/**
 * ViewerIdentity Entity
 *
 * Viewer is identified by email address (required).
 * Phone number is optional (used for SMS delivery).
 */
export interface ViewerIdentity {
    id: string;
    email: string;
    phoneE164?: string;
    smsOptOut: boolean;
    optOutAt?: Date;
    createdAt: Date;
    lastSeenAt?: Date;
}
//# sourceMappingURL=ViewerIdentity.d.ts.map