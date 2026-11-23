/**
 * The commands that read and change a game's stream: the full order of steps,
 * the account choice, the decision table end to end, numbered answers, UNDO,
 * UNLINK and the reply window. Real engine, in-memory stores.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { LiveStream, OwnerLiveStreams } from '../../camera-sources/interfaces';
import { AccountChooser } from '../AccountChooser';
import { CoachTextEngine } from '../CoachTextEngine';
import type { InboundText } from '../interfaces';

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
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const TIGERS_LINK = '11111111-1111-4111-8111-111111111111';
const HAWKS_LINK = '22222222-2222-4222-8222-222222222222';
const GAME_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GAME_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GAME_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const URL_1 = 'https://stream.example.com/diablos-sporting.m3u8';
const URL_2 = 'https://stream.example.com/u15-solar.m3u8';
const URL_OLD = 'https://stream.example.com/earlier.m3u8';

const EMPTY = '<Response></Response>';
const reply = (words: string): string => `<Response><Message>FieldView.Live: ${words}</Message></Response>`;
/** The reply's words, unescaped, without the brand. */
function words(result: { handled: boolean; twiml?: string }): string {
  const twiml = 'twiml' in result && result.twiml ? result.twiml : '';
  return twiml
    .replace(/^<Response><Message>FieldView\.Live: /, '')
    .replace(/<\/Message><\/Response>$/, '')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

const MENU =
  'Text LIVE for what is streaming, GAMES for your pages, ATTACH to put the live stream on your game, UNDO to put it back, UNLINK to remove this phone. Reply STOP to pause, HELP for help.';

describe('CoachTextEngine commands', () => {
  let now: Date;
  let links: FakeLinkStore;
  let commands: FakeCommandLog;
  let conversations: FakeConversationStore;
  let settings: FakeSettingsStore;
  let consent: FakeConsent;
  let pages: FakePages;
  let lookup: FakeLiveLookup;
  let keywords: FakeKeywords;
  let removePhone: Mock<[string, string], Promise<{ removed: boolean }>>;
  let engine: CoachTextEngine;
  let questionIds: number;
  let sid: number;

  const text = (body: string, overrides: Partial<InboundText> = {}): InboundText => ({
    from: PHONE,
    body,
    messageSid: `SM${String((sid += 1)).padStart(32, '0')}`,
    twilioVerified: true,
    receivedAtMs: now.getTime() - 40,
    ...overrides,
  });

  const send = (body: string, overrides: Partial<InboundText> = {}) => engine.handleInbound(text(body, overrides));

  const stream = (title: string, url: string, startedAgoMs = 20 * MINUTE): LiveStream => ({
    provider: 'veo',
    title,
    streamUrl: url,
    startedAt: new Date(now.getTime() - startedAgoMs),
  });

  const live = (account: string, streams: LiveStream[], sources: OwnerLiveStreams['sources'] = [{ provider: 'veo', displayName: 'Veo', status: 'ok' }]) => {
    lookup.byAccount.set(account, { streams, sources });
  };

  /** PHONE works with Tigers FC (account-1) only. */
  const linkOne = (): void => {
    links.addOwner(makeOwner({ ownerUserId: 'user-1', ownerAccountId: 'account-1', accountName: 'Tigers FC' }));
    links.seed({ id: TIGERS_LINK, ownerUserId: 'user-1', phoneE164: PHONE, label: 'Jordan', verifiedAt: now, lastCommandAt: now });
  };

  /** PHONE works with Tigers FC (account-1) and Hawks FC (account-2). */
  const linkTwo = (): void => {
    linkOne();
    links.addOwner(makeOwner({ ownerUserId: 'user-2', ownerAccountId: 'account-2', accountName: 'Hawks FC' }));
    links.seed({ id: HAWKS_LINK, ownerUserId: 'user-2', phoneE164: PHONE, label: 'Jo', verifiedAt: now, lastCommandAt: now });
  };

  const lastRow = () => commands.rows[commands.rows.length - 1];

  beforeEach(() => {
    now = new Date('2026-11-22T01:30:00.000Z'); // Saturday 7:30 PM in Chicago
    const clock = (): Date => now;
    vi.stubEnv('COACH_TEXT_ENABLED', 'true');
    vi.stubEnv('RELAY_INBOUND_SECRET', 'test-relay-secret');
    vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', '');
    vi.stubEnv('COACH_TEXT_REPLY_BUDGET_MS', '');
    vi.stubEnv('APP_URL', '');
    links = new FakeLinkStore();
    commands = new FakeCommandLog(clock);
    conversations = new FakeConversationStore();
    settings = new FakeSettingsStore();
    consent = new FakeConsent(clock);
    ({ pages, lookup, keywords } = commandFakes(conversations, clock));
    questionIds = 0;
    sid = 0;
    removePhone = vi.fn<[string, string], Promise<{ removed: boolean }>>((_user, id) => {
      links.rows.delete(id);
      return Promise.resolve({ removed: true });
    });
    engine = new CoachTextEngine({
      linking: {
        completeFromText: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        removePhone,
      },
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

  // ── The order of steps ────────────────────────────────────────────────────

  describe('the order of steps', () => {
    beforeEach(linkOne);

    it('logs each text once: a duplicate message id gets an empty reply', async () => {
      const first = text('MENU');

      expect(await engine.handleInbound(first)).toEqual({ handled: true, twiml: reply(MENU) });
      expect(await engine.handleInbound(first)).toEqual({ handled: true, twiml: EMPTY });
      expect(commands.rows).toHaveLength(1);
      expect(commands.rows[0]).toMatchObject({
        body: 'MENU',
        interpreter: 'rules',
        status: 'done',
        action: 'menu',
        reason: 'menu',
        ownerAccountId: 'account-1',
        phoneLabel: 'Jordan',
      });
    });

    it('answers "still working" while another text holds the phone, and lets go after', async () => {
      await conversations.acquireLease(PHONE, now, new Date(now.getTime() + 20_000));

      expect(await send('MENU')).toEqual({
        handled: true,
        twiml: reply('Still working on your last text. Try again in a few seconds.'),
      });
      expect(lastRow()).toMatchObject({ status: 'rejected', reason: 'busy' });

      now = new Date(now.getTime() + 21_000);
      expect(await send('MENU')).toEqual({ handled: true, twiml: reply(MENU) });
      expect(conversations.leases.size).toBe(0);
    });

    it('starts the reply with "timed out" when the last text never finished', async () => {
      await send('MENU');
      commands.rows[0].status = 'received';

      expect(words(await send('MENU'))).toBe(`Your last text timed out and changed nothing. ${MENU}`);
      // Once said, it is not said again.
      expect(words(await send('MENU'))).toBe(MENU);
    });

    it('starts the reply with "timed out" after a camera lookup that ran out of time', async () => {
      vi.stubEnv('COACH_TEXT_REPLY_BUDGET_MS', '1540');
      lookup.hang = true;
      expect(words(await send('LIVE'))).toBe('Still checking your camera. Nothing changed. Text LIVE again in a few seconds.');
      expect(lastRow()).toMatchObject({ status: 'timeout', reason: 'camera_slow' });

      expect(words(await send('MENU'))).toBe(`Your last text timed out and changed nothing. ${MENU}`);
    });

    it('does not count a text turned away as busy as the last text', async () => {
      commands.rows.push({ ...structuredCloneRow(), status: 'timeout' });
      await conversations.acquireLease(PHONE, now, new Date(now.getTime() + 1));
      await send('MENU');
      now = new Date(now.getTime() + 5);

      expect(words(await send('MENU'))).toBe(`Your last text timed out and changed nothing. ${MENU}`);
    });

    it('marks the link used', async () => {
      now = new Date(now.getTime() + HOUR);
      await send('MENU');

      expect(links.rows.get(TIGERS_LINK)?.lastCommandAt).toEqual(now);
    });

    it('answers "not understood" for a text the rules cannot read', async () => {
      expect(words(await send('what is the score'))).toBe('I did not understand that. Text MENU for what I can do.');
      expect(lastRow()).toMatchObject({ status: 'not_understood', body: 'what is the score' });
    });

    it('answers an error inside a command with "nothing changed", never the viewer path', async () => {
      lookup.find = () => Promise.reject(new Error('camera store down'));

      expect(words(await send('LIVE'))).toBe('Something went wrong and nothing changed. Try again in a moment.');
      expect(lastRow()).toMatchObject({ status: 'failed', reason: 'error' });
      expect(conversations.leases.size).toBe(0);
    });

    /** A finished row of this phone, for seeding the log. */
    function structuredCloneRow() {
      return {
        id: 'command-seeded',
        messageSid: 'SMseeded',
        phoneE164: PHONE,
        twilioVerified: true,
        body: 'LIVE',
        interpreter: 'rules' as const,
        status: 'done' as const,
        action: 'live',
        reason: 'live',
        replyText: null,
        latencyMs: null,
        ownerUserId: null,
        ownerAccountId: null,
        phoneLabel: null,
        createdAt: now,
      };
    }
  });

  // ── Viewer keywords ───────────────────────────────────────────────────────

  describe('viewer keywords from a linked phone', () => {
    beforeEach(linkOne);

    it('leaves a real game keyword to the viewer path', async () => {
      keywords.words.add('KX7P2Q');
      keywords.words.add('DIRECT-TIGERS-1');

      expect(await send('kx7p2q')).toEqual({ handled: false });
      expect(await send('DIRECT-TIGERS-1')).toEqual({ handled: false });
      expect(commands.rows).toEqual([]);
    });

    it('keeps a keyword-shaped word that is no game for the bot', async () => {
      expect(words(await send('KX7P2Q'))).toBe('I did not understand that. Text MENU for what I can do.');
    });

    it('lets ATTACH win even if a game had it as its keyword', async () => {
      keywords.words.add('ATTACH');

      const result = await send('ATTACH');

      expect(result.handled).toBe(true);
      expect(lastRow()).toMatchObject({ action: 'attach' });
    });
  });

  // ── Checks ────────────────────────────────────────────────────────────────

  describe('checks', () => {
    it('leaves a phone whose accounts are all off the allowlist to the viewer path', async () => {
      linkOne();
      vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', 'account-9');

      expect(await send('MENU')).toEqual({ handled: false });
      expect(commands.rows).toEqual([]);
    });

    it('runs nothing for a paused phone: an empty reply and a log row', async () => {
      linkOne();
      links.rows.get(TIGERS_LINK)!.pausedAt = now;

      expect(await send('ATTACH')).toEqual({ handled: true, twiml: EMPTY });
      expect(lastRow()).toMatchObject({ status: 'rejected', reason: 'paused' });
      expect(lookup.calls).toBe(0);
    });

    it('counts a STOP sent while the switch was off as paused', async () => {
      linkOne();
      await consent.revokeConsent(PHONE, 'viewer_notifications');

      expect(await send('ATTACH')).toEqual({ handled: true, twiml: EMPTY });
      expect(lastRow()).toMatchObject({ status: 'rejected', reason: 'paused' });
      expect(lookup.calls).toBe(0);
    });

    it('runs nothing for a suspended account', async () => {
      links.addOwner(makeOwner({ ownerUserId: 'user-1', ownerAccountId: 'account-1', accountSuspended: true }));
      links.seed({ id: TIGERS_LINK, ownerUserId: 'user-1', phoneE164: PHONE, verifiedAt: now, lastCommandAt: now });

      expect(words(await send('ATTACH'))).toBe('Text commands are off for this account.');
      expect(lastRow()).toMatchObject({ status: 'rejected', reason: 'account_off' });
      expect(lookup.calls).toBe(0);
    });

    it('runs nothing for a login that is no longer active', async () => {
      links.addOwner(makeOwner({ ownerUserId: 'user-1', loginStatus: 'disabled' }));
      links.seed({ id: TIGERS_LINK, ownerUserId: 'user-1', phoneE164: PHONE, verifiedAt: now, lastCommandAt: now });

      expect(words(await send('LIVE'))).toBe('Text commands are off for this account.');
    });

    it('says the link expired after 90 idle days', async () => {
      links.addOwner(makeOwner({ ownerUserId: 'user-1' }));
      const old = new Date(now.getTime() - 91 * 24 * HOUR);
      links.seed({ id: TIGERS_LINK, ownerUserId: 'user-1', phoneE164: PHONE, verifiedAt: old, lastCommandAt: old });

      expect(words(await send('LIVE'))).toBe(
        "This phone's link has expired. Open Text commands in your FieldView account to link it again."
      );
      expect(lastRow()).toMatchObject({ reason: 'link_expired' });
    });
  });

  // ── MENU, LIVE, GAMES ─────────────────────────────────────────────────────

  describe('MENU', () => {
    it('lists the commands', async () => {
      linkOne();

      expect(await send('menu')).toEqual({ handled: true, twiml: reply(MENU) });
    });

    it('also names ACCOUNT, and asks nothing, on a phone with several accounts', async () => {
      linkTwo();

      expect(words(await send('MENU'))).toContain('Text ACCOUNT to choose an account.');
      expect(conversations.rows.get(PHONE)?.pendingId ?? null).toBeNull();
    });
  });

  describe('LIVE', () => {
    beforeEach(linkOne);

    it('says what is live and what the game on now shows', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting', streamUrl: URL_1 });
      live('account-1', [stream('Diablos - Sporting', URL_1, 28 * MINUTE)]);

      expect(words(await send("what's live?"))).toBe(
        'Live now: Diablos - Sporting (Veo, started 7:02 PM). Diablos vs Sporting shows Diablos - Sporting.'
      );
      expect(lastRow()).toMatchObject({ status: 'done', action: 'live', reason: 'live' });
    });

    it('hints at ATTACH when a fresh stream is not on the game yet', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('Diablos - Sporting', URL_1)]);

      expect(words(await send('LIVE'))).toBe(
        'Live now: Diablos - Sporting (Veo, started 7:10 PM). Diablos vs Sporting has no stream yet. Text ATTACH to put it on your game.'
      );
    });

    it('never puts a stream URL in the reply', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting', streamUrl: URL_OLD });
      live('account-1', [stream('Diablos - Sporting', URL_1)]);

      const said = words(await send('LIVE'));

      expect(said).toContain('Diablos vs Sporting shows a stream that is not live now.');
      expect(said).not.toContain('stream.example.com');
    });

    it.each<[string, OwnerLiveStreams['sources'], string]>([
      ['no source', [], 'No streaming provider is connected to this account yet.'],
      ['a source to reconnect', [{ provider: 'veo', displayName: 'Veo', status: 'needs_reconnect' }], 'Veo needs to be reconnected before it can be searched.'],
      ['a source that failed', [{ provider: 'veo', displayName: 'Veo', status: 'error' }], 'Could not reach Veo right now. Try again in a moment.'],
      ['nothing live', [{ provider: 'veo', displayName: 'Veo', status: 'ok' }], 'Nothing is live on Veo right now.'],
    ])('uses the portal sentence for %s', async (_name, sources, sentence) => {
      live('account-1', [], sources);

      expect(words(await send('LIVE'))).toBe(`${sentence} No game is on now.`);
    });

    it('answers "still checking" when the camera is too slow, and reuses nothing it did not get', async () => {
      vi.stubEnv('COACH_TEXT_REPLY_BUDGET_MS', '1540');
      lookup.hang = true;

      expect(words(await send('LIVE'))).toBe('Still checking your camera. Nothing changed. Text LIVE again in a few seconds.');
      expect(lastRow()).toMatchObject({ status: 'timeout' });
    });
  });

  describe('GAMES', () => {
    beforeEach(linkOne);

    it('lists the pages on now and in the next 24 hours', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting', streamUrl: URL_1 });
      pages.add('account-1', {
        eventId: GAME_B,
        title: 'Diablos vs FC Dallas',
        scheduledStartAt: new Date(now.getTime() + 20 * HOUR),
      });
      pages.add('account-1', { eventId: GAME_C, title: 'Next week', scheduledStartAt: new Date(now.getTime() + 100 * HOUR) });
      pages.add('account-2', { eventId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', title: 'Another account' });

      expect(words(await send('my games'))).toBe(
        'Your games: Diablos vs Sporting, Sat 7:30 PM, on now, has a stream; Diablos vs FC Dallas, Sun 3:30 PM, no stream.'
      );
    });

    it('says so when there are none', async () => {
      expect(words(await send('GAMES'))).toBe('No game page is on now or in the next 24 hours.');
    });
  });

  // ── ATTACH ────────────────────────────────────────────────────────────────

  describe('ATTACH', () => {
    beforeEach(linkOne);

    it('one game, one fresh stream: attaches, pins and confirms with the page link', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting', eventSlug: 'diablos-vs-sporting-20261121' });
      live('account-1', [stream('Diablos - Sporting', URL_1, 28 * MINUTE)]);

      const result = await send('add the stream to the game');

      expect(words(result)).toBe(
        'Done. Diablos vs Sporting now shows Diablos - Sporting from Veo, started 7:02 PM. https://fieldview.live/direct/diablos/diablos-vs-sporting-20261121 Viewers may need to refresh. Text UNDO to put it back.'
      );
      expect(pages.pages.get(GAME_A)).toMatchObject({ pinnedAt: now, game: { streamUrl: URL_1 } });
      expect(lastRow()).toMatchObject({ status: 'done', action: 'attach', reason: 'attached', ownerAccountId: 'account-1' });
      expect(lastRow().replyText).not.toContain('stream.example.com');
    });

    it('says nothing changed when the game already shows that stream', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting', streamUrl: URL_1 });
      live('account-1', [stream('Diablos - Sporting', URL_1)]);

      expect(words(await send('ATTACH'))).toBe('Nothing changed. Diablos vs Sporting already shows that stream.');
    });

    it('two streams: asks which, then attaches what the coach picked without a second lookup', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('Diablos U15 - Solar', URL_2, 75 * MINUTE), stream('Diablos - Sporting', URL_1, 28 * MINUTE)]);

      const asked = await send("update the current active game with the current veo session that's streaming");

      expect(words(asked)).toBe(
        '2 streams are live. Which one goes on Diablos vs Sporting? Reply with a number:\n1 Diablos - Sporting, started 7:02 PM\n2 Diablos U15 - Solar, started 6:15 PM\n0 None of these'
      );
      expect(lastRow()).toMatchObject({ status: 'asked', reason: 'pick_stream', action: 'attach' });

      const answered = await send('1');

      expect(words(answered)).toMatch(/^Done\. Diablos vs Sporting now shows Diablos - Sporting from Veo, started 7:02 PM\./);
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBe(URL_1);
      expect(lookup.calls).toBe(1);
      expect(conversations.rows.get(PHONE)?.pendingId).toBeNull();
      expect(lastRow()).toMatchObject({ interpreter: 'answer', status: 'done', reason: 'attached' });
    });

    it('asks before putting on a stream that is not fresh', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('Diablos - Sporting', URL_1, 5 * HOUR)]);

      expect(words(await send('ATTACH'))).toMatch(/^A stream is live\. Which one goes on Diablos vs Sporting\?/);
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBeNull();
    });

    it('two games, one stream: asks which game, then attaches', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'U15 Solar' });
      pages.add('account-1', { eventId: GAME_B, title: 'Diablos vs Sporting' });
      live('account-1', [stream('Diablos - Sporting', URL_1)]);

      expect(words(await send('ATTACH'))).toBe(
        '2 games are on now. Which one gets Diablos - Sporting? Reply with a number:\n1 Diablos vs Sporting, 7:30 PM\n2 U15 Solar, 7:30 PM\n0 None of these'
      );
      await send('1');

      expect(pages.pages.get(GAME_B)?.game.streamUrl).toBe(URL_1);
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBeNull();
    });

    it('two games, two streams: asks which game, then which stream, then attaches', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'U15 Solar' });
      pages.add('account-1', { eventId: GAME_B, title: 'Diablos vs Sporting' });
      live('account-1', [stream('Diablos - Sporting', URL_1), stream('U15 - Solar', URL_2)]);

      expect(words(await send('ATTACH'))).toMatch(/^2 games are on now\. Which page is the stream for\?/);
      expect(words(await send('2'))).toBe(
        '2 streams are live. Which one goes on U15 Solar? Reply with a number:\n1 U15 - Solar, started 7:10 PM\n2 Diablos - Sporting, started 7:10 PM\n0 None of these'
      );
      await send('1');

      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBe(URL_2);
      expect(lookup.calls).toBe(1);
    });

    it('no game on now: offers the nearest pages', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs FC Dallas', scheduledStartAt: new Date(now.getTime() + 20 * HOUR) });
      live('account-1', [stream('Diablos - Sporting', URL_1)]);

      expect(words(await send('ATTACH'))).toBe(
        'No game is on right now. Where does Diablos - Sporting go? Reply with a number:\n1 Diablos vs FC Dallas, Sun 3:30 PM\n0 None of these'
      );
      await send('1');

      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBe(URL_1);
    });

    it('no game and no page: says to make one', async () => {
      live('account-1', [stream('Diablos - Sporting', URL_1)]);

      expect(words(await send('ATTACH'))).toBe(
        'No game is on right now and no game page is coming up. Make one in your FieldView account first.'
      );
    });

    it('no stream: uses the portal sentence', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });

      expect(words(await send('ATTACH'))).toBe('Nothing is live on Veo right now.');
      expect(lastRow()).toMatchObject({ status: 'no_change', reason: 'nothing_live' });
    });

    it('drops a stream without https', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('Diablos - Sporting', 'http://stream.example.com/plain.m3u8')]);

      expect(words(await send('ATTACH'))).toBe('Nothing is live on Veo right now.');
    });

    it('changes nothing on 0, NO or NONE', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('A', URL_1), stream('B', URL_2)]);
      await send('ATTACH');

      expect(words(await send('none'))).toBe('OK. Nothing changed.');
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBeNull();
    });

    it('asks again for a number that was not offered', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('A', URL_1), stream('B', URL_2)]);
      await send('ATTACH');

      expect(words(await send('7'))).toBe('Reply with a number from 1 to 2, or 0 for none.');
      expect(conversations.rows.get(PHONE)?.pendingId).not.toBeNull();
    });

    it('lets another command close the open question', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('A', URL_1), stream('B', URL_2)]);
      await send('ATTACH');

      await send('GAMES');

      expect(words(await send('1'))).toBe('There is no open question. Text MENU for what I can do.');
    });

    it('checks the account again when the answer arrives', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('A', URL_1), stream('B', URL_2)]);
      await send('ATTACH');
      // The page moved to another account while the question was open.
      pages.pages.get(GAME_A)!.ownerAccountId = 'account-9';

      expect(words(await send('1'))).toBe('That game page is not open any more. Nothing changed.');
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBeNull();
    });

    it('starts no write once the reply window has run out', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('Diablos - Sporting', URL_1)]);
      pages.duringWrite = () => {
        now = new Date(now.getTime() + 10_000);
      };

      expect(words(await send('ATTACH'))).toBe('That took too long, so nothing changed. Send it again.');
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBeNull();
      expect(lastRow()).toMatchObject({ status: 'timeout', reason: 'late' });
    });

    it('answers "still checking" and writes nothing when the camera lookup loses the race', async () => {
      vi.stubEnv('COACH_TEXT_REPLY_BUDGET_MS', '1540');
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      lookup.hang = true;

      expect(words(await send('ATTACH'))).toBe('Still checking your camera. Nothing changed. Text LIVE again in a few seconds.');
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBeNull();
    });
  });

  // ── UNDO ──────────────────────────────────────────────────────────────────

  describe('UNDO', () => {
    beforeEach(() => {
      linkOne();
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting', streamUrl: URL_OLD });
      live('account-1', [stream('Diablos - Sporting', URL_1)]);
    });

    it('puts back the earlier stream', async () => {
      await send('ATTACH');

      expect(words(await send('put it back'))).toBe('Put back. Diablos vs Sporting shows its earlier stream again.');
      expect(pages.pages.get(GAME_A)).toMatchObject({ pinnedAt: null, game: { streamUrl: URL_OLD } });
      expect(lastRow()).toMatchObject({ status: 'done', action: 'undo', reason: 'undone' });
    });

    it('works from another phone of the same account', async () => {
      await send('ATTACH');
      const other = '+12145550177';
      links.seed({ ownerUserId: 'user-1', phoneE164: other, label: 'Kim', verifiedAt: now, lastCommandAt: now });

      expect(words(await send('UNDO', { from: other }))).toBe('Put back. Diablos vs Sporting shows its earlier stream again.');
    });

    it('has nothing to undo after 30 minutes, or twice', async () => {
      await send('ATTACH');
      await send('UNDO');

      expect(words(await send('UNDO'))).toBe('Nothing to undo.');

      await send('ATTACH');
      now = new Date(now.getTime() + 31 * MINUTE);
      expect(words(await send('UNDO'))).toBe('Nothing to undo.');
    });

    it('leaves a page someone changed after the text alone', async () => {
      await send('ATTACH');
      pages.pages.get(GAME_A)!.game.streamUrl = URL_2;

      expect(words(await send('UNDO'))).toBe('Diablos vs Sporting was changed again after your text, so I left it alone.');
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBe(URL_2);
    });
  });

  // ── UNLINK ────────────────────────────────────────────────────────────────

  describe('UNLINK', () => {
    it('removes the phone from its one account', async () => {
      linkOne();

      expect(words(await send('UNLINK'))).toBe(
        'This phone is unlinked. Link it again from Text commands in your FieldView account.'
      );
      expect(removePhone).toHaveBeenCalledWith('user-1', TIGERS_LINK);
      expect(lastRow()).toMatchObject({ status: 'done', action: 'unlink', ownerAccountId: 'account-1' });
    });

    it('asks which account on a phone with several and no choice in force, then removes only that one', async () => {
      linkTwo();
      // A game on now on one account does not decide an UNLINK.
      pages.add('account-2', { eventId: GAME_B, title: 'Hawks game' });

      expect(words(await send('UNLINK'))).toBe('Which account? 1 Tigers FC, 2 Hawks FC. Reply with the number, 0 for none.');
      const answered = await send('2');

      expect(words(answered)).toBe('Hawks FC: This phone is unlinked. Link it again from Text commands in your FieldView account.');
      expect(removePhone).toHaveBeenCalledTimes(1);
      expect(removePhone).toHaveBeenCalledWith('user-2', HAWKS_LINK);
      expect(conversations.rows.get(PHONE)?.chosenLinkId).toBeNull();
    });

    it('removes the phone from the account in force', async () => {
      linkTwo();
      conversations.choose(PHONE, TIGERS_LINK, new Date(now.getTime() + HOUR));

      expect(words(await send('UNLINK'))).toMatch(/^Tigers FC: This phone is unlinked\./);
      expect(removePhone).toHaveBeenCalledWith('user-1', TIGERS_LINK);
    });
  });

  // ── Several accounts ──────────────────────────────────────────────────────

  describe('a phone on several accounts', () => {
    beforeEach(linkTwo);

    it('starts the reply with the account in force', async () => {
      conversations.choose(PHONE, HAWKS_LINK, new Date(now.getTime() + HOUR));

      expect(words(await send('GAMES'))).toBe('Hawks FC: No game page is on now or in the next 24 hours.');
      expect(lastRow()).toMatchObject({ ownerAccountId: 'account-2', phoneLabel: 'Jo' });
      expect(links.rows.get(HAWKS_LINK)?.lastCommandAt).toEqual(now);
    });

    it('picks the one account with a game on now, and says so', async () => {
      pages.add('account-2', { eventId: GAME_B, title: 'Hawks vs Owls' });
      live('account-2', [stream('Hawks - Owls', URL_1)]);

      expect(words(await send('ATTACH'))).toMatch(/^Hawks FC \(game on now\): Done\. Hawks vs Owls now shows Hawks - Owls/);
      expect(pages.pages.get(GAME_B)?.game.streamUrl).toBe(URL_1);
    });

    it('asks which account when both or neither have a game on now, keeps the command, and runs it after the digit', async () => {
      pages.add('account-1', { eventId: GAME_A, title: 'Tigers game' });
      pages.add('account-2', { eventId: GAME_B, title: 'Hawks vs Owls' });
      live('account-2', [stream('Hawks - Owls', URL_1)]);

      expect(words(await send('ATTACH'))).toBe('Which account? 1 Tigers FC, 2 Hawks FC. Reply with the number, 0 for none.');
      expect(conversations.rows.get(PHONE)?.pendingQuestion).toMatchObject({
        kind: 'pick_account',
        context: { command: { action: 'attach', offerNewPage: false } },
      });

      const answered = await send('2');

      expect(words(answered)).toMatch(/^Hawks FC: Done\. Hawks vs Owls now shows Hawks - Owls/);
      expect(conversations.rows.get(PHONE)?.chosenLinkId).toBe(HAWKS_LINK);
      expect(lastRow()).toMatchObject({ ownerAccountId: 'account-2', reason: 'attached' });
    });

    it('UNDO undoes only the account it is for', async () => {
      conversations.choose(PHONE, TIGERS_LINK, new Date(now.getTime() + HOUR));
      pages.add('account-1', { eventId: GAME_A, title: 'Tigers game', streamUrl: URL_OLD });
      live('account-1', [stream('Tigers - Owls', URL_1)]);
      await send('ATTACH');

      conversations.choose(PHONE, HAWKS_LINK, new Date(now.getTime() + HOUR));
      expect(words(await send('UNDO'))).toBe('Hawks FC: Nothing to undo.');
      expect(pages.pages.get(GAME_A)?.game.streamUrl).toBe(URL_1);
    });
  });

  // ── YES ───────────────────────────────────────────────────────────────────

  describe('YES during a question', () => {
    it('hints to answer with a number while a question is open, and only then', async () => {
      linkOne();
      pages.add('account-1', { eventId: GAME_A, title: 'Diablos vs Sporting' });
      live('account-1', [stream('A', URL_1), stream('B', URL_2)]);

      expect(await engine.hintForYes({ from: PHONE, twilioVerified: true })).toBeNull();
      await send('ATTACH');

      expect(await engine.hintForYes({ from: PHONE, twilioVerified: true })).toBe(
        'FieldView.Live: Reply with the number, for example 1.'
      );
      expect(await engine.hintForYes({ from: PHONE, twilioVerified: false })).toBeNull();
      now = new Date(now.getTime() + 11 * MINUTE);
      expect(await engine.hintForYes({ from: PHONE, twilioVerified: true })).toBeNull();
    });

    it('gives no hint to a stranger or with the switch off', async () => {
      expect(await engine.hintForYes({ from: PHONE, twilioVerified: true })).toBeNull();
      vi.stubEnv('COACH_TEXT_ENABLED', '');
      expect(await engine.hintForYes({ from: PHONE, twilioVerified: true })).toBeNull();
    });
  });
});
