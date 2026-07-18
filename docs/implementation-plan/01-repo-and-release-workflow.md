# Repository & Release Workflow

## Git Branching Strategy

### Branch Model

- **`main`**: Default branch for all development and deployment
  - All feature work merges here via PR
  - Must stay green (all tests passing, 100% coverage)
  - Protected: requires PR, status checks, approvals, no direct pushes
  - Deployments triggered automatically on push/merge to `main`

- **`feature/<name>`**: Feature branches (short-lived)
  - Created from `main`
  - Merged back to `main` via PR

- **`hotfix/<name>`**: Hotfix branches (urgent fixes)
  - Created from `main`
  - Merged back to `main` via PR

### Repository

- **GitHub**: https://github.com/YOLOVibeCode/fieldview-live
- **Default Branch**: `main` (set in GitHub settings)
- **Deploy Branch**: `main`

## Branch Protection Rules

### `main` Branch Protection (Strict)

**Required**:
- Require pull request reviews before merging (≥1 approval)
- Require status checks to pass before merging:
  - `lint` (ESLint)
  - `type-check` (TypeScript)
  - `test` (all tests pass)
  - `coverage` (100% coverage threshold)
- Require branches to be up to date before merging
- Require linear history
- **Do not allow** force pushes
- **Do not allow** deletions
- Restrict who can push (maintainers only)

**Optional**:
- Restrict who can push to matching branches

## Release Workflow (Push-Based)

### Release Process

1. **Merge to `main`**:
   - Create PR: `feature/<name>` → `main`
   - Ensure all tests pass, coverage is 100%
   - Get approval
   - Merge PR

2. **Automatic Deploy**:
   - `.github/workflows/railway-deploy.yml` runs on push to `main`
   - Runs type check and unit tests as a gate
   - Railway auto-deploys the `api` and `web` services from `main`

3. **Tag the Release (optional)**:
   - On `main` branch, create tag: `v0.1.0`, `v0.2.0`, etc. (semver)
   - Tag format: `v<major>.<minor>.<patch>`
   - Example: `git tag v0.1.0 && git push origin v0.1.0`

### Versioning Strategy

- **Semantic Versioning** (semver): `MAJOR.MINOR.PATCH`
- **MVP**: Start at `v0.1.0` (pre-1.0 indicates MVP/development)
- **Major** (`1.0.0`): Production-ready, stable API
- **Minor** (`0.2.0`): New features, backward compatible
- **Patch** (`0.1.1`): Bug fixes, backward compatible

## CI/CD Pipelines

### PR Checks (`.github/workflows/ci.yml`)

**Triggers**: Pull requests and pushes to `develop` or `main`

**Steps**:
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies (`pnpm install`)
4. Lint (`pnpm lint`)
5. Type check (`pnpm type-check`)
6. Run tests (`pnpm test`)
7. Check coverage (`pnpm test:coverage` - must be 100%)
8. Build packages (`pnpm build`)

**Failure Behavior**: PR cannot be merged until all checks pass

### Deploy Pipeline (`.github/workflows/railway-deploy.yml`)

**Triggers**: Push to `main` (also runs on `develop` and manual `workflow_dispatch`); the deploy step is gated to `main`

**Steps**:
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies (`pnpm install --frozen-lockfile`)
4. Generate Prisma client (`pnpm db:generate`)
5. Build `@fieldview/data-model`
6. Type check (`pnpm type-check`)
7. Run tests (`pnpm test:unit`)
8. Railway auto-deploys the `api` and `web` services on `main`

## Local Development Workflow

### Starting Work

```bash
# Clone repository
git clone https://github.com/YOLOVibeCode/fieldview-live.git
cd fieldview-live

# Checkout main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: add feature X"
```

### Before Pushing

```bash
# Ensure tests pass locally
pnpm test

# Ensure coverage is 100%
pnpm test:coverage

# Ensure linting passes
pnpm lint

# Ensure type checking passes
pnpm type-check
```

### Creating PR

1. Push feature branch: `git push origin feature/my-feature`
2. Create PR on GitHub: `feature/my-feature` → `main`
3. Wait for CI checks to pass
4. Get code review approval
5. Merge PR (squash merge recommended)

### Releasing

1. Ensure your `feature/<name>` branch is stable and tested
2. Create PR: `feature/<name>` → `main`
3. Review and merge PR
4. Railway automatically deploys `main` to production
5. (Optional) Tag the release: `git checkout main && git pull`, then `git tag v0.1.0 && git push origin v0.1.0`

## Commit Message Conventions

Use conventional commits for clarity:

- `feat: add game creation endpoint` (new feature)
- `fix: correct keyword collision handling` (bug fix)
- `docs: update API documentation` (documentation)
- `test: add tests for refund calculator` (tests)
- `refactor: extract keyword service` (refactoring)
- `chore: update dependencies` (maintenance)

## Acceptance Criteria

- [ ] Repository initialized and connected to GitHub
- [ ] `main` branch created and set as default
- [ ] Branch protection rules configured for `main`
- [ ] CI pipeline (`.github/workflows/ci.yml`) created and passing
- [ ] Deploy pipeline (`.github/workflows/railway-deploy.yml`) created
- [ ] Push-based deployment tested (merge to `main`, verify Railway deploy)
- [ ] Team members can create PRs and merge to `main`
- [ ] Only maintainers can merge to `main`

## Next Steps

- Proceed to [02-monorepo-and-tooling.md](./02-monorepo-and-tooling.md) for workspace setup
