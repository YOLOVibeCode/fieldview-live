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
});
