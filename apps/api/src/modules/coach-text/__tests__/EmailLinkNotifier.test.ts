import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EmailOptions } from '../../../lib/email';
import { EmailLinkNotifier } from '../EmailLinkNotifier';

describe('EmailLinkNotifier', () => {
  let sent: EmailOptions[];
  let notifier: EmailLinkNotifier;

  beforeEach(() => {
    sent = [];
    notifier = new EmailLinkNotifier((options) => {
      sent.push(options);
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('tells the login a phone was linked and where to undo it', async () => {
    await notifier.linked({
      email: 'coach@example.com',
      accountName: 'Diablos FC',
      phoneMasked: '(***) ***-0100',
      paused: false,
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('coach@example.com');
    expect(sent[0].subject).toBe('A phone was linked to your FieldView account');
    expect(sent[0].text).toContain('(***) ***-0100');
    expect(sent[0].text).toContain('Diablos FC');
    expect(sent[0].text).toContain('https://fieldview.live/owners/text-commands');
    expect(sent[0].text).not.toContain('START');
    expect(sent[0].html).toContain('(***) ***-0100');
  });

  it('says how to resume when the phone was linked paused', async () => {
    await notifier.linked({
      email: 'coach@example.com',
      accountName: 'Diablos FC',
      phoneMasked: '(***) ***-0100',
      paused: true,
    });

    expect(sent[0].text).toContain('text START to (877) 343-5308');
  });

  it('tells the earlier login its phone moved without naming anyone', async () => {
    await notifier.movedAway({ email: 'coach@example.com', phoneMasked: '(***) ***-0100' });

    expect(sent[0].to).toBe('coach@example.com');
    expect(sent[0].subject).toBe('A phone was unlinked from your FieldView account');
    expect(sent[0].text).toContain('(***) ***-0100');
    expect(sent[0].text).toContain('another FieldView login');
  });

  it('tells the login a phone was unlinked', async () => {
    await notifier.unlinked({
      email: 'coach@example.com',
      accountName: 'Diablos FC',
      phoneMasked: '(***) ***-0100',
    });

    expect(sent[0].subject).toBe('A phone was unlinked from your FieldView account');
    expect(sent[0].text).toContain('Diablos FC');
  });

  it('escapes the account name in the HTML part', async () => {
    await notifier.unlinked({
      email: 'coach@example.com',
      accountName: 'Tom & <b>Jerry</b> FC',
      phoneMasked: '(***) ***-0100',
    });

    expect(sent[0].html).toContain('Tom &amp; &lt;b&gt;Jerry&lt;/b&gt; FC');
    expect(sent[0].html).not.toContain('<b>Jerry</b>');
    expect(sent[0].text).toContain('Tom & <b>Jerry</b> FC');
  });

  it('links to APP_URL when it is set', async () => {
    vi.stubEnv('APP_URL', 'https://staging.fieldview.live/');

    await notifier.movedAway({ email: 'coach@example.com', phoneMasked: '(***) ***-0100' });

    expect(sent[0].text).toContain('https://staging.fieldview.live/owners/text-commands');
  });
});
