import { describe, expect, it } from 'vitest';

import { parsePhoneToE164 } from '../phone';

describe('parsePhoneToE164', () => {
  it('normalizes US numbers to E.164', () => {
    expect(parsePhoneToE164('5125550100')).toBe('+15125550100');
  });

  it('accepts already E.164', () => {
    expect(parsePhoneToE164('+15125550100')).toBe('+15125550100');
  });

  it('throws on invalid input', () => {
    expect(() => parsePhoneToE164('not-a-phone')).toThrow();
  });
});
