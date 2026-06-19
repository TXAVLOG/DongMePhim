const PBKDF2_ITERATIONS = 100_000;
const SALT_LEN = 16;
const IV_LEN = 12;

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as any, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function txaEncrypt(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv   = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key  = await deriveKey(passphrase, salt);
  const enc  = new TextEncoder();

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    enc.encode(plaintext)
  );

  const result = new Uint8Array(SALT_LEN + IV_LEN + cipherBuffer.byteLength);
  result.set(salt, 0);
  result.set(iv, SALT_LEN);
  result.set(new Uint8Array(cipherBuffer), SALT_LEN + IV_LEN);

  return btoa(String.fromCharCode(...result))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function txaDecrypt(encoded: string, passphrase: string): Promise<string> {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const salt       = raw.slice(0, SALT_LEN);
  const iv         = raw.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const cipherData = raw.slice(SALT_LEN + IV_LEN);

  const key = await deriveKey(passphrase, salt);
  const dec = new TextDecoder();

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    cipherData
  );

  return dec.decode(decryptedBuffer);
}
