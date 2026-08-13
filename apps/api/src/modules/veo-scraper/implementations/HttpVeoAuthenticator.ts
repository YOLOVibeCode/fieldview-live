/**
 * HttpVeoAuthenticator — the browser-free IVeoAuthenticator.
 *
 * "Login" here means: bind a token provider to the seeded `_session` cookie.
 * No browser, no email/password at runtime — the cookie is the credential.
 * The returned session carries the provider for the scraper to use.
 */

import {
  type FetchLike,
  type IVeoAccessTokenProvider,
  type IVeoAuthenticator,
  type VeoCredentials,
  type VeoSession,
} from '../interfaces';

import { CachingVeoTokenProvider } from './CachingVeoTokenProvider';
import { HttpVeoTokenMinter } from './HttpVeoTokenMinter';

/** Provider that can also be invalidated (for the scraper's 401 retry). */
export type InvalidatableTokenProvider = IVeoAccessTokenProvider & { invalidate?: () => void };

export interface HttpVeoAuthenticatorDeps {
  /** Build a token provider for a seeded cookie (injectable for tests). */
  createTokenProvider?: (sessionCookie: string) => InvalidatableTokenProvider;
}

function defaultCreateTokenProvider(sessionCookie: string): InvalidatableTokenProvider {
  const fetch = globalThis.fetch as unknown as FetchLike;
  return new CachingVeoTokenProvider({
    minter: new HttpVeoTokenMinter({ fetch }),
    sessionCookie,
  });
}

export class HttpVeoAuthenticator implements IVeoAuthenticator {
  private readonly createTokenProvider: (sessionCookie: string) => InvalidatableTokenProvider;

  constructor(deps: HttpVeoAuthenticatorDeps = {}) {
    this.createTokenProvider = deps.createTokenProvider ?? defaultCreateTokenProvider;
  }

  async login(credentials: VeoCredentials): Promise<VeoSession> {
    const cookie = credentials.sessionCookie?.trim();
    if (!cookie) {
      throw new Error(
        'HttpVeoAuthenticator requires a seeded session cookie (VeoIntegration.veoSessionCookie). Reconnect Veo to seed one.'
      );
    }
    const provider = this.createTokenProvider(cookie);
    return { context: { provider } };
  }

  async logout(_session: VeoSession): Promise<void> {
    // Nothing to close — the HTTP client holds no browser/socket.
  }
}
