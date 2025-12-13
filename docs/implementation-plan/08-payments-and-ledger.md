# Payments & Ledger

## Overview

Square payment integration with marketplace split accounting, ledger entries, and payout processing.

**Payment Provider**: Square (not Stripe)

**Marketplace Model**: Square Connect (marketplace application)

## Square Integration

### Square Connect Setup

**Owner Onboarding Flow**:
1. Owner registers/logs in
2. Clicks "Connect Square Account"
3. Redirected to Square Connect OAuth
4. Authorizes FieldView application
5. Square returns `access_token` and `merchant_id`
6. Store `payoutProviderRef` = Square merchant ID

**API Implementation**:
```typescript
// apps/api/src/routes/owners.ts
app.get('/api/owners/me/square/connect', async (req, res) => {
  const ownerAccount = await getOwnerAccountFromAuth(req);
  
  // Generate Square Connect URL
  const connectUrl = squareClient.getConnectUrl({
    clientId: process.env.SQUARE_APPLICATION_ID,
    redirectUri: `${process.env.APP_URL}/api/owners/me/square/callback`,
    state: ownerAccount.id, // CSRF protection
  });
  
  res.redirect(connectUrl);
});

app.get('/api/owners/me/square/callback', async (req, res) => {
  const { code, state } = req.query;
  const ownerAccountId = state as string;
  
  // Exchange code for access token
  const { access_token, merchant_id } = await squareClient.oauth.obtainToken({
    code: code as string,
    clientId: process.env.SQUARE_APPLICATION_ID,
    clientSecret: process.env.SQUARE_APPLICATION_SECRET,
  });
  
  // Store Square merchant ID
  await ownerAccountRepository.update(ownerAccountId, {
    payoutProviderRef: merchant_id,
    squareAccessToken: encrypt(access_token), // Encrypt before storing
  });
  
  res.redirect('/owner/dashboard?square_connected=true');
});
```

### Checkout Flow

**Endpoint**: `POST /api/public/games/:gameId/checkout`

**Request** (email required):
```typescript
interface CheckoutCreateRequest {
  viewerEmail: string; // Required
  viewerPhone?: string; // Optional, E.164
  returnUrl?: string;
}
```

**Implementation**:
```typescript
// apps/api/src/routes/public.ts
app.post('/api/public/games/:gameId/checkout', async (req, res) => {
  const { gameId } = req.params;
  const { viewerEmail, viewerPhone } = req.body;
  
  // Validate email required
  if (!viewerEmail || !isValidEmail(viewerEmail)) {
    return res.status(400).json({ error: 'viewerEmail is required' });
  }
  
  // Get or create ViewerIdentity
  let viewer = await viewerIdentityRepository.findByEmail(viewerEmail);
  if (!viewer) {
    viewer = await viewerIdentityRepository.create({ email: viewerEmail, phoneE164: viewerPhone });
  }
  
  // Get game
  const game = await gameRepository.getById(gameId);
  
  // Calculate marketplace split
  const split = calculateMarketplaceSplit(game.priceCents, PLATFORM_FEE_PERCENT);
  
  // Create Purchase record
  const purchase = await purchaseRepository.create({
    gameId,
    viewerId: viewer.id,
    amountCents: game.priceCents,
    currency: game.currency,
    platformFeeCents: split.platformFeeCents,
    processorFeeCents: split.processorFeeCents,
    ownerNetCents: split.ownerNetCents,
    status: 'created',
  });
  
  // Create Square payment
  const payment = await squareClient.payments.createPayment({
    sourceId: 'EXTERNAL', // Customer pays via Square checkout
    idempotencyKey: purchase.id,
    amountMoney: {
      amount: game.priceCents,
      currency: game.currency,
    },
    // Marketplace split
    applicationFeeMoney: {
      amount: split.platformFeeCents,
    },
    // Owner receives net amount
    // Note: Square Connect handles marketplace splits differently
    // May need to use Square Connect API for proper split
  });
  
  // Update purchase with Square payment ID
  await purchaseRepository.update(purchase.id, {
    paymentProviderPaymentId: payment.payment.id,
    status: 'paid',
    paidAt: new Date(),
  });
  
  // Create ledger entries
  await createLedgerEntries(purchase, split);
  
  // Create entitlement
  const entitlement = await entitlementService.createEntitlement(purchase.id);
  
  res.json({
    purchaseId: purchase.id,
    watchToken: entitlement.token,
    watchUrl: `/watch/${entitlement.token}`,
  });
});
```

### Marketplace Split Calculation

**Formula**:
```typescript
// packages/data-model/src/utils/feeCalculator.ts
export function calculateMarketplaceSplit(
  grossAmountCents: number,
  platformFeePercent: number = 10 // 10% default
): MarketplaceSplit {
  // Square processing fee: 2.9% + $0.30
  const processorFeeCents = Math.round(grossAmountCents * 0.029 + 30);
  
  // Platform fee: percentage of gross
  const platformFeeCents = Math.round(grossAmountCents * (platformFeePercent / 100));
  
  // Owner net: gross - platform fee - processor fee
  const ownerNetCents = grossAmountCents - platformFeeCents - processorFeeCents;
  
  return {
    grossAmountCents,
    platformFeeCents,
    processorFeeCents,
    ownerNetCents,
  };
}
```

**Note**: Square Connect marketplace model may differ. Consult Square documentation for exact split API.

### Square Webhooks

**Endpoint**: `POST /api/webhooks/square`

