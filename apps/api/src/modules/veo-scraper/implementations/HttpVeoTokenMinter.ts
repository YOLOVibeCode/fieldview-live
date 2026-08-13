/**
 * HttpVeoTokenMinter — mint a Veo access token from a seeded `_session` cookie,
 * over pure HTTP (no browser).
 *
 *   GET  authorize (Cookie: _session…, PKCE) --303--> Location carries ?code=
 *   POST token     (code + code_verifier, public client) ------------> access_token
 *
 * If authorize returns no code, the session cookie is dead → VeoSessionExpiredError
 * (the owner must re-seed via a one-time browser login).
 */

import {
  VeoSessionExpiredError,
  type FetchLike,
  type IVeoTokenMinter,
  type MintedToken,
  type VeoOidcConfig,
} from '../interfaces';

import {
  DEFAULT_VEO_OIDC,
  buildAuthorizeUrl,
  extractCodeFromLocation,
  generatePkce,
} from './veo-oidc';

export interface HttpVeoTokenMinterDeps {
  fetch: FetchLike;
  config?: VeoOidcConfig;
  /** State generator (injectable for determinism in tests). */
  makeState?: () => string;
}

export class HttpVeoTokenMinter implements IVeoTokenMinter {
  private readonly fetch: FetchLike;
  private readonly cfg: VeoOidcConfig;
  private readonly makeState: () => string;

  constructor(deps: HttpVeoTokenMinterDeps) {
    this.fetch = deps.fetch;
    this.cfg = deps.config ?? DEFAULT_VEO_OIDC;
    this.makeState = deps.makeState ?? (() => `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`);
  }

  async mint(sessionCookie: string): Promise<MintedToken> {
    const { verifier, challenge } = generatePkce();
    const authorizeUrl = buildAuthorizeUrl(this.cfg, { challenge, state: this.makeState() });

    const authRes = await this.fetch(authorizeUrl, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
      redirect: 'manual',
    });
    const code = extractCodeFromLocation(authRes.headers.get('location'));
    if (!code) {
      throw new VeoSessionExpiredError();
    }

    const tokenRes = await this.fetch(this.cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.cfg.redirectUri,
        client_id: this.cfg.clientId,
        code_verifier: verifier,
      }).toString(),
    });

    const body = (await tokenRes.json().catch(() => null)) as
      | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
      | null;

    if (!body?.access_token) {
      const detail = body?.error_description || body?.error || `status ${tokenRes.status}`;
      throw new Error(`Veo token exchange failed: ${detail}`);
    }

    return { accessToken: body.access_token, expiresInSec: body.expires_in ?? 3600 };
  }
}
