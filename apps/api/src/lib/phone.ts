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

/**
 * Normalize user input to E.164, US and Canadian numbers only. Other +1
 * countries are refused, because FieldView texts only the US and Canada.
 */
export function parseUsCanadaPhoneToE164(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new BadRequestError('Phone number is required');
  }
  const parsed = parsePhoneNumberFromString(trimmed, 'US');
  if (!parsed?.isValid() || (parsed.country !== 'US' && parsed.country !== 'CA')) {
    throw new BadRequestError('Enter a valid US or Canadian mobile number');
  }
  return parsed.format('E.164');
}

/** `+12145550100` becomes `(***) ***-0100`. Safe to show and to log. */
export function maskPhoneE164(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  const lastFour = digits.length >= 10 ? digits.slice(-4) : '****';
  return `(***) ***-${lastFour}`;
}

/** `+18773435308` becomes `(877) 343-5308`. Other values come back unchanged. */
export function formatNanpForDisplay(phoneE164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phoneE164);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phoneE164;
}

/** Parse inbound Twilio From field; returns input if already valid E.164. */
export function normalizeInboundPhone(from: string): string {
  const trimmed = from.trim();
  if (/^\+[1-9]\d{1,14}$/.test(trimmed)) {
    return trimmed;
  }
  return parsePhoneToE164(trimmed);
}
