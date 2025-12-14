/**
 * SMS Service Implementation
 * 
 * Implements ISmsReader and ISmsWriter.
 * Handles Twilio SMS integration, keyword routing, STOP/HELP compliance.
 */

import type { Game } from '@prisma/client';

import { twilioClient, twilioPhoneNumber } from '../lib/twilio';
import type { IGameReader } from '../repositories/IGameRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '../repositories/IViewerIdentityRepository';

import type { ISmsReader, ISmsWriter } from './ISmsService';

const HELP_MESSAGE = 'Text a game keyword to receive a payment link. Reply STOP to unsubscribe.';

export class SmsService implements ISmsReader, ISmsWriter {
  constructor(
    private gameReader: IGameReader,
    private viewerIdentityReader: IViewerIdentityReader,
    private viewerIdentityWriter: IViewerIdentityWriter
  ) {}

  async findByKeyword(keyword: string): Promise<Game | null> {
    // Normalize keyword (uppercase, trim)
    const normalizedKeyword = keyword.trim().toUpperCase();
    return this.gameReader.getByKeywordCode(normalizedKeyword);
  }

  async sendPaymentLink(gameId: string, phoneE164: string, paymentLink: string): Promise<void> {
    // Check if viewer has opted out
    const viewer = await this.viewerIdentityReader.getByPhone(phoneE164);
    if (viewer?.smsOptOut) {
      throw new Error('Viewer has opted out of SMS');
    }

    // Send SMS via Twilio
    const message = `Click here to purchase access: ${paymentLink}`;
    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneE164,
    });

    // Log outbound SMS
    await this.logSmsMessage({
      direction: 'outbound',
      phoneE164,
      gameId,
      messageBody: message,
      status: 'sent',
    });
  }

  async sendNotification(phoneE164: string, message: string): Promise<void> {
    // Check if viewer has opted out
    const viewer = await this.viewerIdentityReader.getByPhone(phoneE164);
    if (viewer?.smsOptOut) {
      return; // Silently skip if opted out
    }

    // Send SMS via Twilio
    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneE164,
    });

    // Log outbound SMS
    await this.logSmsMessage({
      direction: 'outbound',
      phoneE164,
      messageBody: message,
      status: 'sent',
    });
  }

  async handleStop(phoneE164: string): Promise<void> {
    // Find or create viewer identity
    let viewer = await this.viewerIdentityReader.getByPhone(phoneE164);

    if (!viewer) {
      // Create viewer identity with phone only (email not required for STOP)
      viewer = await this.viewerIdentityWriter.create({
        email: `${phoneE164}@sms.optout`, // Placeholder email
        phoneE164,
      });
    }

    // Update opt-out status
    await this.viewerIdentityWriter.update(viewer.id, {
      smsOptOut: true,
      optOutAt: new Date(),
    });

    // Log inbound SMS (STOP)
    await this.logSmsMessage({
      direction: 'inbound',
      phoneE164,
      messageBody: 'STOP',
      status: 'received',
    });
  }

  async handleHelp(phoneE164: string): Promise<void> {
    // Send HELP response via Twilio
    await twilioClient.messages.create({
      body: HELP_MESSAGE,
      from: twilioPhoneNumber,
      to: phoneE164,
    });

    // Log outbound SMS (HELP response)
    await this.logSmsMessage({
      direction: 'outbound',
      phoneE164,
      messageBody: HELP_MESSAGE,
      status: 'sent',
    });
  }

  async logSmsMessage(_data: {
    direction: 'inbound' | 'outbound';
    phoneE164: string;
    keywordCode?: string;
    gameId?: string;
    messageBody: string;
    status: string;
  }): Promise<void> {
    // TODO: Implement SMS message logging to database
    // For now, this is a no-op (logging can be added later)
    // In production, this would write to a SmsMessage table
  }
}
