/**
 * DirectStream Registration Zod Schemas
 * 
 * Validation schemas for viewer registration and verification.
 */

import { z } from 'zod';

export const DirectStreamRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name required').max(50),
  lastName: z.string().min(1, 'Last name required').max(50),
  wantsReminders: z.boolean().optional().default(false),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const VerifyTokenSchema = z.object({
  token: z.string().min(10, 'Invalid token format'),
});

export type DirectStreamRegister = z.infer<typeof DirectStreamRegisterSchema>;
export type ResendVerification = z.infer<typeof ResendVerificationSchema>;
export type VerifyToken = z.infer<typeof VerifyTokenSchema>;

