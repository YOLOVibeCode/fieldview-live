/**
 * SMS Service — keyword routing and inbound handlers; sends via SmsComplianceService.
 */

import {
  SMS_PURPOSE_VIEWER_NOTIFICATIONS,
  buildInboundHelpTwimlBody,
} from '@fieldview/data-model';
import type { Game } from '@prisma/client';

import type { IGameReader } from '../repositories/IGameRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../repositories/IViewerIdentityRepository';
import { SmsConsentRepository } from '../repositories/implementations/SmsConsentRepository';
import { prisma } from '../lib/prisma';

import type { ISmsReader, ISmsWriter } from './ISmsService';
import { SmsComplianceService } from './SmsComplianceService';

export class SmsService implements ISmsReader, ISmsWriter {
  private compliance: SmsComplianceService;

  constructor(
    private gameReader: IGameReader,
    viewerIdentityReader: IViewerIdentityReader,
    viewerIdentityWriter: IViewerIdentityWriter,
    compliance?: SmsComplianceService,
  ) {
    const consentRepo = new SmsConsentRepository(prisma);
    this.compliance =
      compliance ??
      new SmsComplianceService(consentRepo, consentRepo, viewerIdentityReader, viewerIdentityWriter);
  }

  getComplianceService(): SmsComplianceService {
    return this.compliance;
  }

  async findByKeyword(keyword: string): Promise<Game | null> {
    const normalizedKeyword = keyword.trim().toUpperCase();
    return this.gameReader.getByKeywordCode(normalizedKeyword);
  }

  async sendPaymentLink(gameId: string, phoneE164: string, paymentLink: string): Promise<void> {
    const message = `Click here to purchase access: ${paymentLink}`;
    await this.compliance.send({
      phoneE164,
      body: message,
      purpose: SMS_PURPOSE_VIEWER_NOTIFICATIONS,
      gameId,
    });
  }

  async sendNotification(phoneE164: string, message: string): Promise<void> {
    try {
      await this.compliance.send({
        phoneE164,
        body: message,
        purpose: SMS_PURPOSE_VIEWER_NOTIFICATIONS,
      });
    } catch {
      // Skip silently when no consent (legacy NotificationService behavior)
    }
  }

  async handleStop(phoneE164: string): Promise<void> {
    await this.compliance.recordOptOut(phoneE164);
    await this.compliance.logInbound({ phoneE164, messageBody: 'STOP' });
  }

  async handleStart(phoneE164: string): Promise<void> {
    await this.compliance.recordOptInFromStart(phoneE164);
    await this.compliance.logInbound({ phoneE164, messageBody: 'START' });
  }

  async handleYes(phoneE164: string): Promise<void> {
    await this.compliance.confirmYesReply(phoneE164);
    await this.compliance.logInbound({ phoneE164, messageBody: 'YES' });
  }

  getHelpTwimlBody(): string {
    return buildInboundHelpTwimlBody();
  }

  async handleHelp(phoneE164: string): Promise<void> {
    await this.compliance.logInbound({ phoneE164, messageBody: 'HELP' });
  }

  async recordKeywordConsent(phoneE164: string): Promise<void> {
    await this.compliance.recordViewerConsent({
      phoneE164,
      source: 'inbound-keyword',
    });
  }

  async logSmsMessage(data: {
    direction: 'inbound' | 'outbound';
    phoneE164: string;
    keywordCode?: string;
    gameId?: string;
    messageBody: string;
    status: string;
  }): Promise<void> {
    if (data.direction === 'inbound') {
      await this.compliance.logInbound({
        phoneE164: data.phoneE164,
        messageBody: data.messageBody,
        keywordCode: data.keywordCode,
        gameId: data.gameId,
      });
    }
  }
}
