# 🚨 EMERGENCY: Fix Production Database

## Problem
The API is crashing because:
- Prisma Client expects `DirectStream.ownerAccountId` column
- Production database doesn't have this column
- Server crashes on startup when cron job tries to query DirectStream

## Solution
Run the SQL script directly on the Railway PostgreSQL database.

---

## 📋 STEPS TO FIX

### Option A: Via Railway Dashboard (RECOMMENDED)

1. **Go to Railway Dashboard**
   - Navigate to your project
   - Click on the **PostgreSQL** database service (not API or Web)

2. **Open Data Tab**
   - Click "Data" tab
   - Click "Query" at the top

3. **Run the SQL Script**
   - Copy the entire contents of `EMERGENCY_DB_FIX.sql`
   - Paste into the query editor
   - Click "Run" or press Ctrl/Cmd+Enter

4. **Verify Success**
   - You should see NOTICE messages like:
     ```
     Created default OwnerAccount: <uuid>
     Added ownerAccountId column to DirectStream
     Updated X DirectStream records
     Set ownerAccountId to NOT NULL
     ```
   - At the end, you'll see a verification table showing counts

5. **Redeploy API Service**
   - Go to API service
   - Click "Redeploy"
   - Server should now start successfully

---

### Option B: Via Railway CLI

```bash
# Connect to database
railway connect postgres

# Inside psql:
\i EMERGENCY_DB_FIX.sql

# Exit
\q

# Redeploy API
railway up -s api
```

---

### Option C: Via psql Directly

```bash
# Get DATABASE_URL from Railway dashboard
export DATABASE_URL="postgresql://..."

# Run the script
psql $DATABASE_URL < EMERGENCY_DB_FIX.sql
```

---

## ✅ Expected Result

After running the script:
1. ✅ Default `OwnerAccount` created (email: admin@fieldview.live)
2. ✅ `DirectStream.ownerAccountId` column added
3. ✅ All `DirectStream` records backfilled
4. ✅ Foreign key constraints added
5. ✅ Indexes created
6. ✅ API will start successfully on next deploy

---

## 🔍 Verification

After the API redeploys, test:

```bash
# Should return 200 OK
curl https://api.fieldview.live/health

# Should return DirectStream data
curl https://api.fieldview.live/api/direct/tchs/bootstrap
```

---

## 📊 What the Script Does

The script is **idempotent** (safe to run multiple times):
- Uses `IF EXISTS` checks
- Won't duplicate data
- Won't fail if already applied
- Shows NOTICE messages for what it does

---

## 🆘 If This Doesn't Work

If the API still crashes after running the script:
1. Check Railway API deploy logs for specific error
2. Share the error message
3. We may need to check for other schema mismatches

---

## 🎯 Next Steps After Fix

Once API is running:
1. Test the full E2E flow
2. Verify chat, admin panel, paywall all work
3. Re-enable automatic migrations in `railway.toml` (optional)

