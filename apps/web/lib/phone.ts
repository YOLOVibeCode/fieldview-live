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
