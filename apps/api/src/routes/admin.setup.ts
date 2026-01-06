import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Admin endpoint to initialize production database
 * POST /api/admin/setup/tchs
 */
/**
 * POST /api/admin/setup/tchs
 * Create TCHS owner account
 */
router.post(
  '/tchs',
  (_req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        logger.info('🚀 Starting TCHS setup...');

        // Check if TCHS owner already exists
        let owner = await prisma.ownerAccount.findFirst({
          where: {
            OR: [
              { name: { equals: 'TCHS' } },
              { contactEmail: { contains: 'tchs', mode: 'insensitive' } },
            ],
          },
        });

        if (owner) {
          logger.info({ ownerId: owner.id }, 'TCHS owner already exists');
          return res.json({
            success: true,
            message: 'TCHS owner already exists',
            owner: {
              id: owner.id,
              name: owner.name,
              contactEmail: owner.contactEmail,
            },
          });
        }

        // Create TCHS owner
        logger.info('Creating TCHS owner...');
        owner = await prisma.ownerAccount.create({
          data: {
            type: 'owner',
            name: 'TCHS',
            status: 'active',
            contactEmail: 'admin@tchs.example.com',
          },
        });

        logger.info({ ownerId: owner.id }, 'TCHS owner created successfully');

        return res.json({
          success: true,
          message: 'TCHS owner created successfully',
          owner: {
            id: owner.id,
            name: owner.name,
            contactEmail: owner.contactEmail,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to setup TCHS');
        next(error);
      }
    })();
  }
);

/**
 * GET /api/admin/setup/verify
 * Verify database schema and tables
 */
router.get(
  '/verify',
  (_req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        logger.info('🔍 Verifying database schema...');

        // Test ViewerIdentity table
        const viewerCount = await prisma.viewerIdentity.count();
        
        // Test GameChatMessage table
        const chatCount = await prisma.gameChatMessage.count();
        
        // Test Game table
        const gameCount = await prisma.game.count();
        
        // Test OwnerAccount table
        const ownerCount = await prisma.ownerAccount.count();

        logger.info({ viewerCount, chatCount, gameCount, ownerCount }, 'Schema verification complete');

        return res.json({
          success: true,
          message: 'Database schema verified',
          tables: {
            viewerIdentity: viewerCount,
            gameChatMessage: chatCount,
            game: gameCount,
            ownerAccount: ownerCount,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Schema verification failed');
        next(error);
      }
    })();
  }
);

export function createAdminSetupRouter(): Router {
  return router;
}

