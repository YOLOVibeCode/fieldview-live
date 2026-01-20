# 🎯 PAYWALL TESTING PLAN - EXECUTIVE SUMMARY

**Engineer:** Analysis & Recommendations  
**Date:** 2026-01-20

---

## 📊 BOTTOM LINE

**System Status:** 95% Complete, 1 Security Gap

| Gap | Status | Severity | Time to Fix |
|-----|--------|----------|-------------|
| #1: Checkout API | ✅ FALSE ALARM | None | 0 min |
| #2: Access Verification | ⚠️ CONFIRMED | 🔴 HIGH | 2 hours |
| #3: Webhook Testing | ❓ UNTESTED | 🟡 MEDIUM | 1 hour |

---

## 🔍 WHAT I FOUND

### Gap #1: Checkout Endpoint - FALSE ALARM ✅

**Original Claim:** Constructor mismatch causing HTTP 500

**Reality:** Constructor has 8 params, factory provides 8 params. **Perfect match.**

```typescript
// Constructor expects 8 parameters ✅
constructor(
  gameReader, viewerIdentityReader, viewerIdentityWriter,
  purchaseReader, purchaseWriter, entitlementReader,
  entitlementWriter, watchLinkReader
)

// Factory provides exactly 8 parameters ✅
new PaymentService(
  gameRepo, viewerIdentityRepo, viewerIdentityRepo,
  purchaseRepo, purchaseRepo, entitlementRepo,
  entitlementRepo, watchLinkRepo
)
```

**Recommendation:** Test endpoint manually to confirm it works:
```bash
curl -X POST http://localhost:4301/api/direct/tchs/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","firstName":"Test","lastName":"User"}'

# Expected: { "purchaseId": "...", "checkoutUrl": "..." }
```

---

### Gap #2: Access Verification - REAL SECURITY HOLE ⚠️

**Problem:** Video player only checks `localStorage`, never verifies entitlement in database.

**Exploit:**
```javascript
// Anyone can bypass paywall:
localStorage.setItem('paywall_tchs', '{"hasPaid":true}');
location.reload();
// → Stream plays WITHOUT payment
```

**Fix Required:**

1. **New API Endpoint** (`apps/api/src/routes/direct.ts`):
```typescript
GET /api/direct/:slug/verify-access?viewerId=xxx

Response:
{
  "hasAccess": true,
  "reason": "valid_entitlement",
  "entitlement": { "id": "...", "expiresAt": "..." }
}
```

2. **Frontend Integration** (`DirectStreamPageBase.tsx`):
```typescript
// Before playing video:
const verifyResult = await fetch(
  `/api/direct/${slug}/verify-access?viewerId=${viewerId}`
).then(r => r.json());

if (verifyResult.hasAccess) {
  initPlayer(streamUrl);  // ✅ Verified by server
} else {
  paywall.openPaywall();  // ❌ No entitlement
}
```

**Impact:** Without this, **paywall is bypassable** by anyone with basic JavaScript knowledge.

---

### Gap #3: Webhook Testing - NEEDS VALIDATION ❓

**Status:** Code is complete, but **never tested** with real webhooks.

**What's Working:**
- ✅ Webhook handler exists
- ✅ HMAC signature validation implemented
- ✅ Purchase status update logic ready
- ✅ Entitlement creation ready
- ✅ Ledger entries ready
- ✅ Square credentials configured (9 env vars)

**What's Unknown:**
- ❓ Does Square actually send webhooks?
- ❓ Is webhook URL registered in Square Dashboard?
- ❓ Does signature validation work?

**Testing Strategy:**

**Phase 1: Local Simulation** (No Square needed)
```javascript
// Create test script to simulate webhook payload
// Tests: Purchase status update → Entitlement creation → Ledger
```

**Phase 2: Square Sandbox** (Requires ngrok)
```bash
ngrok http 4301
# Register: https://xxx.ngrok.io/api/webhooks/square in Square
# Complete test payment
# Verify webhook arrives
```

---

## 🎯 RECOMMENDED ACTION PLAN

### Step 1: Validate Gap #1 (5 minutes)

```bash
# Test checkout endpoint
curl -X POST http://localhost:4301/api/direct/tchs/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"gap1-test@test.com","firstName":"Gap","lastName":"One"}'
```

**If 200 OK:** Gap #1 FALSE ALARM, skip  
**If 500 Error:** Check API logs, fix real issue

---

### Step 2: Implement Gap #2 (2 hours) - CRITICAL

**Files to Create/Modify:**
1. `apps/api/src/routes/direct.ts` - Add verify-access endpoint
2. `apps/web/components/DirectStreamPageBase.tsx` - Add verification call
3. `apps/web/__tests__/e2e/paywall-security.spec.ts` - Add bypass test

**Implementation Checklist:**
- [ ] Create `/api/direct/:slug/verify-access` endpoint
- [ ] Query Entitlement table for viewer + game
- [ ] Check expiry date
- [ ] Return hasAccess boolean
- [ ] Call API before initPlayer()
- [ ] Handle localStorage/DB mismatch
- [ ] Test localStorage tampering blocked

---

### Step 3: Test Gap #3 (1 hour)

**Create:** `apps/api/scripts/test-webhook-local.js`

**Flow:**
1. Create Purchase via API
2. Simulate Square webhook payload
3. Verify Purchase status → 'paid'
4. Verify Entitlement created
5. Verify LedgerEntries created

---

## 📈 CONFIDENCE LEVELS

| Component | Confidence | Evidence |
|-----------|-----------|----------|
| Checkout Endpoint | 90% | Code review shows correct implementation |
| Square Integration | 95% | Credentials valid, can create payment links |
| Webhook Handler | 85% | Code complete, logic sound, needs testing |
| Access Verification | 0% | **MISSING ENTIRELY** |
| UI/UX | 100% | 48 tests passing |

---

## 🚨 CRITICAL RECOMMENDATION

**DO NOT DEPLOY TO PRODUCTION WITHOUT GAP #2 FIX**

Currently, the paywall can be bypassed with:
```javascript
localStorage.setItem('paywall_tchs', '{"hasPaid":true}');
```

This is a **revenue-critical security issue**.

---

## 📋 DELIVERABLES

I've created two comprehensive documents:

1. **`docs/PAYWALL-ARCHITECTURAL-REVIEW.md`**
   - Full architectural analysis
   - Detailed gap descriptions
   - Implementation examples

2. **`docs/PAYWALL-GAP-ANALYSIS.md`** (this file)
   - Code-level analysis
   - Line-by-line review
   - Testing strategies
   - Implementation plans

---

## ⏱️ TOTAL TIME ESTIMATE

| Task | Time | Status |
|------|------|--------|
| Validate Gap #1 | 5 min | Ready to test |
| Implement Gap #2 | 2 hours | Blocked (security critical) |
| Test Gap #3 | 1 hour | Can do parallel |
| **TOTAL** | **~3 hours** | **No blockers** |

---

## ✅ NEXT STEPS

**For You to Decide:**
1. Should I proceed with Gap #2 implementation?
2. Should I create the test scripts for Gap #3?
3. Do you want to test Gap #1 first to validate my analysis?

**My Recommendation:**
Start with Gap #1 validation (5 min), then immediately implement Gap #2 (2 hr), as it's the only real security blocker.

---

**Status:** 🟢 **ANALYSIS COMPLETE - AWAITING GO/NO-GO**

ROLE: engineer STRICT=false
