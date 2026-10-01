import {
  SMS_BRAND,
  SMS_CONSENT_TEXT_VERSION,
  SMS_PURPOSE_PHRASE,
  SMS_PURPOSE_VIEWER_NOTIFICATIONS,
} from '@fieldview/data-model';

import { ensureBrandPrefix, relaySmsSend } from '../lib/sms/RelaySmsClient';
import { prisma } from '../lib/prisma';
import type { ISmsConsentReader, ISmsConsentWriter } from '../repositories/ISmsConsentRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../repositories/IViewerIdentityRepository';

import { logger } from '../lib/logger';

export interface SmsSendOptions {
  phoneE164: string;
  body: string;
  purpose: string;
  gameId?: string;
  skipConsentCheck?: boolean;
}

export class SmsComplianceService {
  constructor(
    private consentReader: ISmsConsentReader,
    private consentWriter: ISmsConsentWriter,
    private viewerReader: IViewerIdentityReader,
    private viewerWriter: IViewerIdentityWriter,
  ) {}

  async recordViewerConsent(params: {
    phoneE164: string;
    source: string;
    ipAddress?: string;
    userAgent?: string;
    purpose?: string;
  }): Promise<void> {
    await this.consentWriter.recordConsent({
      phoneE164: params.phoneE164,
      purpose: params.purpose ?? SMS_PURPOSE_VIEWER_NOTIFICATIONS,
      consentTextVersion: SMS_CONSENT_TEXT_VERSION,
      source: params.source,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      consentedAt: new Date(),
      pendingConfirmation: false,
    });
    const viewer = await this.viewerReader.getByPhone(params.phoneE164);
    if (viewer) {
      await this.viewerWriter.update(viewer.id, { smsOptOut: false });
    }
  }

  async sendThirdPartyConfirmation(params: {
    phoneE164: string;
    addedByLabel: string;
    purpose?: string;
  }): Promise<void> {
    const purpose = params.purpose ?? SMS_PURPOSE_VIEWER_NOTIFICATIONS;
    await this.consentWriter.recordConsent({
      phoneE164: params.phoneE164,
      purpose,
      consentTextVersion: SMS_CONSENT_TEXT_VERSION,
      source: 'third-party-pending',
      pendingConfirmation: true,
      addedByLabel: params.addedByLabel,
    });
    const body = `${SMS_BRAND}: ${params.addedByLabel} added this number for ${SMS_PURPOSE_PHRASE}. Reply YES to receive these texts. Reply STOP to opt out.`;
    await this.send({
      phoneE164: params.phoneE164,
      body,
      purpose,
      skipConsentCheck: true,
    });
  }

  async recordOptOut(phoneE164: string, purpose: string = SMS_PURPOSE_VIEWER_NOTIFICATIONS): Promise<void> {
    await this.consentWriter.revokeConsent(phoneE164, purpose);
    let viewer = await this.viewerReader.getByPhone(phoneE164);
    if (!viewer) {
      viewer = await this.viewerWriter.create({
        email: `${phoneE164.replace(/\D/g, '')}@sms.optout`,
        phoneE164,
      });
      await this.viewerWriter.update(viewer.id, { smsOptOut: true, optOutAt: new Date() });
      return;
    }
    await this.viewerWriter.update(viewer.id, { smsOptOut: true, optOutAt: new Date() });
  }

  async recordOptInFromStart(phoneE164: string, purpose: string = SMS_PURPOSE_VIEWER_NOTIFICATIONS): Promise<void> {
    await this.consentWriter.clearRevocation(phoneE164, purpose);
    const viewer = await this.viewerReader.getByPhone(phoneE164);
    if (viewer) {
      await this.viewerWriter.update(viewer.id, { smsOptOut: false });
    }
  }

  async confirmYesReply(phoneE164: string, purpose: string = SMS_PURPOSE_VIEWER_NOTIFICATIONS): Promise<void> {
    await this.consentWriter.confirmPendingConsent(phoneE164, purpose, 'reply-yes');
    const viewer = await this.viewerReader.getByPhone(phoneE164);
    if (viewer) {
      await this.viewerWriter.update(viewer.id, { smsOptOut: false });
    }
  }

  async send(options: SmsSendOptions): Promise<void> {
    const { phoneE164, purpose, gameId, skipConsentCheck } = options;
    const body = ensureBrandPrefix(options.body);

    const viewer = await this.viewerReader.getByPhone(phoneE164);
    if (viewer?.smsOptOut) {
      throw new Error('Recipient has opted out of SMS');
    }

    if (!skipConsentCheck) {
      const hasConsent = await this.consentReader.hasActiveConsent(phoneE164, purpose);
      if (!hasConsent) {
        throw new Error('No active SMS consent for this number');
      }
    }

    const result = await relaySmsSend(phoneE164, body);

    if (!result.ok) {
      if (result.optedOut) {
        await this.recordOptOut(phoneE164, purpose);
      }
      logger.error({ phoneE164, code: result.code, message: result.message }, 'Relay SMS send failed');
      throw new Error(`SMS send failed: ${result.message}`);
    }

    await prisma.sMSMessage.create({
      data: {
        direction: 'outbound',
        phoneE164,
        gameId: gameId ?? null,
        messageBody: body,
        status: 'sent',
        providerMessageId: result.messageSid || null,
      },
    });
  }

  async logInbound(params: {
    phoneE164: string;
    messageBody: string;
    keywordCode?: string;
    gameId?: string;
  }): Promise<void> {
    await prisma.sMSMessage.create({
      data: {
        direction: 'inbound',
        phoneE164: params.phoneE164,
        messageBody: params.messageBody,
        keywordCode: params.keywordCode ?? null,
        gameId: params.gameId ?? null,
        status: 'received',
      },
    });
  }
}
