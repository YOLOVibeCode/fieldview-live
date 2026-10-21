/**
 * Proof of payment for paywalled direct streams.
 *
 * After checkout, the watch link (success page and receipt email) carries the
 * entitlement token as `?access=`. The page saves it per parent stream, strips
 * it from the address bar, and sends it to the API in a header. The API never
 * unlocks a stream from an email or viewerId, so this token (or the stream
 * admin's JWT) is the only way in.
 */

export const ACCESS_TOKEN_HEADER = 'x-fieldview-access';

const storageKey = (parentSlug: string) => `fv_access_${parentSlug.toLowerCase()}`;

/** Parent stream slug from a bootstrap URL (`/api/direct/<slug or parent%2Fevent>/bootstrap`). */
export function parentSlugFromBootstrapUrl(bootstrapUrl: string): string {
  const match = bootstrapUrl.match(/\/direct\/([^/?#]+)/);
  if (!match) return '';
  return decodeURIComponent(match[1]).split('/')[0].toLowerCase();
}

export function getAccessToken(parentSlug: string): string | null {
  try {
    return localStorage.getItem(storageKey(parentSlug));
  } catch {
    return null;
  }
}

export function clearAccessToken(parentSlug: string): void {
  try {
    localStorage.removeItem(storageKey(parentSlug));
  } catch {
    // Storage unavailable (private mode); nothing to clear.
  }
}

/**
 * Saves `?access=` from the current link (if any), removes it from the address
 * bar so it isn't shared by accident, and returns the token to use.
 */
export function captureAccessToken(
  parentSlug: string,
  location: { href: string; search: string } = window.location,
  history: { replaceState: (data: unknown, unused: string, url: string) => void } = window.history,
): string | null {
  const fromLink = new URLSearchParams(location.search).get('access');
  if (!fromLink) return getAccessToken(parentSlug);

  try {
    localStorage.setItem(storageKey(parentSlug), fromLink);
  } catch {
    // Storage unavailable; the token still works for this page view.
  }
  const url = new URL(location.href);
  url.searchParams.delete('access');
  history.replaceState(null, '', url.toString());
  return fromLink;
}

export function accessHeaders(accessToken: string | null, adminJwt?: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (accessToken) headers[ACCESS_TOKEN_HEADER] = accessToken;
  if (adminJwt) headers.Authorization = `Bearer ${adminJwt}`;
  return headers;
}
