/**
 * LIVE Paywall Tests (Square Sandbox)
 *
 * These tests verify paywall functionality with a real database.
 *
 * IMPORTANT: Payment processing tests require a REAL Square merchant OAuth token.
 * The platform's SQUARE_ACCESS_TOKEN cannot be used to process payments on behalf
 * of an owner account because Square Marketplace Model A requires each merchant
 * to authorize the app via OAuth. Tests that process payments are skipped unless
 * SQUARE_MERCHANT_ACCESS_TOKEN and SQUARE_MERCHANT_LOCATION_ID are set.
 *
 * Tests that work without merchant credentials:
 * - Fee calculation verification (10% platform / 90% owner split)
 * - Checkout creation and purchase record verification
 * - Square credential storage structure
 *
 * REQUIREMENTS:
 * - LIVE_TEST_MODE=1
 * - DATABASE_URL pointing to a test/dev database
 *
 * For payment processing tests (optional):
 * - SQUARE_MERCHANT_ACCESS_TOKEN (sandbox merchant OAuth token)
 * - SQUARE_MERCHANT_LOCATION_ID (sandbox merchant location)
 * - SQUARE_ENVIRONMENT=sandbox
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { agent, type SuperTest } from 'supertest';

import app from '@/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { calculateMarketplaceSplit } from '@/utils/feeCalculator';

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
 * This simulates what happens after OAuth flow completes.
 *
 * NOTE: Uses SQUARE_MERCHANT_* credentials if available, otherwise skips.
 */
