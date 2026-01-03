/**
 * Owner Membership Routes
 *
 * Manage organization memberships (coaches, team managers, org admins).
 */

import { InviteMemberSchema } from '@fieldview/data-model';
import express, { type Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { MembershipRepository } from '../repositories/implementations/MembershipRepository';
import { WatchLinkRepository } from '../repositories/implementations/WatchLinkRepository';
import { AuthorizationService } from '../services/AuthorizationService';

const router = express.Router();

async function getOwnerUserId(req: AuthRequest): Promise<string> {
  if (!req.ownerAccountId) throw new Error('Owner account ID not found');
  const ownerUser = await prisma.ownerUser.findFirst({
    where: { ownerAccountId: req.ownerAccountId },
  });
  if (!ownerUser) throw new Error('Owner user not found');
  return ownerUser.id;
}

import { EventRepository } from '../repositories/implementations/EventRepository';

// Initialize services
const membershipRepo = new MembershipRepository(prisma);
const watchLinkRepo = new WatchLinkRepository(prisma);
const eventRepo = new EventRepository(prisma);
const authService = new AuthorizationService(membershipRepo, eventRepo);

/**
 * POST /api/owners/me/orgs/:orgShortName/members
 * Add a member to an organization (by email invitation or direct assignment).
 */
router.post(
  '/me/orgs/:orgShortName/members',
  requireOwnerAuth,
  validateRequest({ body: InviteMemberSchema }),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerUserId = await getOwnerUserId(req);
        const { orgShortName } = req.params;
        if (!orgShortName) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'orgShortName is required' } });
        }
        const body = req.body as z.infer<typeof InviteMemberSchema>;

        // Get organization
        const org = await watchLinkRepo.getOrganizationByShortName(orgShortName);
        if (!org) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
        }

        // Check authorization (must be org_admin or team_manager)
        await authService.assertCanManageOrganization(ownerUserId, org.id);

        // Find owner user by email
        const ownerUser = await prisma.ownerUser.findUnique({ where: { email: body.email } });
        if (!ownerUser) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found with this email' } });
        }

        // Check if membership already exists
        const existing = await membershipRepo.getMembershipByUserIdAndOrgId(ownerUser.id, org.id);
        if (existing) {
          return res.status(409).json({ error: { code: 'CONFLICT', message: 'User is already a member' } });
        }

        // Create membership
        const membership = await membershipRepo.createMembership({
          ownerUserId: ownerUser.id,
          organizationId: org.id,
          role: body.role,
        });

        res.status(201).json({
          id: membership.id,
          ownerUserId: membership.ownerUserId,
          organizationId: membership.organizationId,
          role: membership.role,
          createdAt: membership.createdAt,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/owners/me/orgs/:orgShortName/members
 * List all members of an organization.
 */
router.get(
  '/me/orgs/:orgShortName/members',
  requireOwnerAuth,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerUserId = await getOwnerUserId(req);
        const { orgShortName } = req.params;
        if (!orgShortName) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'orgShortName is required' } });
        }

        // Get organization
        const org = await watchLinkRepo.getOrganizationByShortName(orgShortName);
        if (!org) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
        }

        // Check authorization
        await authService.assertCanManageOrganization(ownerUserId, org.id);

        const memberships = await membershipRepo.listMembershipsByOrganization(org.id);

        // Enrich with user details
        const enriched = await Promise.all(
          memberships.map(async (m) => {
            const user = await prisma.ownerUser.findUnique({ where: { id: m.ownerUserId } });
            return {
              id: m.id,
              ownerUserId: m.ownerUserId,
              email: user?.email ?? 'unknown',
              role: m.role,
              createdAt: m.createdAt,
            };
          })
        );

        res.json({ members: enriched });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * PATCH /api/owners/me/members/:membershipId
 * Update a member's role.
 */
router.patch(
  '/me/members/:membershipId',
  requireOwnerAuth,
  validateRequest({
    body: z.object({
      role: z.enum(['org_admin', 'team_manager', 'coach']),
    }),
  }),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerUserId = await getOwnerUserId(req);
        const { membershipId } = req.params;
        if (!membershipId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'membershipId is required' } });
        }
        const body = req.body as { role: 'org_admin' | 'team_manager' | 'coach' };

        // Get membership
        const membership = await prisma.organizationMember.findUnique({ where: { id: membershipId } });
        if (!membership) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Membership not found' } });
        }

        // Check authorization
        await authService.assertCanManageOrganization(ownerUserId, membership.organizationId);

        const updated = await membershipRepo.updateMembershipRole(membershipId, body.role);

        res.json({
          id: updated.id,
          ownerUserId: updated.ownerUserId,
          organizationId: updated.organizationId,
          role: updated.role,
          updatedAt: updated.updatedAt,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * DELETE /api/owners/me/members/:membershipId
 * Remove a member from an organization.
 */
router.delete(
  '/me/members/:membershipId',
  requireOwnerAuth,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const ownerUserId = await getOwnerUserId(req);
        const { membershipId } = req.params;
        if (!membershipId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'membershipId is required' } });
        }

        // Get membership
        const membership = await prisma.organizationMember.findUnique({ where: { id: membershipId } });
        if (!membership) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Membership not found' } });
        }

        // Check authorization
        await authService.assertCanManageOrganization(ownerUserId, membership.organizationId);

        await membershipRepo.deleteMembership(membershipId);

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createOwnersMembersRouter(): Router {
  return router;
}

