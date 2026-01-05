# Railway Production Deployment - Marketplace Model A

## Quick Start

### 1. Set Environment Variables in Railway Dashboard

Go to Railway → Your API Service → Variables → Add:

```
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>
```

**Generate key:**
```bash
openssl rand -base64 32
```

**Update Square variables (use production credentials):**
- `SQUARE_ENVIRONMENT=production`
- `SQUARE_ACCESS_TOKEN=<production-token>`
- `SQUARE_LOCATION_ID=<production-location>`
- `SQUARE_WEBHOOK_SIGNATURE_KEY=<production-webhook-key>`
- `SQUARE_APPLICATION_ID=<production-app-id>`
- `SQUARE_APPLICATION_SECRET=<production-app-secret>`
- `SQUARE_REDIRECT_URI=https://api.fieldview.live/api/owners/square/callback`

### 2. Run Migration

**Option A: Via Railway CLI (recommended)**
```bash
railway run --service api pnpm --filter=data-model exec prisma migrate deploy
```

**Option B: Via Script**
```bash
./scripts/deploy-marketplace-production.sh
```

**Option C: Manual SQL (if needed)**
```bash
railway connect postgres
```

Then run:
```sql
ALTER TABLE "OwnerAccount" 
ADD COLUMN "squareAccessTokenEncrypted" TEXT,
ADD COLUMN "squareRefreshTokenEncrypted" TEXT,
ADD COLUMN "squareTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "OwnerAccount_payoutProviderRef_idx" ON "OwnerAccount"("payoutProviderRef");
```

### 3. Update Square Webhook

1. Go to Square Developer Dashboard → Your App → Webhooks
2. Update webhook URL: `https://api.fieldview.live/api/webhooks/square`
3. Verify signature key matches `SQUARE_WEBHOOK_SIGNATURE_KEY` in Railway

### 4. Verify Deployment

1. **Check migration:**
   ```bash
   railway connect postgres
   \d "OwnerAccount"
   ```
   Should show new columns: `squareAccessTokenEncrypted`, `squareRefreshTokenEncrypted`, `squareTokenExpiresAt`

2. **Test Square Connect:**
   - Owner logs in → connects Square
   - Verify tokens stored (encrypted, not plaintext)

3. **Test payment:**
   - Create pay-per-view game/channel
   - Complete checkout
   - Verify payment in owner's Square dashboard
   - Check ledger: `GET /api/owners/me/ledger`

4. **Monitor logs:**
   ```bash
   railway logs --service api --follow
   ```

## Troubleshooting

### Migration fails
- Verify `DATABASE_URL` is set in Railway
- Check Railway PostgreSQL service is running
- Try manual SQL approach

### "ENCRYPTION_KEY not set"
- Add `ENCRYPTION_KEY` to Railway variables
- Restart API service after adding

### Square Connect fails
- Verify Square credentials are production (not sandbox)
- Check `SQUARE_REDIRECT_URI` matches Square dashboard
- Ensure Square app has correct scopes

### Payments fail
- Owner must connect Square first
- Check `OwnerAccount.payoutProviderRef` is set
- Verify Square tokens aren't expired

## Rollback (Emergency Only)

```sql
ALTER TABLE "OwnerAccount" 
DROP COLUMN IF EXISTS "squareAccessTokenEncrypted",
DROP COLUMN IF EXISTS "squareRefreshTokenEncrypted",
DROP COLUMN IF EXISTS "squareTokenExpiresAt";

DROP INDEX IF EXISTS "OwnerAccount_payoutProviderRef_idx";
```

**Warning:** This breaks Square-connected owners. Only use if absolutely necessary.

