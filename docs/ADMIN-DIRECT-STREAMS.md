# Super Admin & Direct Stream Links

**Current flow for creating and managing the super admin account and direct stream links (e.g. TCHS soccer).**

## Production URLs

| Purpose | URL |
|--------|-----|
| **Web app** | https://fieldview.live |
| **API** | https://api.fieldview.live |
| **API health** | https://api.fieldview.live/health |

The API is on a separate host (`api.fieldview.live`). Do not use `https://fieldview.live/api` for API calls; that is served by the Next.js app.

## Super Admin Account

- **Email:** `admin@fieldview.live`
- **Role:** `super_admin`
- **Password:** Set via scripts below (e.g. `tchs2026` for TCHS flows).

### Ensure super admin exists (local + production)

**Option A – Via API (when API is running):**
```bash
./scripts/ensure-super-admin.sh
```
Prompts for password once, then calls `POST .../api/admin/setup/super-admin` for local (`http://localhost:4301`) and production (`https://api.fieldview.live`). Creates or skips if already exists.

**Option B – Direct to database (e.g. seeding production DB from your machine):**
```bash
# Local (use DATABASE_URL from apps/api/.env)
export $(grep -v '^#' apps/api/.env | xargs)
ADMIN_PASSWORD=tchs2026 pnpm exec tsx scripts/ensure-super-admin.ts

# Production (use Railway DATABASE_URL)
DATABASE_URL="postgresql://..." ADMIN_PASSWORD=tchs2026 pnpm exec tsx scripts/ensure-super-admin.ts
```
Creates `admin@fieldview.live` with the given password if missing; if the account exists, updates the password to match.

## Adding Direct Stream Links

### Via API (recommended when API is up)

1. Ensure super admin exists (see above).
2. Log in and create streams:

```bash
# Local
ADMIN_PASSWORD=tchs2026 bash scripts/add-direct-links-api.sh http://localhost:4301 slug1 slug2

# Production – use API host
ADMIN_PASSWORD=tchs2026 bash scripts/add-direct-links-api.sh https://api.fieldview.live slug1 slug2
```

Script prompts for admin password if `ADMIN_PASSWORD` is not set, then:
- `POST /api/admin/login` (email `admin@fieldview.live`, password)
- Uses returned `sessionToken` as Bearer for `POST /api/admin/direct-streams` per slug.

**Stream admin password:** Set via `STREAM_ADMIN_PASSWORD` (default `admin2026`). For TCHS links we use `tchs2026` via the TCHS script below.

### TCHS Soccer Feb 13 links (predefined slugs)

```bash
# Local
ADMIN_PASSWORD=tchs2026 bash scripts/add-tchs-soccer-20260213-api.sh

# Production
ADMIN_PASSWORD=tchs2026 bash scripts/add-tchs-soccer-20260213-api.sh https://api.fieldview.live
```

Adds (or updates) these slugs with stream admin password `tchs2026`:

- `tchs/soccer-20260213-jv2`
- `tchs/soccer-20260213-jv`
- `tchs/soccer-20260213-varsity`

Public URLs:

- https://fieldview.live/direct/tchs/soccer-20260213-jv2  
- https://fieldview.live/direct/tchs/soccer-20260213-jv  
- https://fieldview.live/direct/tchs/soccer-20260213-varsity  

### TCHS Soccer Feb 17 links (predefined slugs)

```bash
# Local
ADMIN_PASSWORD=tchs2026 bash scripts/add-tchs-soccer-20260217-api.sh

# Production
ADMIN_PASSWORD=tchs2026 bash scripts/add-tchs-soccer-20260217-api.sh https://api.fieldview.live
```

Adds (or updates) these slugs with stream admin password `tchs2026`:

- `tchs/soccer-20260217-jv2`
- `tchs/soccer-20260217-jv`
- `tchs/soccer-20260217-varsity`

Public URLs:

- https://fieldview.live/direct/tchs/soccer-20260217-jv2  
- https://fieldview.live/direct/tchs/soccer-20260217-jv  
- https://fieldview.live/direct/tchs/soccer-20260217-varsity  

### TCHS Soccer Feb 20 links (predefined slugs)

```bash
# Local
ADMIN_PASSWORD=tchs2026 bash scripts/add-tchs-soccer-20260220-api.sh

# Production
ADMIN_PASSWORD=tchs2026 bash scripts/add-tchs-soccer-20260220-api.sh https://api.fieldview.live
```

Adds (or updates) these slugs with stream admin password `tchs2026`:

- `tchs/soccer-20260220-jv2`
- `tchs/soccer-20260220-jv`
- `tchs/soccer-20260220-varsity`

Public URLs:

- https://fieldview.live/direct/tchs/soccer-20260220-jv2  
- https://fieldview.live/direct/tchs/soccer-20260220-jv  
- https://fieldview.live/direct/tchs/soccer-20260220-varsity  

### TCHS Soccer Feb 24 links (predefined slugs)

```bash
# Local
ADMIN_PASSWORD=tchs2026 bash scripts/add-tchs-soccer-20260224-api.sh

# Production
ADMIN_PASSWORD=tchs2026 bash scripts/add-tchs-soccer-20260224-api.sh https://api.fieldview.live
```

Adds (or updates) these slugs with stream admin password `tchs2026`:

- `tchs/soccer-20260224-jv2`
- `tchs/soccer-20260224-jv`
- `tchs/soccer-20260224-varsity`

Public URLs:

- https://fieldview.live/direct/tchs/soccer-20260224-jv2  
- https://fieldview.live/direct/tchs/soccer-20260224-jv  
- https://fieldview.live/direct/tchs/soccer-20260224-varsity  

### Via database (when API is down or for one-off seeding)

```bash
# Local
export $(grep -v '^#' apps/api/.env | xargs)
pnpm exec tsx scripts/add-tchs-soccer-20260213.ts   # Feb 13
pnpm exec tsx scripts/add-tchs-soccer-20260217.ts   # Feb 17
pnpm exec tsx scripts/add-tchs-soccer-20260220.ts   # Feb 20
pnpm exec tsx scripts/add-tchs-soccer-20260224.ts   # Feb 24

# Production
DATABASE_URL="postgresql://..." pnpm exec tsx scripts/add-tchs-soccer-20260213.ts
DATABASE_URL="postgresql://..." pnpm exec tsx scripts/add-tchs-soccer-20260217.ts
DATABASE_URL="postgresql://..." pnpm exec tsx scripts/add-tchs-soccer-20260220.ts
DATABASE_URL="postgresql://..." pnpm exec tsx scripts/add-tchs-soccer-20260224.ts
```

Creates/updates the three TCHS direct streams and their linked games; stream admin password is `tchs2026`.

## API Endpoints Used

| Endpoint | Purpose |
|---------|--------|
| `POST /api/admin/setup/super-admin` | Create or idempotent setup of super admin (body: `email`, `password`) |
| `POST /api/admin/login` | Admin login (body: `email`, `password`) → returns `sessionToken`, `mfaRequired` |
| `POST /api/admin/direct-streams` | Create direct stream (requires `Authorization: Bearer <sessionToken>`, super_admin only) |

All admin endpoints are on the **API** host: `https://api.fieldview.live` in production, `http://localhost:4301` locally.

## Stale / Removed

- **Super admin API key / JWT exchange:** The old flow (`POST /api/admin/auth/token`, `X-Super-Admin-Key`, `validateSuperAdminApi`) has been removed. Use email/password login and `sessionToken` only.
- **API at fieldview.live:** Production API is at `api.fieldview.live`, not `fieldview.live/api`.
