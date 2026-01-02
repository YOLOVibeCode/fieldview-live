/**
 * Watch Link Schemas
 *
 * Shared validation for org/team watch link inputs.
 */
import { z } from 'zod';
export declare const OrgShortNameSchema: z.ZodString;
export declare const TeamSlugSchema: z.ZodString;
export declare const EventCodeSchema: z.ZodString;
export declare const WatchChannelStreamTypeSchema: z.ZodEnum<["mux_playback", "byo_hls", "external_embed"]>;
export declare const WatchChannelAccessModeSchema: z.ZodEnum<["public_free", "pay_per_view"]>;
export declare const UpdateWatchChannelStreamSchema: z.ZodObject<{
    streamType: z.ZodEnum<["mux_playback", "byo_hls", "external_embed"]>;
    muxPlaybackId: z.ZodOptional<z.ZodString>;
    hlsManifestUrl: z.ZodOptional<z.ZodString>;
    externalEmbedUrl: z.ZodOptional<z.ZodString>;
    externalProvider: z.ZodOptional<z.ZodEnum<["youtube", "twitch", "vimeo", "other"]>>;
    requireEventCode: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    streamType: "byo_hls" | "external_embed" | "mux_playback";
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    requireEventCode?: boolean | undefined;
}, {
    streamType: "byo_hls" | "external_embed" | "mux_playback";
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    requireEventCode?: boolean | undefined;
}>;
export declare const CreateWatchOrgSchema: z.ZodObject<{
    shortName: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    shortName: string;
}, {
    name: string;
    shortName: string;
}>;
export declare const CreateWatchChannelSchema: z.ZodEffects<z.ZodObject<{
    teamSlug: z.ZodString;
    displayName: z.ZodString;
    accessMode: z.ZodEnum<["public_free", "pay_per_view"]>;
    priceCents: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    requireEventCode: z.ZodOptional<z.ZodBoolean>;
    streamType: z.ZodEnum<["mux_playback", "byo_hls", "external_embed"]>;
    muxPlaybackId: z.ZodOptional<z.ZodString>;
    hlsManifestUrl: z.ZodOptional<z.ZodString>;
    externalEmbedUrl: z.ZodOptional<z.ZodString>;
    externalProvider: z.ZodOptional<z.ZodEnum<["youtube", "twitch", "vimeo", "other"]>>;
}, "strip", z.ZodTypeAny, {
    streamType: "byo_hls" | "external_embed" | "mux_playback";
    teamSlug: string;
    displayName: string;
    accessMode: "public_free" | "pay_per_view";
    currency?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    requireEventCode?: boolean | undefined;
    priceCents?: number | undefined;
}, {
    streamType: "byo_hls" | "external_embed" | "mux_playback";
    teamSlug: string;
    displayName: string;
    accessMode: "public_free" | "pay_per_view";
    currency?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    requireEventCode?: boolean | undefined;
    priceCents?: number | undefined;
}>, {
    streamType: "byo_hls" | "external_embed" | "mux_playback";
    teamSlug: string;
    displayName: string;
    accessMode: "public_free" | "pay_per_view";
    currency?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    requireEventCode?: boolean | undefined;
    priceCents?: number | undefined;
}, {
    streamType: "byo_hls" | "external_embed" | "mux_playback";
    teamSlug: string;
    displayName: string;
    accessMode: "public_free" | "pay_per_view";
    currency?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    requireEventCode?: boolean | undefined;
    priceCents?: number | undefined;
}>;
export declare const UpdateWatchChannelSchema: z.ZodEffects<z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    accessMode: z.ZodOptional<z.ZodEnum<["public_free", "pay_per_view"]>>;
    priceCents: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    requireEventCode: z.ZodOptional<z.ZodBoolean>;
    streamType: z.ZodOptional<z.ZodEnum<["mux_playback", "byo_hls", "external_embed"]>>;
    muxPlaybackId: z.ZodOptional<z.ZodString>;
    hlsManifestUrl: z.ZodOptional<z.ZodString>;
    externalEmbedUrl: z.ZodOptional<z.ZodString>;
    externalProvider: z.ZodOptional<z.ZodEnum<["youtube", "twitch", "vimeo", "other"]>>;
}, "strip", z.ZodTypeAny, {
    currency?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    streamType?: "byo_hls" | "external_embed" | "mux_playback" | undefined;
    requireEventCode?: boolean | undefined;
    displayName?: string | undefined;
    accessMode?: "public_free" | "pay_per_view" | undefined;
    priceCents?: number | undefined;
}, {
    currency?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    streamType?: "byo_hls" | "external_embed" | "mux_playback" | undefined;
    requireEventCode?: boolean | undefined;
    displayName?: string | undefined;
    accessMode?: "public_free" | "pay_per_view" | undefined;
    priceCents?: number | undefined;
}>, {
    currency?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    streamType?: "byo_hls" | "external_embed" | "mux_playback" | undefined;
    requireEventCode?: boolean | undefined;
    displayName?: string | undefined;
    accessMode?: "public_free" | "pay_per_view" | undefined;
    priceCents?: number | undefined;
}, {
    currency?: string | undefined;
    muxPlaybackId?: string | undefined;
    hlsManifestUrl?: string | undefined;
    externalEmbedUrl?: string | undefined;
    externalProvider?: "youtube" | "twitch" | "vimeo" | "other" | undefined;
    streamType?: "byo_hls" | "external_embed" | "mux_playback" | undefined;
    requireEventCode?: boolean | undefined;
    displayName?: string | undefined;
    accessMode?: "public_free" | "pay_per_view" | undefined;
    priceCents?: number | undefined;
}>;
export declare const CreateWatchEventCodeSchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
//# sourceMappingURL=WatchLinkSchema.d.ts.map