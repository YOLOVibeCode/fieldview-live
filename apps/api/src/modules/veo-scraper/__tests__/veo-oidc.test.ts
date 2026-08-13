import { createHash } from 'crypto';
import { describe, it, expect } from 'vitest';

import {
  DEFAULT_VEO_OIDC,
  generatePkce,
  buildAuthorizeUrl,
  extractCodeFromLocation,
  extractClubSlug,
} from '../implementations/veo-oidc';

const b64url = (b: Buffer) =>
  b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('generatePkce', () => {
  it('produces a url-safe verifier of RFC-legal length', () => {
    const { verifier } = generatePkce();
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it('challenge is BASE64URL(SHA256(verifier)) — S256', () => {
    const { verifier, challenge } = generatePkce();
    expect(challenge).toBe(b64url(createHash('sha256').update(verifier).digest()));
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(challenge).not.toContain('=');
  });

  it('is random per call', () => {
    expect(generatePkce().verifier).not.toBe(generatePkce().verifier);
  });
});

describe('buildAuthorizeUrl', () => {
  it('encodes all required OIDC + PKCE params', () => {
    const url = new URL(
      buildAuthorizeUrl(DEFAULT_VEO_OIDC, { challenge: 'CHAL', state: 'st8' })
    );
    expect(url.origin + url.pathname).toBe(DEFAULT_VEO_OIDC.authorizeUrl);
    const p = url.searchParams;
    expect(p.get('client_id')).toBe(DEFAULT_VEO_OIDC.clientId);
    expect(p.get('redirect_uri')).toBe(DEFAULT_VEO_OIDC.redirectUri);
    expect(p.get('response_type')).toBe('code');
    expect(p.get('scope')).toBe(DEFAULT_VEO_OIDC.scope);
    expect(p.get('code_challenge')).toBe('CHAL');
    expect(p.get('code_challenge_method')).toBe('S256');
    expect(p.get('state')).toBe('st8');
  });
});

describe('extractCodeFromLocation', () => {
  it('reads the code from an absolute redirect', () => {
    expect(
      extractCodeFromLocation('https://app.veo.co/signin-redirect/?code=ABC123&state=x')
    ).toBe('ABC123');
  });
  it('reads the code from a relative redirect', () => {
    expect(extractCodeFromLocation('/signin-redirect/?state=x&code=Z9')).toBe('Z9');
  });
  it('returns null when there is no code (e.g. an error redirect)', () => {
    expect(extractCodeFromLocation('/error.html?errorMessage=bad')).toBeNull();
    expect(extractCodeFromLocation('')).toBeNull();
    expect(extractCodeFromLocation(null)).toBeNull();
  });
});

describe('extractClubSlug', () => {
  it('pulls the club slug from a diagnostics URL', () => {
    expect(
      extractClubSlug('https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics')
    ).toBe('noctusoft-inc');
  });
  it('pulls the club slug from a bare live URL', () => {
    expect(extractClubSlug('https://app.veo.co/clubs/club-america-tarrant-county/live')).toBe(
      'club-america-tarrant-county'
    );
  });
  it('returns null when there is no club segment', () => {
    expect(extractClubSlug('https://app.veo.co/recordings')).toBeNull();
  });
});
