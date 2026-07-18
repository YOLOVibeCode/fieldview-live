/**
 * Viewer Account Zod Schemas
 *
 * Validation for the viewer account management API.
 */

import { z } from 'zod';

export const UpdateViewerProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().max(100).optional(),
}).refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
  message: 'At least one field (firstName or lastName) must be provided',
});

export const ViewerIdParamSchema = z.object({
  viewerIdentityId: z.string().uuid('Invalid viewer identity id'),
});

export type UpdateViewerProfileInput = z.infer<typeof UpdateViewerProfileSchema>;
