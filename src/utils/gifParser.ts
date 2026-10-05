export class GifParser {
  /**
   * Extremely lightweight GIF parser to count frames and estimate duration.
   * Scans for the Graphic Control Extension (0x21 0xF9) indicating a frame.
   */
  static async extractMetadata(blobURL: string): Promise<{ frames: number, duration: number } | null> {
    try {
      const resp = await fetch(blobURL);
      const buffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      let frames = 0;
      let durationMs = 0;
      
      // Basic GIF signature check
      if (bytes.length < 6 || bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) {
         return null; // Not a GIF
      }

      for (let i = 0; i < bytes.length - 2; i++) {
        // Find Graphic Control Extension block
        if (bytes[i] === 0x21 && bytes[i + 1] === 0xF9) {
          frames++;
          // The block size is usually 4 bytes
          if (i + 5 < bytes.length) {
            // Delay time is in hundredths of a second (bytes 4 and 5 of the extension)
            const delay = bytes[i + 4] | (bytes[i + 5] << 8);
            durationMs += (delay * 10);
          }
        }
      }
      
      return { 
        frames: Math.max(1, frames), 
        duration: durationMs || frames * 100 // Fallback estimate
      };
    } catch (e) {
      console.error('GIF parse error:', e);
      return null;
    }
  }
}
