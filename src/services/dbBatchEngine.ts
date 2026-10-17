/**
 * SnapClean AI - Mobile IndexedDB Write-Behind Batch Buffer & Throttled Event Engine
 * Optimizes mobile flash storage I/O by batching individual writes into bulkPut transactions
 * and throttling React re-render dispatches to prevent main-thread layout thrashing.
 */

import { db, PhotoRecord } from './db';

export interface BatchBufferStats {
  queuedCount: number;
  totalFlushed: number;
  totalBatches: number;
  avgBatchSize: number;
  isFlushing: boolean;
  ioWritesSaved: number;
}

export class DbBatchEngine {
  private static instance: DbBatchEngine;
  private queue: Map<string, PhotoRecord> = new Map(); // Keyed by path or id to dedup in-flight updates
  private flushTimer: any = null;
  private isFlushing = false;
  private lastEventDispatchTime = 0;
  private pendingEventTimer: any = null;

  // Batch tuning parameters (Tuned for mobile battery & flash storage lifespan)
  private batchThreshold = 20; // Auto-flush when queue reaches this count
  private maxDebounceMs = 250; // Max time before auto-flushing pending items
  private eventThrottleMs = 300; // Min interval between UI notification events

  // Telemetry metrics
  private totalFlushed = 0;
  private totalBatches = 0;
  private ioWritesSaved = 0;

  private constructor() {
    this.configureForEnvironment();
  }

  public static getInstance(): DbBatchEngine {
    if (!DbBatchEngine.instance) {
      DbBatchEngine.instance = new DbBatchEngine();
    }
    return DbBatchEngine.instance;
  }

  private configureForEnvironment(): void {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) || window.innerWidth < 768;

    if (isMobile) {
      this.batchThreshold = 18; // Smaller chunks to avoid long micro-locks on low-RAM mobile
      this.maxDebounceMs = 200;
      this.eventThrottleMs = 350; // Less frequent UI re-render triggers on mobile
    } else {
      this.batchThreshold = 40;
      this.maxDebounceMs = 300;
      this.eventThrottleMs = 200;
    }
  }

  /**
   * Queues a photo record for atomic bulk writing.
   */
  public async queuePhoto(photo: PhotoRecord): Promise<void> {
    const key = photo.path || (photo.id !== undefined ? String(photo.id) : photo.originalId);
    this.queue.set(key, photo);

    // If threshold reached, flush immediately
    if (this.queue.size >= this.batchThreshold) {
      await this.flush();
    } else {
      this.scheduleDebouncedFlush();
    }
  }

  /**
   * Schedules a debounced flush if one is not already ticking.
   */
  private scheduleDebouncedFlush(): void {
    if (this.flushTimer !== null) return;

    this.flushTimer = setTimeout(async () => {
      this.flushTimer = null;
      await this.flush();
    }, this.maxDebounceMs);
  }

  /**
   * Atomically flushes all queued records to IndexedDB in a single transaction.
   */
  public async flush(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.size === 0 || this.isFlushing) return;

    this.isFlushing = true;
    const batch = Array.from(this.queue.values());
    this.queue.clear();

    try {
      // Execute in a single Dexie transaction for optimal mobile SQLite write performance
      await db.transaction('rw', db.photos, async () => {
        await db.photos.bulkPut(batch);
      });

      this.totalFlushed += batch.length;
      this.totalBatches++;
      this.ioWritesSaved += Math.max(0, batch.length - 1);

      this.dispatchThrottledEvent();
    } catch (err) {
      console.warn('[DbBatchEngine] Error flushing batch, attempting individual fallback:', err);
      // Fallback: save one-by-one to isolate problematic record
      for (const item of batch) {
        try {
          await db.photos.put(item);
        } catch (singleErr) {
          console.error(`[DbBatchEngine] Failed to save record ${item.path}:`, singleErr);
        }
      }
      this.dispatchThrottledEvent();
    } finally {
      this.isFlushing = false;

      // If more items accumulated while flushing, schedule another flush
      if (this.queue.size > 0) {
        this.scheduleDebouncedFlush();
      }
    }
  }

  /**
   * Throttles DOM custom event dispatch to prevent React hooks from over-rendering.
   */
  private dispatchThrottledEvent(): void {
    if (typeof window === 'undefined') return;

    const now = performance.now();
    const elapsed = now - this.lastEventDispatchTime;

    if (elapsed >= this.eventThrottleMs) {
      this.lastEventDispatchTime = now;
      window.dispatchEvent(new CustomEvent('photos-database-updated'));
    } else {
      if (this.pendingEventTimer === null) {
        this.pendingEventTimer = setTimeout(() => {
          this.pendingEventTimer = null;
          this.lastEventDispatchTime = performance.now();
          window.dispatchEvent(new CustomEvent('photos-database-updated'));
        }, this.eventThrottleMs - elapsed);
      }
    }
  }

  /**
   * Force immediately dispatch an event (e.g., at scan completion).
   */
  public forceEventDispatch(): void {
    if (this.pendingEventTimer !== null) {
      clearTimeout(this.pendingEventTimer);
      this.pendingEventTimer = null;
    }
    if (typeof window !== 'undefined') {
      this.lastEventDispatchTime = performance.now();
      window.dispatchEvent(new CustomEvent('photos-database-updated'));
    }
  }

  /**
   * Returns live operational metrics for performance telemetry.
   */
  public getStats(): BatchBufferStats {
    const avgBatchSize = this.totalBatches > 0 
      ? Number((this.totalFlushed / this.totalBatches).toFixed(1)) 
      : 0;

    return {
      queuedCount: this.queue.size,
      totalFlushed: this.totalFlushed,
      totalBatches: this.totalBatches,
      avgBatchSize,
      isFlushing: this.isFlushing,
      ioWritesSaved: this.ioWritesSaved,
    };
  }
}

export const dbBatchEngine = DbBatchEngine.getInstance();
