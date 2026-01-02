"use strict";
/**
 * Watch Link Schemas
 *
 * Shared validation for org/team watch link inputs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWatchEventCodeSchema = exports.UpdateWatchChannelSchema = exports.CreateWatchChannelSchema = exports.CreateWatchOrgSchema = exports.UpdateWatchChannelStreamSchema = exports.WatchChannelAccessModeSchema = exports.WatchChannelStreamTypeSchema = exports.EventCodeSchema = exports.TeamSlugSchema = exports.OrgShortNameSchema = void 0;
const zod_1 = require("zod");
exports.OrgShortNameSchema = zod_1.z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9]+$/, 'Org short name must be uppercase alphanumeric');
exports.TeamSlugSchema = zod_1.z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Team slug must be URL-safe');
exports.EventCodeSchema = zod_1.z
    .string()
    .min(4)
    .max(32)
    .regex(/^[A-Za-z0-9]+$/, 'Event code must be alphanumeric');
exports.WatchChannelStreamTypeSchema = zod_1.z.enum(['mux_playback', 'byo_hls', 'external_embed']);
exports.WatchChannelAccessModeSchema = zod_1.z.enum(['public_free', 'pay_per_view']);
exports.UpdateWatchChannelStreamSchema = zod_1.z.object({
    streamType: exports.WatchChannelStreamTypeSchema,
    muxPlaybackId: zod_1.z.string().min(1).optional(),
    hlsManifestUrl: zod_1.z.string().url().optional(),
    externalEmbedUrl: zod_1.z.string().url().optional(),
    externalProvider: zod_1.z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
    requireEventCode: zod_1.z.boolean().optional(),
});
exports.CreateWatchOrgSchema = zod_1.z.object({
    shortName: exports.OrgShortNameSchema,
    name: zod_1.z.string().min(1).max(120),
});
exports.CreateWatchChannelSchema = zod_1.z
    .object({
    teamSlug: exports.TeamSlugSchema,
    displayName: zod_1.z.string().min(1).max(120),
    accessMode: exports.WatchChannelAccessModeSchema,
    priceCents: zod_1.z.number().int().min(0).optional(),
    currency: zod_1.z.string().default('USD').optional(),
    requireEventCode: zod_1.z.boolean().optional(),
    streamType: exports.WatchChannelStreamTypeSchema,
    muxPlaybackId: zod_1.z.string().min(1).optional(),
    hlsManifestUrl: zod_1.z.string().url().optional(),
    externalEmbedUrl: zod_1.z.string().url().optional(),
    externalProvider: zod_1.z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
})
    .refine((data) => {
    if (data.accessMode === 'pay_per_view') {
        return data.priceCents !== undefined && data.priceCents > 0;
    }
    return true;
}, {
    message: 'priceCents is required when accessMode is pay_per_view',
    path: ['priceCents'],
});
exports.UpdateWatchChannelSchema = zod_1.z
    .object({
    displayName: zod_1.z.string().min(1).max(120).optional(),
    accessMode: exports.WatchChannelAccessModeSchema.optional(),
    priceCents: zod_1.z.number().int().min(0).optional(),
    currency: zod_1.z.string().optional(),
    requireEventCode: zod_1.z.boolean().optional(),
    streamType: exports.WatchChannelStreamTypeSchema.optional(),
    muxPlaybackId: zod_1.z.string().min(1).optional(),
    hlsManifestUrl: zod_1.z.string().url().optional(),
    externalEmbedUrl: zod_1.z.string().url().optional(),
    externalProvider: zod_1.z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
})
    .refine((data) => {
    if (data.accessMode === 'pay_per_view') {
        return data.priceCents === undefined || data.priceCents > 0;
    }
    return true;
}, {
    message: 'priceCents must be > 0 when accessMode is pay_per_view',
    path: ['priceCents'],
});
exports.CreateWatchEventCodeSchema = zod_1.z.object({
    code: exports.EventCodeSchema,
});
//# sourceMappingURL=WatchLinkSchema.js.map