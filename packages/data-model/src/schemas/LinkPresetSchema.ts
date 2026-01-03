/**
 * Link Preset Schemas
 *
 * Validation for link format presets and URL key generation.
 */

import { z } from 'zod';

export const LinkPresetIdSchema = z.enum(['preset_a', 'preset_b', 'preset_c']);

export const LinkPresetSchema = z.object({
  id: LinkPresetIdSchema,
  name: z.string(),
  template: z.string(), // e.g., '/{org}/{ageYear}' or '/{org}/{ageYear}/{urlKey}'
  description: z.string(),
});

export const GenerateUrlKeySchema = z.object({
  startsAt: z.coerce.date(),
  format: z.enum(['YYYYMMDDHHmm']).default('YYYYMMDDHHmm'),
});

export const RenderPresetSchema = z.object({
  presetId: LinkPresetIdSchema,
  orgShortName: z.string().min(2).max(20),
  teamSlug: z.string().min(2).max(40).optional(),
  ageYear: z.string().min(4).max(4).optional(), // e.g., '2010'
  urlKey: z.string().min(10).max(32).optional(),
});

