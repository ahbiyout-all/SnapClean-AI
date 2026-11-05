/**
 * SnapClean AI - File Watcher Service
 * Manages background filesystem monitoring, real-time watcher initialization,
 * and automated change detection for monitored picture folders.
 */

import { SystemAPI } from './systemApi';
import { backgroundSyncManager } from './backgroundSyncManager';

export const STORAGE_KEY_BG_SCANNING = 'snapclean_enable_background_scanning';
export const STORAGE_KEY_WATCH_PATHS = 'snapclean_watch_paths';
export const STORAGE_KEY_STARTUP_AUTOWATCHER = 'snapclean_startup_autowatcher';

export interface FileWatcherStatus {
  isEnabled: boolean;
  isRunning: boolean;
  watchPaths: string[];
  activeWatchersCount: number;
  lastScanTime: number | null;
  lastDetectedFilesCount: number;
  lastEventMessage?: string;
}

export type FileWatcherListener = (status: FileWatcherStatus) => void;

class FileWatcherService {
  private static instance: FileWatcherService;
  private isRunning: boolean = false;
  private watchPaths: string[] = ['/users/me/pictures'];
  private lastScanTime: number | null = null;
  private lastDetectedFilesCount: number = 0;
  private lastEventMessage: string | undefined = undefined;
  private listeners: Set<FileWatcherListener> = new Set();
  private scanTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.loadPersistedState();
  }

  public static getInstance(): FileWatcherService {
    if (!FileWatcherService.instance) {
      FileWatcherService.instance = new FileWatcherService();
    }
    return FileWatcherService.instance;
  }

  private loadPersistedState(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedPaths = localStorage.getItem(STORAGE_KEY_WATCH_PATHS);
      if (savedPaths) {
        const parsed = JSON.parse(savedPaths);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.watchPaths = parsed;
        }
      }
    } catch (e) {
      console.warn('[FileWatcherService] Failed to parse watch paths:', e);
    }
  }

  /**
   * Returns whether background scanning is globally enabled by user preference.
   * Defaults to true if not set.
   */
  public isEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEY_BG_SCANNING);
    if (val === null) {
      // Check legacy autowatcher key as fallback
      const legacyVal = localStorage.getItem(STORAGE_KEY_STARTUP_AUTOWATCHER);
      return legacyVal !== 'false';
    }
    return val !== 'false';
  }

  /**
   * Sets whether background scanning is globally enabled and persists to localStorage.
   * If enabled, automatically starts the file watcher service.
   * If disabled, stops the running file watcher service.
   */
  public async setEnabled(enabled: boolean): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BG_SCANNING, String(enabled));
      localStorage.setItem(STORAGE_KEY_STARTUP_AUTOWATCHER, String(enabled));
    }

    if (enabled) {
      await this.start();
    } else {
      await this.stop();
    }

    this.notifyListeners();
  }

  /**
   * Initializes the file watcher service on application startup.
   * Checks the persisted localStorage toggle and boots watchers if enabled.
   */
  public async init(): Promise<void> {
    this.loadPersistedState();
    const enabled = this.isEnabled();

    console.log(`[FileWatcherService] App startup init: Background Scanning = ${enabled}`);

    if (enabled) {
      await this.start();
    } else {
      this.isRunning = false;
      this.lastEventMessage = 'Background scanning is disabled in Settings.';
      this.notifyListeners();
    }
  }

  /**
   * Starts the file watcher service and begins monitoring directories.
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    this.lastEventMessage = 'File watcher service started.';

    // Start native Tauri watchers if available
    if (SystemAPI.isTauri() && this.watchPaths.length > 0) {
      for (const path of this.watchPaths) {
        try {
          await SystemAPI.startWatcher(path);
          console.log(`[FileWatcherService] Native watcher active for: ${path}`);
        } catch (err) {
          console.error(`[FileWatcherService] Failed to start native watcher for ${path}:`, err);
        }
      }
    }

    // Set up background heartbeat / incremental sync trigger
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
    }
    this.scanTimer = setInterval(async () => {
      if (this.isRunning && this.isEnabled()) {
        await this.performBackgroundHeartbeat();
      }
    }, 60000); // Heartbeat check every 60s

    this.notifyListeners();
    this.broadcastCustomEvent();
  }

  /**
   * Stops the file watcher service and detaches OS watchers.
   */
  public async stop(): Promise<void> {
    this.isRunning = false;
    this.lastEventMessage = 'File watcher service stopped.';

    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    if (SystemAPI.isTauri() && this.watchPaths.length > 0) {
      for (const path of this.watchPaths) {
        try {
          await SystemAPI.stopWatching(path);
          console.log(`[FileWatcherService] Native watcher stopped for: ${path}`);
        } catch (err) {
          console.error(`[FileWatcherService] Failed to stop native watcher for ${path}:`, err);
        }
      }
    }

    this.notifyListeners();
    this.broadcastCustomEvent();
  }

  /**
   * Performs an incremental change check / heartbeat.
   */
  public async triggerScanNow(): Promise<{ success: boolean; message: string }> {
    if (!this.isRunning) {
      await this.start();
    }

    this.lastScanTime = Date.now();
    try {
      const res = await backgroundSyncManager.triggerIncrementalSync();
      const added = res.stats?.added?.length || 0;
      const modified = res.stats?.modified?.length || 0;
      this.lastDetectedFilesCount = added + modified;
      this.lastEventMessage = `Scan complete. Added: ${added}, Modified: ${modified}`;
      this.notifyListeners();
      return {
        success: true,
        message: this.lastEventMessage,
      };
    } catch (e: any) {
      this.lastEventMessage = `Scan failed: ${e?.message || e}`;
      this.notifyListeners();
      return {
        success: false,
        message: this.lastEventMessage,
      };
    }
  }

  private async performBackgroundHeartbeat(): Promise<void> {
    this.lastScanTime = Date.now();
    try {
      await backgroundSyncManager.triggerIncrementalSync();
      this.notifyListeners();
    } catch (e) {
      // Quiet fail in background
    }
  }

  public getWatchPaths(): string[] {
    return [...this.watchPaths];
  }

  public async addWatchPath(path: string): Promise<void> {
    if (this.watchPaths.includes(path)) return;
    this.watchPaths = [...this.watchPaths, path];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WATCH_PATHS, JSON.stringify(this.watchPaths));
    }
    if (this.isRunning && SystemAPI.isTauri()) {
      await SystemAPI.startWatcher(path);
    }
    this.notifyListeners();
  }

  public async removeWatchPath(path: string): Promise<void> {
    this.watchPaths = this.watchPaths.filter((p) => p !== path);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WATCH_PATHS, JSON.stringify(this.watchPaths));
    }
    if (SystemAPI.isTauri()) {
      await SystemAPI.stopWatching(path);
    }
    this.notifyListeners();
  }

  public getStatus(): FileWatcherStatus {
    return {
      isEnabled: this.isEnabled(),
      isRunning: this.isRunning,
      watchPaths: [...this.watchPaths],
      activeWatchersCount: this.isRunning ? this.watchPaths.length : 0,
      lastScanTime: this.lastScanTime,
      lastDetectedFilesCount: this.lastDetectedFilesCount,
      lastEventMessage: this.lastEventMessage,
    };
  }

  public subscribe(listener: FileWatcherListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('[FileWatcherService] Listener invocation error:', err);
      }
    });
  }

  private broadcastCustomEvent(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('file-watcher-status-changed', {
          detail: this.getStatus(),
        }),
      );
    }
  }
}

export const fileWatcherService = FileWatcherService.getInstance();
