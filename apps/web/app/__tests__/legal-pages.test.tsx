import { readFileSync } from 'fs';
import { join } from 'path';

import { SMS_PRIVACY_VERBATIM_THIRD_PARTY } from '@fieldview/data-model';
import { describe, expect, it } from 'vitest';


describe('legal pages content', () => {
  it('privacy page contains verbatim third-party SMS sentence', () => {
    const privacy = readFileSync(join(__dirname, '../privacy/page.tsx'), 'utf8');
    expect(privacy).toContain(SMS_PRIVACY_VERBATIM_THIRD_PARTY);
    expect(privacy).toContain('Text messages');
  });

  it('terms page contains sms anchor section', () => {
    const terms = readFileSync(join(__dirname, '../terms/page.tsx'), 'utf8');
    expect(terms).toContain('id="sms"');
    expect(terms).toContain('Message frequency varies');
    expect(terms).toContain('Carriers are not liable for delayed or undelivered messages');
  });

  it('recipient agreement page describes the Stripe marketplace at version v2 with no Square wording', () => {
    const agreement = readFileSync(join(__dirname, '../legal/recipient-agreement/page.tsx'), 'utf8');
    expect(agreement).toContain('Effective version: v2');
    expect(agreement).toContain('Noctusoft Store');
    expect(agreement).toContain('Stripe Connected Account Agreement');
    expect(agreement).toContain('10% of each purchase price');
    expect(agreement).not.toMatch(/Square/);
  });
});
