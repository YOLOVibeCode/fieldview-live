/**
 * Organization Member Schemas
 *
 * Validation for organization membership and roles.
 */

import { z } from 'zod';

export const OrganizationMemberRoleSchema = z.enum(['org_admin', 'team_manager', 'coach']);

export const CreateOrganizationMemberSchema = z.object({
  ownerUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: OrganizationMemberRoleSchema,
});

export const UpdateOrganizationMemberSchema = z.object({
  role: OrganizationMemberRoleSchema.optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  organizationId: z.string().uuid(),
  role: OrganizationMemberRoleSchema,
});

