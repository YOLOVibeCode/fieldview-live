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

/** App-relative watch path after checkout (DirectStream `/direct/...` or game `/stream/{token}`). */
export function watchPathFromPurchaseStatus(status: {
  watchUrl?: string | null;
  entitlementToken?: string | null;
}): string {
  const fromWatch = pathFromWatchUrl(status.watchUrl);
  if (fromWatch) return fromWatch;
  if (status.entitlementToken) return `/stream/${status.entitlementToken}`;
  return '/';
}

function pathFromWatchUrl(watchUrl: string | null | undefined): string | null {
  if (!watchUrl?.trim()) return null;
  try {
    const parsed = watchUrl.startsWith('http')
      ? new URL(watchUrl)
      : new URL(watchUrl, 'https://fieldview.live');
    if (parsed.pathname.startsWith('/direct/') || parsed.pathname.startsWith('/stream/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    if (watchUrl.startsWith('/direct/') || watchUrl.startsWith('/stream/')) return watchUrl;
  }
  return null;
}
