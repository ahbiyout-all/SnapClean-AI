import { FunnelEngine } from './funnelEngine';

/**
 * WASM & Rust Engine Bridge for SnapClean AI
 * Routes heavy computations (Sparse Hash, pHash, Funnel Pruning) to Rust core (via Tauri invoke if desktop/mobile native, or high-performance JS/Worker fallback in browser).
 */
export class WasmEngine {
  private static isInitialized = false;
  private static engineType = 'typescript-optimized';

  static async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      // Check if Tauri is available
      // @ts-ignore
      if (typeof window !== 'undefined' && window.__TAURI__) {
        this.engineType = 'rust-tauri-core';
      } else {
        this.engineType = 'wasm-browser-sandbox';
      }
      this.isInitialized = true;
    } catch {
      this.engineType = 'typescript-optimized';
    }
  }

  static getEngineType(): string {
    return this.engineType;
  }

  /**
   * Compute sparse hash via Rust core or JS fallback
   */
  static async computeSparseHash(fileOrBlob: Blob | File, filePath?: string): Promise<string> {
    await this.init();
    // @ts-ignore
    if (this.engineType === 'rust-tauri-core' && filePath) {
      try {
        // @ts-ignore
        const { invoke } = await import('@tauri-apps/api/core');
        const hash = await invoke<string>('compute_sparse_hash_cmd', { path: filePath });
        if (hash) return hash;
      } catch {
        // Fallback to JS/Worker implementation
      }
    }
    return FunnelEngine.computeSparseHash(fileOrBlob);
  }

  /**
   * Compute perceptual hash via Rust core or JS fallback
   */
  static async computePHash(blobOrUrl: Blob | File | string, filePath?: string): Promise<string> {
    await this.init();
    // @ts-ignore
    if (this.engineType === 'rust-tauri-core' && filePath && typeof filePath === 'string') {
      try {
        // @ts-ignore
        const { invoke } = await import('@tauri-apps/api/core');
        const phash = await invoke<string>('compute_phash_cmd', { path: filePath });
        if (phash) return phash;
      } catch {
        // Fallback
      }
    }
    return FunnelEngine.computeFastPHash(blobOrUrl);
  }
}
