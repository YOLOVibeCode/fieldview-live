import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import bcrypt from 'bcryptjs';
import { createDirectRouter } from '../direct';
import { prisma } from '../../lib/prisma';
import { errorHandler } from '../../middleware/errorHandler';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    directStreamEvent: { findUnique: vi.fn() },
    ownerAccount: { findFirst: vi.fn(), findUnique: vi.fn() },
    game: { findFirst: vi.fn(), create: vi.fn() },
    viewerIdentity: { upsert: vi.fn(), findUnique: vi.fn() },
    entitlement: { findFirst: vi.fn() },
  },
}));

const PARENT_SLUG = 'test-parent';
const EVENT_SLUG = 'test-event';
const ADMIN_PASSWORD = 'admin2026';
const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 4);

function parentStream() {
  return {
    id: 'ds-parent-1',
    slug: PARENT_SLUG,
    status: 'active',
    gameId: 'game-1',
    ownerAccountId: 'owner-1',
    adminPassword: hashed,
    title: 'Test Parent Stream',
    paywallEnabled: false,
    priceInCents: 0,
    paywallMessage: null,
    allowSavePayment: false,
    streamUrl: null,
    chatEnabled: true,
    scoreboardEnabled: true,
    scoreboardHomeTeam: 'Twin Cities',
    scoreboardAwayTeam: 'Rivals',
    scoreboardHomeColor: '#003366',
    scoreboardAwayColor: '#CC0000',
    welcomeMessage: null,
    scheduledStartAt: null,
    sendReminders: false,
    reminderMinutes: null,
    allowViewerScoreEdit: false,
    allowViewerNameEdit: false,
    allowViewerReporting: false,
    eventConfirmThreshold: null,
    sport: 'soccer',
    allowAnonymousChat: false,
    allowAnonymousScoreEdit: false,
    game: { streamSource: null, state: 'live' },
  };
}

function eventRecord() {
  return {
    id: 'evt-1',
    eventSlug: EVENT_SLUG,
    title: 'Test Event',
    chatEnabled: true,
    scoreboardEnabled: true,
    streamUrl: null,
    scheduledStartAt: null,
  };
}

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', createDirectRouter());
  a.use(errorHandler);
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const dsCreate = prisma.directStream.create as unknown as ReturnType<typeof vi.fn>;
const evFindUnique = prisma.directStreamEvent.findUnique as unknown as ReturnType<typeof vi.fn>;
const ownerFindUnique = prisma.ownerAccount.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-jwt-secret-hier';
  ownerFindUnique.mockResolvedValue({
    relayRecipientKey: null,
    agreementAcceptedVersion: null,
    squareLocationId: null,
    squareAccessTokenEncrypted: null,
    squareTokenExpiresAt: null,
  });
});

describe('hierarchical DirectStream routes', () => {
  it('GET parent/event/bootstrap 404s and does not create a slash slug', async () => {
    dsFindUnique.mockResolvedValue(null);

    const res = await request(app()).get(
      `/api/direct/${PARENT_SLUG}/${EVENT_SLUG}/bootstrap`
    );

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
    expect(dsCreate).not.toHaveBeenCalled();
  });

  it('GET parent/event/bootstrap 404s when the event is missing', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue(null);

    const res = await request(app()).get(
      `/api/direct/${PARENT_SLUG}/${EVENT_SLUG}/bootstrap`
    );

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Stream event not found');
    expect(dsCreate).not.toHaveBeenCalled();
  });

  it('GET parent/event/bootstrap returns 200 when parent and event exist', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue(eventRecord());

    const res = await request(app()).get(
      `/api/direct/${PARENT_SLUG}/${EVENT_SLUG}/bootstrap`
    );

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(`${PARENT_SLUG}/${EVENT_SLUG}`);
    expect(res.body.parentSlug).toBe(PARENT_SLUG);
    expect(res.body.title).toBe('Test Event');
    expect(res.body.scoreboardHomeTeam).toBe('Twin Cities');
    expect(res.body.scoreboardAwayTeam).toBe('Rivals');
  });

  it('GET parent%2Fevent/bootstrap returns 200 for encoded hierarchical slug', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue(eventRecord());

    const encodedSlug = `${PARENT_SLUG}%2F${EVENT_SLUG}`;
    const res = await request(app()).get(`/api/direct/${encodedSlug}/bootstrap`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(`${PARENT_SLUG}/${EVENT_SLUG}`);
    expect(res.body.parentSlug).toBe(PARENT_SLUG);
  });

  it('POST parent/event/unlock-admin 404s when the event is missing', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue(null);

    const res = await request(app())
      .post(`/api/direct/${PARENT_SLUG}/${EVENT_SLUG}/unlock-admin`)
      .send({ password: ADMIN_PASSWORD });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Stream event not found');
  });

  it('POST parent/event/unlock-admin returns a token when the event exists', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue(eventRecord());
    (prisma.viewerIdentity.upsert as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'v1',
    });

    const res = await request(app())
      .post(`/api/direct/${PARENT_SLUG}/${EVENT_SLUG}/unlock-admin`)
      .send({ password: ADMIN_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
