/**
 * SnapClean AI - Mobile Offscreen WebWorker (Thread-Isolated Hash & Thumbnail Engine)
 * Runs off the main UI thread with OffscreenCanvas & createImageBitmap hardware acceleration.
 */

interface WorkerRequest {
  id: string;
  type: 'COMPUTE_PHASH' | 'COMPUTE_SPARSE_HASH' | 'DOWNSAMPLE_THUMBNAIL' | 'PING';
  payload: any;
}

interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  result?: any;
  error?: string;
  latencyMs: number;
}

// 32-bit FNV-1a Hash on ArrayBuffer (Zero-alloc)
function fastBufferHash(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let hval = 0x811c9dc5;
  for (let i = 0; i < view.length; i++) {
    hval ^= view[i];
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  return (hval >>> 0).toString(16).padStart(8, '0');
}

// 64-bit dHash gradient computation from 32x32 pixel buffer
function computeDHashFromPixels(data: Uint8ClampedArray): { hash: string; dominantColor: string } {
  const blockWidth = 4;
  const blockHeight = 4;
  const grid = new Float32Array(64);

  let rSum = 0, gSum = 0, bSum = 0;
  const totalPixels = 32 * 32;

  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      let sum = 0;
      for (let y = 0; y < blockHeight; y++) {
        for (let x = 0; x < blockWidth; x++) {
          const px = gx * blockWidth + x;
          const py = gy * blockHeight + y;
          const idx = (py * 32 + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          // Rec. 601 Luma
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          sum += luma;

          rSum += r;
          gSum += g;
          bSum += b;
        }
      }
      grid[gy * 8 + gx] = sum / (blockWidth * blockHeight);
    }
  }

  // 64-bit difference hash
  let hashHex = '';
  for (let row = 0; row < 8; row++) {
    let byteVal = 0;
    for (let col = 0; col < 8; col++) {
      const nextCol = (col + 1) % 8;
      const bit = grid[row * 8 + col] > grid[row * 8 + nextCol] ? 1 : 0;
      byteVal = (byteVal << 1) | bit;
    }
    hashHex += byteVal.toString(16).padStart(2, '0');
  }

  const avgR = Math.round(rSum / totalPixels);
  const avgG = Math.round(gSum / totalPixels);
  const avgB = Math.round(bSum / totalPixels);
  const dominantColor = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;

  return { hash: hashHex || '1f2e3d4c5b6a7988', dominantColor };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = e.data;
  const start = performance.now();

  try {
    switch (type) {
      case 'PING': {
        self.postMessage({
          id,
          type,
          success: true,
          result: { pong: true, time: Date.now() },
          latencyMs: performance.now() - start,
        } as WorkerResponse);
        break;
      }

      case 'COMPUTE_SPARSE_HASH': {
        const { size, headBuf, midBuf, tailBuf } = payload;
        if (!size || size === 0) {
          self.postMessage({
            id,
            type,
            success: true,
            result: { sparseHash: 'sparse_0_empty' },
            latencyMs: performance.now() - start,
          } as WorkerResponse);
          return;
        }

        if (size <= 12288 && headBuf) {
          const hash = fastBufferHash(headBuf);
          self.postMessage({
            id,
            type,
            success: true,
            result: { sparseHash: `sparse_${size}_${hash}` },
            latencyMs: performance.now() - start,
          } as WorkerResponse);
          return;
        }

        const CHUNK_SIZE = 4096;
        const combined = new Uint8Array(CHUNK_SIZE * 3);
        if (headBuf) combined.set(new Uint8Array(headBuf), 0);
        if (midBuf) combined.set(new Uint8Array(midBuf), CHUNK_SIZE);
        if (tailBuf) combined.set(new Uint8Array(tailBuf), CHUNK_SIZE * 2);

        const hash = fastBufferHash(combined.buffer);
        self.postMessage({
          id,
          type,
          success: true,
          result: { sparseHash: `sparse_${size}_${hash}` },
          latencyMs: performance.now() - start,
        } as WorkerResponse);
        break;
      }

      case 'COMPUTE_PHASH': {
        const { blob, arrayBuffer, mimeType } = payload;
        let sourceBlob: Blob;
        if (blob instanceof Blob) {
          sourceBlob = blob;
        } else if (arrayBuffer instanceof ArrayBuffer) {
          sourceBlob = new Blob([arrayBuffer], { type: mimeType || 'image/jpeg' });
        } else {
          throw new Error('Invalid blob or arrayBuffer provided to worker');
        }

        let bmp: ImageBitmap | null = null;
        try {
          bmp = await createImageBitmap(sourceBlob, {
            resizeWidth: 32,
            resizeHeight: 32,
            resizeQuality: 'low',
          });
        } catch {
          // Fallback if resizing options not supported in some browsers
          bmp = await createImageBitmap(sourceBlob);
        }

        if (typeof OffscreenCanvas === 'undefined') {
          bmp.close();
          throw new Error('OffscreenCanvas unsupported in worker');
        }

        const canvas = new OffscreenCanvas(32, 32);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          bmp.close();
          throw new Error('Failed to get 2d context on OffscreenCanvas');
        }

        ctx.drawImage(bmp, 0, 0, 32, 32);
        bmp.close();

        const imgData = ctx.getImageData(0, 0, 32, 32);
        const { hash, dominantColor } = computeDHashFromPixels(imgData.data);

        self.postMessage({
          id,
          type,
          success: true,
          result: {
            pHash: hash,
            dominantColor,
            width: 32,
            height: 32,
          },
          latencyMs: performance.now() - start,
        } as WorkerResponse);
        break;
      }

      case 'DOWNSAMPLE_THUMBNAIL': {
        const { blob, arrayBuffer, mimeType, maxW = 220, maxH = 220, quality = 0.75 } = payload;
        let sourceBlob: Blob;
        if (blob instanceof Blob) {
          sourceBlob = blob;
        } else if (arrayBuffer instanceof ArrayBuffer) {
          sourceBlob = new Blob([arrayBuffer], { type: mimeType || 'image/jpeg' });
        } else {
          throw new Error('Invalid blob for downsampling');
        }

        let bmp: ImageBitmap;
        try {
          bmp = await createImageBitmap(sourceBlob, {
            resizeWidth: maxW,
            resizeHeight: maxH,
            resizeQuality: 'medium',
          });
        } catch {
          bmp = await createImageBitmap(sourceBlob);
        }

        const { width, height } = bmp;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        const targetW = Math.max(1, Math.round(width * ratio));
        const targetH = Math.max(1, Math.round(height * ratio));

        if (typeof OffscreenCanvas === 'undefined') {
          bmp.close();
          throw new Error('OffscreenCanvas unsupported in worker');
        }

        const canvas = new OffscreenCanvas(targetW, targetH);
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          bmp.close();
          throw new Error('Could not get 2d context for thumbnail');
        }

        ctx.drawImage(bmp, 0, 0, targetW, targetH);
        bmp.close();

        const outBlob = await canvas.convertToBlob({
          type: 'image/webp',
          quality: quality,
        });

        // Convert blob to ArrayBuffer so it can be transferred cleanly
        const outBuffer = await outBlob.arrayBuffer();

        (self as any).postMessage(
          {
            id,
            type,
            success: true,
            result: {
              buffer: outBuffer,
              width: targetW,
              height: targetH,
              mimeType: 'image/webp',
            },
            latencyMs: performance.now() - start,
          } as WorkerResponse,
          [outBuffer] // Transfer ownership for zero-copy
        );
        break;
      }

      default:
        throw new Error(`Unknown worker command: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      type,
      success: false,
      error: err?.message || String(err),
      latencyMs: performance.now() - start,
    } as WorkerResponse);
  }
};
