# Marketplace Model A - Startup Checklist

## ✅ Pre-Flight Checks

### 1. Database Migration Applied
- [ ] Local: Migration applied to local database
- [ ] Production: Migration applied to Railway database
- [ ] Verify: `OwnerAccount` table has `squareAccessTokenEncrypted`, `squareRefreshTokenEncrypted`, `squareTokenExpiresAt` columns

**Check migration:**
```bash
# Local
psql postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev -c "\d \"OwnerAccount\""

# Production
railway connect postgres
\d "OwnerAccount"
```

### 2. Environment Variables Set

**Local (`apps/api/.env`):**
- [ ] `ENCRYPTION_KEY` - Required! Generate with `openssl rand -base64 32`
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `PLATFORM_FEE_PERCENT` - Default "10"
- [ ] Square credentials (sandbox for local)

**Production (Railway):**
- [ ] `ENCRYPTION_KEY` - Required! Must be set
- [ ] `PLATFORM_FEE_PERCENT` - Default "10"
- [ ] Square production credentials
- [ ] `SQUARE_REDIRECT_URI` - `https://api.fieldview.live/api/owners/square/callback`

### 3. Square Configuration

**Square Developer Dashboard:**
- [ ] Webhook URL set: `https://api.fieldview.live/api/webhooks/square` (production)
- [ ] Webhook signature key matches `SQUARE_WEBHOOK_SIGNATURE_KEY` in Railway
- [ ] Square Connect app has correct scopes: `MERCHANT_PROFILE_READ PAYMENTS_READ SETTLEMENTS_READ`
- [ ] OAuth redirect URI matches `SQUARE_REDIRECT_URI`

### 4. Code Verification

- [ ] All files compiled successfully (no TypeScript errors)
- [ ] `PaymentService` has `LedgerService` initialized
- [ ] `public.purchases.ts` uses owner's Square account
- [ ] Webhook handler creates ledger entries
- [ ] Transparency endpoints registered in server

---

## 🚀 Starting the System

### Local Development

1. **Start services:**
   ```bash
   docker-compose up -d postgres redis mailpit
   ```

2. **Verify services:**
   ```bash
   docker-compose ps
   ```

3. **Start API:**
   ```bash
   cd apps/api
   pnpm dev
   ```

4. **Start Web (separate terminal):**
   ```bash
   cd apps/web
   pnpm dev
   ```

### Production (Railway)

1. **Verify deployment:**
   ```bash
   railway status
   ```

2. **Check logs:**
   ```bash
   railway logs --service api --follow
   ```

3. **Verify environment variables:**
   ```bash
   railway variables --service api
   ```

---

## 🧪 Testing the System

### 1. Test Square Connect Flow

**Local:**
```bash
# Register/login as owner
curl -X POST http://localhost:4301/api/owners/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get Square Connect URL
curl -X POST http://localhost:4301/api/owners/square/connect \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Verify:**
- Owner can connect Square account
- `OwnerAccount.payoutProviderRef` is set
- `squareAccessTokenEncrypted` is encrypted (not plaintext)

### 2. Test Payment Flow

1. Create a pay-per-view game/channel
2. Initiate checkout
3. Complete payment
4. Verify:
   - Payment uses owner's Square account
   - Application fee (10%) is included
   - Ledger entries created
   - Purchase status is "paid"

### 3. Test Transparency Endpoints

```bash
# Get ledger entries
curl -H "Authorization: Bearer <owner-token>" \
  http://localhost:4301/api/owners/me/ledger

# Get balance
curl -H "Authorization: Bearer <owner-token>" \
  http://localhost:4301/api/owners/me/balance

# Get transparency breakdown
curl -H "Authorization: Bearer <owner-token>" \
  http://localhost:4301/api/owners/me/transparency
```

**Expected response:**
- Ledger shows charges, platform fees, processor fees
- Balance shows net earnings
- Transparency shows gross → fees → net breakdown

### 4. Test Webhook Handler

**Square Dashboard:**
- Send test webhook event
- Verify webhook is received
- Check logs for ledger entry creation

---

## 🔍 Monitoring

### Key Metrics to Watch

1. **Payment Success Rate**
   - Monitor Square payment failures
   - Check for "Owner has not connected Square" errors

2. **Ledger Entry Creation**
   - Verify entries created for each payment
   - Check for duplicate entries (shouldn't happen - idempotent)

3. **Square Token Expiration**
   - Monitor `squareTokenExpiresAt` dates
   - Plan for refresh token flow (future enhancement)

4. **Platform Fee Accuracy**
   - Verify 10% fee is calculated correctly
   - Check actual vs estimated processor fees

### Log Monitoring

**Local:**
- Check API console output
- Check Mailpit for email testing: http://localhost:4304

**Production:**
```bash
railway logs --service api --follow
```

Look for:
- `Failed to create ledger entries` - Should not happen
- `Owner has not connected Square` - Expected for new owners
- `ENCRYPTION_KEY not set` - Critical error, must fix

---

## ⚠️ Common Issues & Solutions

### Issue: "ENCRYPTION_KEY not set"
**Solution:** Add `ENCRYPTION_KEY` to environment variables and restart API

### Issue: "Owner has not connected Square"
**Solution:** Owner must complete Square Connect flow before receiving payments

### Issue: Payments fail with Square API error
**Solution:** 
- Verify Square credentials are correct
- Check owner's Square account is active
- Verify Square location ID is correct

### Issue: Ledger entries not created
**Solution:**
- Check logs for errors
- Verify `recipientOwnerAccountId` is set on Purchase
- Check database connection

### Issue: Migration fails
**Solution:**
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Try manual SQL migration

---

## ✅ Success Criteria

System is ready when:

1. ✅ Owners can connect Square accounts
2. ✅ Payments use owner's Square account (not platform account)
3. ✅ Application fee (10%) is collected automatically
4. ✅ Ledger entries created for all payments
5. ✅ Transparency endpoints return correct data
6. ✅ Webhooks process correctly
7. ✅ No critical errors in logs

---

## 📞 Support

If issues persist:
1. Check Railway logs: `railway logs --service api`
2. Verify all environment variables are set
3. Test Square Connect flow manually
4. Check database for encrypted tokens (should be encrypted, not plaintext)
5. Review `DEPLOYMENT-MARKETPLACE-MODEL-A.md` for detailed troubleshooting

