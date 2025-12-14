/**
 * Email Masking Utility
 * 
 * Masks email addresses for privacy (e.g., j***@example.com).
 * Used for owner audience views (SuperAdmin sees full email).
 */

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***@***';
  
  if (localPart.length <= 1) {
    return `***@${domain}`;
  }
  
  return `${localPart[0]}***@${domain}`;
}
