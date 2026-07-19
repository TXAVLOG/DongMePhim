/**
 * Gravatar helper — uses SHA-256 (Web Crypto API, compatible with Cloudflare Workers & Node 18+).
 * Gravatar supports both MD5 (legacy) and SHA-256 (since 2024 via path /avatar/sha256/<hash>).
 * 
 * Usage:
 *   const url = await getGravatarUrl('user@example.com');
 *   // https://www.gravatar.com/avatar/sha256/<hash>?d=identicon&s=256
 */
export async function getGravatarUrl(
  email: string,
  fallback: 'identicon' | 'mp' | 'retro' | '404' = 'identicon',
  size: number = 256
): Promise<string> {
  const emailClean = email.trim().toLowerCase();
  
  // SHA-256 via Web Crypto API (works in Cloudflare Workers, Node 18+)
  const encoder = new TextEncoder();
  const data = encoder.encode(emailClean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `https://www.gravatar.com/avatar/sha256/${hashHex}?d=${fallback}&s=${size}`;
}

/**
 * Quick check if a Gravatar actually exists for the email (not just a default placeholder).
 * Returns the URL if the user has a Gravatar, otherwise returns null.
 */
export async function getGravatarIfExists(email: string, size: number = 256): Promise<string | null> {
  const url404 = await getGravatarUrl(email, '404', size);
  try {
    const res = await fetch(url404, { method: 'HEAD' });
    if (res.ok) {
      // User has a real Gravatar — return the actual URL with identicon fallback
      return await getGravatarUrl(email, 'identicon', size);
    }
  } catch (e) {
    // Network error — fall through
  }
  return null;
}
