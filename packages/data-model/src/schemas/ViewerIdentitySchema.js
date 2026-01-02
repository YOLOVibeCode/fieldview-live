"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewerIdentitySchema = void 0;
const zod_1 = require("zod");
/**
 * ViewerIdentity Zod Schema
 *
 * Email is required for viewer identity and monitoring.
 * Phone number is optional (E.164 format).
 */
exports.ViewerIdentitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(), // Required
    phoneE164: zod_1.z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
    smsOptOut: zod_1.z.boolean(),
    optOutAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    lastSeenAt: zod_1.z.date().optional(),
});
//# sourceMappingURL=ViewerIdentitySchema.js.map