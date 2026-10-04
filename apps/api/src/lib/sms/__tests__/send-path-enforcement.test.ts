import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(__dirname, '../../..');
const ALLOWED = join(SRC_ROOT, 'lib/sms/RelaySmsClient.ts');

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, files);
    } else if (full.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('SMS send path enforcement', () => {
  it('only RelaySmsClient may reference relay /sms/send or twilio SDK', () => {
    const violations: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      if (file === ALLOWED) continue;
      const content = readFileSync(file, 'utf8');
      if (content.includes('/sms/send') || content.includes("from 'twilio'") || content.includes('twilioClient')) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});
