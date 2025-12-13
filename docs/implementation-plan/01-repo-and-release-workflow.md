# Repository & Release Workflow

## Git Branching Strategy

### Branch Model

- **`develop`**: Default branch for all development work
  - All feature work merges here first
  - Must stay green (all tests passing, 100% coverage)
  - Protected: requires PR, status checks, approvals

- **`main`**: Deployment branch
  - Receives changes only via PR from `develop`
  - Protected: requires PR, status checks, approvals, no direct pushes
  - Deployments triggered by version tags only

- **`feature/<name>`**: Feature branches (short-lived)
  - Created from `develop`
  - Merged back to `develop` via PR

- **`hotfix/<name>`**: Hotfix branches (urgent fixes)
  - Created from `main`
  - Merged to both `main` and `develop`

### Repository

- **GitHub**: https://github.com/YOLOVibeCode/fieldview-live
- **Default Branch**: `develop` (set in GitHub settings)
- **Deploy Branch**: `main`

## Branch Protection Rules

### `develop` Branch Protection

**Required**:
- Require pull request reviews before merging
- Require status checks to pass before merging:
  - `lint` (ESLint)
  - `type-check` (TypeScript)
  - `test` (all tests pass)
  - `coverage` (100% coverage threshold)
- Require branches to be up to date before merging
- Allow maintainers to merge

**Optional**:
- Require linear history (recommended)
- Restrict who can push to matching branches

### `main` Branch Protection (Strict)

**Required**:
- Require pull request reviews before merging (≥1 approval)
- Require status checks to pass before merging (same as `develop`)
- Require branches to be up to date before merging
- Require linear history
- **Do not allow** force pushes
- **Do not allow** deletions
- Restrict who can push (maintainers only)

## Release Workflow (Tag-Based)

### Release Process

1. **Merge to `main`**:
   - Create PR: `develop` → `main`
   - Ensure all tests pass, coverage is 100%
   - Get approval
   - Merge PR

2. **Create Version Tag**:
   - On `main` branch, create tag: `v0.1.0`, `v0.2.0`, etc. (semver)
   - Tag format: `v<major>.<minor>.<patch>`
   - Example: `git tag v0.1.0 && git push origin v0.1.0`

3. **Deploy Trigger**:
   - GitHub Actions detects tag push (`v*.*.*` pattern)
   - Builds Docker images for `api` and `web` services
   - Deploys to Railway production environment

### Versioning Strategy

- **Semantic Versioning** (semver): `MAJOR.MINOR.PATCH`
- **MVP**: Start at `v0.1.0` (pre-1.0 indicates MVP/development)
- **Major** (`1.0.0`): Production-ready, stable API
- **Minor** (`0.2.0`): New features, backward compatible
- **Patch** (`0.1.1`): Bug fixes, backward compatible

## CI/CD Pipelines

### PR Checks (`.github/workflows/ci.yml`)

**Triggers**: Pull requests to `develop` or `main`

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

### Deploy Pipeline (`.github/workflows/deploy.yml`)

**Triggers**: Tag push matching `v*.*.*` on `main` branch

**Steps**:
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies
4. Build Docker images:
   - `apps/api/Dockerfile` → `fieldview-api:${TAG}`
   - `apps/web/Dockerfile` → `fieldview-web:${TAG}`
5. Push images to Railway (or container registry)
6. Deploy to Railway production:
   - Update `api` service
   - Update `web` service
7. Run health checks
8. Notify on failure (optional: Slack/Discord)

## Local Development Workflow

### Starting Work

```bash
# Clone repository
git clone https://github.com/YOLOVibeCode/fieldview-live.git
cd fieldview-live

# Checkout develop branch
git checkout develop
git pull origin develop

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
2. Create PR on GitHub: `feature/my-feature` → `develop`
3. Wait for CI checks to pass
4. Get code review approval
5. Merge PR (squash merge recommended)

### Releasing

1. Ensure `develop` is stable and tested
2. Create PR: `develop` → `main`
3. Review and merge PR
4. Checkout `main` locally: `git checkout main && git pull`
5. Create tag: `git tag v0.1.0`
6. Push tag: `git push origin v0.1.0`
7. CI/CD automatically deploys to Railway

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
- [ ] `develop` branch created and set as default
- [ ] `main` branch created
- [ ] Branch protection rules configured for both branches
- [ ] CI pipeline (`.github/workflows/ci.yml`) created and passing
- [ ] Deploy pipeline (`.github/workflows/deploy.yml`) created
- [ ] Tag-based deployment tested (create test tag, verify deploy)
- [ ] Team members can create PRs and merge to `develop`
- [ ] Only maintainers can merge to `main`

## Next Steps

- Proceed to [02-monorepo-and-tooling.md](./02-monorepo-and-tooling.md) for workspace setup
