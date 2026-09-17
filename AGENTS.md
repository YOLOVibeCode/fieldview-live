# AGENTS.md

Onboarding for agents (Cursor cloud agents fired from Slack `#fieldview-fixbot`,
`npm run pipeline` from the `cloud-agents` kit, or any unattended run). Read this
before touching code. `.cursorrules` and `CLAUDE.md` hold the detailed coding
rules and the decided payment architecture; this file is the map and the
guardrails.

## What this project is

FieldView.Live is a monetization platform for youth-sports live streaming.
Coaches/owners create games and direct streams, viewers pay to watch (Square
via the Noctusoft relay), and the app handles chat, DVR/recordings, watch links,
and admin tooling. "Working" means: `pnpm type-check` and `pnpm test:unit` pass,
the API boots on `PORT` and answers `GET /health`, and the Next.js web app
builds. Production runs on Railway (services `api` and `web`); deploys are
**human-only**.

## Layout

pnpm workspace (`pnpm-workspace.yaml`: `packages/*`, `apps/*`).

- `apps/api/` - Express + Prisma backend (TypeScript, entry `src/server.ts`).
  - `src/routes/` - one file per route group (`owners.*.ts`, `public.*.ts`, `admin.*.ts`, `webhooks.*.ts`). Register in `src/server.ts`.
  - `src/services/` - business logic. Segregated interfaces (`IXReader` / `IXWriter`), constructor DI.
  - `src/repositories/` - Prisma access, read/write separation.
  - `src/middleware/`, `src/lib/`, `src/utils/`, `src/jobs/`, `src/modules/` (e.g. `veo-scraper`).
  - Tests: `__tests__/unit/`, `__tests__/integration/`, `src/**/__tests__/` (Vitest). `__tests__/live/` needs a running stack and is excluded from `test:unit`.
- `apps/web/` - Next.js 14 App Router frontend (`app/`, `components/`, `hooks/`, `lib/`).
  - `lib/api-client.ts` (`apiRequest<T>`, `ApiError`), `lib/event-bus.ts` (`DataEventBus`).
  - Tests: `components/**/__tests__/`, `hooks/**/__tests__/` (Vitest). `e2e/` is Playwright and needs live servers.
- `packages/data-model/` - `@fieldview/data-model`: Prisma schema (`prisma/schema.prisma`), migrations, shared Zod schemas (`src/schemas/`), entities. Both apps depend on its **built** output.
- `packages/dvr-service/` - `@fieldview/dvr-service`, DVR provider abstraction.
- `openapi/api.yaml` - API contract. `docs/` - design + runbooks (`docs/architecture-checklist.md` if a task references it).
- `scripts/` - deploy, seed, and Railway tooling. Not part of the build; most are human-only (see **Never**).

## Commands

Fresh clone on stock Ubuntu, no Docker, no database. This is exactly what CI
(`.github/workflows/ci.yml`) runs, so it is the subset you can rely on.

| Purpose | Command | Notes |
| --- | --- | --- |
| Toolchain | Node 20 (CI) / >=20, `pnpm@8.15.9` | `corepack enable && corepack prepare pnpm@8.15.9 --activate` if pnpm is missing. |
| Install | `pnpm install --frozen-lockfile` | Never plain `pnpm install`; keep `pnpm-lock.yaml` stable. |
| Prisma client | `pnpm db:generate` | **Run before anything else.** Missing client = `TS2305: Module has no exported member`. |
| Build shared pkg | `pnpm --filter @fieldview/data-model build` | Required before API type-check/tests. |
| Typecheck (all) | `pnpm type-check` | Must pass. Most common Railway failure is an API TS error. |
| Typecheck (API only) | `pnpm --filter api type-check` | Fast loop while editing the API. |
| Unit tests (all) | `pnpm test:unit` | packages + `apps/*` `test:unit`. No DB needed. |
| Unit tests (one app) | `pnpm --filter api test:unit` / `pnpm --filter web test:unit` | Vitest. Add tests next to what you change. |
| Lint | `pnpm lint` | Advisory in CI (`|| true`); keep new code warning-free anyway. |
| Full Railway simulation | `./scripts/preflight-build.sh` | Optional, slow. Runs the exact Railway build. |
| Dev servers | `pnpm dev` | API on `PORT` (3001), web on 4300. Needs Postgres + Redis (`docker-compose.yml`) and `apps/api/.env`. Usually **not** available to you. |

