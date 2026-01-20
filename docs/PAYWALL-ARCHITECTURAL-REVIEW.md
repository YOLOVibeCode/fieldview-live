# 🏗️ PAYWALL SYSTEM - COMPREHENSIVE ARCHITECTURAL REVIEW

**Reviewer:** System Architect  
**Date:** 2026-01-20  
**Status:** Second Opinion Analysis

---

## 📋 EXECUTIVE SUMMARY

After reviewing 63 passing tests and examining the complete codebase, I've identified **3 CRITICAL GAPS** that prevent the paywall system from working end-to-end in production.

### Current Status:
- ✅ **UI Layer**: 100% Complete & Tested (48 tests passing)
- ✅ **Square Integration**: Credentials valid, can create payment links
- ⚠️  **API Checkout Endpoint**: **BROKEN** - Returns HTTP 500
- ❓ **Webhook Processing**: Untested
- ❓ **Entitlement Verification**: Not integrated with video player

---

## 🔴 CRITICAL GAPS IDENTIFIED

### Gap #1: Checkout API Endpoint Fails (BLOCKER)

**Location:** `apps/api/src/routes/direct.ts:499-561`

**Problem:**
```bash
POST /api/direct/:slug/checkout → HTTP 500 Internal Server Error
```

**Root Cause Analysis:**

The `getPaymentService()` factory is missing the `CouponService` parameter:

```typescript
// Current (BROKEN):
paymentServiceInstance = new PaymentService(
  gameRepo,
  viewerIdentityRepo,  // reader
  viewerIdentityRepo,  // writer
  purchaseRepo,        // reader
  purchaseRepo,        // writer
  entitlementRepo,     // reader
  entitlementRepo,     // writer
  watchLinkRepo
  // ❌ MISSING: couponService
);
```

**PaymentService Constructor:**
```typescript
constructor(
  private gameReader: IGameReader,
  private viewerIdentityReader: IViewerIdentityReader,
  private viewerIdentityWriter: IViewerIdentityWriter,
  private purchaseReader: IPurchaseReader,
  private purchaseWriter: IPurchaseWriter,
  private entitlementReader: IEntitlementReader,
  private entitlementWriter: IEntitlementWriter,
  private watchLinkReader: IWatchLinkReaderRepo,
  private couponService?: CouponService // ⚠️ REQUIRED but not provided
)
```

**Impact:** 🔴 **BLOCKS ALL PAYMENTS** - No viewer can purchase access

**Fix Required:**
1. Add `CouponService` to service factory
2. Or make `couponService` truly optional in constructor
3. Update all 3 factory instances:
   - `apps/api/src/routes/direct.ts`
   - `apps/api/src/routes/public.checkout.ts`
   - `apps/api/src/routes/webhooks.square.ts`

---

### Gap #2: Video Player Doesn't Check Entitlements

**Location:** `apps/web/components/DirectStreamPageBase.tsx:893-1372`

**Problem:**
The paywall modal works perfectly, but the video player **never actually checks** if the viewer has a valid entitlement from the database.

**Current Flow:**
1. ✅ Viewer sees paywall
2. ✅ Viewer pays (or simulates payment)
3. ✅ `localStorage` updated with `hasPaid: true`
4. ✅ Modal closes
5. ❌ **Video plays immediately WITHOUT verifying entitlement exists in database**

**Security Issue:**
```javascript
// In browser console, anyone can do:
localStorage.setItem('paywall_tchs', JSON.stringify({
  hasPaid: true,
  purchaseId: 'fake',
  timestamp: Date.now()
}));
location.reload();
// ⚠️ Stream now unlocks WITHOUT actual payment!
```

**Missing Implementation:**
- No API call to verify entitlement before playing video
- No JWT token validation
- No server-side access control

**Fix Required:**
1. Add entitlement verification API endpoint:
   ```typescript
   GET /api/direct/:slug/verify-access?viewerId=xxx
   → { hasAccess: boolean, entitlement?: { ... } }
   ```

2. Call this endpoint before initializing player:
   ```typescript
   // In DirectStreamPageBase
   const verifyAccess = async () => {
     const response = await fetch(
       `${API_URL}/api/direct/${slug}/verify-access?viewerId=${viewerId}`
     );
     const { hasAccess } = await response.json();
     return hasAccess;
   };

   // Before initPlayer:
   if (isPaywallBlocked) {
     const hasAccess = await verifyAccess();
     if (!hasAccess) {
       paywall.openPaywall();
       return;
     }
   }
   ```

3. Return entitlement token with verification
4. Include token in HLS requests (if using signed URLs)

