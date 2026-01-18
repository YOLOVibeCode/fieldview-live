/**
 * Early Access Signup Routes
 * 
 * Handles email collection for launch notifications
 */

import express, { type Request, type Response, type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Validation schema
const EarlyAccessSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).max(100).optional(),
  source: z.enum(['veo', 'organic']).optional(),
});

/**
 * POST /api/early-access/signup
 * Register interest for early access
 */
router.post(
  '/signup',
  validateRequest({ body: EarlyAccessSignupSchema }),
  async (req: Request, res: Response) => {
    try {
      const { email, name, source } = req.body as z.infer<typeof EarlyAccessSignupSchema>;

      // Check if already signed up
      const existing = await prisma.earlyAccessSignup.findUnique({
        where: { email },
      });

      if (existing) {
        return res.status(200).json({
          message: 'You\'re already on the list!',
          alreadySignedUp: true,
        });
      }

      // Create signup
      const signup = await prisma.earlyAccessSignup.create({
        data: {
          email,
          name: name || null,
          source: source || 'organic',
        },
      });

      logger.info({ email, source }, 'Early access signup');

      res.status(201).json({
        message: 'Thanks! We\'ll notify you on February 15, 2026.',
        alreadySignedUp: false,
        id: signup.id,
      });
    } catch (error) {
      logger.error({ error }, 'Early access signup failed');
      res.status(500).json({ error: 'Failed to register' });
    }
  }
);

/**
 * GET /api/early-access/count
 * Get signup count (public)
 */
router.get('/count', async (_req: Request, res: Response) => {
  try {
    const count = await prisma.earlyAccessSignup.count();
    res.json({ count });
  } catch (error) {
    logger.error({ error }, 'Failed to get signup count');
    res.status(500).json({ error: 'Failed to get count' });
  }
});

export function createEarlyAccessRouter(): Router {
  return router;
}
