import { describe, expect, it } from 'vitest';

import { BadRequestError } from '../errors';
import {
  formatNanpForDisplay,
  maskPhoneE164,
  parsePhoneToE164,
  parseUsCanadaPhoneToE164,
} from '../phone';

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

describe('parseUsCanadaPhoneToE164', () => {
  it('normalizes a US number as a person types it', () => {
    expect(parseUsCanadaPhoneToE164('(214) 555-0100')).toBe('+12145550100');
    expect(parseUsCanadaPhoneToE164(' 214.555.0100 ')).toBe('+12145550100');
  });

  it('takes a Canadian number', () => {
    expect(parseUsCanadaPhoneToE164('+14165550123')).toBe('+14165550123');
  });

  it('takes a US toll-free number', () => {
    expect(parseUsCanadaPhoneToE164('+18005550199')).toBe('+18005550199');
  });

  it.each(['+18765550100', '+12425550100', '+442079460958'])(
    'refuses %s, which is not a US or Canadian number',
    (input) => {
      expect(() => parseUsCanadaPhoneToE164(input)).toThrow(BadRequestError);
    }
  );

  it.each(['', '   ', 'not-a-phone', '555-0100'])('refuses %j', (input) => {
    expect(() => parseUsCanadaPhoneToE164(input)).toThrow(BadRequestError);
  });
});

describe('maskPhoneE164', () => {
  it('shows the last four digits only', () => {
    expect(maskPhoneE164('+12145550100')).toBe('(***) ***-0100');
  });

  it('shows nothing of a value too short to mask', () => {
    expect(maskPhoneE164('+123')).toBe('(***) ***-****');
    expect(maskPhoneE164('')).toBe('(***) ***-****');
  });
});

describe('formatNanpForDisplay', () => {
  it('writes a +1 number the way people read it', () => {
    expect(formatNanpForDisplay('+18773435308')).toBe('(877) 343-5308');
  });

  it('leaves any other value as it is', () => {
    expect(formatNanpForDisplay('+442079460958')).toBe('+442079460958');
  });
});
