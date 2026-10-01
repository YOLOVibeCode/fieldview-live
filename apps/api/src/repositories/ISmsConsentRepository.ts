import type { SmsConsent } from '@prisma/client';

export interface RecordSmsConsentInput {
  phoneE164: string;
  purpose: string;
  consentTextVersion: string;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  consentedAt?: Date;
  pendingConfirmation?: boolean;
  addedByLabel?: string;
}

export interface ISmsConsentReader {
  getByPhoneAndPurpose(phoneE164: string, purpose: string): Promise<SmsConsent | null>;
  hasActiveConsent(phoneE164: string, purpose: string): Promise<boolean>;
}

export interface ISmsConsentWriter {
  recordConsent(input: RecordSmsConsentInput): Promise<SmsConsent>;
  revokeConsent(phoneE164: string, purpose: string): Promise<void>;
  confirmPendingConsent(phoneE164: string, purpose: string, source: string): Promise<void>;
  clearRevocation(phoneE164: string, purpose: string): Promise<void>;
}
