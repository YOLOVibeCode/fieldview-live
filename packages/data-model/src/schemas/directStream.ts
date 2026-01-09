/**
 * DirectStream Zod schemas for validation
 * 
 * Follows ISP (Interface Segregation Principle):
 * - Separate schemas for reading vs. updating
 * - Granular schemas for specific operations
 */

import { z } from 'zod';

// Base direct stream data
export const DirectStreamSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  streamUrl: z.string().url().nullable(),
  paywallEnabled: z.boolean(),
  priceInCents: z.number().int().min(0).max(99999), // Max $999.99
  paywallMessage: z.string().max(1000).nullable(),
  allowSavePayment: z.boolean(),
  chatEnabled: z.boolean(),
  gameId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DirectStream = z.infer<typeof DirectStreamSchema>;

// Admin settings update schema (ISP: only fields admin can update)
export const UpdateDirectStreamSettingsSchema = z.object({
  password: z.string().min(1),  // Admin password (verified on server)
  streamUrl: z.string().url().optional(),
  paywallEnabled: z.boolean().optional(),
  priceInCents: z.number().int().min(0).max(99999).optional(),
  paywallMessage: z.string().max(1000).nullable().optional(),
  allowSavePayment: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
});

export type UpdateDirectStreamSettings = z.infer<typeof UpdateDirectStreamSettingsSchema>;

// Bootstrap response schema (public-facing)
export const DirectStreamBootstrapSchema = z.object({
  slug: z.string(),
  gameId: z.string().uuid().nullable(),
  streamUrl: z.string().url().nullable(),
  chatEnabled: z.boolean(),
  title: z.string(),
  
  // Paywall info
  paywallEnabled: z.boolean(),
  priceInCents: z.number().int().min(0),
  paywallMessage: z.string().max(1000).nullable(),
  allowSavePayment: z.boolean(),
});

export type DirectStreamBootstrap = z.infer<typeof DirectStreamBootstrapSchema>;

// Price validation helper
export const validatePrice = (priceInCents: number): boolean => {
  return priceInCents >= 0 && priceInCents <= 99999;
};

// Format price for display
export const formatPrice = (priceInCents: number): string => {
  return `$${(priceInCents / 100).toFixed(2)}`;
};

// Parse price from user input (e.g., "4.99" -> 499)
export const parsePrice = (priceString: string): number | null => {
  const cleaned = priceString.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed) || parsed < 0) {
    return null;
  }
  
  return Math.round(parsed * 100);
};

