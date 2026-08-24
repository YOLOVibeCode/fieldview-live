/**
 * Pure OIDC helpers for the browser-free Veo client.
 *
 * Veo's auth is standard OIDC (node-oidc-provider at auth.veo.co):
 * authorization_code + PKCE(S256), public client (no secret). These functions
 * are side-effect-free (crypto only) so they unit-test without any network.
 */

import { createHash, randomBytes } from 'crypto';

import type { VeoOidcConfig } from '../interfaces';

/** Discovered Veo OIDC client config (see veo-integration-plan memory, 2026-08-12). */
export const DEFAULT_VEO_OIDC: VeoOidcConfig = {
  clientId: 'IzRQtXQ07V7n8uBtpTHzi',
  redirectUri: 'https://app.veo.co/signin-redirect/',
  authorizeUrl: 'https://auth.veo.co/oidc/auth',
  tokenUrl: 'https://auth.veo.co/oidc/token',
  streamHistoryBase: 'https://app.veo.co/api/v2/live/stream-history/clubs',
  // The SPA uses "openid email phone address profile"; "openid" alone is enough
  // for the stream-history API and keeps the token minimal.
  scope: 'openid',
};

const base64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export interface Pkce {
  verifier: string;
  challenge: string;
}

/** Generate a PKCE verifier + S256 challenge (RFC 7636). */
export function generatePkce(): Pkce {
  const verifier = base64url(randomBytes(32)); // 43 url-safe chars
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

/** Build the OIDC authorization URL for the code+PKCE flow. */
export function buildAuthorizeUrl(
  cfg: VeoOidcConfig,
  opts: { challenge: string; state: string }
): string {
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: cfg.scope,
    code_challenge: opts.challenge,
    code_challenge_method: 'S256',
    state: opts.state,
  });
  return `${cfg.authorizeUrl}?${p.toString()}`;
}

/** Extract the `code` query param from an authorize redirect `Location` header. */
export function extractCodeFromLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  try {
    // Base lets us parse relative Locations ("/signin-redirect/?code=…").
    return new URL(location, 'https://app.veo.co').searchParams.get('code');
  } catch {
    return null;
  }
}

/** Pull the club slug out of a diagnostics or live URL (…/clubs/<slug>/…). */
export function extractClubSlug(url: string): string | null {
  const m = url.match(/\/clubs\/([^/]+)/);
  return m ? m[1] : null;
}
