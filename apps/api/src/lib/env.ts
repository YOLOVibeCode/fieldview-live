/**
 * Server-side environment resolution for the API.
 *
 * Mirrors the web app's `apps/web/lib/env-chrome/resolve.ts` so both halves of
 * the stack agree on which environment they are running in. The API has no DOM
 * chrome to render — this exists so env-aware backend behaviour (chiefly the
 * `X-App-Env` header the relay uses to route email to Mailpit / tag UAT / send
 * prod) has one authoritative source instead of scattered `NODE_ENV` checks.
 *
 * Priority: APP_ENV → RAILWAY_ENVIRONMENT → NODE_ENV.
 *
 * Default is **production**. Deployed Railway services always set
 * RAILWAY_ENVIRONMENT, so the default only bites when nothing is set (a local
 * process or a broken deploy). Defaulting to production is the safe failure for
 * *email*: the alternative — resolving an unlabelled prod process to `dev` —
 * would silently capture real password-reset / receipt mail in Mailpit and lock
 * users out. Local development should instead set `EMAIL_PROVIDER=mailpit` (see
 * the email factory) so it never touches the relay at all.
 */

export type ServerEnv = 'dev' | 'uat' | 'production';

const SYNONYMS: Record<string, ServerEnv> = {
  production: 'production',
  prod: 'production',
  uat: 'uat',
  staging: 'uat',
  qa: 'uat',
  preview: 'uat',
  dev: 'dev',
  development: 'dev',
  local: 'dev',
  test: 'dev',
};

export function normalizeServerEnv(raw: string | undefined | null): ServerEnv {
  if (raw === undefined || raw === null) return 'production';
  const s = String(raw).trim().toLowerCase();
  if (!s) return 'production';
  return SYNONYMS[s] ?? 'production';
}

export function resolveServerEnv(): ServerEnv {
  const raw =
    process.env.APP_ENV ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    '';
  return normalizeServerEnv(raw);
}
