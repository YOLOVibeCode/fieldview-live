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
  AddCoachTextPhoneSchema,
  COACH_TEXT_MAX_ACCOUNTS_PER_PHONE,
  COACH_TEXT_MAX_PHONES_PER_LOGIN,
  COACH_TEXT_PHONE_STATES,
  CoachTextHistoryItemSchema,
  CoachTextHistoryQuerySchema,
  CoachTextPhoneCodeSchema,
  CoachTextQuestionSchema,
  CoachTextStatusSchema,
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

describe('coach text limits', () => {
  it('lets a login add ten phones', () => {
    expect(COACH_TEXT_MAX_PHONES_PER_LOGIN).toBe(10);
  });

  it('lets a phone work with nine accounts, one for each answer digit', () => {
    expect(COACH_TEXT_MAX_ACCOUNTS_PER_PHONE).toBe(9);
  });
});

describe('AddCoachTextPhoneSchema', () => {
  it("accepts a person's name and a phone as the coach typed it", () => {
    const parsed = AddCoachTextPhoneSchema.parse({ label: 'Jordan', phone: '(214) 555-0100' });
    expect(parsed).toEqual({ label: 'Jordan', phone: '(214) 555-0100' });
  });

  it('trims the name', () => {
    expect(AddCoachTextPhoneSchema.parse({ label: '  Coach Mike ', phone: '2145550100' }).label).toBe('Coach Mike');
  });

  it.each(['', '   ', 'x'.repeat(41), 'Jor\ndan', 'Jor\u0000dan'])('rejects the name %j', (label) => {
    expect(AddCoachTextPhoneSchema.safeParse({ label, phone: '2145550100' }).success).toBe(false);
  });

  it('accepts a name of forty characters', () => {
    expect(AddCoachTextPhoneSchema.safeParse({ label: 'x'.repeat(40), phone: '2145550100' }).success).toBe(true);
  });

  it('rejects an empty phone', () => {
    expect(AddCoachTextPhoneSchema.safeParse({ label: 'Jordan', phone: '' }).success).toBe(false);
  });

  it('rejects a phone that is too long', () => {
    expect(AddCoachTextPhoneSchema.safeParse({ label: 'Jordan', phone: '1'.repeat(33) }).success).toBe(false);
  });

  it('rejects a missing name', () => {
    expect(AddCoachTextPhoneSchema.safeParse({ phone: '2145550100' }).success).toBe(false);
  });

  it("takes the browser's time zone when it is a known one", () => {
    const parsed = AddCoachTextPhoneSchema.parse({ label: 'Jordan', phone: '2145550100', timeZone: 'America/Denver' });
    expect(parsed.timeZone).toBe('America/Denver');
    expect(
      AddCoachTextPhoneSchema.safeParse({ label: 'Jordan', phone: '2145550100', timeZone: 'Nowhere/Land' }).success
    ).toBe(false);
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
  const linked = {
    id: '2f1c4f0e-8a51-4e43-9d0b-7b8d1c2e3f40',
    label: 'Ricardo',
    phoneMasked: '(***) ***-0100',
    state: 'linked',
    codeExpiresAt: null,
    verifiedAt: '2026-11-22T01:05:00.000Z',
    lastCommandAt: '2026-11-22T01:05:00.000Z',
    unverifiedTextSeen: false,
  };
  const waiting = {
    id: '6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d',
    label: 'Jordan',
    phoneMasked: '(***) ***-0142',
    state: 'pending',
    codeExpiresAt: '2026-11-22T01:10:00.000Z',
    verifiedAt: null,
    lastCommandAt: null,
    unverifiedTextSeen: true,
  };
  const status = {
    enabled: true,
    productNumber: '+18773435308',
    timeZone: 'America/Chicago',
    maxPhones: 10,
    phones: [linked, waiting],
    commands: [],
  };

  it('parses a status answer with several phones', () => {
    expect(CoachTextStatusSchema.parse(status)).toEqual(status);
  });

  it('parses an account with no phones yet', () => {
    expect(CoachTextStatusSchema.parse({ ...status, phones: [] }).phones).toEqual([]);
  });

  it('knows exactly four phone states', () => {
    expect([...COACH_TEXT_PHONE_STATES]).toEqual(['pending', 'linked', 'paused', 'expired']);
    const unknown = { ...status, phones: [{ ...linked, state: 'active' }] };
    expect(CoachTextStatusSchema.safeParse(unknown).success).toBe(false);
  });

  it('rejects a phone row without an id', () => {
    const { id: _id, ...noId } = linked;
    expect(CoachTextStatusSchema.safeParse({ ...status, phones: [noId] }).success).toBe(false);
  });
});

describe('CoachTextPhoneCodeSchema', () => {
  const code = {
    id: '6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d',
    code: '482913',
    codeExpiresAt: '2026-11-22T01:10:00.000Z',
    productNumber: '+18773435308',
    smsHref: 'sms:+18773435308?&body=LINK%20482913',
  };

  it('names the phone and carries a six-digit code', () => {
    expect(CoachTextPhoneCodeSchema.safeParse(code).success).toBe(true);
    expect(CoachTextPhoneCodeSchema.safeParse({ ...code, code: '48291' }).success).toBe(false);
    const { id: _id, ...noId } = code;
    expect(CoachTextPhoneCodeSchema.safeParse(noId).success).toBe(false);
  });
});

describe('CoachTextHistoryItemSchema', () => {
  it("carries the name of the phone that sent the text, or null when it isn't known", () => {
    const item = {
      createdAt: '2026-11-22T01:05:00.000Z',
      body: 'LINK ******',
      status: 'done',
      replyText: 'This phone now runs text commands for Tigers FC.',
      phoneLabel: 'Jordan',
    };
    expect(CoachTextHistoryItemSchema.parse(item)).toEqual(item);
    expect(CoachTextHistoryItemSchema.parse({ ...item, phoneLabel: null }).phoneLabel).toBeNull();
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

  it('stores which account each option of an account question stands for', () => {
    const pickAccount = {
      v: 1,
      kind: 'pick_account',
      options: [
        { n: 1, label: 'Tigers FC', linkId: '2f1c4f0e-8a51-4e43-9d0b-7b8d1c2e3f40' },
        { n: 2, label: 'Hawks FC', linkId: '6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d' },
      ],
    };
    expect(CoachTextQuestionSchema.parse(pickAccount)).toEqual(pickAccount);
    const badLink = { ...pickAccount, options: [{ n: 1, label: 'Tigers FC', linkId: 'not-a-uuid' }] };
    expect(CoachTextQuestionSchema.safeParse(badLink).success).toBe(false);
  });
});
