import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import type { OwnerAccount } from '@prisma/client';
import * as ownersRoute from '@/routes/owners';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('Owner Authentication Routes', () => {
  let request: SuperTest<typeof app>;
  let mockAuthService: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);
    
    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
    };
    
    // Set the mocked service
    ownersRoute.setAuthService(mockAuthService as any);
  });

  describe('POST /api/owners/register', () => {
    it('registers new owner and returns token', async () => {
      const mockAccount = {
        id: 'account-1',
        contactEmail: 'test@example.com',
        name: 'Test Owner',
        type: 'individual',
        status: 'pending_verification',
        payoutProviderRef: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OwnerAccount;

      mockAuthService.register.mockResolvedValue({
        account: mockAccount,
        token: {
          token: 'jwt-token-123',
          expiresAt: new Date('2025-12-19'),
        },
      });

      const response = await request
        .post('/api/owners/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test Owner',
          type: 'individual',
        })
        .expect(201);

      expect(response.body.account.contactEmail).toBe('test@example.com');
      expect(response.body.token.token).toBe('jwt-token-123');
    });

    it('returns 400 if email already exists', async () => {
      const { BadRequestError } = await import('@/lib/errors');
      mockAuthService.register.mockRejectedValue(
        new BadRequestError('Email already registered')
      );

      await request
        .post('/api/owners/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test Owner',
          type: 'individual',
        })
        .expect(400);
    });

    it('returns 400 if validation fails', async () => {
      await request
        .post('/api/owners/register')
        .send({
          email: 'invalid-email',
          password: '123',
          name: '',
          type: 'invalid',
        })
        .expect(400);
    });
  });

  describe('POST /api/owners/login', () => {
    it('logs in owner and returns token', async () => {
      const mockAccount = {
        id: 'account-1',
        contactEmail: 'test@example.com',
        name: 'Test Owner',
        type: 'individual',
        status: 'active',
        payoutProviderRef: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OwnerAccount;

      mockAuthService.login.mockResolvedValue({
        account: mockAccount,
        token: {
          token: 'jwt-token-123',
          expiresAt: new Date('2025-12-19'),
        },
      });

      const response = await request
        .post('/api/owners/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.account.contactEmail).toBe('test@example.com');
      expect(response.body.token.token).toBe('jwt-token-123');
    });

    it('returns 401 if credentials invalid', async () => {
      const { UnauthorizedError } = await import('@/lib/errors');
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedError('Invalid email or password')
      );

      await request
        .post('/api/owners/login')
        .send({
          email: 'test@example.com',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('returns 400 if validation fails', async () => {
      await request
        .post('/api/owners/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400);
    });
  });
});
