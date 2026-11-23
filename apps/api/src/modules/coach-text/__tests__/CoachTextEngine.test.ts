import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { AccountChooser } from '../AccountChooser';
import { CoachTextEngine } from '../CoachTextEngine';
import type { InboundText, LinkCompletion } from '../interfaces';

import {
  FakeCommandLog,
  FakeConsent,
  FakeConversationStore,
  FakeKeywords,
  FakeLinkStore,
  FakeLiveLookup,
  FakePages,
  FakeSettingsStore,
  commandFakes,
  makeOwner,
} from './fakes';

const PHONE = '+12145550100';
const CODE = '482913';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const TIGERS_LINK = '11111111-1111-4111-8111-111111111111';
const HAWKS_LINK = '22222222-2222-4222-8222-222222222222';

const LINKED_TWIML =
  '<Response><Message>FieldView.Live: This phone now runs text commands for Diablos FC. Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to pause, HELP for help.</Message></Response>';
const LINKED_TOO_TWIML =
  '<Response><Message>FieldView.Live: This phone now runs text commands for Diablos FC too. It works with 2 accounts. Text ACCOUNT to choose one. Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to pause, HELP for help.</Message></Response>';
const NO_MATCH_TWIML =
  '<Response><Message>FieldView.Live: That code did not match or has expired. Open Text commands in your FieldView account for a new code.</Message></Response>';
const TOO_MANY_ACCOUNTS_TWIML =
  '<Response><Message>FieldView.Live: This phone already works with 9 accounts. Remove it from one of them first.</Message></Response>';
const EMPTY_TWIML = '<Response></Response>';

const reply = (words: string): string => `<Response><Message>FieldView.Live: ${words}</Message></Response>`;

const MATCHED: LinkCompletion = {
  matched: true,
  linkId: 'link-1',
  ownerUserId: 'user-1',
  ownerAccountId: 'account-1',
  accountName: 'Diablos FC',
  label: 'Jordan',
  paused: false,
  accountCount: 1,
};

