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
      return `${appUrl}/direct/${directStream.slug}`;
    }
  }
  return `${appUrl}/stream/${entitlementToken}`;
}
