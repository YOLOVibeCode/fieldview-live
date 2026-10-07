/** Fleet health contract: build identity fields for GET /api/health. */

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
