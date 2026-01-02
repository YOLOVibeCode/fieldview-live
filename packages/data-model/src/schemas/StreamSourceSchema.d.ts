import { z } from 'zod';
export declare const StreamSourceTypeSchema: z.ZodEnum<["mux_managed", "byo_hls", "byo_rtmp", "external_embed"]>;
export declare const ProtectionLevelSchema: z.ZodEnum<["strong", "moderate", "best_effort"]>;
/**
 * StreamSource Zod Schema
 *
 * Validates stream source configuration with type-specific fields.
 */
export declare const StreamSourceSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    gameId: z.ZodString;
    type: z.ZodEnum<["mux_managed", "byo_hls", "byo_rtmp", "external_embed"]>;
    protectionLevel: z.ZodEnum<["strong", "moderate", "best_effort"]>;
    muxAssetId: z.ZodOptional<z.ZodString>;
    muxPlaybackId: z.ZodOptional<z.ZodString>;
    hlsManifestUrl: z.ZodOptional<z.ZodString>;
    rtmpPublishUrl: z.ZodOptional<z.ZodString>;
    rtmpStreamKey: z.ZodOptional<z.ZodString>;
    externalEmbedUrl: z.ZodOptional<z.ZodString>;
    externalProvider: z.ZodOptional<z.ZodEnum<["youtube", "twitch", "vimeo", "other"]>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    gameId: string;
    createdAt: Date;
    type: "mux_managed" | "byo_hls" | "byo_rtmp" | "external_embed";
    protectionLevel: "strong" | "moderate" | "best_effort";
    updatedAt: Date;
    muxAssetId?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    rtmpPublishUrl?: string | undefined;
    rtmpStreamKey?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
}, {
    id: string;
    gameId: string;
    createdAt: Date;
    type: "mux_managed" | "byo_hls" | "byo_rtmp" | "external_embed";
    protectionLevel: "strong" | "moderate" | "best_effort";
    updatedAt: Date;
    muxAssetId?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    rtmpPublishUrl?: string | undefined;
    rtmpStreamKey?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
}>, {
    id: string;
    gameId: string;
    createdAt: Date;
    type: "mux_managed" | "byo_hls" | "byo_rtmp" | "external_embed";
    protectionLevel: "strong" | "moderate" | "best_effort";
    updatedAt: Date;
    muxAssetId?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    rtmpPublishUrl?: string | undefined;
    rtmpStreamKey?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
}, {
    id: string;
    gameId: string;
    createdAt: Date;
    type: "mux_managed" | "byo_hls" | "byo_rtmp" | "external_embed";
    protectionLevel: "strong" | "moderate" | "best_effort";
    updatedAt: Date;
    muxAssetId?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    rtmpPublishUrl?: string | undefined;
    rtmpStreamKey?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
}>;
//# sourceMappingURL=StreamSourceSchema.d.ts.map