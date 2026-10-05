
/**
 * SnapClean AI - Local-First Crypto Engine
 * Uses Web Crypto API (AES-GCM 256) for Zero-Knowledge Encryption
 */

export class CryptoEngine {
  private static ITERATIONS = 100000;
  private static ALGO = 'AES-GCM';

  /**
   * Derives a cryptographic key from a plain-text password
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGO, length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a Blob with a password
   */
  static async encryptBlob(blob: Blob, password: string): Promise<{ data: ArrayBuffer, salt: Uint8Array, iv: Uint8Array }> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    
    const arrayBuffer = await blob.arrayBuffer();
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: this.ALGO, iv },
      key,
      arrayBuffer
    );

    return { data: encryptedData, salt, iv };
  }

  /**
   * Decrypts an ArrayBuffer back into a Blob
   */
  static async decryptToBlob(encryptedData: ArrayBuffer, password: string, salt: Uint8Array, iv: Uint8Array, mimeType: string): Promise<Blob> {
    const key = await this.deriveKey(password, salt);
    
    try {
      const decryptedData = await window.crypto.subtle.decrypt(
        { name: this.ALGO, iv },
        key,
        encryptedData
      );
      return new Blob([decryptedData], { type: mimeType });
    } catch (e) {
      throw new Error('Invalid password or corrupted data');
    }
  }

  /**
   * Helper to pack encrypted components into a single buffer for storage
   */
  static pack(encrypted: { data: ArrayBuffer, salt: Uint8Array, iv: Uint8Array }): Blob {
    return new Blob([
      encrypted.salt, // 16 bytes
      encrypted.iv,   // 12 bytes
      encrypted.data
    ]);
  }

  /**
   * Helper to unpack stored data
   */
  static unpack(packed: ArrayBuffer): { data: ArrayBuffer, salt: Uint8Array, iv: Uint8Array } {
    const salt = new Uint8Array(packed.slice(0, 16));
    const iv = new Uint8Array(packed.slice(16, 28));
    const data = packed.slice(28);
    return { data, salt, iv };
  }

  /**
   * Hashes a password for decoy mode storage
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies if a password matches the vault master key
   */
  static async verifyVaultPassword(password: string): Promise<boolean> {
    // In a real local-first app, we'd try to decrypt a known "test" file or use a stored hash.
    // For this implementation, we will use a stored hash in localStorage for the "Master Key".
    const storedHash = localStorage.getItem('snapclean_vault_master_hash');
    if (!storedHash) {
      // First time initialization - set the password as master
      const hash = await this.hashPassword(password);
      localStorage.setItem('snapclean_vault_master_hash', hash);
      return true;
    }
    const currentHash = await this.hashPassword(password);
    return currentHash === storedHash;
  }
}
