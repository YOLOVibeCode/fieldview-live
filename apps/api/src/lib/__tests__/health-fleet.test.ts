import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveHealthCommit } from '../health-fleet';

const COMMIT_KEYS = [
  'RAILWAY_GIT_COMMIT_SHA',
  'VERCEL_GIT_COMMIT_SHA',
  'GIT_COMMIT',
] as const;

describe('resolveHealthCommit', () => {
  const saved: Partial<Record<(typeof COMMIT_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of COMMIT_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of COMMIT_KEYS) {
      const value = saved[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('returns RAILWAY_GIT_COMMIT_SHA when set', () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = 'abc123fullsha';
    expect(resolveHealthCommit()).toBe('abc123fullsha');
  });

  it('returns unknown when all commit env vars are unset', () => {
    expect(resolveHealthCommit()).toBe('unknown');
  });

  it('falls back to GIT_COMMIT when Railway and Vercel are unset', () => {
    process.env.GIT_COMMIT = 'localsha';
    expect(resolveHealthCommit()).toBe('localsha');
  });
});