---

### Gap #3: Webhook Integration Not Tested

**Location:** `apps/api/src/routes/webhooks.square.ts`

**Problem:**
The webhook handler exists and **looks complete**, but we have:
- ❓ No evidence it's been tested with real Square webhooks
- ❓ No webhook URL configured in Square Dashboard
- ❓ No way to test webhook locally (needs ngrok or similar)

**Webhook Flow:**
```
Square Payment Complete
  ↓
Square → POST https://api.fieldview.live/api/webhooks/square
  ↓
Verify HMAC signature
  ↓
PaymentService.processSquareWebhook()
  ↓
Update Purchase status to 'paid'
  ↓
Create LedgerEntries (marketplace split)
  ↓
Create Entitlement
  ↓
✅ Viewer gets access
```

**Missing:**
1. Webhook URL not registered with Square
2. No test for HMAC signature validation
3. No manual webhook test tool
4. Unclear if `SQUARE_WEBHOOK_SIGNATURE_KEY` is set correctly

**Fix Required:**
1. Create webhook test script:
   ```bash
   scripts/test-square-webhook.js
   ```

2. Use Square's webhook testing tool in dashboard

3. Or use `ngrok` for local testing:
   ```bash
   ngrok http 4301
   # Register: https://xxxx.ngrok.io/api/webhooks/square
   ```

4. Add webhook logging for debugging

---

## ✅ WHAT'S WORKING WELL

### UI Layer (100% Complete)
- ✅ Paywall modal auto-opens
- ✅ Form validation
- ✅ Payment persistence in localStorage
- ✅ Blocker overlay
- ✅ Custom admin messages
- ✅ Multi-browser tested (Chrome, Firefox, Safari)
- ✅ Mobile-responsive
- ✅ Accessibility (ARIA, data-testid)

### Square Integration
- ✅ Credentials configured
- ✅ Can create payment links
- ✅ Test cards work
- ✅ Sandbox environment functional

### Database Schema
- ✅ `Purchase` table ready
- ✅ `Entitlement` table ready
- ✅ `LedgerEntry` table ready
- ✅ `DirectStream.paywallEnabled` working
- ✅ `OwnerAccount.squareAccessTokenEncrypted` working

### Marketplace Split Logic
- ✅ Fee calculation correct (10% platform, ~9% processor)
- ✅ Ledger service implemented
- ✅ Idempotency checks in place

---

## 🔧 REQUIRED FIXES (Priority Order)

### 🔴 PRIORITY 1: Fix Checkout Endpoint

**File:** `apps/api/src/routes/direct.ts`

**Change:**
```typescript
function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const watchLinkRepo = new WatchLinkRepository(prisma);
    
    // ✅ FIX: Make couponService optional or provide instance
    paymentServiceInstance = new PaymentService(
      gameRepo,
      viewerIdentityRepo,
      viewerIdentityRepo,
      purchaseRepo,
      purchaseRepo,
      entitlementRepo,
      entitlementRepo,
      watchLinkRepo,
      undefined // couponService is optional
    );
  }
  return paymentServiceInstance;
}
```

**Apply to 3 files:**
- ✅ `apps/api/src/routes/direct.ts`
- ✅ `apps/api/src/routes/public.checkout.ts`
- ✅ `apps/api/src/routes/webhooks.square.ts`

**Test:**
```bash
curl -X POST http://localhost:4301/api/direct/tchs/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","firstName":"Test","lastName":"User"}'
# Should return: { purchaseId: "...", checkoutUrl: "..." }
```

---

### 🟡 PRIORITY 2: Add Entitlement Verification

**New Endpoint:** `apps/api/src/routes/direct.ts`

```typescript
// GET /api/direct/:slug/verify-access
router.get(
  '/:slug/verify-access',
  async (req, res, next) => {
    try {
      const { slug } = req.params;
      const { viewerId, email } = req.query;

      // Find DirectStream
      const stream = await prisma.directStream.findUnique({
        where: { slug },
        select: { id: true, gameId: true, paywallEnabled: true },
      });

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      // If no paywall, allow access
      if (!stream.paywallEnabled) {
        return res.json({ hasAccess: true, reason: 'no_paywall' });
      }

      // Check for valid entitlement
      let entitlement = null;

      if (viewerId) {
        entitlement = await prisma.entitlement.findFirst({
          where: {
            viewerId,
            gameId: stream.gameId,
            expiresAt: { gte: new Date() }, // Not expired
          },
        });
      } else if (email) {
        // Lookup by email
        const viewer = await prisma.viewerIdentity.findUnique({
          where: { email },
        });
        if (viewer) {
          entitlement = await prisma.entitlement.findFirst({
            where: {
              viewerId: viewer.id,
              gameId: stream.gameId,
              expiresAt: { gte: new Date() },
            },
          });
        }
      }

      if (entitlement) {
        return res.json({
          hasAccess: true,
          reason: 'valid_entitlement',
          entitlement: {
            id: entitlement.id,
            grantedAt: entitlement.grantedAt,
            expiresAt: entitlement.expiresAt,
          },
        });
      }

      // No valid entitlement
      return res.json({ hasAccess: false, reason: 'no_entitlement' });
    } catch (error) {
      next(error);
    }
  }
);
```

