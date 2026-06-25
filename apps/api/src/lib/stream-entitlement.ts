import { prisma } from './prisma';

export interface EntitlementCheckParams {
  viewerId?: string | null;
  email?: string | null;
}

/**
 * Single source of truth for "is this caller allowed to receive the playable
 * stream URL for a paywalled direct stream?".
 *
 * Returns true only when the caller (identified by a viewerId or email) holds a
 * currently-valid, active entitlement tied to a purchase for the given direct
 * stream. Used by the bootstrap endpoints to decide whether to include the
 * playable streamUrl/muxPlaybackId, and by /verify-access.
 *
 * SECURITY: the playable URL (and, for Mux, the playback id — which alone is
 * enough to watch via https://stream.mux.com/<id>.m3u8) must never be returned
 * to a caller that fails this check. A missing viewerId/email is treated as
 * "not entitled" (fail closed).
 */
export async function hasValidStreamEntitlement(
  directStreamId: string,
  { viewerId, email }: EntitlementCheckParams
): Promise<boolean> {
  if (!viewerId && !email) {
    return false;
  }

  let viewer: { id: string } | null = null;
  if (viewerId) {
    viewer = await prisma.viewerIdentity.findUnique({
      where: { id: viewerId },
      select: { id: true },
    });
  } else if (email) {
    viewer = await prisma.viewerIdentity.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  if (!viewer) {
    return false;
  }

  const entitlement = await prisma.entitlement.findFirst({
    where: {
      purchase: {
        viewerId: viewer.id,
        directStreamId,
      },
      status: 'active',
      validTo: { gte: new Date() },
    },
    select: { id: true },
  });

  return Boolean(entitlement);
}
