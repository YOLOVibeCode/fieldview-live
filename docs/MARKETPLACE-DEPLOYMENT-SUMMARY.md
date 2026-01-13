# Marketplace Model A - Deployment Summary

## ✅ What Was Implemented

1. **Encrypted Square Token Storage**
   - Added `squareAccessTokenEncrypted`, `squareRefreshTokenEncrypted`, `squareTokenExpiresAt` to `OwnerAccount`
   - Created encryption utility (`apps/api/src/lib/encryption.ts`)

2. **Ledger Service**
   - Immutable accounting entries for charges, fees, refunds
   - Full transparency: gross → platform fee → processor fee → net

3. **Marketplace Payment Processing**
   - Payments use owner's Square account (not platform account)
   - Application fee (10%) collected automatically by Square
   - Actual Square processing fees extracted from payment response

4. **Transparency Endpoints**
   - `GET /api/owners/me/ledger` - All ledger entries
   - `GET /api/owners/me/balance` - Current balance + payout status
   - `GET /api/owners/me/transparency` - Financial breakdown

---

## 🚀 Local Deployment Steps

### 1. Generate Encryption Key

```bash
openssl rand -base64 32
```

Save this output - you'll need it for `apps/api/.env`

### 2. Update Environment Variables

Add to `apps/api/.env`:

```bash
# Encryption (REQUIRED)
ENCRYPTION_KEY="<paste-generated-key-here>"

# Database (if not already set)
DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public"

# Platform fee
PLATFORM_FEE_PERCENT="10"
```

### 3. Run Migration

**Option A: Use setup script**
```bash
./scripts/setup-marketplace-local.sh
```

**Option B: Manual**
```bash
export DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public"
pnpm --filter=data-model exec prisma migrate deploy
```

### 4. Verify Migration

```bash
psql postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev -c "\d \"OwnerAccount\""
```

Should show:
- `squareAccessTokenEncrypted` (TEXT)
- `squareRefreshTokenEncrypted` (TEXT)
- `squareTokenExpiresAt` (TIMESTAMP)
- Index on `payoutProviderRef`

### 5. Test Locally

1. Start API: `cd apps/api && pnpm dev`
2. Test Square Connect: `POST /api/owners/square/connect`
3. Test payment flow
4. Check ledger: `GET /api/owners/me/ledger`

---

## 🌐 Production Deployment (Railway)

### 1. Set Environment Variables

In Railway Dashboard → API Service → Variables:

```
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>
```

**Generate key:**
```bash
openssl rand -base64 32
```

**Update Square variables (production):**
- `SQUARE_ENVIRONMENT=production`
- `SQUARE_REDIRECT_URI=https://api.fieldview.live/api/owners/square/callback`
- All other Square credentials (use production values)

### 2. Run Migration

**Option A: Railway CLI**
```bash
railway run --service api pnpm --filter=data-model exec prisma migrate deploy
```

**Option B: Use deployment script**
```bash
./scripts/deploy-marketplace-production.sh
```

**Option C: Manual SQL**
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

Square Developer Dashboard → Your App → Webhooks:
- URL: `https://api.fieldview.live/api/webhooks/square`
- Verify signature key matches `SQUARE_WEBHOOK_SIGNATURE_KEY`

### 4. Verify Production

1. Check migration: `railway connect postgres` → `\d "OwnerAccount"`
2. Test Square Connect flow
3. Test payment flow
4. Monitor logs: `railway logs --service api --follow`

---

## 📋 Verification Checklist

### Local
- [ ] Migration applied (`OwnerAccount` has new columns)
- [ ] `ENCRYPTION_KEY` set in `apps/api/.env`
- [ ] Square Connect flow works
- [ ] Payments use owner's Square account
- [ ] Ledger entries created
- [ ] Transparency endpoints work

### Production
- [ ] Migration applied
- [ ] `ENCRYPTION_KEY` set in Railway
- [ ] Square production credentials configured
- [ ] Webhook URL updated in Square dashboard
- [ ] Square Connect flow works
- [ ] Payments route correctly
- [ ] No errors in logs

---

## 🔍 Testing Endpoints

### Owner Ledger
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4301/api/owners/me/ledger
```

### Owner Balance
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4301/api/owners/me/balance
```

### Transparency Breakdown
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4301/api/owners/me/transparency
```

---

## 🐛 Troubleshooting

### "ENCRYPTION_KEY not set"
- Add to `apps/api/.env` (local) or Railway variables (production)
- Restart API server

### Migration fails
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Try manual SQL approach

### Square Connect fails
- Verify Square credentials
- Check `SQUARE_REDIRECT_URI` matches Square dashboard
- Ensure correct scopes: `MERCHANT_PROFILE_READ PAYMENTS_READ SETTLEMENTS_READ`

### Payments fail: "Owner has not connected Square"
- Owner must complete Square Connect first
- Check `OwnerAccount.payoutProviderRef` is set
- Verify tokens aren't expired

---

## 📚 Documentation

- **Full deployment guide:** `DEPLOYMENT-MARKETPLACE-MODEL-A.md`
- **Railway-specific:** `RAILWAY-DEPLOYMENT-INSTRUCTIONS.md`
- **Migration file:** `packages/data-model/prisma/migrations/20250103120000_add_square_token_fields/migration.sql`

---

## 🎯 Next Steps After Deployment

1. Monitor first payments for correct marketplace split
2. Test refund flow (verify ledger entries)
3. Update owner dashboard UI for Square Connect
4. Add ledger/transparency UI to owner dashboard
5. Educate owners about Square Connect requirement

---

## ⚠️ Important Notes

- **ENCRYPTION_KEY is REQUIRED** - Payments will fail without it
- **Owner must connect Square** before receiving payments
- **Square tokens expire** - Refresh token flow needed (future enhancement)
- **Migration is irreversible** - Test thoroughly before production

