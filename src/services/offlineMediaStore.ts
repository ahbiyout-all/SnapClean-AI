/**
 * Persistent Offline Media Thumbnail Store
 * Stores compact WebP/JPEG thumbnails in Origin Private File System (OPFS) when available
 * with automatic IndexedDB (Dexie thumbnailCache) persistence so mobile & offline sessions
 * retain instant visuals after browser tab eviction or reloads.
 */

import { db } from './db';
import { blobRegistry } from '../utils/blobRegistry';

const MAX_CACHE_ENTRIES = 2000;
const OPFS_DIR_NAME = 'snapclean-thumbs';

function hashPath(path: string): string {
  let h1 = 0xdeadbeef ^ path.length;
  let h2 = 0x41c6ce57 ^ path.length;
  for (let i = 0; i < path.length; i++) {
    const ch = path.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

class OfflineMediaStore {
  private static instance: OfflineMediaStore;
  private opfsDirPromise: Promise<FileSystemDirectoryHandle | null> | null = null;
  private inflightSaves = new Set<string>();
  private urlCache = new Map<string, string>();

  public static getInstance(): OfflineMediaStore {
    if (!OfflineMediaStore.instance) {
      OfflineMediaStore.instance = new OfflineMediaStore();
    }
    return OfflineMediaStore.instance;
  }

  private async getOpfsDir(): Promise<FileSystemDirectoryHandle | null> {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
      return null;
    }
    if (!this.opfsDirPromise) {
      this.opfsDirPromise = navigator.storage
        .getDirectory()
        .then((root) => root.getDirectoryHandle(OPFS_DIR_NAME, { create: true }))
        .catch(() => null);
    }
    return this.opfsDirPromise;
  }

  /**
   * Compress a File or Blob to a compact WebP/JPEG thumbnail suitable for persistent offline storage.
   */
  public async createCompactThumbnailBlob(
    source: Blob | File,
    maxDimension = 280,
    quality = 0.72
  ): Promise<Blob | null> {
    if (typeof createImageBitmap !== 'function') return null;
    try {
      const bitmap = await createImageBitmap(source);
      const ratio = Math.min(maxDimension / bitmap.width, maxDimension / bitmap.height, 1);
      const targetW = Math.max(1, Math.round(bitmap.width * ratio));
      const targetH = Math.max(1, Math.round(bitmap.height * ratio));

      let blob: Blob | null = null;
      if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(targetW, targetH);
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(bitmap, 0, 0, targetW, targetH);
          blob = await canvas.convertToBlob({ type: 'image/webp', quality });
        }
      } else if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(bitmap, 0, 0, targetW, targetH);
          blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/webp', quality)
          );
        }
      }

      bitmap.close();
      return blob;
    } catch {
      return null;
    }
  }

  /**
   * Persist an already generated thumbnail Blob to OPFS + IndexedDB (Dexie).
   */
  public async saveThumbnail(path: string, blob: Blob, width?: number, height?: number): Promise<void> {
    if (!path || !blob || blob.size === 0) return;
    if (this.inflightSaves.has(path)) return;
    this.inflightSaves.add(path);

    try {
      // Ensure we store a pure Blob (not a live File handle that Chromium rejects in IDB)
      const pureBlob = blob instanceof File ? new Blob([await blob.arrayBuffer()], { type: blob.type || 'image/webp' }) : blob;

      // Write to IndexedDB (primary cross-platform mobile fallback)
      await db.thumbnailCache.put({
        path,
        blob: pureBlob,
        size: pureBlob.size,
        width,
        height,
        createdAt: Date.now(),
      });

      // Mirror to OPFS if supported for ultra-fast file-backed streaming
      const opfsDir = await this.getOpfsDir();
      if (opfsDir) {
        try {
          const fileName = `${hashPath(path)}.webp`;
          const fileHandle = await opfsDir.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(pureBlob);
          await writable.close();
        } catch {
          // OPFS write optional; Dexie already succeeded
        }
      }

      // Periodically prune oversized cache
      const count = await db.thumbnailCache.count();
      if (count > MAX_CACHE_ENTRIES) {
        const excess = count - MAX_CACHE_ENTRIES;
        const oldest = await db.thumbnailCache.orderBy('createdAt').limit(excess).primaryKeys();
        if (oldest.length > 0) {
          await db.thumbnailCache.bulkDelete(oldest);
        }
      }
    } catch (err) {
      console.warn('[OfflineMediaStore] Save skipped:', err);
    } finally {
      this.inflightSaves.delete(path);
    }
  }

  /**
   * Generate and persist a compact thumbnail directly from a user-selected File/Blob during scan.
   */
  public async persistFromFile(path: string, file: File | Blob): Promise<void> {
    if (!path || !file || file.size === 0) return;
    if (file.type && !file.type.startsWith('image/')) return;
    try {
      const existing = await db.thumbnailCache.get(path);
      if (existing && existing.blob && existing.blob.size > 0) return;

      const compact = await this.createCompactThumbnailBlob(file, 260, 0.72);
      if (compact) {
        await this.saveThumbnail(path, compact);
      }
    } catch {
      // ignore individual decode failure
    }
  }

  /**
   * Retrieve a persistent object URL for a path from memory, OPFS, or Dexie thumbnailCache.
   */
  public async getThumbnailUrl(path: string): Promise<string | null> {
    if (!path) return null;
    if (this.urlCache.has(path)) {
      return this.urlCache.get(path)!;
    }

    try {
      // 1. Check Dexie thumbnailCache first
      const record = await db.thumbnailCache.get(path);
      if (record && record.blob && record.blob.size > 0) {
        const url = blobRegistry.create(record.blob);
        this.urlCache.set(path, url);
        return url;
      }

      // 2. Check OPFS fallback
      const opfsDir = await this.getOpfsDir();
      if (opfsDir) {
        try {
          const handle = await opfsDir.getFileHandle(`${hashPath(path)}.webp`);
          const file = await handle.getFile();
          if (file && file.size > 0) {
            const url = blobRegistry.create(file);
            this.urlCache.set(path, url);
            return url;
          }
        } catch {
          // Not present in OPFS
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  public async clearAll(): Promise<void> {
    this.urlCache.forEach((url) => blobRegistry.revoke(url));
    this.urlCache.clear();
    try {
      await db.thumbnailCache.clear();
    } catch {}
    const opfsDir = await this.getOpfsDir();
    if (opfsDir) {
      try {
        for await (const name of (opfsDir as any).keys()) {
          await opfsDir.removeEntry(name);
        }
      } catch {}
    }
  }
}

export const offlineMediaStore = OfflineMediaStore.getInstance();
