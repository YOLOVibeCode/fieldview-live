import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeEnv, resolveServerEnv } from './resolve';

describe('normalizeEnv', () => {
  it('normalizes the canonical values', () => {
    expect(normalizeEnv('production')).toBe('production');
    expect(normalizeEnv('uat')).toBe('uat');
    expect(normalizeEnv('dev')).toBe('dev');
    expect(normalizeEnv('local')).toBe('local');
  });

  it('maps synonyms', () => {
    expect(normalizeEnv('prod')).toBe('production');
    expect(normalizeEnv('staging')).toBe('uat');
    expect(normalizeEnv('qa')).toBe('uat');
    expect(normalizeEnv('preview')).toBe('uat');
    expect(normalizeEnv('development')).toBe('dev');
    expect(normalizeEnv('test')).toBe('local');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(normalizeEnv('  UAT  ')).toBe('uat');
    expect(normalizeEnv('Production')).toBe('production');
  });

  it('returns "unknown" for empty / null / gibberish', () => {
    expect(normalizeEnv(undefined)).toBe('unknown');
    expect(normalizeEnv(null)).toBe('unknown');
    expect(normalizeEnv('')).toBe('unknown');
    expect(normalizeEnv('   ')).toBe('unknown');
    expect(normalizeEnv('nonsense')).toBe('unknown');
  });
});

describe('resolveServerEnv — env-var priority', () => {
  beforeEach(() => {
    vi.stubEnv('APP_ENV', '');
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('RAILWAY_ENVIRONMENT', '');
    vi.stubEnv('NODE_ENV', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('APP_ENV wins over everything', () => {
    vi.stubEnv('APP_ENV', 'uat');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveServerEnv()).toBe('uat');
  });

  it('falls back to VERCEL_ENV when APP_ENV is unset (preview → uat)', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(resolveServerEnv()).toBe('uat');
  });

  it('falls back to RAILWAY_ENVIRONMENT', () => {
    vi.stubEnv('RAILWAY_ENVIRONMENT', 'dev');
    expect(resolveServerEnv()).toBe('dev');
  });

  it('falls back to NODE_ENV=production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveServerEnv()).toBe('production');
  });

  it('defaults to "local" when no env var is set', () => {
    expect(resolveServerEnv()).toBe('local');
  });

  it('coerces "unknown" (unrecognized synonym) to "local" so we never render a false banner', () => {
    vi.stubEnv('APP_ENV', 'nonsense-value');
    expect(resolveServerEnv()).toBe('local');
  });
});
