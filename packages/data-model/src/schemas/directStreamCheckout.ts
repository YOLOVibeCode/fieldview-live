/**
 * DirectStream Checkout Validation Schema
 * 
 * Validates viewer information for DirectStream paywall checkout.
 */

import { z } from 'zod';

export const DirectStreamCheckoutSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name required').max(50, 'Last name too long'),
  phone: z.string().optional(),
  returnUrl: z.string().url('Invalid return URL').optional(),
});

export type DirectStreamCheckout = z.infer<typeof DirectStreamCheckoutSchema>;

