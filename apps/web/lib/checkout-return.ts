/**
 * Parse a DirectStream return URL from checkout query params into an app-relative path.
 */

export function parseDirectStreamReturnPath(returnUrl: string | null | undefined): string | null {
  if (!returnUrl?.trim()) return null;

  try {
    const parsed = returnUrl.startsWith('http')
      ? new URL(returnUrl)
      : new URL(returnUrl, 'https://fieldview.live');
    if (!parsed.pathname.startsWith('/direct/')) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function extractDirectStreamSlug(returnUrl: string | null | undefined): string | null {
  const path = parseDirectStreamReturnPath(returnUrl);
  if (!path) return null;
  const match = path.match(/^\/direct\/([^/?#]+)/);
  return match?.[1] ?? null;
}
