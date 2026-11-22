import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function parsePhoneToE164(input: string, defaultRegion: 'US' = 'US'): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Phone number is required');
  }
  const parsed = parsePhoneNumberFromString(trimmed, defaultRegion);
  if (!parsed?.isValid()) {
    throw new Error('Enter a valid phone number');
  }
  return parsed.format('E.164');
}

/**
 * A phone number the way people write it: "(877) 343-5308" for a US or Canadian number,
 * the international form for any other. Text that is not a whole phone number, such as a
 * masked one, comes back as it was given.
 */
export function formatPhoneForDisplay(input: string): string {
  const parsed = parsePhoneNumberFromString(input.trim(), 'US');
  if (!parsed?.isValid()) {
    return input;
  }
  return parsed.countryCallingCode === '1' ? parsed.formatNational() : parsed.formatInternational();
}
