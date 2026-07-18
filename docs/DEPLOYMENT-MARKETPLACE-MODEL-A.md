# Marketplace Model A Deployment Guide

## Overview

This guide covers deploying the Marketplace Model A implementation (owner Square accounts + 10% platform fee) to both local and production environments.

## Prerequisites

- Docker Compose (for local PostgreSQL/Redis)
- Railway account (for production)
- Square Developer account with Connect app configured

---

## Local Deployment

### 1. Start Local Services

```bash
cd /Users/admin/Dev/YOLOProjects/fieldview.live
docker-compose up -d postgres redis mailpit
```

Verify services are running:
```bash
docker-compose ps
```

### 2. Set Environment Variables

Create `apps/api/.env` (if not exists) with:

```bash
# Database
DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public"

# Encryption (REQUIRED for Square token encryption)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY="your-generated-key-here"

# Square (use sandbox credentials)
SQUARE_ACCESS_TOKEN="your-sandbox-access-token"
SQUARE_LOCATION_ID="your-sandbox-location-id"
SQUARE_WEBHOOK_SIGNATURE_KEY="your-webhook-signature-key"
SQUARE_ENVIRONMENT="sandbox"
SQUARE_APPLICATION_ID="your-application-id"
SQUARE_APPLICATION_SECRET="your-application-secret"
SQUARE_REDIRECT_URI="http://localhost:4301/api/owners/square/callback"

# Platform fee
PLATFORM_FEE_PERCENT="10"

# Other required vars (see ENV_SANDBOX_TEMPLATE.txt)
```

### 3. Run Database Migration

```bash
cd /Users/admin/Dev/YOLOProjects/fieldview.live
export DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public"
pnpm --filter=data-model exec prisma migrate deploy
```

Or if you need to create a new migration:
```bash
pnpm --filter=data-model exec prisma migrate dev --name add_square_token_fields
```

### 4. Verify Migration

Check that the new columns exist:
```bash
psql postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev -c "\d \"OwnerAccount\""
```

You should see:
- `squareAccessTokenEncrypted` (TEXT, nullable)
- `squareRefreshTokenEncrypted` (TEXT, nullable)
- `squareTokenExpiresAt` (TIMESTAMP(3), nullable)
- Index on `payoutProviderRef`

### 5. Test Locally

1. **Start API server:**
   ```bash
   cd apps/api
   pnpm dev
   ```

2. **Test Square Connect flow:**
   - Register/login as owner
   - Call `POST /api/owners/square/connect`
   - Complete Square OAuth
   - Verify tokens are encrypted in database

3. **Test payment flow:**
   - Create a game/channel with pay-per-view
   - Complete checkout
   - Verify payment uses owner's Square account
   - Check ledger entries via `GET /api/owners/me/ledger`

4. **Test transparency endpoints:**
   ```bash
   curl -H "Authorization: Bearer <owner-token>" http://localhost:4301/api/owners/me/balance
   curl -H "Authorization: Bearer <owner-token>" http://localhost:4301/api/owners/me/transparency
   ```

---

## Production Deployment (Railway)

### 1. Set Environment Variables in Railway

Go to Railway dashboard → Your API service → Variables tab:

**Required new variables:**
```
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>
```

**Update Square variables (use production credentials):**
```
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=<production-access-token>
SQUARE_LOCATION_ID=<production-location-id>
SQUARE_WEBHOOK_SIGNATURE_KEY=<production-webhook-key>
SQUARE_APPLICATION_ID=<production-application-id>
SQUARE_APPLICATION_SECRET=<production-application-secret>
SQUARE_REDIRECT_URI=https://api.fieldview.live/api/owners/square/callback
```

**Verify existing:**
```
PLATFORM_FEE_PERCENT=10
DATABASE_URL=<railway-postgres-url>
```

### 2. Run Migration in Production

**Option A: Via Railway CLI**
```bash
railway run --service api pnpm --filter=data-model exec prisma migrate deploy
```

**Option B: Via Railway Dashboard**
1. Go to your API service → Deployments
2. Trigger a new deployment (migrations run automatically on deploy if `prisma migrate deploy` is in your build script)

