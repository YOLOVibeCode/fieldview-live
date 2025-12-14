/**
 * SMS Service Interfaces (ISP)
 * 
 * Segregated interfaces for SMS operations.
 */

import type { Game } from '@prisma/client';

/**
 * Reader Interface (ISP)
 * 
 * Focused on reading SMS-related data.
 */
export interface ISmsReader {
  findByKeyword(keyword: string): Promise<Game | null>;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on writing SMS operations.
 */
export interface ISmsWriter {
  sendPaymentLink(gameId: string, phoneE164: string, paymentLink: string): Promise<void>;
  sendNotification(phoneE164: string, message: string): Promise<void>;
  handleStop(phoneE164: string): Promise<void>;
  handleHelp(phoneE164: string): Promise<void>;
  logSmsMessage(data: {
    direction: 'inbound' | 'outbound';
    phoneE164: string;
    keywordCode?: string;
    gameId?: string;
    messageBody: string;
    status: string;
  }): Promise<void>;
}
