/**
 * Global Object URL Tracker
 * Phase 43.2: Precision Memory Hardening
 * Prevents memory leaks by centralizing Blob URL creation and destruction.
 */

class BlobRegistry {
  private registry = new Set<string>();

  public create(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.registry.add(url);
    return url;
  }

  public revoke(url: string | null | undefined) {
    if (!url) return;
    if (this.registry.has(url)) {
      URL.revokeObjectURL(url);
      this.registry.delete(url);
    }
  }

  public clearAll() {
    console.log(`[BlobRegistry] Force-clearing ${this.registry.size} lingering Object URLs.`);
    this.registry.forEach(url => URL.revokeObjectURL(url));
    this.registry.clear();
  }

  public get size() {
    return this.registry.size;
  }
}

export const blobRegistry = new BlobRegistry();
