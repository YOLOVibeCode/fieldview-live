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
    await page.goto(VEO_LOGIN_URL, { waitUntil: 'networkidle' });

    await page.getByLabel(/email|e-mail|username/i).fill(credentials.email);
    await page.getByLabel(/password/i).fill(credentials.password);

    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(
      (url) => !url.pathname.includes('/accounts/login'),
      { timeout: 15000 }
    );

    return { context };
  }

  async logout(session: VeoSession): Promise<void> {
    const context = session.context as ContextWithBrowser;
    if (context?._veoBrowser) await context._veoBrowser.close();
    if (context?.close) await context.close();
  }
}
