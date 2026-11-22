import { SMS_OWNER_CONSENT_TEXT_VERSION } from '@fieldview/data-model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, BadRequestError, NotFoundError } from '../../../lib/errors';
import { PhoneLinkService } from '../PhoneLinkService';

import {
  FakeCommandLog,
  FakeConsent,
  FakeLinkStore,
  FakeNotifier,
  FakeSettingsStore,
  makeOwner,
} from './fakes';

const PHONE = '+12145550100';
const HELPER = '+12145550142';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const OWNER_COMMANDS = 'owner_commands';

describe('PhoneLinkService', () => {
  let now: Date;
  let links: FakeLinkStore;
  let consent: FakeConsent;
  let commands: FakeCommandLog;
  let notifier: FakeNotifier;
  let settings: FakeSettingsStore;
  let service: PhoneLinkService;

  const advance = (ms: number): void => {
    now = new Date(now.getTime() + ms);
  };

  const wrongCodeFor = (code: string): string => (code === '000000' ? '000001' : '000000');

  /** Adds a phone on a login and texts its code back from it. */
  const linkPhone = async (ownerUserId: string, phone: string, label = 'Phone') => {
    const issued = await service.addPhone({ ownerUserId, label, phone });
    return service.completeFromText({ from: phone, code: issued.code });
  };

  const expectAppError = async (promise: Promise<unknown>, code: string, status: number) => {
    const error = await promise.then(
      () => null,
      (caught: unknown) => caught
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code, statusCode: status });
  };

  beforeEach(() => {
    now = new Date('2026-11-22T18:00:00.000Z');
    const clock = (): Date => now;
    links = new FakeLinkStore();
    consent = new FakeConsent(clock);
    commands = new FakeCommandLog(clock);
    notifier = new FakeNotifier();
    settings = new FakeSettingsStore();
    service = new PhoneLinkService({ links, consent, commands, notifier, settings, now: clock });
    links.addOwner(makeOwner());
    links.addOwner(
      makeOwner({
        ownerUserId: 'user-2',
        email: 'hawks@example.com',
        ownerAccountId: 'account-2',
        accountName: 'Hawks FC',
      })
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('adding a phone in the portal', () => {
    it("makes a code for a named phone and keeps only the code's hash", async () => {
      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: '(214) 555-0142' });

      expect(issued.code).toMatch(/^\d{6}$/);
      expect(issued.codeExpiresAt.getTime()).toBe(now.getTime() + 10 * MINUTE);
      const [row] = links.rowsFor('user-1');
      expect(row).toMatchObject({
        id: issued.id,
        phoneE164: HELPER,
        label: 'Jordan',
        verifiedAt: null,
        codeAttempts: 0,
      });
      expect(row.codeHash).not.toContain(issued.code);
      expect(consent.rows.size).toBe(0);
    });

    it('keeps several phones on one login, each its own row', async () => {
      const mine = await service.addPhone({ ownerUserId: 'user-1', label: 'Ricardo', phone: PHONE });
      const jordans = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      expect(mine.id).not.toBe(jordans.id);
      expect(links.rowsFor('user-1').map((row) => row.label)).toEqual(['Ricardo', 'Jordan']);
    });

    it('gives a number that is still waiting a fresh code on the same row, with the new name', async () => {
      const first = await service.addPhone({ ownerUserId: 'user-1', label: 'Jo', phone: HELPER });
      await service.completeFromText({ from: HELPER, code: wrongCodeFor(first.code) });

      const again = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      expect(again.id).toBe(first.id);
      expect(links.rowsFor('user-1')).toHaveLength(1);
      expect(links.rowsFor('user-1')[0]).toMatchObject({ label: 'Jordan', codeAttempts: 0 });
      const linked = await service.completeFromText({ from: HELPER, code: again.code });
      expect(linked.matched).toBe(true);
    });

    it('refuses a number already linked on this login', async () => {
      await linkPhone('user-1', HELPER);

      await expectAppError(
        service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER }),
        'PHONE_ALREADY_ADDED',
        409
      );
    });

    it('stops at ten phones', async () => {
      for (let n = 0; n < 10; n += 1) {
        await service.addPhone({ ownerUserId: 'user-1', label: `Helper ${n}`, phone: `+1214555011${n}` });
      }

      await expectAppError(
        service.addPhone({ ownerUserId: 'user-1', label: 'One more', phone: '+12145550199' }),
        'PHONE_LIMIT_REACHED',
        409
      );
      expect(links.rowsFor('user-1')).toHaveLength(10);
    });

    it('takes a number another login already uses, and says nothing about it', async () => {
      await linkPhone('user-2', HELPER);

      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      expect(issued.code).toMatch(/^\d{6}$/);
      expect(links.rowsFor('user-2')[0].verifiedAt).not.toBeNull();
    });

    it("takes the browser's time zone while the login has not picked one", async () => {
      await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER, timeZone: 'America/Denver' });
      expect(settings.zones.get('user-1')).toBe('America/Denver');

      await service.setTimeZone('user-1', 'America/New_York');
      await service.addPhone({ ownerUserId: 'user-1', label: 'Sam', phone: PHONE, timeZone: 'America/Denver' });
      expect(settings.zones.get('user-1')).toBe('America/New_York');
    });

    it('refuses a number outside the US and Canada, and the FieldView number', async () => {
      await expect(
        service.addPhone({ ownerUserId: 'user-1', label: 'Abroad', phone: '+44 20 7946 0958' })
      ).rejects.toBeInstanceOf(BadRequestError);
      await expect(
        service.addPhone({ ownerUserId: 'user-1', label: 'Us', phone: '(877) 343-5308' })
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(links.rows.size).toBe(0);
    });
  });

  describe('a new code', () => {
    it('replaces the code of a waiting phone and resets its tries', async () => {
      const first = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });
      await service.completeFromText({ from: HELPER, code: wrongCodeFor(first.code) });

      const fresh = await service.newCode('user-1', first.id);

      expect(fresh.id).toBe(first.id);
      expect(links.rowsFor('user-1')[0].codeAttempts).toBe(0);
      expect((await service.completeFromText({ from: HELPER, code: first.code })).matched).toBe(
        first.code === fresh.code
      );
      expect((await service.completeFromText({ from: HELPER, code: fresh.code })).matched).toBe(true);
    });

    it('refuses a phone that is linked', async () => {
      await linkPhone('user-1', HELPER);
      const [row] = links.rowsFor('user-1');

      await expectAppError(service.newCode('user-1', row.id), 'PHONE_ALREADY_LINKED', 409);
    });

    it('re-proves a phone that went 90 days without a text', async () => {
      await linkPhone('user-1', HELPER);
      const [row] = links.rowsFor('user-1');
      advance(91 * DAY);

      const fresh = await service.newCode('user-1', row.id);

      expect((await service.completeFromText({ from: HELPER, code: fresh.code })).matched).toBe(true);
      expect((await service.getStatus('user-1')).phones[0].state).toBe('linked');
    });

    it("does not reach another login's phone", async () => {
      const theirs = await service.addPhone({ ownerUserId: 'user-2', label: 'Jordan', phone: HELPER });

      await expect(service.newCode('user-1', theirs.id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.newCode('user-1', 'no-such-link')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('the status the portal shows', () => {
    it('lists every phone, oldest first, with its state and a masked number', async () => {
      await linkPhone('user-1', PHONE, 'Ricardo');
      await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      const status = await service.getStatus('user-1');

      expect(status.timeZone).toBe('America/Chicago');
      expect(status.phones).toEqual([
        expect.objectContaining({
          label: 'Ricardo',
          phoneMasked: '(***) ***-0100',
          state: 'linked',
          codeExpiresAt: null,
          verifiedAt: now,
        }),
        expect.objectContaining({
          label: 'Jordan',
          phoneMasked: '(***) ***-0142',
          state: 'pending',
          codeExpiresAt: new Date(now.getTime() + 10 * MINUTE),
          verifiedAt: null,
          unverifiedTextSeen: false,
        }),
      ]);
      expect(JSON.stringify(status)).not.toContain('2145550');
    });

    it('shows an empty list for a login with no phones', async () => {
      expect(await service.getStatus('user-1')).toEqual({ timeZone: 'America/Chicago', phones: [] });
    });

    it('keeps a waiting phone whose code ran out, so the coach can ask for a new one', async () => {
      await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });
      advance(11 * MINUTE);

      const [phone] = (await service.getStatus('user-1')).phones;

      expect(phone.state).toBe('pending');
      expect(phone.codeExpiresAt!.getTime()).toBeLessThan(now.getTime());
    });

    it('shows a paused phone and a phone idle for 90 days', async () => {
      await linkPhone('user-1', PHONE, 'Ricardo');
      await linkPhone('user-1', HELPER, 'Jordan');
      await service.pause(HELPER);
      advance(91 * DAY);
      await linkPhone('user-1', '+12145550177', 'Sam');

      const states = (await service.getStatus('user-1')).phones.map((phone) => [phone.label, phone.state]);

      expect(states).toEqual([
        ['Ricardo', 'expired'],
        ['Jordan', 'expired'],
        ['Sam', 'linked'],
      ]);
    });

    it('shows a code with no tries left as run out, so the page offers a new one', async () => {
      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });
      for (let n = 0; n < 5; n += 1) {
        await service.completeFromText({ from: HELPER, code: wrongCodeFor(issued.code) });
      }

      const [phone] = (await service.getStatus('user-1')).phones;

      expect(phone.state).toBe('pending');
      expect(phone.codeExpiresAt).toEqual(now);
    });

    it('marks a paused phone that is still within 90 days as paused', async () => {
      await linkPhone('user-1', HELPER, 'Jordan');
      await service.pause(HELPER);

      expect((await service.getStatus('user-1')).phones[0].state).toBe('paused');
    });

    it('notes a text from a waiting number that could not be verified', async () => {
      await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });
      await commands.recordUnverified({ phoneE164: HELPER, twilioVerified: false, reason: 'unverified' });

      expect((await service.getStatus('user-1')).phones[0].unverifiedTextSeen).toBe(true);
    });

    it('uses the time zone the login picked', async () => {
      await service.setTimeZone('user-1', 'America/Denver');

      expect((await service.getStatus('user-1')).timeZone).toBe('America/Denver');
      expect(settings.zones.get('user-1')).toBe('America/Denver');
    });
  });

  describe('a LINK text', () => {
    it('links the phone, records its opt-in, and emails the login', async () => {
      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      const result = await service.completeFromText({ from: HELPER, code: issued.code });

      expect(result).toEqual({
        matched: true,
        linkId: issued.id,
        ownerUserId: 'user-1',
        ownerAccountId: 'account-1',
        accountName: 'Diablos FC',
        label: 'Jordan',
        paused: false,
        accountCount: 1,
      });
      expect(links.rowsFor('user-1')[0]).toMatchObject({ verifiedAt: now, codeHash: null });
      expect(consent.get(HELPER, OWNER_COMMANDS)).toMatchObject({
        consentTextVersion: SMS_OWNER_CONSENT_TEXT_VERSION,
        source: 'inbound-link',
        revokedAt: null,
      });
      await Promise.resolve();
      expect(notifier.sent).toEqual([
        {
          kind: 'linked',
          email: 'coach@example.com',
          accountName: 'Diablos FC',
          label: 'Jordan',
          phoneMasked: '(***) ***-0142',
          paused: false,
        },
      ]);
    });

    it('adds a second account to a phone without taking it from the first', async () => {
      await linkPhone('user-2', HELPER, 'Jordan');
      notifier.sent.length = 0;

      const result = await linkPhone('user-1', HELPER, 'Jordan');

      expect(result).toMatchObject({ matched: true, accountName: 'Diablos FC', accountCount: 2 });
      expect(links.rowsFor('user-2')[0].verifiedAt).not.toBeNull();
      expect(links.rowsFor('user-1')[0].verifiedAt).not.toBeNull();
      await Promise.resolve();
      expect(notifier.sent.map((notice) => [notice.kind, notice.email])).toEqual([
        ['linked', 'coach@example.com'],
      ]);
    });

    it('stops at nine accounts per phone, and leaves the tenth waiting', async () => {
      for (let n = 3; n <= 11; n += 1) {
        links.addOwner(makeOwner({ ownerUserId: `user-${n}`, ownerAccountId: `account-${n}`, email: `c${n}@example.com` }));
        links.seed({ ownerUserId: `user-${n}`, phoneE164: HELPER });
      }
      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      const result = await service.completeFromText({ from: HELPER, code: issued.code });

      expect(result).toEqual({ matched: false, reason: 'too_many_accounts' });
      expect(links.rowsFor('user-1')[0].verifiedAt).toBeNull();
    });

    it('counts a phone proving itself again on the same login as no new account', async () => {
      await linkPhone('user-1', HELPER);
      advance(91 * DAY);
      for (let n = 3; n <= 10; n += 1) {
        links.addOwner(makeOwner({ ownerUserId: `user-${n}`, ownerAccountId: `account-${n}`, email: `c${n}@example.com` }));
        links.seed({ ownerUserId: `user-${n}`, phoneE164: HELPER, verifiedAt: now, lastCommandAt: now });
      }
      const fresh = await service.newCode('user-1', links.rowsFor('user-1')[0].id);

      const result = await service.completeFromText({ from: HELPER, code: fresh.code });

      expect(result).toMatchObject({ matched: true, accountCount: 9 });
    });

    it('counts a wrong code against every live code for that phone', async () => {
      const mine = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });
      const theirs = await service.addPhone({ ownerUserId: 'user-2', label: 'Jordan', phone: HELPER });
      const wrong = ['000000', '000001', '000002'].find((code) => code !== mine.code && code !== theirs.code)!;

      expect(await service.completeFromText({ from: HELPER, code: wrong })).toEqual({
        matched: false,
        reason: 'wrong_code',
      });
      expect(links.rowsFor('user-1')[0].codeAttempts).toBe(1);
      expect(links.rowsFor('user-2')[0].codeAttempts).toBe(1);
    });

    it('stops a code after five wrong tries, and lets a code run out', async () => {
      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });
      for (let n = 0; n < 5; n += 1) {
        await service.completeFromText({ from: HELPER, code: wrongCodeFor(issued.code) });
      }
      expect(await service.completeFromText({ from: HELPER, code: issued.code })).toEqual({
        matched: false,
        reason: 'too_many_tries',
      });

      const fresh = await service.newCode('user-1', issued.id);
      advance(11 * MINUTE);
      expect(await service.completeFromText({ from: HELPER, code: fresh.code })).toEqual({
        matched: false,
        reason: 'expired',
      });
    });

    it('answers no_pending for a phone no login is waiting on', async () => {
      expect(await service.completeFromText({ from: HELPER, code: '123456' })).toEqual({
        matched: false,
        reason: 'no_pending',
      });
    });

    it('refuses a suspended account and an account off the allowlist', async () => {
      links.addOwner(makeOwner({ accountSuspended: true }));
      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });
      expect(await service.completeFromText({ from: HELPER, code: issued.code })).toEqual({
        matched: false,
        reason: 'not_allowed',
      });

      links.addOwner(makeOwner());
      vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', 'account-9');
      const fresh = await service.newCode('user-1', issued.id);
      expect(await service.completeFromText({ from: HELPER, code: fresh.code })).toEqual({
        matched: false,
        reason: 'not_allowed',
      });
    });

    it('links a phone that had texted STOP as paused, with its opt-in revoked', async () => {
      await consent.revokeConsent(HELPER, 'viewer_notifications');
      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      const result = await service.completeFromText({ from: HELPER, code: issued.code });

      expect(result).toMatchObject({ matched: true, paused: true });
      expect(links.rowsFor('user-1')[0].pausedAt).toEqual(now);
      expect(consent.get(HELPER, OWNER_COMMANDS)?.revokedAt).toEqual(now);
    });
  });

  describe('removing a phone', () => {
    it("removes one phone, keeps the login's others, and emails the login", async () => {
      await linkPhone('user-1', PHONE, 'Ricardo');
      await linkPhone('user-1', HELPER, 'Jordan');
      notifier.sent.length = 0;
      const jordan = links.rowsFor('user-1')[1];

      expect(await service.removePhone('user-1', jordan.id)).toEqual({ removed: true });

      expect(links.rowsFor('user-1').map((row) => row.label)).toEqual(['Ricardo']);
      expect(consent.get(HELPER, OWNER_COMMANDS)?.revokedAt).toEqual(now);
      await Promise.resolve();
      expect(notifier.sent).toEqual([
        {
          kind: 'removed',
          email: 'coach@example.com',
          accountName: 'Diablos FC',
          label: 'Jordan',
          phoneMasked: '(***) ***-0142',
        },
      ]);
    });

    it('keeps the opt-in while the phone still works with another account', async () => {
      await linkPhone('user-1', HELPER);
      await linkPhone('user-2', HELPER);

      await service.removePhone('user-1', links.rowsFor('user-1')[0].id);

      expect(consent.get(HELPER, OWNER_COMMANDS)?.revokedAt).toBeNull();
      expect(links.rowsFor('user-2')).toHaveLength(1);
    });

    it('drops a waiting phone without an email', async () => {
      const issued = await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      expect(await service.removePhone('user-1', issued.id)).toEqual({ removed: true });

      expect(links.rows.size).toBe(0);
      await Promise.resolve();
      expect(notifier.sent).toEqual([]);
    });

    it("answers removed: false for another login's phone or an unknown id", async () => {
      const theirs = await service.addPhone({ ownerUserId: 'user-2', label: 'Jordan', phone: HELPER });

      expect(await service.removePhone('user-1', theirs.id)).toEqual({ removed: false });
      expect(await service.removePhone('user-1', 'no-such-link')).toEqual({ removed: false });
      expect(links.rows.size).toBe(1);
    });

    it('still removes the phone when the email fails', async () => {
      await linkPhone('user-1', HELPER);
      notifier.failWith = new Error('mail down');

      expect(await service.removePhone('user-1', links.rowsFor('user-1')[0].id)).toEqual({ removed: true });
      await Promise.resolve();
    });
  });

  describe('STOP and START', () => {
    it('pause every account a phone works with, then resume them', async () => {
      await linkPhone('user-1', HELPER);
      await linkPhone('user-2', HELPER);

      await service.pause(HELPER);
      expect(links.rowsFor('user-1')[0].pausedAt).toEqual(now);
      expect(links.rowsFor('user-2')[0].pausedAt).toEqual(now);
      expect(consent.get(HELPER, OWNER_COMMANDS)?.revokedAt).toEqual(now);

      await service.resume(HELPER);
      expect(links.rowsFor('user-1')[0].pausedAt).toBeNull();
      expect(links.rowsFor('user-2')[0].pausedAt).toBeNull();
      expect(consent.get(HELPER, OWNER_COMMANDS)?.revokedAt).toBeNull();
    });

    it('do nothing for a phone no login has proven', async () => {
      await service.addPhone({ ownerUserId: 'user-1', label: 'Jordan', phone: HELPER });

      await service.pause(HELPER);

      expect(links.rowsFor('user-1')[0].pausedAt).toBeNull();
      expect(consent.get(HELPER, OWNER_COMMANDS)).toBeUndefined();
    });
  });
});
