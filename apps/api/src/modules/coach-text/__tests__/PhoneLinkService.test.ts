import { SMS_OWNER_CONSENT_TEXT_VERSION } from '@fieldview/data-model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BadRequestError } from '../../../lib/errors';
import { PhoneLinkService } from '../PhoneLinkService';

import { FakeCommandLog, FakeConsent, FakeLinkStore, FakeNotifier, makeOwner } from './fakes';

const PHONE = '+12145550100';
const OTHER_PHONE = '+12145550111';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('PhoneLinkService', () => {
  let now: Date;
  let links: FakeLinkStore;
  let consent: FakeConsent;
  let commands: FakeCommandLog;
  let notifier: FakeNotifier;
  let service: PhoneLinkService;

  const advance = (ms: number): void => {
    now = new Date(now.getTime() + ms);
  };

  const wrongCodeFor = (code: string): string => (code === '000000' ? '000001' : '000000');

  beforeEach(() => {
    now = new Date('2026-11-21T18:00:00.000Z');
    const clock = (): Date => now;
    links = new FakeLinkStore();
    consent = new FakeConsent(clock);
    commands = new FakeCommandLog(clock);
    notifier = new FakeNotifier();
    service = new PhoneLinkService({ links, consent, commands, notifier, now: clock });
    links.addOwner(makeOwner());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('startLink', () => {
    it('gives a six-digit code that lasts ten minutes and stores only its hash', async () => {
      const started = await service.startLink({ ownerUserId: 'user-1', phone: '(214) 555-0100' });

      expect(started.code).toMatch(/^\d{6}$/);
      expect(started.codeExpiresAt.getTime()).toBe(now.getTime() + 10 * MINUTE);

      const row = links.rowFor('user-1');
      expect(row?.pendingPhoneE164).toBe(PHONE);
      expect(row?.phoneE164).toBeNull();
      expect(row?.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(row)).not.toContain(started.code);
    });

    it('keeps the time zone sent with the phone', async () => {
      await service.startLink({
        ownerUserId: 'user-1',
        phone: PHONE,
        timeZone: 'America/Denver',
      });
      expect(links.rowFor('user-1')?.timeZone).toBe('America/Denver');
    });

    it('follows COACH_TEXT_CODE_TTL_SECONDS', async () => {
      vi.stubEnv('COACH_TEXT_CODE_TTL_SECONDS', '120');
      const started = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      expect(started.codeExpiresAt.getTime()).toBe(now.getTime() + 2 * MINUTE);
    });

    it('makes a fresh code and clears the try count on a second start', async () => {
      const first = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code: wrongCodeFor(first.code) });
      expect(links.rowFor('user-1')?.codeAttempts).toBe(1);
      const firstHash = links.rowFor('user-1')?.codeHash;

      await service.startLink({ ownerUserId: 'user-1', phone: OTHER_PHONE });

      const row = links.rowFor('user-1');
      expect(row?.codeAttempts).toBe(0);
      expect(row?.pendingPhoneE164).toBe(OTHER_PHONE);
      expect(row?.codeHash).not.toBe(firstHash);
      expect(links.rows.size).toBe(1);
    });

    it('refuses a number outside the US and Canada', async () => {
      await expect(
        service.startLink({ ownerUserId: 'user-1', phone: '+442079460958' })
      ).rejects.toBeInstanceOf(BadRequestError);
      await expect(
        service.startLink({ ownerUserId: 'user-1', phone: 'not a phone' })
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(links.rows.size).toBe(0);
    });

    it('refuses the FieldView number itself', async () => {
      await expect(
        service.startLink({ ownerUserId: 'user-1', phone: '+18773435308' })
      ).rejects.toBeInstanceOf(BadRequestError);
    });
  });

  describe('completeFromText', () => {
    it('links the phone when the right code comes from it', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      advance(MINUTE);

      const result = await service.completeFromText({ from: PHONE, code });

      expect(result).toEqual({
        matched: true,
        ownerUserId: 'user-1',
        ownerAccountId: 'account-1',
        accountName: 'Diablos FC',
        paused: false,
      });
      const row = links.rowFor('user-1');
      expect(row).toMatchObject({
        phoneE164: PHONE,
        verifiedAt: now,
        lastCommandAt: now,
        pausedAt: null,
        pendingPhoneE164: null,
        codeHash: null,
        codeExpiresAt: null,
        codeAttempts: 0,
      });
    });

    it('records the opt-in for owner commands', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code });

      expect(consent.get(PHONE, 'owner_commands')).toMatchObject({
        consentTextVersion: SMS_OWNER_CONSENT_TEXT_VERSION,
        source: 'inbound-link',
        consentedAt: now,
        revokedAt: null,
      });
    });

    it('emails the login with the phone masked', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code });

      expect(notifier.sent).toEqual([
        {
          kind: 'linked',
          email: 'coach@example.com',
          accountName: 'Diablos FC',
          phoneMasked: '(***) ***-0100',
          paused: false,
        },
      ]);
    });

    it('still links when the email cannot be sent', async () => {
      notifier.failWith = new Error('mail is down');
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });

      const result = await service.completeFromText({ from: PHONE, code });

      expect(result.matched).toBe(true);
      expect(links.rowFor('user-1')?.phoneE164).toBe(PHONE);
    });

    it('counts a wrong code and still takes the right one after it', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });

      const wrong = await service.completeFromText({ from: PHONE, code: wrongCodeFor(code) });
      expect(wrong).toEqual({ matched: false, reason: 'wrong_code' });
      expect(links.rowFor('user-1')?.codeAttempts).toBe(1);
      expect(links.rowFor('user-1')?.phoneE164).toBeNull();

      const right = await service.completeFromText({ from: PHONE, code });
      expect(right.matched).toBe(true);
    });

    it('refuses the sixth try even with the right code', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      for (let i = 0; i < 5; i += 1) {
        await service.completeFromText({ from: PHONE, code: wrongCodeFor(code) });
      }

      const result = await service.completeFromText({ from: PHONE, code });

      expect(result).toEqual({ matched: false, reason: 'too_many_tries' });
      expect(links.rowFor('user-1')?.phoneE164).toBeNull();
      expect(consent.rows.size).toBe(0);
    });

    it('refuses a code after it expires', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      advance(10 * MINUTE + 1);

      const result = await service.completeFromText({ from: PHONE, code });

      expect(result).toEqual({ matched: false, reason: 'expired' });
      expect(links.rowFor('user-1')?.phoneE164).toBeNull();
    });

    it('refuses a phone nobody is waiting on', async () => {
      const result = await service.completeFromText({ from: PHONE, code: '123456' });
      expect(result).toEqual({ matched: false, reason: 'no_pending' });
    });

    it('refuses the right code from a different phone and does not count a try', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });

      const result = await service.completeFromText({ from: OTHER_PHONE, code });

      expect(result).toEqual({ matched: false, reason: 'no_pending' });
      expect(links.rowFor('user-1')?.codeAttempts).toBe(0);
    });

    it.each([
      ['an inactive login', { loginStatus: 'disabled' }],
      ['a suspended account', { accountStatus: 'suspended' }],
      ['an account flagged suspended', { accountSuspended: true }],
    ])('refuses %s', async (_label, change) => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      links.addOwner(makeOwner(change));

      const result = await service.completeFromText({ from: PHONE, code });

      expect(result).toEqual({ matched: false, reason: 'not_allowed' });
      expect(links.rowFor('user-1')?.phoneE164).toBeNull();
      expect(consent.rows.size).toBe(0);
      expect(notifier.sent).toEqual([]);
    });

    it('links an account that is still waiting on verification', async () => {
      links.addOwner(makeOwner({ accountStatus: 'pending_verification' }));
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      expect((await service.completeFromText({ from: PHONE, code })).matched).toBe(true);
    });

    it('refuses an account that is not on the allowlist', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', 'account-9');

      expect(await service.completeFromText({ from: PHONE, code })).toEqual({
        matched: false,
        reason: 'not_allowed',
      });

      vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', 'account-9, account-1');
      expect((await service.completeFromText({ from: PHONE, code })).matched).toBe(true);
    });

    it('moves a phone to the login that texts its code and tells both logins', async () => {
      const first = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code: first.code });
      notifier.sent.length = 0;

      links.addOwner(
        makeOwner({
          ownerUserId: 'user-2',
          email: 'second@example.com',
          ownerAccountId: 'account-2',
          accountName: 'Storm SC',
        })
      );
      const second = await service.startLink({ ownerUserId: 'user-2', phone: PHONE });

      // Until the text arrives, nothing moves and the second login just waits.
      expect(links.rowFor('user-1')?.phoneE164).toBe(PHONE);
      expect((await service.getStatus('user-2')).state).toBe('pending');

      const result = await service.completeFromText({ from: PHONE, code: second.code });

      expect(result).toMatchObject({ matched: true, ownerUserId: 'user-2' });
      expect(links.rowFor('user-2')?.phoneE164).toBe(PHONE);
      expect(links.rowFor('user-1')).toMatchObject({ phoneE164: null, verifiedAt: null });
      expect((await service.getStatus('user-1')).state).toBe('none');
      expect(consent.get(PHONE, 'owner_commands')?.revokedAt).toBeNull();

      expect(notifier.sent).toEqual([
        {
          kind: 'linked',
          email: 'second@example.com',
          accountName: 'Storm SC',
          phoneMasked: '(***) ***-0100',
          paused: false,
        },
        { kind: 'movedAway', email: 'coach@example.com', phoneMasked: '(***) ***-0100' },
      ]);
    });

    it('ends consent for the old phone when a login links a new one', async () => {
      const first = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code: first.code });

      const second = await service.startLink({ ownerUserId: 'user-1', phone: OTHER_PHONE });
      // The old phone keeps working until the new one texts its code.
      expect(links.rowFor('user-1')?.phoneE164).toBe(PHONE);
      await service.completeFromText({ from: OTHER_PHONE, code: second.code });

      expect(links.rowFor('user-1')?.phoneE164).toBe(OTHER_PHONE);
      expect(consent.get(PHONE, 'owner_commands')?.revokedAt).toEqual(now);
      expect(consent.get(OTHER_PHONE, 'owner_commands')?.revokedAt).toBeNull();
      expect(notifier.sent.filter((notice) => notice.kind === 'movedAway')).toEqual([]);
    });

    it('links a phone that had texted STOP as paused', async () => {
      await consent.revokeConsent(PHONE, 'viewer_notifications');
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });

      const result = await service.completeFromText({ from: PHONE, code });

      expect(result).toMatchObject({ matched: true, paused: true });
      expect(links.rowFor('user-1')).toMatchObject({ phoneE164: PHONE, pausedAt: now });
      expect(consent.get(PHONE, 'owner_commands')).toMatchObject({
        source: 'inbound-link',
        consentedAt: now,
        revokedAt: now,
      });
      expect((await service.getStatus('user-1')).state).toBe('paused');
      expect(notifier.sent).toEqual([expect.objectContaining({ kind: 'linked', paused: true })]);
    });
  });

  describe('pause and resume', () => {
    it('pauses a linked phone and ends its consent, then resumes both', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code });

      advance(MINUTE);
      await service.pause(PHONE);
      expect(links.rowFor('user-1')?.pausedAt).toEqual(now);
      expect(consent.get(PHONE, 'owner_commands')?.revokedAt).toEqual(now);
      expect((await service.getStatus('user-1')).state).toBe('paused');

      await service.resume(PHONE);
      expect(links.rowFor('user-1')?.pausedAt).toBeNull();
      expect(consent.get(PHONE, 'owner_commands')?.revokedAt).toBeNull();
      expect((await service.getStatus('user-1')).state).toBe('linked');
    });

    it('writes nothing for a phone that is not linked', async () => {
      await service.startLink({ ownerUserId: 'user-1', phone: PHONE });

      await service.pause(PHONE);
      await service.resume(PHONE);
      await service.pause(OTHER_PHONE);

      expect(consent.rows.size).toBe(0);
      expect(links.rowFor('user-1')?.pausedAt).toBeNull();
    });
  });

  describe('unlink', () => {
    it('removes the link, ends consent and emails the login', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code });
      notifier.sent.length = 0;

      expect(await service.unlink('user-1')).toEqual({ unlinked: true });

      expect(links.rows.size).toBe(0);
      expect(consent.get(PHONE, 'owner_commands')?.revokedAt).toEqual(now);
      expect(notifier.sent).toEqual([
        {
          kind: 'unlinked',
          email: 'coach@example.com',
          accountName: 'Diablos FC',
          phoneMasked: '(***) ***-0100',
        },
      ]);
      expect((await service.getStatus('user-1')).state).toBe('none');
    });

    it('drops a code that was never used without an email', async () => {
      await service.startLink({ ownerUserId: 'user-1', phone: PHONE });

      expect(await service.unlink('user-1')).toEqual({ unlinked: true });

      expect(links.rows.size).toBe(0);
      expect(consent.rows.size).toBe(0);
      expect(notifier.sent).toEqual([]);
    });

    it('answers false when there is nothing to unlink', async () => {
      expect(await service.unlink('user-1')).toEqual({ unlinked: false });
    });
  });

  describe('getStatus', () => {
    it('is none with the default time zone before anything is linked', async () => {
      expect(await service.getStatus('user-1')).toEqual({
        state: 'none',
        phoneMasked: null,
        pendingPhoneMasked: null,
        codeExpiresAt: null,
        unverifiedTextSeen: false,
        verifiedAt: null,
        lastCommandAt: null,
        timeZone: 'America/Chicago',
      });
    });

    it('is pending while the code is live and none after it runs out', async () => {
      const started = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });

      expect(await service.getStatus('user-1')).toMatchObject({
        state: 'pending',
        phoneMasked: null,
        pendingPhoneMasked: '(***) ***-0100',
        codeExpiresAt: started.codeExpiresAt,
        unverifiedTextSeen: false,
      });

      advance(10 * MINUTE + 1);
      expect(await service.getStatus('user-1')).toMatchObject({
        state: 'none',
        pendingPhoneMasked: null,
        codeExpiresAt: null,
      });
    });

    it('says when a text from the waiting phone could not be verified', async () => {
      await commands.recordUnverified({
        phoneE164: PHONE,
        twilioVerified: false,
        reason: 'unverified',
      });
      advance(MINUTE);
      await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      // A text from before this code was made does not count.
      expect((await service.getStatus('user-1')).unverifiedTextSeen).toBe(false);

      advance(MINUTE);
      await commands.recordUnverified({
        phoneE164: PHONE,
        twilioVerified: false,
        reason: 'unverified',
      });
      expect((await service.getStatus('user-1')).unverifiedTextSeen).toBe(true);
    });

    it('is linked with the phone masked and the saved time zone', async () => {
      const { code } = await service.startLink({
        ownerUserId: 'user-1',
        phone: PHONE,
        timeZone: 'America/New_York',
      });
      await service.completeFromText({ from: PHONE, code });

      expect(await service.getStatus('user-1')).toEqual({
        state: 'linked',
        phoneMasked: '(***) ***-0100',
        pendingPhoneMasked: null,
        codeExpiresAt: null,
        unverifiedTextSeen: false,
        verifiedAt: now,
        lastCommandAt: now,
        timeZone: 'America/New_York',
      });
    });

    it('expires a link after ninety idle days', async () => {
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code });

      advance(90 * DAY - MINUTE);
      expect((await service.getStatus('user-1')).state).toBe('linked');

      advance(2 * MINUTE);
      expect((await service.getStatus('user-1')).state).toBe('expired');
    });

    it('follows COACH_TEXT_LINK_IDLE_DAYS and COACH_TEXT_DEFAULT_TIME_ZONE', async () => {
      vi.stubEnv('COACH_TEXT_LINK_IDLE_DAYS', '7');
      vi.stubEnv('COACH_TEXT_DEFAULT_TIME_ZONE', 'America/Denver');
      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code });

      advance(8 * DAY);
      expect(await service.getStatus('user-1')).toMatchObject({
        state: 'expired',
        timeZone: 'America/Denver',
      });
    });
  });

  describe('setTimeZone', () => {
    it('saves the time zone before and after a phone is linked', async () => {
      await service.setTimeZone('user-1', 'America/Phoenix');
      expect(await service.getStatus('user-1')).toMatchObject({
        state: 'none',
        timeZone: 'America/Phoenix',
      });

      const { code } = await service.startLink({ ownerUserId: 'user-1', phone: PHONE });
      await service.completeFromText({ from: PHONE, code });
      await service.setTimeZone('user-1', 'America/Chicago');
      expect(await service.getStatus('user-1')).toMatchObject({
        state: 'linked',
        timeZone: 'America/Chicago',
      });
    });
  });
});
