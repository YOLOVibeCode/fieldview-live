import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/encryption';
import { logger } from '../lib/logger';

const router = Router();

const SuperAdminSetupSchema = z.object({
  email: z.string().email().default('admin@fieldview.live'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

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
 * POST /api/admin/setup/super-admin
 * Create super_admin user (e.g. admin@fieldview.live) for login and direct-stream management.
 * Call once to create the admin user; then use POST /api/admin/login with email + password.
 */
router.post(
  '/super-admin',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const parse = SuperAdminSetupSchema.safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ error: 'Validation failed', details: parse.error.errors });
        }
        const { email, password } = parse.data;
        const existing = await prisma.adminAccount.findUnique({ where: { email } });
        if (existing) {
          const newHash = await hashPassword(password);
          await prisma.adminAccount.update({
            where: { email },
            data: { passwordHash: newHash },
          });
          logger.info({ adminId: existing.id, email }, 'Super admin password updated');
          return res.json({
            success: true,
            message: 'Super admin password updated',
            email: existing.email,
            role: existing.role,
          });
        }
        const passwordHash = await hashPassword(password);
        const admin = await prisma.adminAccount.create({
          data: {
            email,
            passwordHash,
            role: 'super_admin',
            status: 'active',
            mfaEnabled: false,
          },
        });
        logger.info({ adminId: admin.id, email }, 'Super admin created');
        res.status(201).json({
          success: true,
          message: 'Super admin created',
          email: admin.email,
          role: admin.role,
        });
      } catch (error) {
        logger.error({ error }, 'Super admin setup failed');
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

