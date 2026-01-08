/**
 * Admin Platform Routes
 *
 * Platform-wide revenue dashboard endpoints.
 * Super admin only - shows aggregate platform earnings.
 */

import express, { type Router } from 'express';

import { prisma } from '../lib/prisma';
import { requireAdminAuth } from '../middleware/adminAuth';
import { auditLog } from '../middleware/auditLog';
import type { AuthRequest } from '../middleware/auth';
import { PlatformRevenueService } from '../services/PlatformRevenueService';

const router = express.Router();

// Lazy initialization
let revenueServiceInstance: PlatformRevenueService | null = null;

function getRevenueService(): PlatformRevenueService {
  if (!revenueServiceInstance) {
    revenueServiceInstance = new PlatformRevenueService(prisma);
  }
  return revenueServiceInstance;
}

// Export for testing
export function setRevenueService(service: PlatformRevenueService): void {
  revenueServiceInstance = service;
}

/**
 * GET /api/admin/platform/revenue
 *
 * Get comprehensive platform revenue statistics.
 * Includes all-time totals, this month/week, monthly breakdown, and top owners.
 */
router.get(
  '/revenue',
  requireAdminAuth,
  auditLog({ actionType: 'view_platform_revenue', targetType: 'platform' }),
  (_req: AuthRequest, res, next) => {
    void (async () => {
      try {
        const revenueService = getRevenueService();
        const stats = await revenueService.getRevenueStats();
        res.json(stats);
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createAdminPlatformRouter(): Router {
  return router;
}
