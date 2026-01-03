# Prisma Migration Guide - Coach Workflow & Subscriptions

**Migration Name**: `20250130150000_add_coach_workflow_and_subscriptions`  
**Date**: January 30, 2025

---

## Overview

This migration adds the complete coach workflow and subscription system to the database, including:
- `OrganizationMember` model (role-based access control)
- `Event` model (coach-created events with stable URLs)
- `Subscription` model (viewer subscriptions with confirmation)
- Purchase recipient tracking fields

---

## Migration File

**Location**: `packages/data-model/prisma/migrations/20250130150000_add_coach_workflow_and_subscriptions/migration.sql`

---

## What This Migration Does

### 1. Creates OrganizationMember Table
- Links `OwnerUser` → `Organization` with roles (`org_admin`, `team_manager`, `coach`)
- Unique constraint on `(ownerUserId, organizationId)`
- Indexes for efficient queries

### 2. Creates Event Table
- Stores coach-created events with auto-generated URL keys
- Links to `Organization` and `WatchChannel`
- Tracks event state (scheduled/live/ended/cancelled)
- Stores stream source and pricing information
- Unique constraint on `canonicalPath` and `(channelId, urlKey)`

### 3. Creates Subscription Table
- Tracks viewer subscriptions to organizations, channels, or events
- Email confirmation workflow (`confirmed` flag)
- Status tracking (`active`, `unsubscribed`, `bounced`)
- Notification preferences (`email`, `sms`, `both`)
- Indexes for efficient notification queries

### 4. Updates Purchase Table
- Adds `recipientOwnerAccountId` (who receives payout)
- Adds `recipientType` (`personal` | `organization`)
- Adds `recipientOrganizationId` (for org payouts)
- Adds `eventId` (for event-scoped purchases)
- Adds indexes for admin payout visibility queries

---

## Applying the Migration

### Option 1: Using Prisma Migrate (Recommended)

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/fieldview"

# Apply migration
cd packages/data-model
pnpm exec prisma migrate deploy
```

### Option 2: Manual SQL Execution

If you don't have `DATABASE_URL` set up locally, you can:

1. **Copy the migration SQL** from:
   `packages/data-model/prisma/migrations/20250130150000_add_coach_workflow_and_subscriptions/migration.sql`

2. **Execute it directly** on your database:
   ```bash
   psql $DATABASE_URL -f packages/data-model/prisma/migrations/20250130150000_add_coach_workflow_and_subscriptions/migration.sql
   ```

3. **Mark migration as applied** (if using Prisma Migrate):
   ```bash
   pnpm exec prisma migrate resolve --applied 20250130150000_add_coach_workflow_and_subscriptions
   ```

### Option 3: Railway Deployment

Railway will automatically apply migrations if:
- `DATABASE_URL` is set in Railway environment variables
- Migration files are committed to git
- Railway detects new migrations on deploy

---

## Verification

After applying the migration, verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('OrganizationMember', 'Event', 'Subscription');

-- Check Purchase table has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Purchase' 
AND column_name IN ('recipientOwnerAccountId', 'recipientType', 'recipientOrganizationId', 'eventId');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('OrganizationMember', 'Event', 'Subscription');
```

---

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop foreign keys first
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_eventId_fkey";
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_recipientOwnerAccountId_fkey";
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_recipientOrganizationId_fkey";

-- Drop tables (cascade will handle relations)
DROP TABLE IF EXISTS "Subscription" CASCADE;
DROP TABLE IF EXISTS "Event" CASCADE;
DROP TABLE IF EXISTS "OrganizationMember" CASCADE;

-- Remove columns from Purchase
ALTER TABLE "Purchase" DROP COLUMN IF EXISTS "eventId";
ALTER TABLE "Purchase" DROP COLUMN IF EXISTS "recipientOrganizationId";
ALTER TABLE "Purchase" DROP COLUMN IF EXISTS "recipientType";
ALTER TABLE "Purchase" DROP COLUMN IF EXISTS "recipientOwnerAccountId";
```

---

## Post-Migration Steps

1. **Regenerate Prisma Client**:
   ```bash
   pnpm db:generate
   ```

2. **Verify Build**:
   ```bash
   pnpm --filter api build
   pnpm --filter web build
   ```

3. **Run Tests**:
   ```bash
   pnpm test:unit
   ```

4. **Test API Endpoints**:
   - Create an organization
   - Create a channel
   - Create an event
   - Subscribe to an event
   - Mark event as live (should trigger notifications)

---

## Important Notes

- **Foreign Key Constraints**: All foreign keys use `ON DELETE CASCADE` for subscriptions/events/members to ensure data consistency
- **Purchase Relations**: Purchase foreign keys use `ON DELETE SET NULL` to preserve purchase history if related records are deleted
- **Indexes**: All indexes are created for optimal query performance
- **Unique Constraints**: `Event.canonicalPath` and `Event(channelId, urlKey)` ensure URL uniqueness

---

## Troubleshooting

### Error: "relation already exists"
- The migration may have been partially applied
- Check which tables/columns already exist
- Manually remove conflicting objects or adjust migration SQL

### Error: "foreign key constraint violation"
- Ensure referenced tables exist
- Check that `Organization` and `WatchChannel` tables exist before creating `Event`
- Verify `OwnerUser` table exists before creating `OrganizationMember`

### Error: "column already exists" (Purchase table)
- The recipient fields may have been added manually
- Use `ADD COLUMN IF NOT EXISTS` syntax (already included in migration)

---

**Migration Status**: ✅ **READY TO APPLY**  
**Tested**: Schema validated, Prisma client regenerated successfully

