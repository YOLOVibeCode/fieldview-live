/**
 * VeoCookieSeeder — the ONE-TIME browser step that mints the durable credential.
 *
 * Logs in via the (browser) authenticator, extracts the `auth.veo.co` `_session`
 * cookie header, and returns it to be stored encrypted on VeoIntegration. After
 * this, the runtime is pure HTTP (see HttpVeoAuthenticator / HttpVeoTokenMinter).
 * Runs off the hot path — locally or in a dedicated seeding step, so Chromium
 * never needs to be in the production request path.
 */

import type { IVeoAuthenticator, VeoCredentials } from '../interfaces';

import { pickSessionCookieHeader, type CookiePair } from './veo-cookie';

interface CookieReadableContext {
  cookies(url: string): Promise<CookiePair[]>;
}

export class VeoCookieSeeder {
  constructor(private readonly authenticator: IVeoAuthenticator) {}

  async seed(credentials: VeoCredentials): Promise<string> {
    const session = await this.authenticator.login(credentials);
    try {
      const ctx = session.context as CookieReadableContext;
      const cookies = await ctx.cookies('https://auth.veo.co');
      const header = pickSessionCookieHeader(cookies);
      if (!header) {
        throw new Error('VeoCookieSeeder: no _session cookie captured after login');
      }
      return header;
    } finally {
      await this.authenticator.logout(session);
    }
  }
}
