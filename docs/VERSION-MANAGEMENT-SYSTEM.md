# Version Management System

## Overview

FieldView.Live now has a unified version management system that:
- Keeps API and Web versions in sync
- Automatically bumps versions on deployment
- Creates git tags for significant releases
- Displays version in the UI (lower right corner)
- API endpoint for version checking (not yet implemented)

## Current Version

**1.3.0.003**

## Version Format

- **Major.Minor.Patch.Build** (e.g., `1.3.0.003`)
- Major: Breaking changes
- Minor: New features, backward compatible
- Patch: Bug fixes
- Build: Incremental builds (auto-incremented on each deploy)

## Usage

### Check Current Version

```bash
./scripts/version-manager.sh current
```

### Set Version Explicitly

```bash
./scripts/version-manager.sh set 1.3.0.003
```

### Bump Version

```bash
# Patch bump (1.2.3 -> 1.2.4)
./scripts/version-manager.sh patch

# Minor bump (1.2.3 -> 1.3.0)
./scripts/version-manager.sh minor

# Major bump (1.2.3 -> 2.0.0)
./scripts/version-manager.sh major

# Build bump (1.3.0.003 -> 1.3.0.004)
./scripts/version-manager.sh build
```

### Deploy to Production

```bash
./scripts/deploy-to-production.sh
```

This script will:
1. Ask if this is a significant change
2. Bump version accordingly (minor/major for significant, build for regular)
3. Create git tag for significant releases
4. Run preflight build
5. Deploy to Railway

## Version Display

### Web UI

Version is displayed in the **lower right corner** of all pages:
- Component: `apps/web/components/VersionDisplay.tsx`
- Position: Fixed bottom-right
- Format: `v1.3.0.003`
- Styling: Subtle, non-intrusive

### API Endpoint

> **Not implemented.** There is currently no `GET /api/version` endpoint, and the referenced `apps/api/src/routes/version.ts` file does not exist. The version is surfaced only through the web UI via `NEXT_PUBLIC_APP_VERSION` (see below). The closest live endpoint, `GET /api/health` (`apps/api/src/routes/health.ts`), returns service status and a timestamp but not the application version.

## Files

- `scripts/version-manager.sh` - Version management script
- `scripts/deploy-to-production.sh` - Deployment script with versioning
- `apps/web/components/VersionDisplay.tsx` - UI version display
- `apps/api/src/routes/version.ts` - API version endpoint (not yet implemented — file does not exist)
- `apps/api/package.json` - API version
- `apps/web/package.json` - Web version
- `package.json` - Root version (for consistency)

## Version Synchronization

All three `package.json` files are kept in sync:
- `apps/api/package.json`
- `apps/web/package.json`
- `package.json` (root)

The version manager updates all three simultaneously.

## Git Tags

Significant releases (minor/major bumps) automatically create git tags:
- Format: `v1.2.3`
- Tagged after version bump
- Pushed to remote automatically

## Build Integration

The version is injected into the Next.js build:
- Environment variable: `NEXT_PUBLIC_APP_VERSION`
- Set at build time from `package.json`
- Available in client-side code

## Verification

To verify versions match:

```bash
# Check all versions
jq -r '.version' apps/api/package.json apps/web/package.json package.json

# Should output:
# 1.3.0.003
# 1.3.0.003
# 1.3.0.003
```