**Frontend Integration:**

```typescript
// In DirectStreamPageBase.tsx, before initPlayer
useEffect(() => {
  if (bootstrap?.paywallEnabled && viewerId) {
    // Verify access with backend
    fetch(`${API_URL}/api/direct/${slug}/verify-access?viewerId=${viewerId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.hasAccess) {
          // localStorage says paid, but no entitlement in DB
          // Clear localStorage and show paywall
          localStorage.removeItem(`paywall_${slug}`);
          paywall.openPaywall();
        } else {
          // Verified! Allow playback
          setPaywallChecked(true);
        }
      });
  }
}, [bootstrap, viewerId]);
```

---

### 🟢 PRIORITY 3: Test Webhook Flow

**Create Test Script:** `apps/api/scripts/test-webhook-locally.js`

```javascript
/**
 * Test Square Webhook Locally
 * Simulates a Square webhook payload
 */

const crypto = require('crypto');

async function testWebhook() {
  const API_URL = 'http://localhost:4301';
  
  // Create a real purchase first
  const checkoutResponse = await fetch(`${API_URL}/api/direct/tchs/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'webhook-test@test.com',
      firstName: 'Webhook',
      lastName: 'Test',
    }),
  });

  const { purchaseId } = await checkoutResponse.json();
  console.log('Created purchase:', purchaseId);

  // Simulate Square webhook
  const webhookPayload = {
    merchant_id: 'TEST',
    type: 'payment.updated',
    event_id: `test-${Date.now()}`,
    created_at: new Date().toISOString(),
    data: {
      type: 'payment',
      id: `payment-${Date.now()}`,
      object: {
        payment: {
          id: `payment-${Date.now()}`,
          status: 'COMPLETED',
          amount_money: { amount: 500, currency: 'USD' },
          reference_id: purchaseId, // Link to our purchase
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    },
  };

  // Send webhook (will fail signature validation, but tests the flow)
  const webhookResponse = await fetch(`${API_URL}/api/webhooks/square`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-square-signature': 'test-signature',
    },
    body: JSON.stringify(webhookPayload),
  });

  console.log('Webhook status:', webhookResponse.status);
  const result = await webhookResponse.json();
  console.log('Webhook result:', result);
}

testWebhook();
```

---

## 📊 TESTING ROADMAP

### Phase 1: Fix Critical Blocker ✅
- [ ] Fix checkout endpoint (add couponService parameter)
- [ ] Test checkout creates purchase record
- [ ] Verify purchase has correct marketplace split

### Phase 2: Add Security ✅  
- [ ] Implement verify-access endpoint
- [ ] Integrate verification in video player
- [ ] Test localStorage tampering doesn't bypass paywall

### Phase 3: Webhook Testing ✅
- [ ] Test webhook signature validation
- [ ] Test webhook updates purchase to 'paid'
- [ ] Test webhook creates entitlement
- [ ] Test webhook creates ledger entries

### Phase 4: End-to-End Integration ✅
- [ ] Complete real payment with test card
- [ ] Verify webhook arrives
- [ ] Verify entitlement created
- [ ] Verify video unlocks
- [ ] Verify marketplace split in database

---

## 🎯 RECOMMENDATION

**Start with Priority 1 (Checkout Endpoint)** - This is a 5-minute fix that unblocks everything.

Once that's working, we can do a **complete round-trip test** with real Square payment:
1. Create checkout → Get Square payment link
2. Complete payment with test card
3. Square sends webhook
4. System creates entitlement
5. Verify access and play video

**Estimated Time:**
- Priority 1: 15 minutes
- Priority 2: 1 hour
- Priority 3: 2 hours
- **Total: 3-4 hours to full production readiness**

---

**Status:** 🟡 **NEARLY COMPLETE - 3 GAPS TO CLOSE**

The foundation is excellent. With these 3 fixes, the system will be production-ready.

ROLE: architect STRICT=true
