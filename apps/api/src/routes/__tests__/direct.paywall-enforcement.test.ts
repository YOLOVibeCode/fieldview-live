/**
 * Paywall enforcement regression tests.
 *
 * Proves the server NEVER hands the playable streamUrl / muxPlaybackId to a
 * caller without proof of payment. Proof is the entitlement token (sent as the
 * x-fieldview-access header) or the stream admin's JWT. An email or viewerId in
 * the query string proves nothing and must never unlock a stream.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createDirectRouter } from '../direct';
import { prisma } from '../../lib/prisma';
import { setEmailProvider } from '../../lib/email/index';
import { generateAdminJwt } from '../../lib/admin-jwt';

vi.mock('../../lib/prisma', () => ({
    prisma: {
    directStream: { findUnique: vi.fn() },
    directStreamEvent: { findUnique: vi.fn() },
    viewerIdentity: { findUnique: vi.fn() },
    entitlement: { findFirst: vi.fn(), findUnique: vi.fn() },
    ownerAccount: { findUnique: vi.fn() },
  },
}));

const MUX_URL = 'https://stream.mux.com/abc123playbackid.m3u8';
const EVENT_URL = 'https://cdn.example.com/event-1.m3u8';

function paywalledStream(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ds-paid',
    slug: 'paid-stream',
    status: 'active',
    gameId: 'game-1',
    ownerAccountId: 'owner-1',
    paywallEnabled: true,
    priceInCents: 4999,
    streamUrl: MUX_URL,
    chatEnabled: true,
    title: 'Paid Stream',
    game: {
      streamSource: { type: 'mux_managed', muxPlaybackId: 'abc123playbackid', protectionLevel: 'moderate' },
    },
    ...overrides,
  };
}

function validEntitlement(over: Record<string, unknown> = {}) {
  return {
    status: 'active',
    validTo: new Date('2999-01-01'),
    purchase: { directStreamId: 'ds-paid' },
    ...over,
  };
}

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', createDirectRouter());
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const eventFindUnique = prisma.directStreamEvent.findUnique as unknown as ReturnType<typeof vi.fn>;
const viewerFindUnique = prisma.viewerIdentity.findUnique as unknown as ReturnType<typeof vi.fn>;
const entFindFirst = prisma.entitlement.findFirst as unknown as ReturnType<typeof vi.fn>;
const entFindUnique = prisma.entitlement.findUnique as unknown as ReturnType<typeof vi.fn>;
const ownerFindUnique = prisma.ownerAccount.findUnique as unknown as ReturnType<typeof vi.fn>;
const sendEmail = vi.fn();

const unreadyOwner = {
  marketplaceSellerKey: null,
  paymentsConnectedAt: null,
};

const storeReadyOwner = {
  marketplaceSellerKey: 'owner-1',
  paymentsConnectedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  ownerFindUnique.mockResolvedValue(unreadyOwner);
  entFindUnique.mockResolvedValue(null);
  sendEmail.mockResolvedValue(undefined);
  setEmailProvider({ sendEmail });
});

describe('GET /api/direct/:slug/bootstrap — paywall URL gating', () => {
  it('withholds streamUrl AND muxPlaybackId from an anonymous caller on a paywalled stream', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap');

    expect(res.status).toBe(200);
    expect(res.body.paywallEnabled).toBe(true);
    expect(res.body.streamLocked).toBe(true);
    expect(res.body.streamUrl).toBeNull();
    expect(res.body.muxPlaybackId).toBeNull();
  });

  it('returns the streamUrl for a FREE (non-paywalled) stream', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream({ paywallEnabled: false }));

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap');

    expect(res.status).toBe(200);
    expect(res.body.streamLocked).toBe(false);
    expect(res.body.streamUrl).toBe(MUX_URL);
  });

  it('returns the streamUrl for a valid access token', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    entFindUnique.mockResolvedValue(validEntitlement());

    const res = await request(app())
      .get('/api/direct/paid-stream/bootstrap')
      .set('x-fieldview-access', 'tok-1');

    expect(res.status).toBe(200);
    expect(res.body.streamLocked).toBe(false);
    expect(res.body.streamUrl).toBe(MUX_URL);
    expect(res.body.muxPlaybackId).toBe('abc123playbackid');
  });

  it('returns the streamUrl for the stream admin', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    const adminJwt = generateAdminJwt({ slug: 'paid-stream', role: 'admin' });

    const res = await request(app())
      .get('/api/direct/paid-stream/bootstrap')
      .set('Authorization', `Bearer ${adminJwt}`);

    expect(res.status).toBe(200);
    expect(res.body.streamLocked).toBe(false);
    expect(res.body.streamUrl).toBe(MUX_URL);
  });

  it('does NOT unlock for an email or viewerId in the query string, even one that paid', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    viewerFindUnique.mockResolvedValue({ id: 'viewer-1' });
    entFindFirst.mockResolvedValue({ id: 'ent-1' });

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap?viewerId=viewer-1&email=paid@example.com');

    expect(res.status).toBe(200);
    expect(res.body.streamLocked).toBe(true);
    expect(res.body.streamUrl).toBeNull();
    expect(res.body.muxPlaybackId).toBeNull();
  });

  it('withholds the streamUrl for a token bought for another stream', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    entFindUnique.mockResolvedValue(validEntitlement({ purchase: { directStreamId: 'ds-other' } }));

    const res = await request(app())
      .get('/api/direct/paid-stream/bootstrap')
      .set('x-fieldview-access', 'tok-other');

    expect(res.body.streamLocked).toBe(true);
    expect(res.body.streamUrl).toBeNull();
  });

  it('returns paymentsReady true when paywall is off', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream({ paywallEnabled: false }));

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap');

    expect(res.status).toBe(200);
    expect(res.body.paymentsReady).toBe(true);
  });

  it('returns paymentsReady false when paywall on and owner not connected', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    ownerFindUnique.mockResolvedValue(unreadyOwner);

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap');

    expect(res.status).toBe(200);
    expect(res.body.paymentsReady).toBe(false);
  });

  it('returns paymentsReady true when paywall on and owner is relay-ready', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    ownerFindUnique.mockResolvedValue(storeReadyOwner);

    const res = await request(app()).get('/api/direct/paid-stream/bootstrap');

    expect(res.status).toBe(200);
    expect(res.body.paymentsReady).toBe(true);
  });
});

describe('GET /api/direct/:slug/verify-access — gated URL delivery', () => {
  it('grants access AND returns the streamUrl for a valid access token', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    entFindUnique.mockResolvedValue(validEntitlement());

    const res = await request(app())
      .get('/api/direct/paid-stream/verify-access')
      .set('x-fieldview-access', 'tok-1');

    expect(res.status).toBe(200);
    expect(res.body.hasAccess).toBe(true);
    expect(res.body.streamUrl).toBe(MUX_URL);
    expect(res.body.muxPlaybackId).toBe('abc123playbackid');
  });

  it('denies an email lookup and never returns an entitlement token', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    viewerFindUnique.mockResolvedValue({ id: 'viewer-1', email: 'v@example.com' });
    entFindFirst.mockResolvedValue({ id: 'ent-1', tokenId: 'tok-secret', validFrom: new Date(), validTo: new Date('2999-01-01') });

    const res = await request(app()).get('/api/direct/paid-stream/verify-access?email=v@example.com');

    expect(res.status).toBe(200);
    expect(res.body.hasAccess).toBe(false);
    expect(res.body.streamUrl).toBeUndefined();
    expect(res.body.muxPlaybackId).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('tok-secret');
  });

  it('resolves an event slug to its parent and returns the event stream URL', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    eventFindUnique.mockResolvedValue({ id: 'ev-1', streamUrl: EVENT_URL });
    entFindUnique.mockResolvedValue(validEntitlement());

    const res = await request(app())
      .get('/api/direct/paid-stream/game-1/verify-access')
      .set('x-fieldview-access', 'tok-1');

    expect(res.status).toBe(200);
    expect(dsFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'paid-stream' } }));
    expect(res.body.hasAccess).toBe(true);
    expect(res.body.streamUrl).toBe(EVENT_URL);
  });
});

describe('GET /api/direct/:slug (legacy) — no paywall bypass', () => {
  it('refuses a paywalled stream without proof of payment', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());

    const res = await request(app()).get('/api/direct/paid-stream');

    expect(res.status).toBe(403);
    expect(res.body.streamUrl).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(MUX_URL);
  });

  it('returns the URL of a paywalled stream for a valid access token', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    entFindUnique.mockResolvedValue(validEntitlement());

    const res = await request(app()).get('/api/direct/paid-stream').set('x-fieldview-access', 'tok-1');

    expect(res.status).toBe(200);
    expect(res.body.streamUrl).toBe(MUX_URL);
  });

  it('still returns the URL of a free stream', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream({ paywallEnabled: false }));

    const res = await request(app()).get('/api/direct/paid-stream');

    expect(res.status).toBe(200);
    expect(res.body.streamUrl).toBe(MUX_URL);
  });
});

describe('POST /api/direct/:slug/access-link — email a buyer their watch link', () => {
  it('emails the watch link with the access token to a buyer', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    viewerFindUnique.mockResolvedValue({ id: 'viewer-1' });
    entFindFirst.mockResolvedValue({ tokenId: 'tok-1' });

    const res = await request(app())
      .post('/api/direct/paid-stream/access-link')
      .send({ email: 'Buyer@Example.com' });

    expect(res.status).toBe(202);
    expect(viewerFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'buyer@example.com' } }));
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [mail] = sendEmail.mock.calls[0] as [{ to: string; text: string }];
    expect(mail.to).toBe('buyer@example.com');
    expect(mail.text).toContain('/direct/paid-stream?access=tok-1');
    expect(JSON.stringify(res.body)).not.toContain('tok-1');
  });

  it('answers the same way and sends nothing when the email has not paid', async () => {
    dsFindUnique.mockResolvedValue(paywalledStream());
    viewerFindUnique.mockResolvedValue(null);

    const res = await request(app())
      .post('/api/direct/paid-stream/access-link')
      .send({ email: 'stranger@example.com' });

    expect(res.status).toBe(202);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const res = await request(app()).post('/api/direct/paid-stream/access-link').send({ email: 'nope' });
    expect(res.status).toBe(400);
  });
});
