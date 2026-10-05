/**
 * Memory Guardian
 * Phase 41.1: Deep Memory Heap Limiter & Yield
 */

export class MemoryGuardian {
  private static criticalThreshold = 0.90; // 90%
  private static warningThreshold = 0.75; // 75%

  /**
   * Evaluates the current Chrome V8 heap memory pressure.
   */
  public static async getMemoryPressure(): Promise<'safe' | 'warning' | 'critical'> {
    if (typeof window === 'undefined') return 'safe';
    
    // Check if performance.memory is available (Chrome/Edge Chromium)
    const perf = window.performance as any;
    if (!perf || !perf.memory) {
      return 'safe'; // Fallback for Firefox/Safari
    }

    const { usedJSHeapSize, jsHeapSizeLimit } = perf.memory;
    const ratio = usedJSHeapSize / jsHeapSizeLimit;

    if (ratio >= this.criticalThreshold) {
      return 'critical';
    } else if (ratio >= this.warningThreshold) {
      return 'warning';
    }

    return 'safe';
  }

  /**
   * Delays execution if memory pressure is dangerously high, giving the V8 Garbage Collector time to run.
   */
  public static async yieldIfUnderPressure(baseDelayMs: number = 20, pressureMultiplier: number = 25): Promise<boolean> {
    const status = await this.getMemoryPressure();

    if (status === 'critical') {
      console.warn(`[MemoryGuardian] CRITICAL HEAP PRESSURE DETECTED. Emitting heavy back-pressure sleep for GC...`);
      // Force a long sleep loop to allow main thread to clear URLs and Canvas objects
      await new Promise(r => setTimeout(r, baseDelayMs * pressureMultiplier));
      return true;
    } else if (status === 'warning') {
      // Moderate sleep
      await new Promise(r => setTimeout(r, baseDelayMs * (pressureMultiplier / 2)));
      return true;
    } else {
      // Nominal loop yield
      await new Promise(r => setTimeout(r, baseDelayMs));
      return false;
    }
  }
}
