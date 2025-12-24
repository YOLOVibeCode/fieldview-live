import { z } from 'zod';

import type { ViewerIdentity } from '../entities/ViewerIdentity';

/**
 * ViewerIdentity Zod Schema
 * 
 * Email is required for viewer identity and monitoring.
 * Phone number is optional (E.164 format).
 */
export const ViewerIdentitySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(), // Required
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  smsOptOut: z.boolean(),
  optOutAt: z.date().optional(),
  createdAt: z.date(),
  lastSeenAt: z.date().optional(),
}) satisfies z.ZodType<ViewerIdentity>;
