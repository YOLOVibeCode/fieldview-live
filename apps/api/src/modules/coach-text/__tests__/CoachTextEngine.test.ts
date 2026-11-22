import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { CoachTextEngine } from '../CoachTextEngine';
import type { InboundText, LinkCompletion } from '../interfaces';

import { FakeCommandLog, FakeLinkStore, makeOwner } from './fakes';

const PHONE = '+12145550100';
const CODE = '482913';
const MINUTE = 60_000;

const LINKED_TWIML =
  '<Response><Message>FieldView.Live: This phone now runs text commands for Diablos FC. Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to pause, HELP for help.</Message></Response>';
const NO_MATCH_TWIML =
  '<Response><Message>FieldView.Live: That code did not match or has expired. Open Text commands in your FieldView account for a new code.</Message></Response>';
const EMPTY_TWIML = '<Response></Response>';

const MATCHED: LinkCompletion = {
  matched: true,
  ownerUserId: 'user-1',
  ownerAccountId: 'account-1',
  accountName: 'Diablos FC',
  paused: false,
};

describe('CoachTextEngine', () => {
  let now: Date;
  let links: FakeLinkStore;
  let commands: FakeCommandLog;
  let linking: {
    completeFromText: Mock<[{ from: string; code: string }], Promise<LinkCompletion>>;
    pause: Mock<[string], Promise<void>>;
    resume: Mock<[string], Promise<void>>;
  };
  let engine: CoachTextEngine;

  const text = (overrides: Partial<InboundText> = {}): InboundText => ({
    from: PHONE,
    body: `LINK ${CODE}`,
    messageSid: 'SM00000000000000000000000000000001',
    twilioVerified: true,
    receivedAtMs: now.getTime() - 40,
    ...overrides,
  });

  /** Puts a login in the store that is waiting on a LINK text from PHONE. */
  const waitOn = async (phone: string): Promise<void> => {
    links.addOwner(makeOwner());
    const link = await links.ensure('user-1');
    await links.setPending(link.id, {
      pendingPhoneE164: phone,
      codeHash: 'x'.repeat(64),
      codeExpiresAt: new Date(now.getTime() + 10 * MINUTE),
    });
  };

  beforeEach(() => {
    now = new Date('2026-11-21T18:00:00.000Z');
    const clock = (): Date => now;
    vi.stubEnv('COACH_TEXT_ENABLED', 'true');
    vi.stubEnv('RELAY_INBOUND_SECRET', 'test-relay-secret');
    links = new FakeLinkStore();
    commands = new FakeCommandLog(clock);
    linking = {
      completeFromText: vi
        .fn<[{ from: string; code: string }], Promise<LinkCompletion>>()
        .mockResolvedValue(MATCHED),
      pause: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
      resume: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
    };
    engine = new CoachTextEngine({ linking, links, commands, now: clock });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when it stays out of the way', () => {
    it('does nothing while the switch is off', async () => {
      vi.stubEnv('COACH_TEXT_ENABLED', '');
      await waitOn(PHONE);

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

    it.each(['GAME1', 'YES', 'link', 'LINK 12345', 'LINK 482913 please', 'UNLINK 482913'])(
      'leaves the verified text %s to the viewer path without touching a store',
      async (body) => {
        links.failNext = new Error('the store must not be read');

        expect(await engine.handleInbound(text({ body }))).toEqual({ handled: false });

        expect(links.failNext).not.toBeNull();
        expect(linking.completeFromText).not.toHaveBeenCalled();
        expect(commands.rows).toEqual([]);
      }
    );
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
        latencyMs: 40,
      });
      expect(commands.rows[0].replyText).toContain('This phone now runs text commands');
      expect(JSON.stringify(commands.rows[0])).not.toContain(CODE);
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

  describe('texts that cannot be trusted', () => {
    it('never links from a text the relay did not verify', async () => {
      await waitOn(PHONE);

      expect(await engine.handleInbound(text({ twilioVerified: false }))).toEqual({
        handled: false,
      });

      expect(linking.completeFromText).not.toHaveBeenCalled();
    });

    it('never links from a text with no message id', async () => {
      await waitOn(PHONE);

      expect(await engine.handleInbound(text({ messageSid: null }))).toEqual({ handled: false });

      expect(linking.completeFromText).not.toHaveBeenCalled();
      expect(commands.rows).toMatchObject([
        { phoneE164: PHONE, status: 'rejected', reason: 'no_message_sid', messageSid: null },
      ]);
    });

    it('notes an unverified text from a phone a login is waiting on', async () => {
      await waitOn(PHONE);

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
      await waitOn('+12145550111');

      await engine.handleInbound(text({ twilioVerified: false }));

      expect(commands.rows).toEqual([]);
    });

    it('notes at most five unverified texts an hour for one phone', async () => {
      await waitOn(PHONE);

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
