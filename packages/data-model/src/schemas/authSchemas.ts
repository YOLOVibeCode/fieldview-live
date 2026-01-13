/**
 * Zod Schemas for Password Reset & Viewer Refresh Workflows
 */
import { z } from 'zod';

/**
 * Password validation rules
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const newPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Request a password reset
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  userType: z.enum(['owner_user', 'admin_account']),
});

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

/**
 * Verify a password reset token
 */
export const passwordResetVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type PasswordResetVerify = z.infer<typeof passwordResetVerifySchema>;

/**
 * Confirm a password reset (set new password)
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: newPasswordSchema,
});

export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;

/**
 * Request viewer access refresh (re-consent)
 */
export const viewerRefreshRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  directStreamId: z.string().uuid().optional(),
  gameId: z.string().uuid().optional(),
  redirectUrl: z.string().url().optional(),
});

export type ViewerRefreshRequest = z.infer<typeof viewerRefreshRequestSchema>;

/**
 * Verify a viewer refresh token
 */
export const viewerRefreshVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type ViewerRefreshVerify = z.infer<typeof viewerRefreshVerifySchema>;

