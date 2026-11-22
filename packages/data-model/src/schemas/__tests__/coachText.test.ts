import { describe, expect, it } from 'vitest';

// Imported file by file on purpose: src/index and src/schemas/index have stale compiled
// siblings in this package, and a test must exercise the TypeScript source.
import {
  SMS_OWNER_CONSENT_TEXT_VERSION,
  SMS_PRODUCT_NUMBER_E164,
  SMS_PURPOSE_OWNER_COMMANDS,
  SMS_PURPOSE_VIEWER_NOTIFICATIONS,
  buildOwnerCommandsConsentPlain,
} from '../../sms/compliance';
import {
  COACH_TEXT_LINK_STATES,
  CoachTextHistoryQuerySchema,
  CoachTextLinkStartedSchema,
  CoachTextQuestionSchema,
  CoachTextStatusSchema,
  StartCoachTextLinkSchema,
  UpdateCoachTextSettingsSchema,
  isIanaTimeZone,
} from '../coachText';

describe('coach text: compliance constants', () => {
  it('keeps owner commands apart from viewer alerts', () => {
    expect(SMS_PURPOSE_OWNER_COMMANDS).toBe('owner_commands');
    expect(SMS_PURPOSE_OWNER_COMMANDS).not.toBe(SMS_PURPOSE_VIEWER_NOTIFICATIONS);
  });

  it('exposes the product number in E.164', () => {
    expect(SMS_PRODUCT_NUMBER_E164).toMatch(/^\+1\d{10}$/);
  });

  it('versions the owner consent wording', () => {
    expect(SMS_OWNER_CONSENT_TEXT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('words the owner consent with the program disclosures', () => {
    const text = buildOwnerCommandsConsentPlain();
    expect(text).toContain('FieldView.Live');
    expect(text).toContain('Message frequency varies.');
    expect(text).toContain('Message and data rates may apply.');
    expect(text).toContain('Reply STOP to pause, HELP for help.');
  });
});

describe('isIanaTimeZone', () => {
  it.each(['America/Chicago', 'America/Los_Angeles', 'America/Argentina/Buenos_Aires', 'UTC'])(
    'accepts %s',
    (zone) => {
      expect(isIanaTimeZone(zone)).toBe(true);
    },
  );

  it.each(['', 'Mars/Olympus', '+05:00', 'America/Chicago; DROP', 'x'.repeat(65)])(
    'rejects %j',
    (zone) => {
      expect(isIanaTimeZone(zone)).toBe(false);
    },
  );
});

describe('StartCoachTextLinkSchema', () => {
  it('accepts a phone as the coach typed it', () => {
    const parsed = StartCoachTextLinkSchema.parse({ phone: '(214) 555-0100' });
    expect(parsed).toEqual({ phone: '(214) 555-0100' });
  });

  it('accepts a known time zone', () => {
    const parsed = StartCoachTextLinkSchema.parse({ phone: '2145550100', timeZone: 'America/Chicago' });
    expect(parsed.timeZone).toBe('America/Chicago');
  });

  it('rejects an empty phone', () => {
    expect(StartCoachTextLinkSchema.safeParse({ phone: '' }).success).toBe(false);
  });

  it('rejects a phone that is too long', () => {
    expect(StartCoachTextLinkSchema.safeParse({ phone: '1'.repeat(33) }).success).toBe(false);
  });

  it('rejects an unknown time zone', () => {
    expect(StartCoachTextLinkSchema.safeParse({ phone: '2145550100', timeZone: 'Nowhere/Land' }).success).toBe(
      false,
    );
  });
});

describe('UpdateCoachTextSettingsSchema', () => {
  it('requires a time zone', () => {
    expect(UpdateCoachTextSettingsSchema.safeParse({}).success).toBe(false);
    expect(UpdateCoachTextSettingsSchema.safeParse({ timeZone: 'America/Denver' }).success).toBe(true);
  });
});

describe('CoachTextHistoryQuerySchema', () => {
  it('defaults the limit to 20', () => {
    expect(CoachTextHistoryQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it('coerces a query string', () => {
    expect(CoachTextHistoryQuerySchema.parse({ limit: '5' })).toEqual({ limit: 5 });
  });

  it.each(['0', '51', 'abc', '2.5'])('rejects limit %s', (limit) => {
    expect(CoachTextHistoryQuerySchema.safeParse({ limit }).success).toBe(false);
  });
});

describe('CoachTextStatusSchema', () => {
  const status = {
    enabled: true,
    state: 'pending',
    productNumber: '+18773435308',
    phoneMasked: null,
    pendingPhoneMasked: '(***) ***-0100',
    codeExpiresAt: '2026-11-22T01:10:00.000Z',
    unverifiedTextSeen: false,
    verifiedAt: null,
    lastCommandAt: null,
    timeZone: 'America/Chicago',
    commands: [],
  };

  it('parses a status answer', () => {
    expect(CoachTextStatusSchema.parse(status)).toEqual(status);
  });

  it('knows exactly five states', () => {
    expect([...COACH_TEXT_LINK_STATES]).toEqual(['none', 'pending', 'linked', 'paused', 'expired']);
    expect(CoachTextStatusSchema.safeParse({ ...status, state: 'active' }).success).toBe(false);
  });
});

describe('CoachTextLinkStartedSchema', () => {
  it('requires a six-digit code', () => {
    const started = {
      code: '482913',
      codeExpiresAt: '2026-11-22T01:10:00.000Z',
      productNumber: '+18773435308',
      smsHref: 'sms:+18773435308?&body=LINK%20482913',
    };
    expect(CoachTextLinkStartedSchema.safeParse(started).success).toBe(true);
    expect(CoachTextLinkStartedSchema.safeParse({ ...started, code: '48291' }).success).toBe(false);
  });
});

describe('CoachTextQuestionSchema', () => {
  const question = {
    v: 1,
    kind: 'pick_stream',
    options: [
      { n: 1, label: 'Diablos - Sporting, started 7:02 PM', streamUrl: 'https://example.com/live.m3u8' },
      { n: 2, label: 'New page "Diablos - Sporting", starting now', create: true },
    ],
  };

  it('parses a stored question', () => {
    expect(CoachTextQuestionSchema.parse(question)).toEqual(question);
  });

  it('rejects another version', () => {
    expect(CoachTextQuestionSchema.safeParse({ ...question, v: 2 }).success).toBe(false);
  });

  it('never stores option 0, which always means none of these', () => {
    const withZero = { ...question, options: [{ n: 0, label: 'None of these' }] };
    expect(CoachTextQuestionSchema.safeParse(withZero).success).toBe(false);
  });

  it('rejects a question with no options', () => {
    expect(CoachTextQuestionSchema.safeParse({ ...question, options: [] }).success).toBe(false);
  });
});
