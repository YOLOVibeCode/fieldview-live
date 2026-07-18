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
import { AbuseDetectionService } from '../services/AbuseDetectionService';

const router = express.Router();

// Initialize services (ISP: using segregated interfaces)
// Lazy initialization to allow mocking in tests
let authServiceInstance: OwnerAuthService | null = null;
let abuseDetectionServiceInstance: AbuseDetectionService | null = null;

function getAuthService(): OwnerAuthService {
  if (!authServiceInstance) {
    const ownerAccountRepo = new OwnerAccountRepository(prisma);
    const ownerUserRepo = new OwnerUserRepository(prisma);
    authServiceInstance = new OwnerAuthService(ownerAccountRepo, ownerUserRepo, ownerUserRepo);
  }
  return authServiceInstance;
}

function getAbuseDetectionService(): AbuseDetectionService {
  if (!abuseDetectionServiceInstance) {
    abuseDetectionServiceInstance = new AbuseDetectionService(prisma);
  }
  return abuseDetectionServiceInstance;
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
  fingerprintHash: z.string().optional(), // For abuse detection
  useOneTimePass: z.boolean().optional(), // Accept one-time pass
});

// Login schema (CDD: matches OpenAPI spec)
const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Abuse check schema
const AbuseCheckRequestSchema = z.object({
  fingerprintHash: z.string().min(32),
  email: z.string().email(),
});

/**
 * POST /api/owners/check-abuse
 * 
 * Check for multi-account abuse before registration.
 */
router.post(
  '/check-abuse',
  validateRequest({ body: AbuseCheckRequestSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const abuseService = getAbuseDetectionService();
        const { fingerprintHash, email } = req.body as z.infer<typeof AbuseCheckRequestSchema>;

        // Get client IP
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
          || req.socket.remoteAddress 
          || 'unknown';

        const result = await abuseService.checkRegistration({
          fingerprintHash,
          ipAddress,
          email,
        });

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    })();
  }
);

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
        const abuseService = getAbuseDetectionService();
        
        const { fingerprintHash, useOneTimePass, ...registrationData } = req.body as z.infer<typeof RegisterRequestSchema>;

        // Get client IP
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
          || req.socket.remoteAddress 
          || 'unknown';

        // Check abuse if fingerprint provided
        if (fingerprintHash) {
          const abuseCheck = await abuseService.checkRegistration({
            fingerprintHash,
            ipAddress,
            email: registrationData.email,
          });

          // If abuse detected and not using one-time pass, deny
          if (abuseCheck.abuseDetected && !useOneTimePass) {
            res.status(403).json({
              error: {
                code: 'ABUSE_DETECTED',
                errorMessage: 'Multiple accounts detected from this device',
                linkedAccountCount: abuseCheck.linkedAccountCount,
                abuseDetected: abuseCheck.abuseDetected,
                oneTimePassAvailable: abuseCheck.oneTimePassAvailable,
                message: abuseCheck.message,
              },
            });
            return;
          }

          // If using one-time pass, mark it as used
          if (useOneTimePass && abuseCheck.oneTimePassAvailable) {
            await abuseService.useOneTimePass(fingerprintHash);
          }
        }

        // Proceed with registration
        const result = await authService.register(registrationData as OwnerRegistrationData);

        // Record fingerprint after successful registration
        if (fingerprintHash && result.account?.id) {
          await abuseService.recordFingerprint({
            ownerAccountId: result.account.id,
            fingerprintHash,
            ipAddress,
          });
        }

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