Env: `apps/api/.env.example` lists every variable. Unit tests and type-check
need none of them. Do **not** create `.env` files with real values, and do not
add new required env vars without a fallback and a note in the PR.

Known friction in a fresh clone:
- `apps/api` depends on `playwright` (for the Veo scraper). `pnpm install` does not download browsers; do not run `playwright install` unless a test truly needs it.
- `bcryptjs` is pure JS; there are no native addons that need a compiler.
- `apps/api/vitest.config.ts` loads `apps/api/.env` if present; absence is fine.

## Conventions

- TypeScript strict. No `any`. Errors are thrown (never `return null` for failures).
- No hardcoded values: env/config. No static mocks in app code: API-driven data only.
- Logging: Pino (`logger`). No `console.log` in `apps/api/src`.
- Validation: Zod on every API input; shared schemas live in `packages/data-model/src/schemas/`.
- API stack order: Auth -> Validation -> Rate-limit -> Handler -> Error.
- Web: `apiRequest<T>` from `lib/api-client.ts`; cross-component events via `DataEventBus`.
- UI: every interactive element gets a `data-testid` (`btn-*`, `input-*`, `form-*`, `link-*`, ...), semantic HTML, `aria-label` where there is no visible text, `data-loading` on async controls. See `.cursorrules` for the full table.
- TDD: failing test first (Vitest), minimum code to pass, refactor while green.
- Branches: feature branch off `develop` -> PR into `develop`. `develop` -> `release` -> `main` promotions are done by humans.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`), imperative, one concern per commit.

## Never

- Do not push to `main`, `master`, `develop`, or `release`; do not force-push. (Enforced by `.cursor/hooks/guard-shell.mjs`.)
- Do not deploy: no `railway up|deploy|redeploy`, no `scripts/deploy-*.sh`, `scripts/yolo-deploy.sh`, `scripts/deploy-production.sh`. Deploys are human-only. (Enforced.)
- Do not run migrations against any real database (`prisma migrate deploy|reset`, `pnpm db:migrate`, `scripts/apply-prod-migration.ts`, `scripts/clone-prod-to-uat.ts`). (Enforced.) You **may** add a new migration folder under `packages/data-model/prisma/migrations/` when the schema changes (that path is gitignored; stage it with `git add -f`); never edit an existing one.
- Do not modify `.github/workflows/`, `railway.toml`, `Dockerfile`, `scripts/railway-start.sh`, or `.husky/` unless the brief explicitly says so.
- Do not commit secrets or `.env` files. This repo must hold **no** Square / Twilio / SendGrid / Google credentials: all vendor traffic goes through the Noctusoft relay (see `CLAUDE.md`).
- Do not extend the legacy in-repo Square "Model A" integration; the decided direction is the relay Connect Hub (`docs/RELAY-CONNECT-HUB-MIGRATION.md`).
- Do not add runtime dependencies without stating why in the PR description.
- Do not bump `version` in `package.json` files; `scripts/version-manager.sh` owns that and humans run it at deploy time.

## Definition of done for any change

1. `pnpm db:generate && pnpm --filter @fieldview/data-model build && pnpm type-check && pnpm test:unit` pass in the clone. Paste the tail of the output as evidence.
2. New behavior has a Vitest test; UI changes carry `data-testid`s.
3. If an API route changed: Zod schema updated, `openapi/api.yaml` updated when the contract changed.
4. If the Prisma schema changed: a new migration folder exists and `pnpm db:generate` still succeeds.
5. User-facing behavior documented (README or `docs/`) when it is not self-evident.
6. `git status` is clean, commits are Conventional, PR targets `develop`.
