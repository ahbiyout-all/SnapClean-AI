/**
 * Snapshot AI - Blur Detection Utility
 * Uses Laplacian Variance method to detect blur.
 */

export class BlurDetection {
  /**
   * Calculates a blur score using the Laplacian operator.
   * Higher score = sharper image.
   * Typically: 
   * > 0.5: Very sharp
   * 0.3 - 0.5: Acceptable
   * < 0.3: Blurry
   */
  static async calculateScore(imageSource: string | HTMLImageElement): Promise<number> {
    return new Promise((resolve) => {
      const img = typeof imageSource === 'string' ? new Image() : imageSource;
      
      const process = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(0.5);
          return;
        }

        // Downscale for performance (blur characteristics are preserved at lower res)
        const maxDim = 300;
        const scale = Math.min(maxDim / img.width, maxDim / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          const width = imageData.width;
          const height = imageData.height;

          // Laplacian Kernel:
          // [ 0,  1,  0]
          // [ 1, -4,  1]
          // [ 0,  1,  0]
          
          let sum = 0;
          let sumSq = 0;
          let count = 0;

          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const idx = (y * width + x) * 4;
              
              // Simple grayscale conversion
              const getLuma = (px: number, py: number) => {
                const i = ((y + py) * width + (x + px)) * 4;
                return 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
              };

              const lap = 
                getLuma(0, -1) + 
                getLuma(-1, 0) + 
                getLuma(1, 0) + 
                getLuma(0, 1) - 
                4 * getLuma(0, 0);

              sum += lap;
              sumSq += lap * lap;
              count++;
            }
          }

          const mean = sum / count;
          const variance = (sumSq / count) - (mean * mean);
          
          // Normalize variance to 0.0 - 1.0 range
          // Empirical scaling: variance of 150+ is usually very sharp
          const score = Math.min(1, Math.max(0, variance / 200));
          resolve(score);
        } catch (e) {
          console.error('Blur analysis failed:', e);
          resolve(0.5);
        }
      };

      if (typeof imageSource === 'string') {
        img.crossOrigin = 'anonymous';
        img.onload = process;
        img.onerror = () => resolve(0.5);
        img.src = imageSource;
      } else {
        process();
      }
    });
  }

  /**
   * Mocks a score for demo purposes if processing isn't possible
   */
  static mockScore(): number {
    // Generate scores mostly above 0.3 but some below (15% chance of blurry)
    return Math.random() < 0.15 ? Math.random() * 0.29 : 0.3 + Math.random() * 0.7;
  }
}
