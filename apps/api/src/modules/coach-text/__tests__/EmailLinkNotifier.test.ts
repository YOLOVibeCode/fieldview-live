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

  it("tells the login whose phone was linked, and where to undo it", async () => {
    await notifier.linked({
      email: 'coach@example.com',
      accountName: 'Diablos FC',
      label: 'Jordan',
      phoneMasked: '(***) ***-0142',
      paused: false,
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('coach@example.com');
    expect(sent[0].subject).toBe('A phone was linked to your FieldView account');
    expect(sent[0].text).toContain("Jordan's phone (***) ***-0142");
    expect(sent[0].text).toContain('Diablos FC');
    expect(sent[0].text).toContain('https://fieldview.live/owners/text-commands');
    expect(sent[0].text).not.toContain('START');
    expect(sent[0].html).toContain('(***) ***-0142');
  });

  it('says how to resume when the phone was linked paused', async () => {
    await notifier.linked({
      email: 'coach@example.com',
      accountName: 'Diablos FC',
      label: 'Jordan',
      phoneMasked: '(***) ***-0142',
      paused: true,
    });

    expect(sent[0].text).toContain('text START to (877) 343-5308');
  });

  it('tells the login a phone was removed', async () => {
    await notifier.removed({
      email: 'coach@example.com',
      accountName: 'Diablos FC',
      label: 'Jordan',
      phoneMasked: '(***) ***-0142',
    });

    expect(sent[0].subject).toBe('A phone was removed from your FieldView account');
    expect(sent[0].text).toContain("Jordan's phone (***) ***-0142 was removed");
    expect(sent[0].text).toContain('Diablos FC');
  });

  it("escapes the account and the person's names in the HTML part", async () => {
    await notifier.removed({
      email: 'coach@example.com',
      accountName: 'Tom & <b>Jerry</b> FC',
      label: '<i>Jo</i>',
      phoneMasked: '(***) ***-0142',
    });

    expect(sent[0].html).toContain('Tom &amp; &lt;b&gt;Jerry&lt;/b&gt; FC');
    expect(sent[0].html).toContain('&lt;i&gt;Jo&lt;/i&gt;');
    expect(sent[0].html).not.toContain('<b>Jerry</b>');
    expect(sent[0].html).not.toContain('<i>Jo</i>');
    expect(sent[0].text).toContain('Tom & <b>Jerry</b> FC');
  });

  it('links to APP_URL when it is set', async () => {
    vi.stubEnv('APP_URL', 'https://staging.fieldview.live/');

    await notifier.removed({
      email: 'coach@example.com',
      accountName: 'Diablos FC',
      label: 'Jordan',
      phoneMasked: '(***) ***-0142',
    });

    expect(sent[0].text).toContain('https://staging.fieldview.live/owners/text-commands');
  });
});