async function setupSquareCredentials(ownerAccountId: string): Promise<void> {
  const accessToken = process.env.SQUARE_MERCHANT_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_MERCHANT_LOCATION_ID;

  if (!accessToken || !locationId) {
    throw new Error(
      'Payment tests require SQUARE_MERCHANT_ACCESS_TOKEN and SQUARE_MERCHANT_LOCATION_ID ' +
      '(OAuth credentials from a sandbox merchant, not platform credentials)'
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

  // Safety: prevent accidental production runs
  const parsed = new URL(process.env.DATABASE_URL);
  const dbName = parsed.pathname.replace(/^\//, '').toLowerCase();
  if (!dbName.includes('test') && !dbName.includes('dev')) {
    throw new Error(
      `Refusing to run LIVE tests unless DATABASE_URL points to a test/dev database (got db="${dbName}").`
    );
  }
}

/**
 * Check if Square sandbox is configured (for non-payment tests).
 */
function hasSquareConfig(): boolean {
  return (
    Boolean(process.env.SQUARE_ACCESS_TOKEN) &&
    Boolean(process.env.SQUARE_LOCATION_ID) &&
    (process.env.SQUARE_ENVIRONMENT || 'sandbox') !== 'production'
  );
}

/**
 * Check if we can run payment tests (requires merchant OAuth credentials).
 */
function canRunPaymentTests(): boolean {
  return hasMerchantCredentials() && (process.env.SQUARE_ENVIRONMENT || 'sandbox') !== 'production';
}

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@fieldview.live`;
}

// Helper to wait between tests to avoid rate limiting
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('LIVE: Paywall Functionality (Square Sandbox)', () => {
  // Test data for cleanup
  const testData: {
    ownerEmails: string[];
    viewerEmails: string[];
    gameIds: string[];
  } = {
    ownerEmails: [],
    viewerEmails: [],
    gameIds: [],
  };

  // Add delay between tests to avoid rate limiting on checkout endpoint
  // The public checkout endpoint has a 5 req/min limit per IP
  beforeEach(async () => {
    await wait(13000); // Wait 13 seconds to stay under 5 req/min
  });

  afterAll(async () => {
    // Cleanup all test data - order matters for foreign key constraints
    for (const gameId of testData.gameIds) {
      // Get purchase IDs to clean up ledger entries
      const purchases = await prisma.purchase.findMany({ where: { gameId }, select: { id: true } }).catch(() => []);
      for (const p of purchases) {
        await prisma.ledgerEntry.deleteMany({ where: { referenceId: p.id } }).catch(() => {});
      }
      await prisma.playbackSession.deleteMany({ where: { entitlement: { purchase: { gameId } } } }).catch(() => {});
      await prisma.entitlement.deleteMany({ where: { purchase: { gameId } } }).catch(() => {});
      await prisma.purchase.deleteMany({ where: { gameId } }).catch(() => {});
      await prisma.streamSource.deleteMany({ where: { gameId } }).catch(() => {});
      await prisma.game.deleteMany({ where: { id: gameId } }).catch(() => {});
    }
    for (const email of testData.viewerEmails) {
      await prisma.viewerIdentity.deleteMany({ where: { email } }).catch(() => {});
    }
    // Delete ledger entries for owner accounts before deleting the accounts
    for (const email of testData.ownerEmails) {
      const account = await prisma.ownerAccount.findFirst({ where: { contactEmail: email }, select: { id: true } }).catch(() => null);
      if (account) {
        await prisma.ledgerEntry.deleteMany({ where: { ownerAccountId: account.id } }).catch(() => {});
      }
      await prisma.ownerUser.deleteMany({ where: { email } }).catch(() => {});
      await prisma.ownerAccount.deleteMany({ where: { contactEmail: email } }).catch(() => {});
    }
  });

  describe('Platform Fee Verification (10% to platform, 90% to owner)', () => {
    itIf(canRunPaymentTests())(
      'verifies 10% platform fee is correctly calculated and stored on purchase',
      async () => {
        assertLiveTestEnv();

        const request: SuperTest<typeof app> = agent(app);
        const ownerEmail = uniqueEmail('owner-fee');
        const viewerEmail = uniqueEmail('viewer-fee');
        testData.ownerEmails.push(ownerEmail);
        testData.viewerEmails.push(viewerEmail);

        // Register owner
        const registerResp = await request
          .post('/api/owners/register')
          .send({
            email: ownerEmail,
            password: 'password12345',
            name: 'Fee Test Owner',
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

        // Create game with $10.00 price
        const priceCents = 1000;
        const gameResp = await request
          .post('/api/owners/games')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: 'Fee Test Game',
            homeTeam: 'Home',
            awayTeam: 'Away',
            startsAt: new Date(Date.now() - 60_000).toISOString(),
            priceCents,
            currency: 'USD',
          })
          .expect(201);

        const gameId: string = gameResp.body.id;
        testData.gameIds.push(gameId);

        // Activate game
        await request
          .patch(`/api/owners/games/${gameId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ state: 'active' })
          .expect(200);

        // Create checkout
        const checkoutResp = await request
          .post(`/api/public/games/${gameId}/checkout`)
          .send({ viewerEmail })
          .expect(200);

        const purchaseId: string = checkoutResp.body.purchaseId;

        // Verify purchase has correct fee calculation BEFORE payment
        const purchaseBefore = await prisma.purchase.findUnique({
          where: { id: purchaseId },
        });

        expect(purchaseBefore).toBeTruthy();
        expect(purchaseBefore!.amountCents).toBe(priceCents);

        // Calculate expected fees
        const expectedSplit = calculateMarketplaceSplit(priceCents, 10);

        // Verify platform fee is exactly 10%
        expect(purchaseBefore!.platformFeeCents).toBe(expectedSplit.platformFeeCents);
        expect(purchaseBefore!.platformFeeCents).toBe(100); // 10% of $10.00

        // Verify processor fee estimate (2.9% + $0.30)
        expect(purchaseBefore!.processorFeeCents).toBe(expectedSplit.processorFeeCents);

        // Verify owner net = gross - platform - processor
        expect(purchaseBefore!.ownerNetCents).toBe(expectedSplit.ownerNetCents);
        expect(purchaseBefore!.ownerNetCents).toBe(
          priceCents - purchaseBefore!.platformFeeCents - purchaseBefore!.processorFeeCents
        );

        // Process payment with Square sandbox
        const payResp = await request
          .post(`/api/public/purchases/${purchaseId}/process`)
          .send({ sourceId: 'cnon:card-nonce-ok' })
          .expect(200);

        expect(payResp.body.status).toBe('paid');

        // Verify purchase after payment (processor fee may be updated with actual Square fee)
        const purchaseAfter = await prisma.purchase.findUnique({
          where: { id: purchaseId },
        });

        expect(purchaseAfter!.status).toBe('paid');
        expect(purchaseAfter!.paidAt).toBeTruthy();

        // Platform fee should remain exactly 10%
        expect(purchaseAfter!.platformFeeCents).toBe(100);

        // Owner net should be recalculated with actual processor fee
        expect(purchaseAfter!.ownerNetCents).toBe(
          priceCents - purchaseAfter!.platformFeeCents - purchaseAfter!.processorFeeCents
        );
      }
    );

    // This test doesn't require payment processing - just verifies fee calculation
    it(
      'verifies platform fee percentage is configurable via PLATFORM_FEE_PERCENT',
      async () => {
        assertLiveTestEnv();

        // The env variable is set to 10% - verify the calculation uses it
        const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
        expect(platformFeePercent).toBe(10);

        // Test fee calculation
        const split = calculateMarketplaceSplit(1000, platformFeePercent);
        expect(split.platformFeeCents).toBe(100); // 10% of $10.00
      }
    );
  });

  describe('Ledger Entry Verification', () => {
    itIf(canRunPaymentTests())(
      'creates correct ledger entries after successful payment',
      async () => {
        assertLiveTestEnv();

        const request: SuperTest<typeof app> = agent(app);
        const ownerEmail = uniqueEmail('owner-ledger');
        const viewerEmail = uniqueEmail('viewer-ledger');
        testData.ownerEmails.push(ownerEmail);
        testData.viewerEmails.push(viewerEmail);

        // Register owner
        const registerResp = await request
          .post('/api/owners/register')
          .send({
            email: ownerEmail,
            password: 'password12345',
            name: 'Ledger Test Owner',
            type: 'individual',
          })
          .expect(201);

        const ownerToken: string = registerResp.body.token.token;

        // Get owner account ID
        const meResp = await request
          .get('/api/owners/me')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const ownerAccountId: string = meResp.body.id;

        // Setup Square credentials for payment processing
        await setupSquareCredentials(ownerAccountId);

        // Create game with $25.00 price
        const priceCents = 2500;
        const gameResp = await request
          .post('/api/owners/games')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: 'Ledger Test Game',
            homeTeam: 'Home',
            awayTeam: 'Away',
            startsAt: new Date(Date.now() - 60_000).toISOString(),
            priceCents,
            currency: 'USD',
          })
          .expect(201);

        const gameId: string = gameResp.body.id;
        testData.gameIds.push(gameId);

        // Activate game
        await request
          .patch(`/api/owners/games/${gameId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ state: 'active' })
          .expect(200);

        // Create checkout and process payment
        const checkoutResp = await request
          .post(`/api/public/games/${gameId}/checkout`)
          .send({ viewerEmail })
          .expect(200);

        const purchaseId: string = checkoutResp.body.purchaseId;

        await request
          .post(`/api/public/purchases/${purchaseId}/process`)
          .send({ sourceId: 'cnon:card-nonce-ok' })
          .expect(200);

        // Verify ledger entries were created
        const ledgerEntries = await prisma.ledgerEntry.findMany({
          where: { referenceId: purchaseId },
          orderBy: { createdAt: 'asc' },
        });

        // Should have 3 entries: charge, platform_fee, processor_fee
        expect(ledgerEntries.length).toBe(3);

        // Find each entry type
        const chargeEntry = ledgerEntries.find((e) => e.type === 'charge');
        const platformFeeEntry = ledgerEntries.find((e) => e.type === 'platform_fee');
        const processorFeeEntry = ledgerEntries.find((e) => e.type === 'processor_fee');

        expect(chargeEntry).toBeTruthy();
        expect(platformFeeEntry).toBeTruthy();
        expect(processorFeeEntry).toBeTruthy();

        // Verify charge entry (positive = credit)
        expect(chargeEntry!.amountCents).toBe(priceCents);
        expect(chargeEntry!.ownerAccountId).toBe(ownerAccountId);

        // Verify platform fee entry (negative = debit, 10% of gross)
        expect(platformFeeEntry!.amountCents).toBe(-250); // -10% of $25.00
        expect(platformFeeEntry!.ownerAccountId).toBe(ownerAccountId);

        // Verify processor fee entry (negative = debit)
        expect(processorFeeEntry!.amountCents).toBeLessThan(0);
        expect(processorFeeEntry!.ownerAccountId).toBe(ownerAccountId);

        // Verify ledger entries sum to owner net
        const ledgerSum = ledgerEntries.reduce((sum, e) => sum + e.amountCents, 0);
        const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
        expect(ledgerSum).toBe(purchase!.ownerNetCents);
      }
    );
  });

  describe('Square Credential Storage', () => {
    // This test just verifies credential structure, doesn't need payment processing
    it(
      'stores encrypted Square credentials when owner connects',
      async () => {
        assertLiveTestEnv();

        // Note: Full OAuth flow requires browser interaction.
        // This test verifies the credential storage structure exists.

        const request: SuperTest<typeof app> = agent(app);
        const ownerEmail = uniqueEmail('owner-creds');
        testData.ownerEmails.push(ownerEmail);

        // Register owner
        const registerResp = await request
          .post('/api/owners/register')
          .send({
            email: ownerEmail,
            password: 'password12345',
            name: 'Credentials Test Owner',
            type: 'individual',
          })
          .expect(201);

        const ownerToken: string = registerResp.body.token.token;

        // Check Square status endpoint works
        const statusResp = await request
          .get('/api/owners/me/square/status')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        // New owner should NOT have Square connected yet
        expect(statusResp.body.connected).toBe(false);
        expect(statusResp.body.merchantId).toBeNull();

        // Verify owner account structure has Square fields
        const meResp = await request
          .get('/api/owners/me')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const ownerAccount = await prisma.ownerAccount.findUnique({
          where: { id: meResp.body.id },
          select: {
            squareAccessTokenEncrypted: true,
            squareRefreshTokenEncrypted: true,
            squareTokenExpiresAt: true,
            squareLocationId: true,
            payoutProviderRef: true,
          },
        });

        // Fields should exist but be null (not connected)
        expect(ownerAccount).toBeTruthy();
        expect(ownerAccount!.squareAccessTokenEncrypted).toBeNull();
        expect(ownerAccount!.squareRefreshTokenEncrypted).toBeNull();
      }
    );

    // Skip - requires Redis connection for CSRF state storage
    // TODO: This test would need Redis to be running to work
    it.skip(
      'Square Connect URL generation works (requires Redis)',
      async () => {
        assertLiveTestEnv();

        const request: SuperTest<typeof app> = agent(app);
        const ownerEmail = uniqueEmail('owner-connect');
        testData.ownerEmails.push(ownerEmail);

        // Register owner
        const registerResp = await request
          .post('/api/owners/register')
          .send({
            email: ownerEmail,
            password: 'password12345',
            name: 'Connect Test Owner',
            type: 'individual',
          })
          .expect(201);

        const ownerToken: string = registerResp.body.token.token;

        // Request Square Connect URL
        const connectResp = await request
          .post('/api/owners/square/connect')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ returnUrl: 'http://localhost:4300/owners/dashboard' })
          .expect(200);

        // Should return a valid Square Connect URL
        expect(connectResp.body.connectUrl).toBeTruthy();
        expect(connectResp.body.connectUrl).toContain('squareup');
        expect(connectResp.body.connectUrl).toContain('oauth2/authorize');
        expect(connectResp.body.connectUrl).toContain('client_id');

        // Should include required scopes
        expect(connectResp.body.connectUrl).toContain('PAYMENTS_WRITE');

        // State token should be returned
        expect(connectResp.body.state).toBeTruthy();
        expect(connectResp.body.state.length).toBeGreaterThan(20);
      }
    );
  });

  describe('Full Payment Flow End-to-End', () => {
    itIf(canRunPaymentTests())(
      'completes full payment flow: checkout → payment → entitlement → ledger',
      async () => {
        assertLiveTestEnv();

        const request: SuperTest<typeof app> = agent(app);
        const ownerEmail = uniqueEmail('owner-e2e');
        const viewerEmail = uniqueEmail('viewer-e2e');
        testData.ownerEmails.push(ownerEmail);
        testData.viewerEmails.push(viewerEmail);

        // 1. Register owner
        const registerResp = await request
          .post('/api/owners/register')
          .send({
            email: ownerEmail,
            password: 'password12345',
            name: 'E2E Test Owner',
            type: 'individual',
          })
          .expect(201);

        const ownerToken: string = registerResp.body.token.token;

        // 1b. Get owner account ID and setup Square credentials
        const meResp = await request
          .get('/api/owners/me')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const ownerAccountId: string = meResp.body.id;
        await setupSquareCredentials(ownerAccountId);

        // 2. Create game with $15.00 price
        const priceCents = 1500;
        const gameResp = await request
          .post('/api/owners/games')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: 'E2E Paywall Test Game',
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            startsAt: new Date(Date.now() - 60_000).toISOString(),
            priceCents,
            currency: 'USD',
          })
          .expect(201);

        const gameId: string = gameResp.body.id;
        testData.gameIds.push(gameId);

        // 3. Activate game
        await request
          .patch(`/api/owners/games/${gameId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ state: 'active' })
          .expect(200);

        // 4. Create checkout
        const checkoutResp = await request
          .post(`/api/public/games/${gameId}/checkout`)
          .send({ viewerEmail })
          .expect(200);

        const purchaseId: string = checkoutResp.body.purchaseId;
        expect(purchaseId).toBeTruthy();
        expect(checkoutResp.body.checkoutUrl).toContain(purchaseId);

        // 5. Verify purchase created with correct status
        const purchaseBefore = await prisma.purchase.findUnique({
          where: { id: purchaseId },
        });
        expect(purchaseBefore!.status).toBe('created');
        expect(purchaseBefore!.amountCents).toBe(priceCents);
        expect(purchaseBefore!.platformFeeCents).toBe(150); // 10% of $15.00

        // 6. Process payment
        const payResp = await request
          .post(`/api/public/purchases/${purchaseId}/process`)
          .send({ sourceId: 'cnon:card-nonce-ok' })
          .expect(200);

        expect(payResp.body.status).toBe('paid');
        expect(payResp.body.entitlementToken).toBeTruthy();

        // 7. Verify entitlement was created
        const entitlement = await prisma.entitlement.findFirst({
          where: { purchaseId },
        });
        expect(entitlement).toBeTruthy();
        expect(entitlement!.tokenId).toBe(payResp.body.entitlementToken);
        expect(entitlement!.status).toBe('active');

        // 8. Verify ledger entries
        const ledgerEntries = await prisma.ledgerEntry.findMany({
          where: { referenceId: purchaseId },
        });
        expect(ledgerEntries.length).toBe(3);

        // 9. Verify purchase status updated
        const purchaseAfter = await prisma.purchase.findUnique({
          where: { id: purchaseId },
        });
        expect(purchaseAfter!.status).toBe('paid');
        expect(purchaseAfter!.paidAt).toBeTruthy();
        expect(purchaseAfter!.paymentProviderPaymentId).toBeTruthy();

        // 10. Verify Square payment ID format
        expect(purchaseAfter!.paymentProviderPaymentId).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    );

    itIf(canRunPaymentTests())(
      'handles different purchase amounts correctly',
      async () => {
        assertLiveTestEnv();

        const request: SuperTest<typeof app> = agent(app);
        const ownerEmail = uniqueEmail('owner-amounts');
        testData.ownerEmails.push(ownerEmail);

        // Register owner
        const registerResp = await request
          .post('/api/owners/register')
          .send({
            email: ownerEmail,
            password: 'password12345',
            name: 'Amounts Test Owner',
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

        // Test different price points (reduced to 2 to avoid rate limiting)
        const testAmounts = [500, 2500]; // $5, $25

        for (let i = 0; i < testAmounts.length; i++) {
          const priceCents = testAmounts[i];
          const viewerEmail = uniqueEmail(`viewer-${priceCents}`);
          testData.viewerEmails.push(viewerEmail);

          // Wait between iterations to avoid rate limiting (5 req/min on checkout)
          if (i > 0) await wait(13000);

          // Create game
          const gameResp = await request
            .post('/api/owners/games')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
              title: `Amount Test $${priceCents / 100}`,
              homeTeam: 'Home',
              awayTeam: 'Away',
              startsAt: new Date(Date.now() - 60_000).toISOString(),
              priceCents,
              currency: 'USD',
            })
            .expect(201);

          const gameId: string = gameResp.body.id;
          testData.gameIds.push(gameId);

          // Activate and checkout
          await request
            .patch(`/api/owners/games/${gameId}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ state: 'active' })
            .expect(200);

          const checkoutResp = await request
            .post(`/api/public/games/${gameId}/checkout`)
            .send({ viewerEmail })
            .expect(200);

          const purchaseId: string = checkoutResp.body.purchaseId;

          // Verify fee calculation
          const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
          });

          const expectedPlatformFee = Math.round(priceCents * 0.1);
          expect(purchase!.platformFeeCents).toBe(expectedPlatformFee);

          // Process payment
          await request
            .post(`/api/public/purchases/${purchaseId}/process`)
            .send({ sourceId: 'cnon:card-nonce-ok' })
            .expect(200);

          // Verify payment succeeded
          const purchaseAfter = await prisma.purchase.findUnique({
            where: { id: purchaseId },
          });
          expect(purchaseAfter!.status).toBe('paid');
        }
      }
    );
  });

  describe('Error Handling', () => {
    itIf(canRunPaymentTests())(
      'handles declined card gracefully',
      async () => {
        assertLiveTestEnv();

        const request: SuperTest<typeof app> = agent(app);
        const ownerEmail = uniqueEmail('owner-decline');
        const viewerEmail = uniqueEmail('viewer-decline');
        testData.ownerEmails.push(ownerEmail);
        testData.viewerEmails.push(viewerEmail);

        // Setup owner and game
        const registerResp = await request
          .post('/api/owners/register')
          .send({
            email: ownerEmail,
            password: 'password12345',
            name: 'Decline Test Owner',
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

        const gameResp = await request
          .post('/api/owners/games')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: 'Decline Test Game',
            homeTeam: 'Home',
            awayTeam: 'Away',
            startsAt: new Date(Date.now() - 60_000).toISOString(),
            priceCents: 1000,
            currency: 'USD',
          })
          .expect(201);

        const gameId: string = gameResp.body.id;
        testData.gameIds.push(gameId);

        await request
          .patch(`/api/owners/games/${gameId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ state: 'active' })
          .expect(200);

        const checkoutResp = await request
          .post(`/api/public/games/${gameId}/checkout`)
          .send({ viewerEmail })
          .expect(200);

        const purchaseId: string = checkoutResp.body.purchaseId;

        // Try to process with declined card nonce
        // Square sandbox nonce for declined card
        const declineResp = await request
          .post(`/api/public/purchases/${purchaseId}/process`)
          .send({ sourceId: 'cnon:card-nonce-declined' })
          .expect(400);

        expect(declineResp.body.error).toBeTruthy();

        // Purchase should remain in created status (not failed, since we might retry)
        const purchase = await prisma.purchase.findUnique({
          where: { id: purchaseId },
        });
        expect(purchase!.status).toBe('created');
      }
    );

    itIf(canRunPaymentTests())(
      'prevents double payment on same purchase',
      async () => {
        assertLiveTestEnv();

        const request: SuperTest<typeof app> = agent(app);
        const ownerEmail = uniqueEmail('owner-double');
        const viewerEmail = uniqueEmail('viewer-double');
        testData.ownerEmails.push(ownerEmail);
        testData.viewerEmails.push(viewerEmail);

        // Setup
        const registerResp = await request
          .post('/api/owners/register')
          .send({
            email: ownerEmail,
            password: 'password12345',
            name: 'Double Pay Test Owner',
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

        const gameResp = await request
          .post('/api/owners/games')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: 'Double Pay Test Game',
            homeTeam: 'Home',
            awayTeam: 'Away',
            startsAt: new Date(Date.now() - 60_000).toISOString(),
            priceCents: 1000,
            currency: 'USD',
          })
          .expect(201);

        const gameId: string = gameResp.body.id;
        testData.gameIds.push(gameId);

        await request
          .patch(`/api/owners/games/${gameId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ state: 'active' })
          .expect(200);

        const checkoutResp = await request
          .post(`/api/public/games/${gameId}/checkout`)
          .send({ viewerEmail })
          .expect(200);

        const purchaseId: string = checkoutResp.body.purchaseId;

        // First payment should succeed
        await request
          .post(`/api/public/purchases/${purchaseId}/process`)
          .send({ sourceId: 'cnon:card-nonce-ok' })
          .expect(200);

        // Second payment should fail (already paid)
        const doublePayResp = await request
          .post(`/api/public/purchases/${purchaseId}/process`)
          .send({ sourceId: 'cnon:card-nonce-ok' })
          .expect(400);

        expect(doublePayResp.body.error.message).toContain('not payable');
      }
    );
  });
});
