/**
 * Owner Routes
 * 
 * Owner authentication and account management endpoints.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { OwnerAccountRepository, OwnerUserRepository } from '../repositories/implementations/OwnerAccountRepository';
import type { OwnerLoginData, OwnerRegistrationData } from '../services/IOwnerAuthService';
import { OwnerAuthService } from '../services/OwnerAuthService';

const router = express.Router();

// Initialize services (ISP: using segregated interfaces)
// Lazy initialization to allow mocking in tests
let authServiceInstance: OwnerAuthService | null = null;

function getAuthService(): OwnerAuthService {
  if (!authServiceInstance) {
    const ownerAccountRepo = new OwnerAccountRepository(prisma);
    const ownerUserRepo = new OwnerUserRepository(prisma);
    authServiceInstance = new OwnerAuthService(ownerAccountRepo, ownerUserRepo, ownerUserRepo);
  }
  return authServiceInstance;
}

// Export for testing
export function setAuthService(service: OwnerAuthService): void {
  authServiceInstance = service;
}

// Registration schema (CDD: matches OpenAPI spec)
const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  type: z.enum(['individual', 'association']),
});

// Login schema (CDD: matches OpenAPI spec)
const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/owners/register
 * 
 * Register a new owner account.
 */
router.post(
  '/register',
  validateRequest({ body: RegisterRequestSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const authService = getAuthService();
        const result = await authService.register(req.body as OwnerRegistrationData);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/owners/login
 * 
 * Login owner and receive JWT token.
 */
router.post(
  '/login',
  validateRequest({ body: LoginRequestSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const authService = getAuthService();
        const result = await authService.login(req.body as OwnerLoginData);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createOwnersRouter(): Router {
  return router;
}
