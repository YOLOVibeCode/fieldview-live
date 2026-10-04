import { parsePhoneNumberFromString } from 'libphonenumber-js';

import { BadRequestError } from './errors';

/** Normalize user input to E.164 (default region US). */
export function parsePhoneToE164(input: string, defaultRegion: 'US' = 'US'): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new BadRequestError('Phone number is required');
  }
  const parsed = parsePhoneNumberFromString(trimmed, defaultRegion);
  if (!parsed?.isValid()) {
    throw new BadRequestError('Valid phone number required (E.164)');
  }
  return parsed.format('E.164');
}

/** Parse inbound Twilio From field; returns input if already valid E.164. */
export function normalizeInboundPhone(from: string): string {
  const trimmed = from.trim();
  if (/^\+[1-9]\d{1,14}$/.test(trimmed)) {
    return trimmed;
  }
  return parsePhoneToE164(trimmed);
}
