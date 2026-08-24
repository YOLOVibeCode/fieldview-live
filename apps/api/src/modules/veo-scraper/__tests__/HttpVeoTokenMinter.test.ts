import { describe, it, expect, vi } from 'vitest';

import { HttpVeoTokenMinter } from '../implementations/HttpVeoTokenMinter';
import { DEFAULT_VEO_OIDC } from '../implementations/veo-oidc';
import { VeoSessionExpiredError, type FetchLike, type HttpResponse } from '../interfaces';

const COOKIE = '_session=abc; _session.sig=def';

function resp(partial: Partial<HttpResponse> & { location?: string }): HttpResponse {
  return {
    status: partial.status ?? 200,
    headers: { get: (n: string) => (n.toLowerCase() === 'location' ? partial.location ?? null : null) },
    json: partial.json ?? (async () => ({})),
    text: partial.text ?? (async () => ''),
  };
}

/** Fake fetch: 303+code on authorize, access_token on token. Records calls. */
function happyFetch(overrides?: { location?: string; token?: any }) {
  const calls: Array<{ url: string; init?: any }> = [];
  const fetch: FetchLike = vi.fn(async (url: string, init?: any) => {
    calls.push({ url, init });
    if (url.startsWith(DEFAULT_VEO_OIDC.authorizeUrl)) {
      return resp({ status: 303, location: overrides?.location ?? '/signin-redirect/?code=CODE123&state=st' });
    }
    if (url === DEFAULT_VEO_OIDC.tokenUrl) {
      return resp({ status: 200, json: async () => overrides?.token ?? { access_token: 'AT-xyz', expires_in: 3600, token_type: 'Bearer' } });
    }
    throw new Error(`unexpected url ${url}`);
  });
  return { fetch, calls };
}

describe('HttpVeoTokenMinter', () => {
  it('mints an access token: authorize (with cookie+PKCE) → code → token exchange', async () => {
    const { fetch, calls } = happyFetch();
    const minter = new HttpVeoTokenMinter({ fetch });

    const token = await minter.mint(COOKIE);
    expect(token).toEqual({ accessToken: 'AT-xyz', expiresInSec: 3600 });

    // authorize: GET with the session cookie + manual redirect + a PKCE challenge
    const authCall = calls.find((c) => c.url.startsWith(DEFAULT_VEO_OIDC.authorizeUrl))!;
    expect(authCall.init.headers.Cookie).toBe(COOKIE);
    expect(authCall.init.redirect).toBe('manual');
    const challenge = new URL(authCall.url).searchParams.get('code_challenge');
    expect(challenge).toBeTruthy();

    // token: POST form with the code + a matching code_verifier + no client secret
    const tokenCall = calls.find((c) => c.url === DEFAULT_VEO_OIDC.tokenUrl)!;
    expect(tokenCall.init.method).toBe('POST');
    const body = new URLSearchParams(tokenCall.init.body);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('CODE123');
    expect(body.get('client_id')).toBe(DEFAULT_VEO_OIDC.clientId);
    expect(body.get('code_verifier')).toBeTruthy();
    expect(body.get('client_secret')).toBeNull(); // public client
  });

  it('binds verifier↔challenge (S256): the sent verifier hashes to the sent challenge', async () => {
    const { fetch, calls } = happyFetch();
    await new HttpVeoTokenMinter({ fetch }).mint(COOKIE);
    const challenge = new URL(calls.find((c) => c.url.startsWith(DEFAULT_VEO_OIDC.authorizeUrl))!.url).searchParams.get('code_challenge')!;
    const verifier = new URLSearchParams(calls.find((c) => c.url === DEFAULT_VEO_OIDC.tokenUrl)!.init.body).get('code_verifier')!;
    const { createHash } = await import('crypto');
    const expected = createHash('sha256').update(verifier).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(challenge).toBe(expected);
  });

  it('throws VeoSessionExpiredError when authorize yields no code (cookie dead)', async () => {
    const fetch: FetchLike = async (url) =>
      url.startsWith(DEFAULT_VEO_OIDC.authorizeUrl)
        ? resp({ status: 303, location: '/error.html?errorMessage=login_required' })
        : resp({ status: 200 });
    await expect(new HttpVeoTokenMinter({ fetch }).mint(COOKIE)).rejects.toBeInstanceOf(VeoSessionExpiredError);
  });

  it('throws when the token exchange returns no access_token', async () => {
    const { fetch } = happyFetch({ token: { error: 'invalid_grant' } });
    await expect(new HttpVeoTokenMinter({ fetch }).mint(COOKIE)).rejects.toThrow(/invalid_grant|token/i);
  });
});
