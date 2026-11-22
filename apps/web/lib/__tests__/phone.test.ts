import { describe, expect, it } from 'vitest';

import { formatPhoneForDisplay } from '../phone';

describe('formatPhoneForDisplay', () => {
  it('shows a US number the way people write it', () => {
    expect(formatPhoneForDisplay('+18773435308')).toBe('(877) 343-5308');
  });

  it('reads a number typed without the country code', () => {
    expect(formatPhoneForDisplay('214-555-0100')).toBe('(214) 555-0100');
    expect(formatPhoneForDisplay(' 2145550100 ')).toBe('(214) 555-0100');
  });

  it('shows a Canadian number the same way', () => {
    expect(formatPhoneForDisplay('+14165550123')).toBe('(416) 555-0123');
  });

  it('keeps the country code of a number from anywhere else', () => {
    expect(formatPhoneForDisplay('+442079460958')).toBe('+44 20 7946 0958');
  });

  it('leaves anything it cannot read as it was given', () => {
    expect(formatPhoneForDisplay('(***) ***-0100')).toBe('(***) ***-0100');
    expect(formatPhoneForDisplay('not a phone')).toBe('not a phone');
    expect(formatPhoneForDisplay('')).toBe('');
  });
});
