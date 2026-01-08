import { describe, it, expect } from 'vitest';
import { agent, type SuperTest } from 'supertest';
import app from '@/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

/**
 * Check if we have merchant OAuth credentials for payment tests.
 * Platform credentials cannot be used for owner payments in Marketplace Model A.
 */
function hasMerchantCredentials(): boolean {
  return Boolean(
    process.env.SQUARE_MERCHANT_ACCESS_TOKEN &&
    process.env.SQUARE_MERCHANT_LOCATION_ID
  );
}

/**
 * Sets up Square sandbox credentials for a test owner account.
 * Uses SQUARE_MERCHANT_* credentials (OAuth tokens from a sandbox merchant).
 */
async function setupSquareCredentials(ownerAccountId: string): Promise<void> {
  const accessToken = process.env.SQUARE_MERCHANT_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_MERCHANT_LOCATION_ID;

  if (!accessToken || !locationId) {
    throw new Error(
      'Payment tests require SQUARE_MERCHANT_ACCESS_TOKEN and SQUARE_MERCHANT_LOCATION_ID'
    );
  }

  await prisma.ownerAccount.update({
    where: { id: ownerAccountId },
    data: {
      squareAccessTokenEncrypted: encrypt(accessToken),
      squareRefreshTokenEncrypted: encrypt('test-refresh-token'),
      squareLocationId: locationId,
      payoutProviderRef: 'SANDBOX_MERCHANT',
      squareTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

function itIf(condition: boolean) {
  return condition ? it : it.skip;
}

function assertLiveTestEnv(): void {
  if (process.env.LIVE_TEST_MODE !== '1') {
    throw new Error(
      'LIVE tests require LIVE_TEST_MODE=1 and a dedicated DATABASE_URL/REDIS_URL. Refusing to run.'
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('LIVE tests require DATABASE_URL to be set (use a dedicated test database).');
  }

  // Safety: prevent accidental production runs.
  // Check DB name (not the password/user) so we don't false-positive on strings like "change_in_production".
  const parsed = new URL(process.env.DATABASE_URL);
  const dbName = parsed.pathname.replace(/^\//, '').toLowerCase();
  if (!dbName.includes('test') && !dbName.includes('dev')) {
    throw new Error(
      `Refusing to run LIVE tests unless DATABASE_URL points to a test/dev database (got db="${dbName}").`
    );
  }
}

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}@fieldview.live`;
}

describe('LIVE: public flow (no mocks, real DB)', () => {
  it('creates owner + game, exposes public game view, and creates checkout', async () => {
    assertLiveTestEnv();

    const request: SuperTest<typeof app> = agent(app);

    const email = uniqueEmail('owner');
    const password = 'password12345';
    const viewerEmail = uniqueEmail('viewer');

    // Register owner (real DB)
    const registerResp = await request
      .post('/api/owners/register')
      .send({
        email,
        password,
        name: 'Live Test Owner',
        type: 'individual',
      })
      .expect(201);

    expect(registerResp.body.token?.token).toBeTruthy();
    const ownerToken: string = registerResp.body.token.token;

    // Create game
    const gameResp = await request
      .post('/api/owners/games')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Live Test Game',
        homeTeam: 'Home',
        awayTeam: 'Away',
        startsAt: new Date(Date.now() + 60_000).toISOString(),
        priceCents: 700,
        currency: 'USD',
      })
      .expect(201);

    const gameId: string = gameResp.body.id;
    expect(gameId).toBeTruthy();

    // Activate game (so it is publicly purchasable)
    await request
      .patch(`/api/owners/games/${gameId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ state: 'active' })
      .expect(200);

    // Public game view should be available
    const publicGameResp = await request.get(`/api/public/games/${gameId}`).expect(200);
    expect(publicGameResp.body.id).toBe(gameId);

    // Create checkout (creates ViewerIdentity + Purchase)
    const checkoutResp = await request
      .post(`/api/public/games/${gameId}/checkout`)
      .send({ viewerEmail })
      .expect(200);

    expect(checkoutResp.body.purchaseId).toBeTruthy();

    // Cleanup (best-effort)
    await prisma.entitlement.deleteMany({ where: { purchase: { gameId } } });
    await prisma.purchase.deleteMany({ where: { gameId } });
    await prisma.streamSource.deleteMany({ where: { gameId } });
    await prisma.game.deleteMany({ where: { id: gameId } });
    await prisma.viewerIdentity.deleteMany({ where: { email: viewerEmail } });
    await prisma.ownerUser.deleteMany({ where: { email } });
    await prisma.ownerAccount.deleteMany({ where: { contactEmail: email } });
  });

  // Requires merchant OAuth credentials - platform credentials cannot process payments for owners
  itIf(hasMerchantCredentials())('processes a sandbox Square payment and boots watch + telemetry flow', async () => {
    assertLiveTestEnv();

    const request: SuperTest<typeof app> = agent(app);

    const ownerEmail = uniqueEmail('owner');
    const viewerEmail = uniqueEmail('viewer');

    // Register owner
    const registerResp = await request
      .post('/api/owners/register')
      .send({
        email: ownerEmail,
        password: 'password12345',
        name: 'Live Test Owner',
        type: 'individual',
      })
      .expect(201);

    const ownerToken: string = registerResp.body.token.token;

    // Get owner account ID and setup Square credentials
    const meResp = await request
      .get('/api/owners/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const ownerAccountId: string = meResp.body.id;
    await setupSquareCredentials(ownerAccountId);

    // Create game (start in the past so state becomes live once active)
    const gameResp = await request
      .post('/api/owners/games')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Live Test Game (Payment)',
        homeTeam: 'Home',
        awayTeam: 'Away',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        priceCents: 700,
        currency: 'USD',
      })
      .expect(201);

    const gameId: string = gameResp.body.id;

    // Activate
    await request
      .patch(`/api/owners/games/${gameId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ state: 'active' })
      .expect(200);

    // Configure BYO HLS stream source (no external creds required)
    const hlsManifestUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    await request
      .post(`/api/owners/me/games/${gameId}/streams/byo-hls`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ manifestUrl: hlsManifestUrl })
      .expect(201);

    // Create checkout
    const checkoutResp = await request
      .post(`/api/public/games/${gameId}/checkout`)
      .send({ viewerEmail })
      .expect(200);

    const purchaseId: string = checkoutResp.body.purchaseId;
    expect(purchaseId).toBeTruthy();

    // Process payment using Square sandbox test nonce
    // NOTE: Square supports this standard sandbox nonce for successful card payments.
    const payResp = await request
      .post(`/api/public/purchases/${purchaseId}/process`)
      .send({ sourceId: 'cnon:card-nonce-ok' })
      .expect(200);

    expect(payResp.body.status).toBe('paid');
    const entitlementToken: string | undefined = payResp.body.entitlementToken;
    expect(entitlementToken).toBeTruthy();

    // Watch bootstrap should include our HLS manifest and be live
    const bootstrapResp = await request.get(`/api/public/watch/${entitlementToken}`).expect(200);
    expect(bootstrapResp.body.streamUrl).toBe(hlsManifestUrl);
    expect(['live', 'not_started']).toContain(bootstrapResp.body.state);

    // Start a playback session
    const sessionResp = await request
      .post(`/api/public/watch/${entitlementToken}/sessions`)
      .send({ metadata: { deviceType: 'test', playerVersion: 'live-test' } })
      .expect(201);

    const sessionId: string = sessionResp.body.sessionId;
    expect(sessionId).toBeTruthy();

    // Submit telemetry events
    await request
      .post(`/api/public/watch/${entitlementToken}/telemetry?sessionId=${sessionId}`)
      .send({
        events: [
          { type: 'play', timestamp: Date.now() },
          { type: 'buffer', timestamp: Date.now() + 1000, duration: 250 },
        ],
      })
      .expect(204);

    // End session with a summary
    const endResp = await request
      .post(`/api/public/watch/${entitlementToken}/sessions/${sessionId}/end`)
      .send({
        totalWatchMs: 10_000,
        totalBufferMs: 250,
        bufferEvents: 1,
        fatalErrors: 0,
        startupLatencyMs: 500,
      })
      .expect(200);

    expect(endResp.body.sessionId).toBe(sessionId);
    expect(endResp.body.totalWatchMs).toBe(10_000);

    // Cleanup (best-effort) - order matters for foreign key constraints
    await prisma.playbackSession.deleteMany({ where: { entitlement: { purchase: { gameId } } } });
    // Get purchase IDs to clean up ledger entries (LedgerEntry uses referenceId, not a relation)
    const purchases = await prisma.purchase.findMany({ where: { gameId }, select: { id: true } });
    for (const p of purchases) {
      await prisma.ledgerEntry.deleteMany({ where: { referenceId: p.id } });
    }
    await prisma.entitlement.deleteMany({ where: { purchase: { gameId } } });
    await prisma.purchase.deleteMany({ where: { gameId } });
    await prisma.streamSource.deleteMany({ where: { gameId } });
    await prisma.game.deleteMany({ where: { id: gameId } });
    await prisma.viewerIdentity.deleteMany({ where: { email: viewerEmail } });
    // Clean up ledger entries for the owner account before deleting
    const ownerAccount = await prisma.ownerAccount.findFirst({ where: { contactEmail: ownerEmail }, select: { id: true } });
    if (ownerAccount) {
      await prisma.ledgerEntry.deleteMany({ where: { ownerAccountId: ownerAccount.id } });
    }
    await prisma.ownerUser.deleteMany({ where: { email: ownerEmail } });
    await prisma.ownerAccount.deleteMany({ where: { contactEmail: ownerEmail } });
  });
});