**Events**:
- `payment.created`: Payment created (may be pending)
- `payment.updated`: Payment status changed (succeeded/failed)
- `refund.created`: Refund created

**Implementation**:
```typescript
// apps/api/src/webhooks/square.ts
app.post('/api/webhooks/square', async (req, res) => {
  // Verify webhook signature
  const isValid = squareClient.webhooks.verifyWebhookSignature(
    req.body,
    req.headers['x-square-signature'],
    process.env.SQUARE_WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = req.body;
  
  switch (event.type) {
    case 'payment.created':
    case 'payment.updated':
      await handlePaymentWebhook(event);
      break;
    case 'refund.created':
      await handleRefundWebhook(event);
      break;
  }
  
  res.status(200).json({ received: true });
});

async function handlePaymentWebhook(event: SquareWebhookEvent) {
  const paymentId = event.data.object.payment.id;
  const purchase = await purchaseRepository.findByPaymentId(paymentId);
  
  if (!purchase) {
    logger.warn({ paymentId }, 'Purchase not found for payment');
    return;
  }
  
  const paymentStatus = event.data.object.payment.status;
  
  if (paymentStatus === 'COMPLETED' && purchase.status === 'created') {
    // Update purchase status
    await purchaseRepository.update(purchase.id, {
      status: 'paid',
      paidAt: new Date(),
    });
    
    // Create entitlement
    await entitlementService.createEntitlement(purchase.id);
    
    // Create ledger entries (if not already created)
    await createLedgerEntries(purchase);
  } else if (paymentStatus === 'FAILED') {
    await purchaseRepository.update(purchase.id, {
      status: 'failed',
      failedAt: new Date(),
    });
  }
}
```

## Ledger Entries

### Purpose

Immutable accounting record for all monetary events:
- Charges (purchases)
- Platform fees
- Processor fees
- Refunds
- Payouts

### Implementation

```typescript
// apps/api/src/services/LedgerService.ts
export async function createLedgerEntries(purchase: Purchase, split: MarketplaceSplit) {
  const ownerAccount = await ownerAccountRepository.getById(purchase.game.ownerAccountId);
  
  // Charge entry (credit to owner)
  await ledgerRepository.create({
    ownerAccountId: ownerAccount.id,
    type: 'charge',
    amountCents: purchase.amountCents,
    currency: purchase.currency,
    referenceType: 'purchase',
    referenceId: purchase.id,
    description: `Purchase for game: ${purchase.game.title}`,
  });
  
  // Platform fee entry (debit from owner)
  await ledgerRepository.create({
    ownerAccountId: ownerAccount.id,
    type: 'platform_fee',
    amountCents: -split.platformFeeCents, // Negative = debit
    currency: purchase.currency,
    referenceType: 'purchase',
    referenceId: purchase.id,
    description: 'Platform fee',
  });
  
  // Processor fee entry (debit from owner)
  await ledgerRepository.create({
    ownerAccountId: ownerAccount.id,
    type: 'processor_fee',
    amountCents: -split.processorFeeCents,
    currency: purchase.currency,
    referenceType: 'purchase',
    referenceId: purchase.id,
    description: 'Payment processing fee',
  });
}
```

### Ledger Queries

**Owner Balance**:
```typescript
export async function getOwnerBalance(ownerAccountId: string): Promise<number> {
  const entries = await ledgerRepository.findByOwner(ownerAccountId);
  return entries.reduce((sum, entry) => sum + entry.amountCents, 0);
}
```

## Payouts

### Payout Processing

**Schedule**: Weekly (configurable) or on-demand

**Implementation**:
```typescript
// apps/api/src/services/PayoutService.ts
export async function processPayouts(ownerAccountId: string): Promise<Payout> {
  const balance = await getOwnerBalance(ownerAccountId);
  
  if (balance <= 0) {
    throw new Error('No balance to payout');
  }
  
  const ownerAccount = await ownerAccountRepository.getById(ownerAccountId);
  
  if (!ownerAccount.payoutProviderRef) {
    throw new Error('Square account not connected');
  }
  
  // Get ledger entries not yet paid out
  const unpaidEntries = await ledgerRepository.findUnpaidByOwner(ownerAccountId);
  
  // Create Square transfer
  const transfer = await squareClient.transfers.createTransfer({
    idempotencyKey: `payout-${ownerAccountId}-${Date.now()}`,
    amountMoney: {
      amount: balance,
      currency: 'USD',
    },
    // Square Connect: transfer to connected account
    // Consult Square docs for exact API
  });
  
  // Create Payout record
  const payout = await payoutRepository.create({
    ownerAccountId,
    amountCents: balance,
    currency: 'USD',
    status: 'processing',
    payoutProviderRef: transfer.id,
    ledgerEntryIds: unpaidEntries.map(e => e.id),
  });
  
  // Mark ledger entries as paid out
  await ledgerRepository.markAsPaidOut(unpaidEntries.map(e => e.id), payout.id);
  
  return payout;
}
```

## Acceptance Criteria

- [ ] Square Connect onboarding flow works
- [ ] Checkout requires `viewerEmail`
- [ ] Square payment created successfully
- [ ] Marketplace split calculated correctly
- [ ] Ledger entries created for all monetary events
- [ ] Webhook handlers process Square events
- [ ] Entitlement created on payment success
- [ ] Payouts process correctly
- [ ] 100% test coverage

## Next Steps

- Proceed to [09-sms-email-notifications.md](./09-sms-email-notifications.md) for Twilio/SendGrid
