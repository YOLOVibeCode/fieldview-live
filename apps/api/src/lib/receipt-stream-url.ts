/**
 * Builds the watch link included on purchase receipt emails.
 */

import { prisma } from './prisma';

export async function buildReceiptStreamUrl(
  purchase: { directStreamId?: string | null; gameId?: string | null },
  entitlementToken: string,
): Promise<string> {
  const appUrl = (process.env.APP_URL || 'https://fieldview.live').replace(/\/$/, '');
  if (purchase.directStreamId) {
    const directStream = await prisma.directStream.findUnique({
      where: { id: purchase.directStreamId },
      select: { slug: true },
    });
    if (directStream?.slug) {
      return directStreamWatchUrl(directStream.slug, entitlementToken);
    }
  }
  return `${appUrl}/stream/${entitlementToken}`;
}

/**
 * Watch link for a direct stream (or `parent/event`) that carries the buyer's
 * entitlement token. The page saves the token and strips it from the URL.
 */
export function directStreamWatchUrl(slugKey: string, entitlementToken: string): string {
  const appUrl = (process.env.APP_URL || 'https://fieldview.live').replace(/\/$/, '');
  return `${appUrl}/direct/${slugKey}?access=${encodeURIComponent(entitlementToken)}`;
}
