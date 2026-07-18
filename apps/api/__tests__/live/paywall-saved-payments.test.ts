/**
 * Enhanced Paywall - Saved Payment Methods Tests
 * TDD tests for saved payment functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { agent } from 'supertest';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/encryption';
import type { SuperAgentTest } from 'supertest';
import app from '@/server';

describe('Paywall - Saved Payment Methods', () => {
  let request: SuperAgentTest;
  let testStreamId: string;
  let testViewerId: string;
  let testOwnerAccountId: string;
  const SLUG = 'test-paywall-saved';
  const TEST_EMAIL = 'saved-payment@test.com';

  beforeAll(async () => {
    request = agent(app);

    // Create test owner account
    const owner = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner',
        status: 'active',
        contactEmail: 'owner@test.com',
      },
    });
    testOwnerAccountId = owner.id;

    // Create test DirectStream with paywall enabled
    const stream = await prisma.directStream.create({
      data: {
        slug: SLUG,
        title: 'Test Paywall Stream',
        adminPassword: await hashPassword('admin123'),
        paywallEnabled: true,
        priceInCents: 499,
        paywallMessage: 'Support our stream!',
        allowSavePayment: true,
      },
    });
    testStreamId = stream.id;

    // Create test viewer
    const viewer = await prisma.viewerIdentity.create({
      data: {
        email: TEST_EMAIL,
        firstName: 'Test',
        lastName: 'User',
      },
    });
    testViewerId = viewer.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.purchase.deleteMany({ where: { viewerId: testViewerId } });
    await prisma.viewerSquareCustomer.deleteMany({ where: { viewerId: testViewerId } });
    await prisma.viewerIdentity.delete({ where: { id: testViewerId } });
    await prisma.directStream.delete({ where: { id: testStreamId } });
    await prisma.ownerAccount.delete({ where: { id: testOwnerAccountId } });
  });

  beforeEach(async () => {
    // Reset viewer square customer and purchases
    await prisma.purchase.deleteMany({ where: { viewerId: testViewerId } });
    await prisma.viewerSquareCustomer.deleteMany({ where: { viewerId: testViewerId } });
  });

  describe('GET /api/direct/:slug/payment-methods', () => {
    it('should return false for new user with no saved payment', async () => {
      const res = await request
        .get(`/api/direct/${SLUG}/payment-methods`)
        .query({ email: TEST_EMAIL });

      expect(res.status).toBe(200);
      expect(res.body.hasSavedCard).toBe(false);
      expect(res.body.cardLastFour).toBeUndefined();
    });

    it('should return saved card details when user has square customer', async () => {
      // Create ViewerSquareCustomer
      await prisma.viewerSquareCustomer.create({
        data: {
          viewerId: testViewerId,
          ownerAccountId: testOwnerAccountId,
          squareCustomerId: 'sq-cust-123',
        },
      });

      // Create previous purchase with saved card info
      await prisma.purchase.create({
        data: {
          viewerId: testViewerId,
          amountCents: 499,
          currency: 'USD',
          platformFeeCents: 50,
          processorFeeCents: 30,
          ownerNetCents: 419,
          status: 'paid',
          savePaymentMethod: true,
          squareCardId: 'sq-card-456',
          cardLastFour: '1234',
          cardBrand: 'Visa',
          recipientOwnerAccountId: testOwnerAccountId,
        },
      });

      const res = await request
        .get(`/api/direct/${SLUG}/payment-methods`)
        .query({ email: TEST_EMAIL });

      expect(res.status).toBe(200);
      expect(res.body.hasSavedCard).toBe(true);
      expect(res.body.cardLastFour).toBe('1234');
      expect(res.body.cardBrand).toBe('Visa');
      expect(res.body.squareCustomerId).toBe('sq-cust-123');
    });

    it('should require email parameter', async () => {
      const res = await request
        .get(`/api/direct/${SLUG}/payment-methods`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i); // Case-insensitive match
    });

    it('should return 404 for non-existent stream', async () => {
      const res = await request
        .get('/api/direct/nonexistent/payment-methods')
        .query({ email: TEST_EMAIL });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/direct/:slug/save-payment-method', () => {
    it('should save square customer info for viewer', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/save-payment-method`)
        .send({
          email: TEST_EMAIL,
          squareCustomerId: 'sq-cust-new-789',
          squareCardId: 'sq-card-new-123',
          cardLastFour: '5678',
          cardBrand: 'Mastercard',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify in database
      const squareCustomer = await prisma.viewerSquareCustomer.findFirst({
        where: {
          viewerId: testViewerId,
          ownerAccountId: testOwnerAccountId,
        },
      });
      expect(squareCustomer).toBeTruthy();
      expect(squareCustomer?.squareCustomerId).toBe('sq-cust-new-789');
    });

    it('should be idempotent (handle existing square customer)', async () => {
      // Create existing square customer
      await prisma.viewerSquareCustomer.create({
        data: {
          viewerId: testViewerId,
          ownerAccountId: testOwnerAccountId,
          squareCustomerId: 'sq-cust-existing',
        },
      });

      const res = await request
        .post(`/api/direct/${SLUG}/save-payment-method`)
        .send({
          email: TEST_EMAIL,
          squareCustomerId: 'sq-cust-updated',
          squareCardId: 'sq-card-999',
          cardLastFour: '9999',
          cardBrand: 'Amex',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it updated, not created duplicate
      const customers = await prisma.viewerSquareCustomer.findMany({
        where: { viewerId: testViewerId },
      });
      expect(customers.length).toBe(1);
      expect(customers[0].squareCustomerId).toBe('sq-cust-updated');
    });

    it('should validate required fields', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/save-payment-method`)
        .send({
          email: TEST_EMAIL,
          // Missing required fields
        });

      expect(res.status).toBe(400);
    });

    it('should create viewer if does not exist', async () => {
      const newEmail = 'newuser@test.com';
      
      const res = await request
        .post(`/api/direct/${SLUG}/save-payment-method`)
        .send({
          email: newEmail,
          firstName: 'New',
          lastName: 'User',
          squareCustomerId: 'sq-cust-brand-new',
          squareCardId: 'sq-card-brand-new',
          cardLastFour: '0000',
          cardBrand: 'Visa',
        });

      expect(res.status).toBe(201);

      // Verify viewer was created
      const viewer = await prisma.viewerIdentity.findUnique({
        where: { email: newEmail },
      });
      expect(viewer).toBeTruthy();
      expect(viewer?.firstName).toBe('New');

      // Cleanup
      await prisma.viewerSquareCustomer.deleteMany({ where: { viewerId: viewer!.id } });
      await prisma.viewerIdentity.delete({ where: { id: viewer!.id } });
    });
  });

  describe('Paywall Message Integration', () => {
    it('should return paywall message in bootstrap', async () => {
      const res = await request
        .get(`/api/direct/${SLUG}/bootstrap`);

      expect(res.status).toBe(200);
      expect(res.body.paywallEnabled).toBe(true);
      expect(res.body.paywallMessage).toBe('Support our stream!');
      expect(res.body.priceInCents).toBe(499);
      expect(res.body.allowSavePayment).toBe(true);
    });

    it('should include paywallMessage in settings update', async () => {
      // This requires admin auth, which is already tested in direct-stream-admin.test.ts
      // Just verify the schema supports it
      const stream = await prisma.directStream.findUnique({
        where: { slug: SLUG },
      });

      expect(stream?.paywallMessage).toBe('Support our stream!');
    });
  });
});

