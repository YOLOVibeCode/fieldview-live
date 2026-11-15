/**
 * VeoCookieSeeder — the ONE-TIME browser step that mints the durable credential.
 *
 * Logs in with a browser, extracts the `auth.veo.co` `_session` cookie header,
 * and returns it to be stored encrypted on the owner's CameraSource. After this
 * the runtime is pure HTTP (see VeoLiveStreamLister / HttpVeoTokenMinter).
 * Runs off the hot path, so Chromium is never needed on the server.
 */

import type { IVeoBrowserLogin, IVeoSessionSeeder, VeoLoginCredentials } from '../types';
import { pickSessionCookieHeader, type CookiePair } from '../veo-cookie';

interface CookieReadableContext {
  cookies(url: string): Promise<CookiePair[]>;
}

export class VeoCookieSeeder implements IVeoSessionSeeder {
  constructor(private readonly authenticator: IVeoBrowserLogin) {}

  async seed(credentials: VeoLoginCredentials): Promise<string> {
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
