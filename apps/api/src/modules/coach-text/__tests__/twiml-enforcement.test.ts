import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const MODULE_ROOT = join(__dirname, '..');
const ALLOWED = join(MODULE_ROOT, 'reply/twiml.ts');

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

describe('coach text reply XML enforcement', () => {
  it('only reply/twiml.ts may write reply XML', () => {
    const files = walk(MODULE_ROOT);
    expect(files).toContain(ALLOWED);

    const violations = files.filter(
      (file) => file !== ALLOWED && readFileSync(file, 'utf8').includes('<Response')
    );
    expect(violations).toEqual([]);
  });
});
