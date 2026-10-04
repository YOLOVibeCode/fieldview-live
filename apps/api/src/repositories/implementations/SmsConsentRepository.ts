import type { PrismaClient, SmsConsent } from '@prisma/client';

import type {
  ISmsConsentReader,
  ISmsConsentWriter,
  RecordSmsConsentInput,
} from '../ISmsConsentRepository';

export class SmsConsentRepository implements ISmsConsentReader, ISmsConsentWriter {
  constructor(private prisma: PrismaClient) {}

  async getByPhoneAndPurpose(phoneE164: string, purpose: string): Promise<SmsConsent | null> {
    return this.prisma.smsConsent.findUnique({
      where: { phoneE164_purpose: { phoneE164, purpose } },
    });
  }

  async hasActiveConsent(phoneE164: string, purpose: string): Promise<boolean> {
    const row = await this.getByPhoneAndPurpose(phoneE164, purpose);
    if (!row || row.pendingConfirmation) {
      return false;
    }
    if (row.revokedAt) {
      return false;
    }
    return Boolean(row.consentedAt);
  }

  async recordConsent(input: RecordSmsConsentInput): Promise<SmsConsent> {
    const now = input.consentedAt ?? new Date();
    return this.prisma.smsConsent.upsert({
      where: { phoneE164_purpose: { phoneE164: input.phoneE164, purpose: input.purpose } },
      create: {
        phoneE164: input.phoneE164,
        purpose: input.purpose,
        consentTextVersion: input.consentTextVersion,
        source: input.source,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        consentedAt: input.pendingConfirmation ? null : now,
        revokedAt: null,
        pendingConfirmation: input.pendingConfirmation ?? false,
        addedByLabel: input.addedByLabel ?? null,
      },
      update: {
        consentTextVersion: input.consentTextVersion,
        source: input.source,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        consentedAt: input.pendingConfirmation ? null : now,
        revokedAt: null,
        pendingConfirmation: input.pendingConfirmation ?? false,
        addedByLabel: input.addedByLabel ?? null,
      },
    });
  }

  async revokeConsent(phoneE164: string, purpose: string): Promise<void> {
    const existing = await this.getByPhoneAndPurpose(phoneE164, purpose);
    if (!existing) {
      await this.prisma.smsConsent.create({
        data: {
          phoneE164,
          purpose,
          consentTextVersion: '',
          source: 'inbound-stop',
          revokedAt: new Date(),
        },
      });
      return;
    }
    await this.prisma.smsConsent.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
  }

  async confirmPendingConsent(phoneE164: string, purpose: string, source: string): Promise<void> {
    const existing = await this.getByPhoneAndPurpose(phoneE164, purpose);
    if (!existing) {
      await this.prisma.smsConsent.create({
        data: {
          phoneE164,
          purpose,
          consentTextVersion: '',
          source,
          consentedAt: new Date(),
          pendingConfirmation: false,
          revokedAt: null,
        },
      });
      return;
    }
    await this.prisma.smsConsent.update({
      where: { id: existing.id },
      data: {
        source,
        consentedAt: new Date(),
        pendingConfirmation: false,
        revokedAt: null,
      },
    });
  }

  async clearRevocation(phoneE164: string, purpose: string): Promise<void> {
    const existing = await this.getByPhoneAndPurpose(phoneE164, purpose);
    if (!existing) {
      return;
    }
    await this.prisma.smsConsent.update({
      where: { id: existing.id },
      data: { revokedAt: null },
    });
  }
}
