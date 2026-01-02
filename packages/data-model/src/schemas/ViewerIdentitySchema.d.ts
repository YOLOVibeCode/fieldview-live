import { z } from 'zod';
/**
 * ViewerIdentity Zod Schema
 *
 * Email is required for viewer identity and monitoring.
 * Phone number is optional (E.164 format).
 */
export declare const ViewerIdentitySchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    phoneE164: z.ZodOptional<z.ZodString>;
    smsOptOut: z.ZodBoolean;
    optOutAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodDate;
    lastSeenAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    email: string;
    smsOptOut: boolean;
    phoneE164?: string | undefined;
    optOutAt?: Date | undefined;
    lastSeenAt?: Date | undefined;
}, {
    id: string;
    createdAt: Date;
    email: string;
    smsOptOut: boolean;
    phoneE164?: string | undefined;
    optOutAt?: Date | undefined;
    lastSeenAt?: Date | undefined;
}>;
//# sourceMappingURL=ViewerIdentitySchema.d.ts.map