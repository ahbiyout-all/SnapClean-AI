import { blobRegistry } from './blobRegistry';

export class ThumbnailGenerator {
  static async generate(fileOrUrl: File | string, size: number = 256): Promise<{ blob: Blob | null, width: number, height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      let objectUrl: string | null = null;
      
      // Watchdog timeout to prevent infinite freezes on corrupted or giant files where the browser image decoder hangs
      const timeoutId = setTimeout(() => {
        console.warn(`[ThumbnailGenerator] Timeout (3s) reached. Aborting thumbnail extraction to prevent scan freezing.`);
        img.onload = null;
        img.onerror = null;
        img.src = ''; // Cancel the browser load/decode operation
        if (objectUrl) blobRegistry.revoke(objectUrl);
        resolve({ blob: null, width: 0, height: 0 });
      }, 3000);

      img.onload = () => {
        clearTimeout(timeoutId);
        const canvas = document.createElement('canvas');
        const scale = Math.min(size / img.width, size / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ blob: null, width: img.width, height: img.height });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (objectUrl) blobRegistry.revoke(objectUrl);
          resolve({ blob, width: img.width, height: img.height });
        }, 'image/jpeg', 0.8);
      };
      
      img.onerror = () => {
          clearTimeout(timeoutId);
          if (objectUrl) blobRegistry.revoke(objectUrl);
          resolve({ blob: null, width: 0, height: 0 });
      };
      
      // img.crossOrigin = 'Anonymous'; // Phase 44.2: Removed to prevent CORS breakage on blob/data URLs in iframe environments
      if (typeof fileOrUrl === 'string') {
        img.src = fileOrUrl;
      } else {
        objectUrl = blobRegistry.create(fileOrUrl);
        img.src = objectUrl;
      }
    });
  }
}

