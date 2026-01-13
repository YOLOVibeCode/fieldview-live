# DirectStream Seeding Guide

## Overview

This guide explains how to seed DirectStreams into both local and production databases.

## What Gets Seeded

Currently, the seed script creates:
- **TCHS Stream** (`/tchs`) - TCHS Live Stream with:
  - Chat enabled ✅
  - Scoreboard enabled ✅
  - Anonymous viewing allowed ✅
  - Email verification required ✅
  - Admin password: `tchs2026`

## Local Seeding

### Prerequisites
- Local Postgres running (Docker: port 4302)
- Database migrations applied

### Run Local Seed

```bash
# From project root
DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev" \
pnpm exec tsx scripts/seed-direct-streams.ts
```

**Expected Output:**
```
🌱 Seeding DirectStreams...
Environment: 🟢 LOCAL

✅ Using OwnerAccount: Test Owner (owner@test.com)
✅ Created: tchs - TCHS Live Stream

📊 Seed Summary:
   Created: 1
   Updated: 0
   Skipped: 0
   Total:   1

✅ Seeding complete!
```

## Production Seeding

### Prerequisites
- Railway CLI logged in (`railway login`)
- Production `DATABASE_PUBLIC_URL` (get from Railway dashboard)

### Option 1: Interactive Script (Recommended)

```bash
# Set production database URL
export DATABASE_PUBLIC_URL='postgresql://postgres:PASSWORD@HOST.railway.app:5432/railway'

# Run interactive seed script (will ask for confirmation)
./scripts/seed-production-streams.sh
```

### Option 2: Direct Execution

```bash
# Run seed directly (no confirmation)
DATABASE_URL="postgresql://postgres:PASSWORD@HOST.railway.app:5432/railway" \
pnpm exec tsx scripts/seed-direct-streams.ts --production
```

### Get Production DATABASE_URL

**From Railway Dashboard:**
1. Go to [railway.app](https://railway.app)
2. Open your project
3. Click on the Postgres service
4. Go to "Variables" tab
5. Copy `DATABASE_PUBLIC_URL`

**From Railway CLI:**
```bash
railway variables --service postgres | grep DATABASE_PUBLIC_URL
```

## Adding More Streams

Edit `scripts/seed-direct-streams.ts` and add to the `directStreams` array:

```typescript
const directStreams = [
  {
    slug: 'tchs',
    title: 'TCHS Live Stream',
    // ... existing config
  },
  {
    slug: 'stormfc',
    title: 'Storm FC Live Stream',
    streamUrl: null,
    scheduledStartAt: null,
    paywallEnabled: false,
    priceInCents: 0,
    adminPassword: 'stormfc2026',
    chatEnabled: true,
    scoreboardEnabled: true,
    allowAnonymousView: true,
    requireEmailVerification: true,
    listed: true,
    sendReminders: true,
    reminderMinutes: 5,
  },
  // Add more streams here...
];
```

## Idempotent Behavior

The seed script is **idempotent**:
- **Existing streams**: Updates configuration (title, settings, password)
- **New streams**: Creates them
- Safe to run multiple times ✅

## Verification

After seeding, verify streams appear in:

**Local:**
- Super Admin Console: http://localhost:3000/superadmin/direct-streams
- Direct access: http://localhost:3000/tchs

**Production:**
- Super Admin Console: https://fieldview.live/superadmin/direct-streams
- Direct access: https://fieldview.live/tchs

## Troubleshooting

### Error: "No OwnerAccount found"

**Problem**: Database has no OwnerAccount records.

**Solution**: Create an OwnerAccount first:
```bash
# Use Prisma Studio or create via API
pnpm exec prisma studio
```

### Error: "tsx not found"

**Problem**: `tsx` package not installed.

**Solution**:
```bash
pnpm add -D -w tsx
```

### Error: "Cannot connect to database"

**Problem**: Database URL incorrect or database not running.

**Solution**:
- Verify `DATABASE_URL` is correct
- For local: Check Docker Postgres is running (`docker ps`)
- For production: Check Railway dashboard for correct URL

## Security Notes

⚠️ **Admin Passwords**: 
- Admin passwords are hashed with bcrypt (10 rounds)
- Default password for TCHS: `tchs2026`
- Change passwords in production via Super Admin console

⚠️ **Production Access**:
- Always double-check `DATABASE_PUBLIC_URL` before running
- The script asks for confirmation before seeding production
- Use `--production` flag explicitly for production

## Next Steps

After seeding:
1. ✅ Verify streams in Super Admin console
2. ✅ Test viewer registration flow
3. ✅ Configure stream settings (paywall, chat, scoreboard)
4. ✅ Set scheduled start times for events
5. ✅ Monitor registrations in the admin dashboard

---

**Need Help?**
- Check the Super Admin console: `/superadmin/direct-streams`
- View logs: `railway logs --service api`
- Database issues: `pnpm exec prisma studio`

