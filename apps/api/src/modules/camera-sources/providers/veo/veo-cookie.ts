/**
 * Pure helper: reduce a cookie jar to the `auth.veo.co` `_session*` header that
 * is the durable credential for the browser-free connector.
 */

export interface CookiePair {
  name: string;
  value: string;
}

/** Join only the `_session*` cookies into a "name=value; …" Cookie header. */
export function pickSessionCookieHeader(cookies: CookiePair[]): string {
  return cookies
    .filter((c) => c.name.startsWith('_session'))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}
