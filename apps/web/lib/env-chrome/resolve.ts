import type { AppEnv } from './chrome';

const SYNONYMS: Record<string, AppEnv> = {
  production: 'production',
  prod: 'production',
  uat: 'uat',
  staging: 'uat',
  qa: 'uat',
  preview: 'uat',
  dev: 'dev',
  development: 'dev',
  local: 'local',
  test: 'local',
  'development-local': 'local',
};

export function normalizeEnv(raw: string | undefined | null): AppEnv {
  if (raw === undefined || raw === null) return 'unknown';
  const s = String(raw).trim().toLowerCase();
  if (!s) return 'unknown';
  return SYNONYMS[s] ?? 'unknown';
}

/**
 * Server-side env detection. Reads `process.env` in priority order:
 * APP_ENV → VERCEL_ENV → RAILWAY_ENVIRONMENT → NODE_ENV → 'local'.
 * Never returns 'unknown' — 'unknown' falls back to 'local'.
 */
export function resolveServerEnv(): AppEnv {
  const raw =
    process.env.APP_ENV ||
    process.env.VERCEL_ENV ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    'local';
  const normalized = normalizeEnv(raw);
  return normalized === 'unknown' ? 'local' : normalized;
}
