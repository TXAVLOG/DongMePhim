/**
 * Password Encryption Helper using AES-256-CBC
 * Compatible with Cloudflare Workers (uses global crypto.subtle Web Crypto API)
 */

/**
 * Hash a secret key of arbitrary length to generate a 32-byte key for AES-256.
 */
async function getCryptoKey(secretKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey || 'default_super_secret_key_32_bytes_long_123');
  const keyHash = await crypto.subtle.digest('SHA-256', keyData);
  return await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Check if the password is encrypted (matches format: 32 hex chars IV + ":" + hex chars ciphertext)
 */
export function isEncrypted(password: string): boolean {
  if (!password) return false;
  const parts = password.split(':');
  if (parts.length !== 2) return false;
  const [iv, encrypted] = parts;
  const hexRegex = /^[0-9a-fA-F]+$/;
  return iv.length === 32 && hexRegex.test(iv) && hexRegex.test(encrypted);
}

/**
 * Encrypt a plaintext password using AES-256-CBC
 */
export async function encryptPassword(plaintext: string, secretKey: string): Promise<string> {
  if (!plaintext) return '';
  const key = await getCryptoKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    encoder.encode(plaintext)
  );

  const ivHex = Array.from(iv)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const encryptedHex = Array.from(new Uint8Array(encryptedBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${ivHex}:${encryptedHex}`;
}

/**
 * Decrypt an AES-256-CBC encrypted password.
 * Returns null if decryption fails (e.g. wrong key, corrupted data).
 */
export async function decryptPassword(ciphertext: string, secretKey: string): Promise<string | null> {
  if (!ciphertext) return null;
  if (!isEncrypted(ciphertext)) return null;

  try {
    const key = await getCryptoKey(secretKey);
    const parts = ciphertext.split(':');
    const ivHex = parts[0];
    const encryptedHex = parts[1];

    const iv = new Uint8Array(
      ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    const encrypted = new Uint8Array(
      encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('[Crypto Error] Decryption failed:', err);
    return null;
  }
}
