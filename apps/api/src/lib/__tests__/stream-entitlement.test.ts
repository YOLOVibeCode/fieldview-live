import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../prisma', () => ({
  prisma: {
    entitlement: { findUnique: vi.fn() },
  },
}));

import { generateAdminJwt } from '../admin-jwt';
import { prisma } from '../prisma';
import { checkStreamAccess, streamAccessCredentials } from '../stream-entitlement';

const entFindUnique = prisma.entitlement.findUnique as unknown as ReturnType<typeof vi.fn>;
const stream = { id: 'ds-1', slug: 'paid-stream' };

function entitlement(over: Record<string, unknown> = {}) {
  return {
    status: 'active',
    validTo: new Date(Date.now() + 60_000),
    purchase: { directStreamId: 'ds-1' },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkStreamAccess', () => {
  it('denies a caller with no credentials', async () => {
    await expect(checkStreamAccess(stream, {})).resolves.toEqual({ granted: false, reason: 'no_credentials' });
    expect(entFindUnique).not.toHaveBeenCalled();
  });

  it('grants a valid entitlement token for this stream', async () => {
    entFindUnique.mockResolvedValue(entitlement());
    await expect(checkStreamAccess(stream, { accessToken: 'tok-1' })).resolves.toEqual({
      granted: true,
      reason: 'valid_entitlement',
    });
    expect(entFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenId: 'tok-1' } }));
  });

  it('denies a token bought for a different stream', async () => {
    entFindUnique.mockResolvedValue(entitlement({ purchase: { directStreamId: 'ds-other' } }));
    await expect(checkStreamAccess(stream, { accessToken: 'tok-1' })).resolves.toEqual({
      granted: false,
      reason: 'invalid_token',
    });
  });

  it('denies an expired token', async () => {
    entFindUnique.mockResolvedValue(entitlement({ validTo: new Date(Date.now() - 1000) }));
    await expect(checkStreamAccess(stream, { accessToken: 'tok-1' })).resolves.toMatchObject({ granted: false });
  });

  it('denies a revoked token', async () => {
    entFindUnique.mockResolvedValue(entitlement({ status: 'revoked' }));
    await expect(checkStreamAccess(stream, { accessToken: 'tok-1' })).resolves.toMatchObject({ granted: false });
  });

  it('denies an unknown token', async () => {
    entFindUnique.mockResolvedValue(null);
    await expect(checkStreamAccess(stream, { accessToken: 'nope' })).resolves.toMatchObject({ granted: false });
  });

  it('grants the stream admin', async () => {
    const adminToken = generateAdminJwt({ slug: 'paid-stream', role: 'admin' });
    await expect(checkStreamAccess(stream, { adminToken })).resolves.toEqual({
      granted: true,
      reason: 'stream_admin',
    });
  });

  it('denies an admin token for another stream', async () => {
    const adminToken = generateAdminJwt({ slug: 'other-stream', role: 'admin' });
    await expect(checkStreamAccess(stream, { adminToken })).resolves.toMatchObject({ granted: false });
  });
});

describe('streamAccessCredentials', () => {
  it('reads the access token header and the bearer admin token', () => {
    const creds = streamAccessCredentials({
      headers: { 'x-fieldview-access': 'tok-1', authorization: 'Bearer jwt-1' },
    });
    expect(creds).toEqual({ accessToken: 'tok-1', adminToken: 'jwt-1' });
  });

  it('ignores email and viewerId in the query string', () => {
    const creds = streamAccessCredentials({ headers: {}, query: { email: 'a@b.c', viewerId: 'v1' } });
    expect(creds).toEqual({ accessToken: null, adminToken: null });
  });
});