describe('CoachTextEngine', () => {
  let now: Date;
  let links: FakeLinkStore;
  let commands: FakeCommandLog;
  let conversations: FakeConversationStore;
  let settings: FakeSettingsStore;
  let consent: FakeConsent;
  let pages: FakePages;
  let lookup: FakeLiveLookup;
  let keywords: FakeKeywords;
  let linking: {
    completeFromText: Mock<[{ from: string; code: string }], Promise<LinkCompletion>>;
    pause: Mock<[string], Promise<void>>;
    resume: Mock<[string], Promise<void>>;
    removePhone: Mock<[string, string], Promise<{ removed: boolean }>>;
  };
  let engine: CoachTextEngine;
  let questionIds: number;

  const text = (overrides: Partial<InboundText> = {}): InboundText => ({
    from: PHONE,
    body: `LINK ${CODE}`,
    messageSid: 'SM00000000000000000000000000000001',
    twilioVerified: true,
    receivedAtMs: now.getTime() - 40,
    ...overrides,
  });

  /** Puts a login in the store that is waiting on a LINK text from this phone. */
  const waitOn = (phone: string): void => {
    links.addOwner(makeOwner());
    const row = links.seed({ ownerUserId: 'user-1', phoneE164: phone, verifiedAt: null, lastCommandAt: null });
    row.codeHash = 'x'.repeat(64);
    row.codeExpiresAt = new Date(now.getTime() + 10 * MINUTE);
  };

  /** PHONE works with Tigers FC (user-1) and Hawks FC (user-2). */
  const linkTwoAccounts = (): void => {
    links.addOwner(makeOwner({ ownerUserId: 'user-1', ownerAccountId: 'account-1', accountName: 'Tigers FC' }));
    links.addOwner(makeOwner({ ownerUserId: 'user-2', ownerAccountId: 'account-2', accountName: 'Hawks FC' }));
    links.seed({ id: TIGERS_LINK, ownerUserId: 'user-1', phoneE164: PHONE, label: 'Jordan', verifiedAt: now, lastCommandAt: now });
    links.seed({ id: HAWKS_LINK, ownerUserId: 'user-2', phoneE164: PHONE, label: 'Jo', verifiedAt: now, lastCommandAt: now });
  };

  let sid = 100;
  const nextSid = (): string => `SM${String(sid++).padStart(32, '0')}`;

  beforeEach(() => {
    now = new Date('2026-11-21T18:00:00.000Z');
    const clock = (): Date => now;
    vi.stubEnv('COACH_TEXT_ENABLED', 'true');
    vi.stubEnv('RELAY_INBOUND_SECRET', 'test-relay-secret');
    links = new FakeLinkStore();
    commands = new FakeCommandLog(clock);
    conversations = new FakeConversationStore();
    settings = new FakeSettingsStore();
    consent = new FakeConsent(clock);
    ({ pages, lookup, keywords } = commandFakes(conversations, clock));
    questionIds = 0;
    linking = {
      completeFromText: vi
        .fn<[{ from: string; code: string }], Promise<LinkCompletion>>()
        .mockResolvedValue(MATCHED),
      pause: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
      resume: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
      removePhone: vi.fn<[string, string], Promise<{ removed: boolean }>>((_user, id) => {
        links.rows.delete(id);
        return Promise.resolve({ removed: true });
      }),
    };
    engine = new CoachTextEngine({
      linking,
      links,
      commands,
      chooser: new AccountChooser({ links, conversations, now: clock }),
      conversations,
      settings,
      consent,
      keywords,
      games: pages,
      lookup,
      writer: pages,
      now: clock,
      newId: () => `00000000-0000-4000-8000-${String((questionIds += 1)).padStart(12, '0')}`,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when it stays out of the way', () => {
    it('does nothing while the switch is off', async () => {
      vi.stubEnv('COACH_TEXT_ENABLED', '');
      waitOn(PHONE);

      expect(await engine.handleInbound(text())).toEqual({ handled: false });
      expect(await engine.handleInbound(text({ twilioVerified: false }))).toEqual({
        handled: false,
      });

      expect(linking.completeFromText).not.toHaveBeenCalled();
      expect(commands.rows).toEqual([]);
    });

    it('does nothing when the relay secret is not set', async () => {
      vi.stubEnv('RELAY_INBOUND_SECRET', '');

      expect(await engine.handleInbound(text())).toEqual({ handled: false });

      expect(linking.completeFromText).not.toHaveBeenCalled();
      expect(commands.rows).toEqual([]);
    });

    it.each(['GAME1', 'YES', 'link', 'LINK 12345', 'LINK 482913 please', 'UNLINK 482913', 'MENU', 'ATTACH', '1'])(
      'leaves the verified text %s from a phone no login has proven to the viewer path',
      async (body) => {
        waitOn(PHONE);

        expect(await engine.handleInbound(text({ body }))).toEqual({ handled: false });

        expect(linking.completeFromText).not.toHaveBeenCalled();
        expect(commands.rows).toEqual([]);
        expect(conversations.leases.size).toBe(0);
      }
    );

    it('falls through to the viewer path when the link lookup fails', async () => {
      links.addOwner(makeOwner());
      links.seed({ ownerUserId: 'user-1', phoneE164: PHONE });
      links.failNext = new Error('database is down');

      expect(await engine.handleInbound(text({ body: 'MENU' }))).toEqual({ handled: false });
      expect(commands.rows).toEqual([]);
    });
  });

  describe('LINK from a verified text', () => {
    it('links the phone and answers with the program wording', async () => {
      const result = await engine.handleInbound(text());

      expect(result).toEqual({ handled: true, twiml: LINKED_TWIML });
      expect(linking.completeFromText).toHaveBeenCalledWith({ from: PHONE, code: CODE });
    });

    it.each(['link 482913', '  Link482913 ', 'LINK-482913', 'LINK: 482913'])(
      'reads the code from %s',
      async (body) => {
        await engine.handleInbound(text({ body }));
        expect(linking.completeFromText).toHaveBeenCalledWith({ from: PHONE, code: CODE });
      }
    );

    it('keeps a log row without the code', async () => {
      await engine.handleInbound(text());

      expect(commands.rows).toHaveLength(1);
      expect(commands.rows[0]).toMatchObject({
        messageSid: 'SM00000000000000000000000000000001',
        phoneE164: PHONE,
        twilioVerified: true,
        body: 'LINK ******',
        interpreter: 'link',
        status: 'done',
        reason: 'linked',
        ownerUserId: 'user-1',
        ownerAccountId: 'account-1',
        phoneLabel: 'Jordan',
        latencyMs: 40,
      });
      expect(commands.rows[0].replyText).toContain('This phone now runs text commands');
      expect(JSON.stringify(commands.rows[0])).not.toContain(CODE);
    });

    it('tells a phone that now works with a second account how to choose', async () => {
      linking.completeFromText.mockResolvedValue({ ...MATCHED, accountCount: 2 });

      expect(await engine.handleInbound(text())).toEqual({ handled: true, twiml: LINKED_TOO_TWIML });
    });

    it('says why a phone on nine accounts cannot add a tenth', async () => {
      linking.completeFromText.mockResolvedValue({ matched: false, reason: 'too_many_accounts' });

      expect(await engine.handleInbound(text())).toEqual({ handled: true, twiml: TOO_MANY_ACCOUNTS_TWIML });
      expect(commands.rows[0]).toMatchObject({ status: 'rejected', reason: 'too_many_accounts' });
    });

    it.each(['no_pending', 'expired', 'too_many_tries', 'wrong_code', 'not_allowed'] as const)(
      'gives the same answer when the link is refused for %s',
      async (reason) => {
        linking.completeFromText.mockResolvedValue({ matched: false, reason });

        const result = await engine.handleInbound(text());

        expect(result).toEqual({ handled: true, twiml: NO_MATCH_TWIML });
        expect(commands.rows[0]).toMatchObject({
          status: 'rejected',
          reason,
          ownerUserId: null,
          ownerAccountId: null,
        });
      }
    );

    it('sends no reply to a phone that is paused', async () => {
      linking.completeFromText.mockResolvedValue({ ...MATCHED, paused: true });

      const result = await engine.handleInbound(text());

      expect(result).toEqual({ handled: true, twiml: EMPTY_TWIML });
      expect(commands.rows[0]).toMatchObject({
        status: 'done',
        reason: 'linked_paused',
        replyText: null,
        ownerUserId: 'user-1',
      });
    });

    it('acts once on a text that is delivered twice', async () => {
      const first = await engine.handleInbound(text());
      const second = await engine.handleInbound(text());

      expect(first).toEqual({ handled: true, twiml: LINKED_TWIML });
      expect(second).toEqual({ handled: true, twiml: EMPTY_TWIML });
      expect(linking.completeFromText).toHaveBeenCalledTimes(1);
      expect(commands.rows).toHaveLength(1);
    });

    it('still answers when the log row cannot be closed', async () => {
      commands.failFinish = new Error('database blip');

      expect(await engine.handleInbound(text())).toEqual({ handled: true, twiml: LINKED_TWIML });
    });

    it('falls through to the viewer path when linking throws', async () => {
      linking.completeFromText.mockRejectedValue(new Error('database is down'));

      expect(await engine.handleInbound(text())).toEqual({ handled: false });
      expect(commands.rows[0]).toMatchObject({ status: 'failed', reason: 'error' });
    });

    it('falls through to the viewer path when the log cannot be opened', async () => {
      commands.failBegin = new Error('database is down');

      expect(await engine.handleInbound(text())).toEqual({ handled: false });
      expect(linking.completeFromText).not.toHaveBeenCalled();
    });
  });

  describe('ACCOUNT', () => {
    it('says so when the phone works with one account', async () => {
      links.addOwner(makeOwner({ accountName: 'Tigers FC' }));
      links.seed({ ownerUserId: 'user-1', phoneE164: PHONE, label: 'Jordan', verifiedAt: now, lastCommandAt: now });

      const result = await engine.handleInbound(text({ body: 'account' }));

      expect(result).toEqual({ handled: true, twiml: reply('This phone works with Tigers FC only.') });
      expect(commands.rows[0]).toMatchObject({
        body: 'account',
        interpreter: 'rules',
        status: 'no_change',
        reason: 'one_account',
        ownerUserId: 'user-1',
        ownerAccountId: 'account-1',
        phoneLabel: 'Jordan',
      });
      expect(conversations.rows.size).toBe(0);
    });

    it('asks which account when the phone works with several, and keeps the question', async () => {
      linkTwoAccounts();

      const result = await engine.handleInbound(text({ body: ' Account ' }));

      expect(result).toEqual({
        handled: true,
        twiml: reply('Which account? 1 Tigers FC, 2 Hawks FC. Reply with the number, 0 for none.'),
      });
      const asked = conversations.rows.get(PHONE);
      expect(asked).toMatchObject({
        pendingId: '00000000-0000-4000-8000-000000000001',
        pendingExpiresAt: new Date(now.getTime() + 10 * MINUTE),
        pendingQuestion: {
          v: 1,
          kind: 'pick_account',
          options: [
            { n: 1, label: 'Tigers FC', linkId: TIGERS_LINK },
            { n: 2, label: 'Hawks FC', linkId: HAWKS_LINK },
          ],
        },
      });
      expect(commands.rows[0]).toMatchObject({ status: 'asked', reason: 'pick_account', ownerUserId: null });
    });

    it('marks the account the phone texts for now', async () => {
      linkTwoAccounts();
      conversations.choose(PHONE, HAWKS_LINK, new Date(now.getTime() + HOUR));

      const result = await engine.handleInbound(text({ body: 'ACCOUNT' }));

      expect(result).toEqual({
        handled: true,
        twiml: reply('Which account? 1 Tigers FC, 2 Hawks FC (now). Reply with the number, 0 for none.'),
      });
    });

    it('leaves ACCOUNT from a phone no login has proven to the viewer path, untouched', async () => {
      waitOn(PHONE);

      expect(await engine.handleInbound(text({ body: 'ACCOUNT' }))).toEqual({ handled: false });
      expect(commands.rows).toEqual([]);
      expect(conversations.rows.size).toBe(0);
    });

    it('answers a text delivered twice once', async () => {
      linkTwoAccounts();

      await engine.handleInbound(text({ body: 'ACCOUNT' }));
      expect(await engine.handleInbound(text({ body: 'ACCOUNT' }))).toEqual({ handled: true, twiml: EMPTY_TWIML });
      expect(commands.rows).toHaveLength(1);
    });
  });

  describe('a digit that answers the account question', () => {
    beforeEach(async () => {
      now = new Date('2026-11-22T12:00:00.000Z');
      linkTwoAccounts();
      await engine.handleInbound(text({ body: 'ACCOUNT', messageSid: nextSid() }));
    });

    it('chooses the account for 12 hours and says until when', async () => {
      const result = await engine.handleInbound(text({ body: '2', messageSid: nextSid() }));

      expect(result).toEqual({
        handled: true,
        twiml: reply('Texting for Hawks FC until 6:00 PM. Text ACCOUNT to switch.'),
      });
      expect(conversations.rows.get(PHONE)).toMatchObject({
        chosenLinkId: HAWKS_LINK,
        chosenUntil: new Date(now.getTime() + 12 * HOUR),
        pendingId: null,
      });
      expect(commands.rows[1]).toMatchObject({
        body: '2',
        interpreter: 'answer',
        status: 'done',
        reason: 'account_chosen',
        ownerUserId: 'user-2',
        ownerAccountId: 'account-2',
        phoneLabel: 'Jo',
      });
    });

    it("tells the time in the chosen account's time zone", async () => {
      settings.zones.set('user-2', 'America/New_York');

      const result = await engine.handleInbound(text({ body: '2', messageSid: nextSid() }));

      expect(result).toEqual({
        handled: true,
        twiml: reply('Texting for Hawks FC until 7:00 PM. Text ACCOUNT to switch.'),
      });
    });

    it('closes the question on 0 and changes nothing', async () => {
      const result = await engine.handleInbound(text({ body: '0', messageSid: nextSid() }));

      expect(result).toEqual({ handled: true, twiml: reply('Nothing changed. Text ACCOUNT to choose an account.') });
      expect(conversations.rows.get(PHONE)).toMatchObject({ pendingId: null, chosenLinkId: null });
      expect(commands.rows[1]).toMatchObject({ status: 'no_change', reason: 'none_of_these' });
    });

    it('asks again for a number that is not on the list, and keeps the question', async () => {
      const result = await engine.handleInbound(text({ body: '7', messageSid: nextSid() }));

      expect(result).toEqual({ handled: true, twiml: reply('Reply with a number from 1 to 2, or 0 for none.') });
      expect(conversations.rows.get(PHONE)?.pendingId).not.toBeNull();
      expect(commands.rows[1]).toMatchObject({ status: 'not_understood', reason: 'not_an_option' });
    });

    it('says so when the chosen account no longer works with the phone', async () => {
      links.rows.get(HAWKS_LINK)!.pausedAt = now;

      const result = await engine.handleInbound(text({ body: '2', messageSid: nextSid() }));

      expect(result).toEqual({
        handled: true,
        twiml: reply('That account no longer works with this phone. Text ACCOUNT to choose again.'),
      });
      expect(conversations.rows.get(PHONE)).toMatchObject({ pendingId: null, chosenLinkId: null });
    });

    it('turns away a second text while the first holds the phone', async () => {
      const [first, second] = await Promise.all([
        engine.handleInbound(text({ body: '1', messageSid: nextSid() })),
        engine.handleInbound(text({ body: '2', messageSid: nextSid() })),
      ]);

      expect(first).toEqual({ handled: true, twiml: reply('Texting for Tigers FC until 6:00 PM. Text ACCOUNT to switch.') });
      expect(second).toEqual({ handled: true, twiml: reply('Still working on your last text. Try again in a few seconds.') });
      expect(commands.rows[2]).toMatchObject({ status: 'rejected', reason: 'busy' });
      expect(conversations.leases.size).toBe(0);
    });

    it('lets only one of two racing answers win, even past the lease', async () => {
      conversations.ignoreLeases = true;
      const [first, second] = await Promise.all([
        engine.handleInbound(text({ body: '1', messageSid: nextSid() })),
        engine.handleInbound(text({ body: '2', messageSid: nextSid() })),
      ]);

      expect(first).toEqual({ handled: true, twiml: reply('Texting for Tigers FC until 6:00 PM. Text ACCOUNT to switch.') });
      // The first text is still running, so the second also hears it has not finished.
      expect(second.handled && second.twiml).toContain('That question has closed. Text ACCOUNT to choose again.');
      expect(conversations.rows.get(PHONE)?.chosenLinkId).toBe(TIGERS_LINK);
    });

    it('says the question has expired once it has run out', async () => {
      now = new Date(now.getTime() + 11 * MINUTE);

      expect(await engine.handleInbound(text({ body: '2', messageSid: nextSid() }))).toEqual({
        handled: true,
        twiml: reply('That question has expired. Send the command again.'),
      });
      expect(commands.rows[1]).toMatchObject({ status: 'rejected', reason: 'question_expired' });
    });

    it.each(['NO', 'n', 'None'])('takes %s as 0', async (body) => {
      const result = await engine.handleInbound(text({ body, messageSid: nextSid() }));

      expect(result).toEqual({ handled: true, twiml: reply('Nothing changed. Text ACCOUNT to choose an account.') });
    });
  });

  describe('a digit with no question open', () => {
    it('tells a linked phone there is no question', async () => {
      linkTwoAccounts();

      expect(await engine.handleInbound(text({ body: '2' }))).toEqual({
        handled: true,
        twiml: reply('There is no open question. Text MENU for what I can do.'),
      });
      expect(commands.rows[0]).toMatchObject({ body: '2', interpreter: 'answer', status: 'rejected', reason: 'no_question' });
    });

    it('leaves a digit from a stranger to the viewer path, untouched', async () => {
      expect(await engine.handleInbound(text({ from: '+12145550999', body: '1', messageSid: nextSid() }))).toEqual({
        handled: false,
      });
      expect(commands.rows).toEqual([]);
    });
  });

  describe('texts that cannot be trusted', () => {
    it('never answers ACCOUNT or a digit the relay did not verify', async () => {
      linkTwoAccounts();
      await engine.handleInbound(text({ body: 'ACCOUNT', messageSid: nextSid() }));

      expect(await engine.handleInbound(text({ body: '2', twilioVerified: false, messageSid: nextSid() }))).toEqual({
        handled: false,
      });
      expect(await engine.handleInbound(text({ body: 'ACCOUNT', twilioVerified: false, messageSid: nextSid() }))).toEqual({
        handled: false,
      });
      expect(conversations.rows.get(PHONE)?.chosenLinkId).toBeNull();
    });

    it('never links from a text the relay did not verify', async () => {
      waitOn(PHONE);

      expect(await engine.handleInbound(text({ twilioVerified: false }))).toEqual({
        handled: false,
      });

      expect(linking.completeFromText).not.toHaveBeenCalled();
    });

    it('never links from a text with no message id', async () => {
      waitOn(PHONE);

      expect(await engine.handleInbound(text({ messageSid: null }))).toEqual({ handled: false });

      expect(linking.completeFromText).not.toHaveBeenCalled();
      expect(commands.rows).toMatchObject([
        { phoneE164: PHONE, status: 'rejected', reason: 'no_message_sid', messageSid: null },
      ]);
    });

    it('notes an unverified text from a phone a login is waiting on', async () => {
      waitOn(PHONE);

      await engine.handleInbound(text({ twilioVerified: false }));

      expect(commands.rows).toHaveLength(1);
      expect(commands.rows[0]).toMatchObject({
        phoneE164: PHONE,
        twilioVerified: false,
        interpreter: 'none',
        status: 'rejected',
        reason: 'unverified',
        messageSid: null,
        ownerUserId: null,
        ownerAccountId: null,
      });
      expect(JSON.stringify(commands.rows[0])).not.toContain(CODE);
    });

    it('notes nothing for a phone no login knows', async () => {
      waitOn('+12145550111');

      await engine.handleInbound(text({ twilioVerified: false }));

      expect(commands.rows).toEqual([]);
    });

    it('notes at most five unverified texts an hour for one phone', async () => {
      waitOn(PHONE);

      for (let i = 0; i < 8; i += 1) {
        await engine.handleInbound(text({ twilioVerified: false, body: 'hello' }));
      }
      expect(commands.rows).toHaveLength(5);

      now = new Date(now.getTime() + 61 * MINUTE);
      await engine.handleInbound(text({ twilioVerified: false, body: 'hello' }));
      expect(commands.rows).toHaveLength(6);
    });

    it('stays quiet when the lookup for an unverified text fails', async () => {
      links.failNext = new Error('database is down');

      expect(await engine.handleInbound(text({ twilioVerified: false }))).toEqual({
        handled: false,
      });
    });
  });

  describe('STOP and START', () => {
    it('pauses on a verified STOP and resumes on a verified START', async () => {
      await engine.handleOptOut({ from: PHONE, twilioVerified: true });
      expect(linking.pause).toHaveBeenCalledWith(PHONE);

      await engine.handleOptIn({ from: PHONE, twilioVerified: true });
      expect(linking.resume).toHaveBeenCalledWith(PHONE);
    });

    it('ignores STOP and START the relay did not verify', async () => {
      await engine.handleOptOut({ from: PHONE, twilioVerified: false });
      await engine.handleOptIn({ from: PHONE, twilioVerified: false });

      expect(linking.pause).not.toHaveBeenCalled();
      expect(linking.resume).not.toHaveBeenCalled();
    });

    it('ignores STOP and START while the switch is off', async () => {
      vi.stubEnv('COACH_TEXT_ENABLED', 'false');

      await engine.handleOptOut({ from: PHONE, twilioVerified: true });
      await engine.handleOptIn({ from: PHONE, twilioVerified: true });

      expect(linking.pause).not.toHaveBeenCalled();
      expect(linking.resume).not.toHaveBeenCalled();
    });

    it('never throws when the store fails', async () => {
      linking.pause.mockRejectedValue(new Error('database is down'));
      linking.resume.mockRejectedValue(new Error('database is down'));

      await expect(
        engine.handleOptOut({ from: PHONE, twilioVerified: true })
      ).resolves.toBeUndefined();
      await expect(
        engine.handleOptIn({ from: PHONE, twilioVerified: true })
      ).resolves.toBeUndefined();
    });
  });
});
