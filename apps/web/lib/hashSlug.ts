/**
 * Hash Slug Utility
 * 
 * Generates a consistent hash from a slug/name for use as a temporary gameId
 * when no real gameId is available. Uses Web Crypto API for consistent hashing.
 */

/**
 * Generate a hash from a slug/name string
 * Returns a consistent hex string that can be used as a temporary gameId
 */
export async function hashSlug(slug: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(slug.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32); // Use first 32 chars
}

/**
 * Synchronous version using a simple hash function
 * Falls back to this if crypto.subtle is not available
 */
export function hashSlugSync(slug: string): string {
  let hash = 0;
  const normalized = slug.toLowerCase().trim();
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string
  return Math.abs(hash).toString(16).padStart(8, '0') + 
         normalized.split('').reduce((acc, char) => {
           return acc + char.charCodeAt(0).toString(16);
         }, '').substring(0, 24);
}

