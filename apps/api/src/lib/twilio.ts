/**
 * Twilio Client
 * 
 * Initializes and exports Twilio client instance.
 */

import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

export const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const twilioPhoneNumber = TWILIO_PHONE_NUMBER;

export function validateTwilioRequest(
  authToken: string,
  signature: string | undefined,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature) {
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}
