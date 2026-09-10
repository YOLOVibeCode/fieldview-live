/**
 * Builds the watch link included on purchase receipt emails.
 */

import { prisma } from './prisma';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

export async function buildReceiptStreamUrl(
  purchase: { directStreamId?: string | null; gameId?: string | null },
  entitlementToken: string,
): Promise<string> {
  if (purchase.directStreamId) {
    const directStream = await prisma.directStream.findUnique({
      where: { id: purchase.directStreamId },
      select: { slug: true },
    });
    if (directStream?.slug) {
      return `${APP_URL}/direct/${directStream.slug}`;
    }
  }
  return `${APP_URL}/stream/${entitlementToken}`;
}
