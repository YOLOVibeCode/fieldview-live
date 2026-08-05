import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { normalizeServerEnv, resolveServerEnv } from '../env';

describe('normalizeServerEnv', () => {
  it('maps known synonyms to dev|uat|production', () => {
    expect(normalizeServerEnv('production')).toBe('production');
    expect(normalizeServerEnv('prod')).toBe('production');
    expect(normalizeServerEnv('uat')).toBe('uat');
    expect(normalizeServerEnv('staging')).toBe('uat');
    expect(normalizeServerEnv('qa')).toBe('uat');
    expect(normalizeServerEnv('preview')).toBe('uat');
    expect(normalizeServerEnv('dev')).toBe('dev');
    expect(normalizeServerEnv('development')).toBe('dev');
    expect(normalizeServerEnv('local')).toBe('dev');
    expect(normalizeServerEnv('DEV')).toBe('dev'); // case-insensitive
  });

  it('defaults unknown / empty / null to production (never silently capture prod mail)', () => {
    expect(normalizeServerEnv('wat')).toBe('production');
    expect(normalizeServerEnv('')).toBe('production');
    expect(normalizeServerEnv(undefined)).toBe('production');
    expect(normalizeServerEnv(null)).toBe('production');
  });
});

describe('resolveServerEnv', () => {
  const saved = {
    APP_ENV: process.env.APP_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    NODE_ENV: process.env.NODE_ENV,
  };

  beforeEach(() => {
    delete process.env.APP_ENV;
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('prefers APP_ENV over RAILWAY_ENVIRONMENT over NODE_ENV', () => {
    process.env.APP_ENV = 'uat';
    process.env.RAILWAY_ENVIRONMENT = 'production';
    process.env.NODE_ENV = 'development';
    expect(resolveServerEnv()).toBe('uat');
  });

  it('falls through to RAILWAY_ENVIRONMENT when APP_ENV is empty', () => {
    process.env.RAILWAY_ENVIRONMENT = 'development';
    expect(resolveServerEnv()).toBe('dev');
  });

  it('falls through to NODE_ENV last', () => {
    process.env.NODE_ENV = 'production';
    expect(resolveServerEnv()).toBe('production');
  });

  it('defaults to production when nothing is set', () => {
    expect(resolveServerEnv()).toBe('production');
  });
});
