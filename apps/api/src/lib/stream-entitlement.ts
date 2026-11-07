import { verifyAdminJwt } from './admin-jwt';
import { prisma } from './prisma';

/** Header the web app uses to send a viewer's entitlement token. */
export const ACCESS_TOKEN_HEADER = 'x-fieldview-access';

export interface StreamAccessCredentials {
  /** Entitlement token from a paid purchase (checkout success page or receipt email). */
  accessToken?: string | null;
  /** Direct-stream admin JWT from /unlock-admin. */
  adminToken?: string | null;
}

export type StreamAccessReason = 'valid_entitlement' | 'stream_admin' | 'no_credentials' | 'invalid_token';

export interface StreamAccessDecision {
  granted: boolean;
  reason: StreamAccessReason;
}

/**
 * Reads proof of access from a request. Only the entitlement token and the
 * stream admin's bearer token count. An email or viewerId in the query string
 * proves nothing (anyone can type an email), so it is deliberately ignored.
 */
export function streamAccessCredentials(req: {
  headers: Record<string, string | string[] | undefined>;
  query?: unknown;
}): StreamAccessCredentials {
  const header = req.headers[ACCESS_TOKEN_HEADER];
  const accessToken = (Array.isArray(header) ? header[0] : header)?.trim() || null;
  const auth = req.headers.authorization;
  const authValue = Array.isArray(auth) ? auth[0] : auth;
  const adminToken = authValue?.startsWith('Bearer ') ? authValue.slice(7).trim() || null : null;
  return { accessToken, adminToken };
}

/**
 * Single source of truth for "may this caller receive the playable stream URL
 * of a paywalled direct stream?". Callers check `paywallEnabled` first.
 *
 * SECURITY: the playable URL (and, for Mux, the playback id, which alone is
 * enough to watch via https://stream.mux.com/<id>.m3u8) must never be returned
 * to a caller this denies. Fails closed.
 */
export async function checkStreamAccess(
  stream: { id: string; slug: string },
  { accessToken, adminToken }: StreamAccessCredentials
): Promise<StreamAccessDecision> {
  if (adminToken && verifyAdminJwt(adminToken)?.slug === stream.slug) {
    return { granted: true, reason: 'stream_admin' };
  }

  if (!accessToken) {
    return { granted: false, reason: adminToken ? 'invalid_token' : 'no_credentials' };
  }

  const entitlement = await prisma.entitlement.findUnique({
    where: { tokenId: accessToken },
    select: { status: true, validTo: true, purchase: { select: { directStreamId: true } } },
  });

  const valid =
    entitlement?.status === 'active' &&
    entitlement.validTo >= new Date() &&
    entitlement.purchase.directStreamId === stream.id;

  return valid ? { granted: true, reason: 'valid_entitlement' } : { granted: false, reason: 'invalid_token' };
}
