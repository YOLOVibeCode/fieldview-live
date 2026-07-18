/**
 * Authenticate with Veo via Playwright: login at app.veo.co/accounts/login, return browser context.
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { IVeoAuthenticator, VeoCredentials, VeoSession } from '../interfaces';

const VEO_LOGIN_URL = 'https://app.veo.co/accounts/login/';

interface ContextWithBrowser extends BrowserContext {
  _veoBrowser?: Browser;
}

export class PlaywrightVeoAuthenticator implements IVeoAuthenticator {
  async login(credentials: VeoCredentials): Promise<VeoSession> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const context = (await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    })) as ContextWithBrowser;
    context._veoBrowser = browser;

    const page = await context.newPage();

    // Veo redirects app.veo.co/accounts/login → auth.veo.co (OIDC). The form is a
    // single-step email + password (name=username / name=password / "Login" button).
    await page.goto(VEO_LOGIN_URL, { waitUntil: 'networkidle' });

    const fillFirst = async (selectors: string[], value: string): Promise<void> => {
      for (const sel of selectors) {
        const loc = page.locator(sel).first();
        if (await loc.count()) {
          await loc.fill(value);
          return;
        }
      }
      throw new Error(`Veo login: no input matched ${selectors.join(', ')}`);
    };
    await fillFirst(['input[name="username"]', 'input#email', 'input[type="email"]'], credentials.email);
    await fillFirst(['input[name="password"]', 'input[type="password"]'], credentials.password);
    await page.getByRole('button', { name: /login|log in|sign in/i }).first().click();

    // Wait for the OIDC redirect chain (auth.veo.co → app.veo.co) to fully settle.
    await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});

    // Verify success HONESTLY. The old check (`!pathname.includes('/accounts/login')`)
    // was fooled by the auth.veo.co error redirect and treated rejected logins as success.
    const landedUrl = page.url();
    let errorMessage: string | null = null;
    try {
      errorMessage = new URL(landedUrl).searchParams.get('errorMessage');
    } catch {
      // not a parseable URL — ignore
    }
    const stillOnAuth = /auth\.veo\.co|\/accounts\/login|\/interaction\//.test(landedUrl);
    if (errorMessage || stillOnAuth) {
      let detail: string = errorMessage ?? 'still on the Veo login/auth page';
      try {
        if (errorMessage) detail = JSON.stringify(JSON.parse(decodeURIComponent(errorMessage)));
      } catch {
        // keep the raw errorMessage
      }
      throw new Error(`Veo login failed: ${detail}`);
    }

    return { context };
  }

  async logout(session: VeoSession): Promise<void> {
    const context = session.context as ContextWithBrowser;
    if (context?._veoBrowser) await context._veoBrowser.close();
    if (context?.close) await context.close();
  }
}
