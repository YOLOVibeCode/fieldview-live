/**
 * Test Cleanup Routes
 * 
 * Endpoints for cleaning up test data (E2E tests, development).
 * Requires SuperAdmin authentication.
 */

import express, { type Router, type Response, type NextFunction } from 'express';

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type { AuthRequest } from '../middleware/auth';
import { UnauthorizedError } from '../lib/errors';

const router = express.Router();

function isTestRoutesEnabled(): boolean {
  return process.env.ENABLE_TEST_ROUTES === '1' || process.env.NODE_ENV !== 'production';
}

function requireTestCleanupAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  void (async () => {
    try {
      if (!isTestRoutesEnabled()) {
        return next(new UnauthorizedError('Test routes are disabled'));
      }

      const secret = process.env.TEST_CLEANUP_SECRET;
      const headerSecret = req.header('x-test-cleanup-secret');
      if (secret && headerSecret && headerSecret === secret) {
        req.adminUserId = 'test_cleanup_secret';
        req.role = 'super_admin';
        return next();
      }

      const authHeader = req.headers.authorization;
      const sessionToken = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : (req.cookies as { adminSessionToken?: string } | undefined)?.adminSessionToken;

      if (!sessionToken || typeof sessionToken !== 'string') {
        return next(new UnauthorizedError('Admin session required'));
      }

      const match = sessionToken.match(/^admin_session_([^_]+)_/);
      if (!match || !match[1]) {
        return next(new UnauthorizedError('Invalid session token'));
      }

      const adminAccountId = match[1];
      const adminAccount = await prisma.adminAccount.findUnique({
        where: { id: adminAccountId },
        select: { id: true, role: true, status: true },
      });

      if (!adminAccount || adminAccount.status !== 'active') {
        return next(new UnauthorizedError('Admin session required'));
      }

      // In production, require super_admin explicitly.
      if (process.env.NODE_ENV === 'production' && adminAccount.role !== 'super_admin') {
        return next(new UnauthorizedError('SuperAdmin access required'));
      }

      req.adminUserId = adminAccount.id;
      req.role = adminAccount.role;
      next();
    } catch (error) {
      next(error);
    }
  })();
}

/**
 * POST /api/test/cleanup
 * 
 * Clean up all test data except SuperAdmin accounts.
 * 
 * Deletes:
 * - Test owners (emails matching @fieldview.live or @fieldview.test)
 * - Test organizations (shortName starting with TESTORG)
 * - Test channels, event codes
 * - Test games, purchases, entitlements
 * - Test viewer identities
 * 
 * Preserves:
 * - SuperAdmin accounts
 * - Production data
 */
