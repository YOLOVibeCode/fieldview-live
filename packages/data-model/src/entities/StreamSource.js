"use strict";
/**
 * StreamSource Entity
 *
 * Supports monetizing "any media stream":
 * - Mux-managed (preferred, strong protection)
 * - BYO HLS (moderate protection)
 * - BYO RTMP (routes to Mux, strong protection)
 * - External embed (best-effort protection)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STREAM_SOURCE_PROTECTION = void 0;
/**
 * Protection level mapping per stream source type
 */
exports.STREAM_SOURCE_PROTECTION = {
    mux_managed: 'strong',
    byo_rtmp: 'strong', // Routes to Mux, same protection
    byo_hls: 'moderate', // Depends on proxy/signing
    external_embed: 'best_effort', // Limited protection
};
//# sourceMappingURL=StreamSource.js.map