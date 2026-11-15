/**
 * HttpVeoSessionSeeder — email + password → the durable `_session` cookie, over
 * plain HTTP (no browser).
 *
 *   GET  /oidc/auth?…PKCE…              --303--> /interaction/<uid>   (+ _interaction cookies)
 *   POST /interaction/<uid>/login        --303--> /oidc/auth/<uid>     (form: clientId, username, password)
 *   GET  /oidc/auth/<uid>                --303--> app …?code=…         (+ _session cookies)
 *
 * The password is sent once to Veo and is never stored, logged or put in an error.
 */

import { BadRequestError } from '../../../../lib/errors';
import type { FetchLike, HttpResponse } from '../../interfaces';

import type { IVeoSessionSeeder, VeoLoginCredentials, VeoOidcConfig } from './types';
import { pickSessionCookieHeader } from './veo-cookie';
import { DEFAULT_VEO_OIDC, buildAuthorizeUrl, generatePkce } from './veo-oidc';

const MAX_REDIRECTS = 6;

export interface HttpVeoSessionSeederDeps {
  fetch: FetchLike;
  config?: VeoOidcConfig;
  /** State generator (injectable for determinism in tests). */
  makeState?: () => string;
}

interface JarCookie {
  name: string;
  value: string;
  path: string;
}

/** Split a combined Set-Cookie header on the commas that start a new cookie (not the one in Expires). */
function splitCombinedSetCookie(header: string): string[] {
  return header.split(/,(?=\s*[^;,=\s]+=)/).map((part) => part.trim());
}

function readSetCookies(headers: HttpResponse['headers']): string[] {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const combined = headers.get('set-cookie');
  return combined ? splitCombinedSetCookie(combined) : [];
}

/** Just enough of a cookie jar for one login: name, value and path scoping. */
class CookieJar {
  private readonly cookies = new Map<string, JarCookie>();

  store(headers: HttpResponse['headers']): void {
    for (const line of readSetCookies(headers)) {
      const [pair, ...attributes] = line.split(';').map((part) => part.trim());
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const pathAttr = attributes.find((attr) => attr.toLowerCase().startsWith('path='));
      const path = pathAttr ? pathAttr.slice('path='.length) || '/' : '/';
      this.cookies.set(pair.slice(0, eq), { name: pair.slice(0, eq), value: pair.slice(eq + 1), path });
    }
  }

  headerFor(url: string): string {
    const { pathname } = new URL(url);
    return [...this.cookies.values()]
      .filter((cookie) => pathname.startsWith(cookie.path))
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  all(): JarCookie[] {
    return [...this.cookies.values()];
  }
}

export class HttpVeoSessionSeeder implements IVeoSessionSeeder {
  private readonly fetch: FetchLike;
  private readonly cfg: VeoOidcConfig;
  private readonly makeState: () => string;
  private readonly authOrigin: string;

  constructor(deps: HttpVeoSessionSeederDeps) {
    this.fetch = deps.fetch;
    this.cfg = deps.config ?? DEFAULT_VEO_OIDC;
    this.makeState = deps.makeState ?? (() => `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`);
    this.authOrigin = new URL(this.cfg.authorizeUrl).origin;
  }

  async seed(credentials: VeoLoginCredentials): Promise<string> {
    const jar = new CookieJar();

    // 1. Ask to sign in with no session: Veo answers with a login interaction.
    const { challenge } = generatePkce();
    const authorizeUrl = buildAuthorizeUrl(this.cfg, { challenge, state: this.makeState() });
    const started = await this.request(jar, authorizeUrl, { method: 'GET' });
    const uid = this.locationOf(started)?.pathname.match(/^\/interaction\/([^/]+)/)?.[1];
    if (!uid) {
      throw new Error(`Veo did not start a login (HTTP ${started.status})`);
    }

    // 2. Submit the login form.
    let response = await this.request(jar, `${this.authOrigin}/interaction/${uid}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        clientId: this.cfg.clientId,
        username: credentials.email,
        password: credentials.password,
      }).toString(),
    });

    // 3. Follow Veo's own redirects until it hands the browser back to the app.
    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      const next = this.locationOf(response);
      if (!next) break;
      if (next.searchParams.has('errorMessage')) {
        throw new BadRequestError('Veo did not accept that email or password');
      }
      if (next.origin !== this.authOrigin) break; // back to the app with ?code=… — login is complete
      response = await this.request(jar, next.toString(), { method: 'GET' });
    }

    const sessionCookie = pickSessionCookieHeader(jar.all());
    if (!sessionCookie) {
      throw new Error('Veo login finished but no session was issued');
    }
    return sessionCookie;
  }

  private async request(
    jar: CookieJar,
    url: string,
    init: { method: string; headers?: Record<string, string>; body?: string }
  ): Promise<HttpResponse> {
    const cookie = jar.headerFor(url);
    const response = await this.fetch(url, {
      ...init,
      headers: { ...init.headers, ...(cookie ? { Cookie: cookie } : {}) },
      redirect: 'manual',
    });
    jar.store(response.headers);
    return response;
  }

  private locationOf(response: HttpResponse): URL | null {
    const location = response.headers.get('location');
    if (!location) return null;
    try {
      return new URL(location, this.authOrigin);
    } catch {
      return null;
    }
  }
}
