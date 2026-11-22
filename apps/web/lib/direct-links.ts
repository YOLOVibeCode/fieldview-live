/**
 * Links to a coach's game pages (direct streams): the address viewers open, built on the
 * site the coach is using, so a link copied on UAT stays on UAT.
 */

/** The public site, for code that runs where there is no browser window. */
const PUBLIC_SITE = 'https://fieldview.live';

/** The address viewers open to watch the game page with this slug. */
export function directStreamUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, '')}/direct/${encodeURIComponent(slug)}`;
}

/** The address the way people read it: no https:// in front. */
export function displayLink(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/** The site this page is open on (fieldview.live, uat.fieldview.live, …). */
export function currentOrigin(): string {
  return typeof window === 'undefined' ? PUBLIC_SITE : window.location.origin;
}
