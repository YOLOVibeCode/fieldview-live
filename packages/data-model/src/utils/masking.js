"use strict";
/**
 * Email Masking Utility
 *
 * Masks email addresses for privacy (e.g., j***@example.com).
 * Used for owner audience views (SuperAdmin sees full email).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskEmail = maskEmail;
function maskEmail(email) {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain)
        return '***@***';
    if (localPart.length <= 1) {
        return `***@${domain}`;
    }
    return `${localPart[0]}***@${domain}`;
}
//# sourceMappingURL=masking.js.map