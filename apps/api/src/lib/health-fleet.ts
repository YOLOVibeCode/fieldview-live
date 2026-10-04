/** Fleet health contract: build identity fields for GET /health. */

export function resolveHealthCommit(): string {
  return (
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT ??
    'unknown'
  );
}

export function resolveHealthEnv(): string {
  return process.env.APP_ENV ?? process.env.RAILWAY_ENVIRONMENT_NAME ?? 'dev';
}

export function buildFleetHealthFields(ok: boolean, service: string): {
  ok: boolean;
  service: string;
  commit: string;
  env: string;
  utc: string;
} {
  return {
    ok,
    service,
    commit: resolveHealthCommit(),
    env: resolveHealthEnv(),
    utc: new Date().toISOString(),
  };
}