**Option C: Manual SQL (if needed)**
```bash
railway connect postgres
# Then run the migration SQL manually
```

### 3. Verify Production Migration

Connect to production database:
```bash
railway connect postgres
```

Check OwnerAccount table:
```sql
\d "OwnerAccount"
```

### 4. Update Square Webhook URL

In Square Developer Dashboard:
1. Go to your app → Webhooks
2. Update webhook URL to: `https://api.fieldview.live/api/webhooks/square`
3. Verify webhook signature key matches `SQUARE_WEBHOOK_SIGNATURE_KEY`

### 5. Test Production Flow

1. **Owner connects Square:**
   - Owner logs in → connects Square account
   - Verify `payoutProviderRef` and encrypted tokens are stored

2. **Test payment:**
   - Create pay-per-view game/channel
   - Complete checkout
   - Verify payment appears in owner's Square dashboard
   - Check ledger entries via API

3. **Monitor logs:**
   ```bash
   railway logs --service api
   ```

---

## Verification Checklist

### Local
- [ ] Migration applied successfully
- [ ] `ENCRYPTION_KEY` set in `apps/api/.env`
- [ ] Square Connect flow works (owner can connect)
- [ ] Payments use owner's Square account
- [ ] Application fee (10%) is included in payments
- [ ] Ledger entries created on payment success
- [ ] Transparency endpoints return correct data
- [ ] Webhook handler extracts actual Square fees

### Production
- [ ] Migration applied successfully
- [ ] `ENCRYPTION_KEY` set in Railway (production)
- [ ] Square production credentials configured
- [ ] Webhook URL updated in Square dashboard
- [ ] Owner Square Connect flow works
- [ ] Payments route to owner accounts correctly
- [ ] Ledger entries created correctly
- [ ] No errors in Railway logs

---

## Troubleshooting

### Migration fails: "Authentication failed"
- Verify `DATABASE_URL` is correct
- Check PostgreSQL container is running: `docker-compose ps postgres`
- Verify credentials match docker-compose.yml

### "ENCRYPTION_KEY not set" error
- Generate key: `openssl rand -base64 32`
- Add to `apps/api/.env` (local) or Railway variables (production)
- Restart API server

### Square Connect fails
- Verify `SQUARE_APPLICATION_ID` and `SQUARE_APPLICATION_SECRET` are correct
- Check `SQUARE_REDIRECT_URI` matches Square dashboard configuration
- Ensure Square app has correct scopes: `MERCHANT_PROFILE_READ PAYMENTS_READ SETTLEMENTS_READ`

### Payments fail: "Owner has not connected Square"
- Owner must complete Square Connect flow first
- Check `OwnerAccount.payoutProviderRef` and `squareAccessTokenEncrypted` are set
- Verify token hasn't expired (check `squareTokenExpiresAt`)

### Ledger entries not created
- Check API logs for errors
- Verify `recipientOwnerAccountId` is set on Purchase
- Ensure LedgerService is instantiated correctly in PaymentService

---

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove new columns
ALTER TABLE "OwnerAccount" 
DROP COLUMN IF EXISTS "squareAccessTokenEncrypted",
DROP COLUMN IF EXISTS "squareRefreshTokenEncrypted",
DROP COLUMN IF EXISTS "squareTokenExpiresAt";

-- Remove index
DROP INDEX IF EXISTS "OwnerAccount_payoutProviderRef_idx";
```

**Note:** This will break existing Square-connected owners. Only rollback if absolutely necessary.

---

## Next Steps After Deployment

1. **Monitor first payments:** Verify marketplace split is correct
2. **Test refunds:** Ensure ledger entries are created correctly
3. **Owner education:** Inform owners they need to connect Square to receive payments
4. **Dashboard updates:** Add UI for Square Connect flow and ledger transparency

---

## Support

For issues:
1. Check Railway logs: `railway logs --service api`
2. Verify environment variables are set correctly
3. Test Square Connect flow manually
4. Check database for encrypted tokens (should be encrypted, not plaintext)

