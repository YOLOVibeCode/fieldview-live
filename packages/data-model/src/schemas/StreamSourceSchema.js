"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamSourceSchema = exports.ProtectionLevelSchema = exports.StreamSourceTypeSchema = void 0;
const zod_1 = require("zod");
exports.StreamSourceTypeSchema = zod_1.z.enum(['mux_managed', 'byo_hls', 'byo_rtmp', 'external_embed']);
exports.ProtectionLevelSchema = zod_1.z.enum(['strong', 'moderate', 'best_effort']);
/**
 * StreamSource Zod Schema
 *
 * Validates stream source configuration with type-specific fields.
 */
exports.StreamSourceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    gameId: zod_1.z.string().uuid(),
    type: exports.StreamSourceTypeSchema,
    protectionLevel: exports.ProtectionLevelSchema,
    muxAssetId: zod_1.z.string().optional(),
    muxPlaybackId: zod_1.z.string().optional(),
    hlsManifestUrl: zod_1.z.string().url().optional(),
    rtmpPublishUrl: zod_1.z.string().url().optional(),
    rtmpStreamKey: zod_1.z.string().optional(),
    externalEmbedUrl: zod_1.z.string().url().optional(),
    externalProvider: zod_1.z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
}).refine((data) => {
    // Validate type-specific required fields
    if (data.type === 'mux_managed' && !data.muxAssetId)
        return false;
    if (data.type === 'byo_hls' && !data.hlsManifestUrl)
        return false;
    if (data.type === 'byo_rtmp' && (!data.rtmpPublishUrl || !data.rtmpStreamKey))
        return false;
    if (data.type === 'external_embed' && !data.externalEmbedUrl)
        return false;
    return true;
}, {
    message: 'StreamSource type-specific fields are required',
});
//# sourceMappingURL=StreamSourceSchema.js.map