import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountChooser } from '../AccountChooser';

import { FakeConversationStore, FakeLinkStore, makeOwner } from './fakes';

const HELPER = '+12145550142';
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

describe('AccountChooser', () => {
  let now: Date;
  let links: FakeLinkStore;
  let conversations: FakeConversationStore;
  let chooser: AccountChooser;

  beforeEach(() => {
    now = new Date('2026-11-22T18:00:00.000Z');
    links = new FakeLinkStore();
    conversations = new FakeConversationStore();
    chooser = new AccountChooser({ links, conversations, now: () => now });
    links.addOwner(makeOwner({ ownerUserId: 'user-1', ownerAccountId: 'account-1', accountName: 'Tigers FC' }));
    links.addOwner(makeOwner({ ownerUserId: 'user-2', ownerAccountId: 'account-2', accountName: 'Hawks FC' }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const seedLive = (ownerUserId: string, id: string, label = 'Jordan') =>
    links.seed({ id, ownerUserId, phoneE164: HELPER, label, verifiedAt: now, lastCommandAt: now });

  it('finds no account for a phone no login has proven', async () => {
    links.seed({ ownerUserId: 'user-1', phoneE164: HELPER, verifiedAt: null });

    expect(await chooser.resolve(HELPER)).toEqual({ kind: 'none' });
    expect(await chooser.listLive('+12145550999')).toEqual([]);
  });

  it('uses the only account a phone works with', async () => {
    seedLive('user-1', 'link-tigers');

    expect(await chooser.resolve(HELPER)).toEqual({
      kind: 'one',
      link: {
        linkId: 'link-tigers',
        ownerUserId: 'user-1',
        ownerAccountId: 'account-1',
        accountName: 'Tigers FC',
        label: 'Jordan',
      },
    });
  });

  it('asks when a phone works with two accounts and has made no choice, oldest link first', async () => {
    seedLive('user-1', 'link-tigers');
    seedLive('user-2', 'link-hawks');

    const resolution = await chooser.resolve(HELPER);

    expect(resolution.kind).toBe('ask');
    expect(resolution.kind === 'ask' && resolution.options.map((option) => option.accountName)).toEqual([
      'Tigers FC',
      'Hawks FC',
    ]);
  });

  it('uses the choice while it lasts', async () => {
    seedLive('user-1', 'link-tigers');
    seedLive('user-2', 'link-hawks');
    conversations.choose(HELPER, 'link-hawks', new Date(now.getTime() + 12 * HOUR));

    expect(await chooser.resolve(HELPER)).toMatchObject({
      kind: 'chosen',
      link: { linkId: 'link-hawks', accountName: 'Hawks FC' },
    });
  });

  it('asks again once the choice has run out', async () => {
    seedLive('user-1', 'link-tigers');
    seedLive('user-2', 'link-hawks');
    conversations.choose(HELPER, 'link-hawks', new Date(now.getTime() - 1));

    expect((await chooser.resolve(HELPER)).kind).toBe('ask');
  });

  it('drops a choice whose link was removed', async () => {
    seedLive('user-1', 'link-tigers');
    seedLive('user-2', 'link-hawks');
    seedLive('user-2', 'link-hawks-2', 'Jordan');
    conversations.choose(HELPER, 'link-gone', new Date(now.getTime() + HOUR));

    expect((await chooser.resolve(HELPER)).kind).toBe('ask');
  });

  it('leaves out a paused link, an idle link, a suspended account and an account off the allowlist', async () => {
    seedLive('user-1', 'link-tigers');
    links.addOwner(makeOwner({ ownerUserId: 'user-3', ownerAccountId: 'account-3', accountName: 'Owls FC' }));
    links.addOwner(
      makeOwner({ ownerUserId: 'user-4', ownerAccountId: 'account-4', accountName: 'Bees FC', accountSuspended: true })
    );
    links.addOwner(makeOwner({ ownerUserId: 'user-5', ownerAccountId: 'account-5', accountName: 'Elks FC' }));
    links.seed({ ownerUserId: 'user-2', phoneE164: HELPER, verifiedAt: now, pausedAt: now });
    links.seed({ ownerUserId: 'user-3', phoneE164: HELPER, verifiedAt: new Date(now.getTime() - 100 * DAY), lastCommandAt: null });
    seedLive('user-4', 'link-bees');
    seedLive('user-5', 'link-elks');
    vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', 'account-1,account-2,account-3,account-4');

    expect((await chooser.listLive(HELPER)).map((link) => link.accountName)).toEqual(['Tigers FC']);
    expect(await chooser.resolve(HELPER)).toMatchObject({ kind: 'one', link: { linkId: 'link-tigers' } });
  });

  it('uses the remaining account when the chosen one is paused', async () => {
    seedLive('user-1', 'link-tigers');
    const hawks = seedLive('user-2', 'link-hawks');
    conversations.choose(HELPER, 'link-hawks', new Date(now.getTime() + HOUR));
    hawks.pausedAt = now;

    expect(await chooser.resolve(HELPER)).toMatchObject({ kind: 'one', link: { linkId: 'link-tigers' } });
  });

  it('counts an account once when two of its logins have the phone', async () => {
    links.addOwner(makeOwner({ ownerUserId: 'user-1b', ownerAccountId: 'account-1', accountName: 'Tigers FC' }));
    seedLive('user-1', 'link-tigers');
    seedLive('user-1b', 'link-tigers-b');

    expect(await chooser.resolve(HELPER)).toMatchObject({ kind: 'one', link: { linkId: 'link-tigers' } });
  });
});