router.post(
  '/',
  requireTestCleanupAuth,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        logger.info({ adminId: req.adminUserId }, 'Starting test data cleanup');

        // Delete in order to respect foreign key constraints
        const deleted = {
          paymentAttempts: 0,
          playbackSessions: 0,
          entitlements: 0,
          purchases: 0,
          streamSources: 0,
          games: 0,
          watchEventCodes: 0,
          watchChannels: 0,
          organizations: 0,
          viewerIdentities: 0,
          ledgerEntries: 0,
          payouts: 0,
          ownerUsers: 0,
          ownerAccounts: 0,
        };

        // 0. Delete payment attempts (must happen before deleting purchases)
        deleted.paymentAttempts = await prisma.paymentAttempt
          .deleteMany({
            where: {
              purchase: {
                OR: [
                  {
                    viewer: {
                      email: {
                        contains: '@fieldview.',
                      },
                    },
                  },
                  {
                    game: {
                      ownerAccount: {
                        contactEmail: {
                          contains: '@fieldview.',
                        },
                      },
                    },
                  },
                  {
                    channel: {
                      organization: {
                        shortName: {
                          startsWith: 'TESTORG',
                        },
                      },
                    },
                  },
                ],
              },
            },
          })
          .then((r) => r.count);

        // 1. Delete playback sessions (from test purchases)
        deleted.playbackSessions = await prisma.playbackSession.deleteMany({
          where: {
            entitlement: {
              purchase: {
                viewer: {
                  email: {
                    contains: '@fieldview.',
                  },
                },
              },
            },
          },
        }).then((r) => r.count);

        // 2. Delete entitlements (from test purchases)
        deleted.entitlements = await prisma.entitlement.deleteMany({
          where: {
            purchase: {
              viewer: {
                email: {
                  contains: '@fieldview.',
                },
              },
            },
          },
        }).then((r) => r.count);

        // 3. Delete purchases (test purchases - both game-based and channel-based)
        deleted.purchases = await prisma.purchase.deleteMany({
          where: {
            OR: [
              {
                viewer: {
                  email: {
                    contains: '@fieldview.',
                  },
                },
              },
              {
                game: {
                  ownerAccount: {
                    contactEmail: {
                      contains: '@fieldview.',
                    },
                  },
                },
              },
              {
                channel: {
                  organization: {
                    shortName: {
                      startsWith: 'TESTORG',
                    },
                  },
                },
              },
            ],
          },
        }).then((r) => r.count);

        // 4. Delete stream sources (from test games)
        deleted.streamSources = await prisma.streamSource.deleteMany({
          where: {
            game: {
              ownerAccount: {
                contactEmail: {
                  contains: '@fieldview.',
                },
              },
            },
          },
        }).then((r) => r.count);

        // 5. Delete games (test games)
        deleted.games = await prisma.game.deleteMany({
          where: {
            ownerAccount: {
              contactEmail: {
                contains: '@fieldview.',
              },
            },
          },
        }).then((r) => r.count);

        // 6. Delete watch event codes (test event codes)
        deleted.watchEventCodes = await prisma.watchEventCode.deleteMany({
          where: {
            channel: {
              organization: {
                shortName: {
                  startsWith: 'TESTORG',
                },
              },
            },
          },
        }).then((r) => r.count);

        // 7. Delete watch channels (test channels)
        deleted.watchChannels = await prisma.watchChannel.deleteMany({
          where: {
            organization: {
              shortName: {
                startsWith: 'TESTORG',
              },
            },
          },
        }).then((r) => r.count);

        // 8. Delete organizations (test orgs)
        deleted.organizations = await prisma.organization.deleteMany({
          where: {
            shortName: {
              startsWith: 'TESTORG',
            },
          },
        }).then((r) => r.count);

        // 9. Delete viewer identities (test viewers)
        deleted.viewerIdentities = await prisma.viewerIdentity.deleteMany({
          where: {
            email: {
              contains: '@fieldview.',
            },
          },
        }).then((r) => r.count);

        // 10. Delete ledger entries + payouts (allow deleting test owner accounts)
        deleted.ledgerEntries = await prisma.ledgerEntry
          .deleteMany({
            where: {
              ownerAccount: {
                contactEmail: {
                  contains: '@fieldview.',
                },
              },
            },
          })
          .then((r) => r.count);

        deleted.payouts = await prisma.payout
          .deleteMany({
            where: {
              ownerAccount: {
                contactEmail: {
                  contains: '@fieldview.',
                },
              },
            },
          })
          .then((r) => r.count);

        // 11. Delete owner users (test owners)
        deleted.ownerUsers = await prisma.ownerUser.deleteMany({
          where: {
            email: {
              contains: '@fieldview.',
            },
          },
        }).then((r) => r.count);

        // 12. Delete owner accounts (test owners)
        deleted.ownerAccounts = await prisma.ownerAccount.deleteMany({
          where: {
            contactEmail: {
              contains: '@fieldview.',
            },
          },
        }).then((r) => r.count);

        logger.info(deleted, 'Test data cleanup completed');

        res.json({
          success: true,
          deleted,
          message: 'Test data cleaned up successfully',
        });
      } catch (error) {
        logger.error({ error }, 'Test cleanup failed');
        next(error);
      }
    })();
  }
);

export function createTestCleanupRouter(): Router {
  return router;
}

