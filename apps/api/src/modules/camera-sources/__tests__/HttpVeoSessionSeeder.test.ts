import { describe, it, expect, vi } from 'vitest';

import { BadRequestError } from '../../../lib/errors';
import type { FetchLike, HttpResponse } from '../interfaces';
import { HttpVeoSessionSeeder } from '../providers/veo/HttpVeoSessionSeeder';

const AUTH = 'https://auth.veo.co';
const UID = 'uid123';
const CREDS = { email: 'coach@example.com', password: 'p$ss word&=1' };

interface Call {
  url: string;
  method: string;
  cookie: string;
  body: string;
  redirect?: string;
}

function resp(opts: { status?: number; location?: string; setCookie?: string[] } = {}): HttpResponse {
  return {
    status: opts.status ?? 200,
    headers: {
      get: (n: string) => (n.toLowerCase() === 'location' ? opts.location ?? null : null),
      getSetCookie: () => opts.setCookie ?? [],
    },
    json: async () => ({}),
    text: async () => '',
  };
}

/** Scripted auth.veo.co: authorize → interaction, login → resume, resume → app with a code. */
function veo(overrides: Partial<Record<'authorize' | 'login' | 'resume', HttpResponse>> = {}) {
  const calls: Call[] = [];
  const fetch: FetchLike = vi.fn(async (url, init) => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      cookie: init?.headers?.Cookie ?? '',
      body: init?.body ?? '',
      redirect: init?.redirect,
    });
    if (url.startsWith(`${AUTH}/oidc/auth?`)) {
      return (
        overrides.authorize ??
        resp({
          status: 303,
          location: `/interaction/${UID}`,
          setCookie: [
            `_interaction=I1; path=/interaction/${UID}; secure; httponly`,
            `_interaction.sig=I2; path=/interaction/${UID}; secure; httponly`,
            `_interaction_resume=R1; path=/oidc/auth/${UID}; expires=Sun, 15 Nov 2026 20:10:23 GMT; httponly`,
          ],
        })
      );
    }
    if (url === `${AUTH}/interaction/${UID}/login`) {
      return overrides.login ?? resp({ status: 303, location: `${AUTH}/oidc/auth/${UID}` });
    }
    if (url === `${AUTH}/oidc/auth/${UID}`) {
      return (
        overrides.resume ??
        resp({
          status: 303,
          location: 'https://app.veo.co/signin-redirect/?code=CODE&state=s',
          setCookie: [
            '_session=S1; path=/; expires=Sun, 29 Nov 2026 20:10:23 GMT; httponly',
            '_session.sig=S2; path=/; httponly',
            '_session.legacy=S3; path=/; httponly',
          ],
        })
      );
    }
    throw new Error(`unexpected request ${init?.method ?? 'GET'} ${url}`);
  });
  return { fetch, calls };
}

describe('HttpVeoSessionSeeder', () => {
  it('logs in over plain HTTP and returns the durable _session cookie header', async () => {
    const { fetch, calls } = veo();

    const cookie = await new HttpVeoSessionSeeder({ fetch }).seed(CREDS);

    expect(cookie).toBe('_session=S1; _session.sig=S2; _session.legacy=S3');
    expect(calls.map((c) => `${c.method} ${c.url.split('?')[0]}`)).toEqual([
      `GET ${AUTH}/oidc/auth`,
      `POST ${AUTH}/interaction/${UID}/login`,
      `GET ${AUTH}/oidc/auth/${UID}`,
    ]);
    expect(calls.every((c) => c.redirect === 'manual')).toBe(true);
  });

  it('starts a PKCE code flow for Veo’s public client', async () => {
    const { fetch, calls } = veo();

    await new HttpVeoSessionSeeder({ fetch }).seed(CREDS);

    const authorize = new URL(calls[0].url);
    expect(authorize.searchParams.get('client_id')).toBe('IzRQtXQ07V7n8uBtpTHzi');
    expect(authorize.searchParams.get('response_type')).toBe('code');
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorize.searchParams.get('code_challenge')).toBeTruthy();
  });

  it('posts the credentials as a form, exactly as typed', async () => {
    const { fetch, calls } = veo();

    await new HttpVeoSessionSeeder({ fetch }).seed(CREDS);

    const form = new URLSearchParams(calls[1].body);
    expect(form.get('username')).toBe('coach@example.com');
    expect(form.get('password')).toBe('p$ss word&=1');
    expect(form.get('clientId')).toBe('IzRQtXQ07V7n8uBtpTHzi');
  });

  it('sends each cookie only to the path it was set for', async () => {
    const { fetch, calls } = veo();

    await new HttpVeoSessionSeeder({ fetch }).seed(CREDS);

    expect(calls[0].cookie).toBe('');
    expect(calls[1].cookie).toBe('_interaction=I1; _interaction.sig=I2');
    expect(calls[2].cookie).toBe('_interaction_resume=R1');
  });

  it('rejects wrong credentials without echoing the password', async () => {
    const { fetch } = veo({
      login: resp({ status: 302, location: `/login.html?uid=${UID}&errorMessage=%7B%22default%22%3A%22Invalid%22%7D` }),
    });

    const attempt = new HttpVeoSessionSeeder({ fetch }).seed(CREDS);

    await expect(attempt).rejects.toBeInstanceOf(BadRequestError);
    await expect(attempt).rejects.toThrow(/email or password/i);
    await attempt.catch((err: Error & { details?: unknown }) => {
      expect(JSON.stringify([err.message, err.details ?? null])).not.toContain('p$ss');
    });
  });

  it('fails clearly when Veo does not start a login interaction', async () => {
    const { fetch } = veo({ authorize: resp({ status: 200 }) });

    await expect(new HttpVeoSessionSeeder({ fetch }).seed(CREDS)).rejects.toThrow(/did not start a login/i);
  });

  it('fails clearly when the login completes but no session cookie was issued', async () => {
    const { fetch } = veo({
      resume: resp({ status: 303, location: 'https://app.veo.co/signin-redirect/?code=CODE&state=s' }),
    });

    await expect(new HttpVeoSessionSeeder({ fetch }).seed(CREDS)).rejects.toThrow(/no session/i);
  });

  it('stops instead of looping when Veo keeps redirecting', async () => {
    const { fetch, calls } = veo({ resume: resp({ status: 303, location: `${AUTH}/oidc/auth/${UID}` }) });

    await expect(new HttpVeoSessionSeeder({ fetch }).seed(CREDS)).rejects.toThrow();
    expect(calls.length).toBeLessThan(12);
  });

  it('reads cookies from a combined Set-Cookie header when getSetCookie is unavailable', async () => {
    const combined = (cookies: string[]): HttpResponse['headers'] => ({
      get: (n: string) => (n.toLowerCase() === 'set-cookie' ? cookies.join(', ') : null),
    });
    const { fetch } = veo({
      resume: {
        status: 303,
        headers: {
          get: (n: string) =>
            n.toLowerCase() === 'location'
              ? 'https://app.veo.co/signin-redirect/?code=CODE'
              : combined([
                  '_session=S1; path=/; expires=Sun, 29 Nov 2026 20:10:23 GMT; httponly',
                  '_session.sig=S2; path=/; httponly',
                ]).get(n),
        },
        json: async () => ({}),
        text: async () => '',
      },
    });

    expect(await new HttpVeoSessionSeeder({ fetch }).seed(CREDS)).toBe('_session=S1; _session.sig=S2');
  });
});
