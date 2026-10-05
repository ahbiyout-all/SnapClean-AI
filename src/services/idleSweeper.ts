import { blobRegistry } from '../utils/blobRegistry';

/**
 * Background Idle Garbage Sweeper
 * Phase 42.2: Observability & Auto-Healing
 */

class BackgroundIdleSweeper {
  private idleTimeoutMs = 10000; // 10 seconds of no events
  private timer: any = null;
  private isActive = false;
  private initialized = false;

  private onActive = () => {
    if (!this.isActive) return;
    this.resetTimer();
  };

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    // Listen for interaction events
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(env => window.addEventListener(env, this.onActive, { passive: true }));
    
    this.isActive = true;
    this.initialized = true;
    this.resetTimer();
    console.log("[IdleSweeper] Background Idle GC Sweeper Initialized.");
  }

  public destroy() {
    this.isActive = false;
    this.initialized = false;
    if (this.timer) clearTimeout(this.timer);
    if (typeof window !== 'undefined') {
      const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
      events.forEach(env => window.removeEventListener(env, this.onActive));
    }
  }

  private resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    
    this.timer = setTimeout(() => {
      this.triggerSweep();
    }, this.idleTimeoutMs);
  }

  private triggerSweep() {
    if (!this.isActive) return;

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(this.performSweep.bind(this), { timeout: 2000 });
    } else {
      setTimeout(() => this.performSweep(), 0);
    }
  }

  private performSweep() {
    // 1. Log or clear arbitrary caches
    console.log("[IdleSweeper] 10s Idle Detected. Performing background sweep/cleanup...");

    // 2. Clear lingering Blob Object URLs if any tracked externally
    // Note: Do NOT clear central blobRegistry here as active components rely on cached object URLs.
    
    // 3. Forcibly invoke GC if exposed flag is running
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        console.log("[IdleSweeper] V8 GC invoked manually.");
      } catch(e) {}
    }
    
    // Wait for next cycle
    this.resetTimer();
  }
}

export const idleSweeper = new BackgroundIdleSweeper();
