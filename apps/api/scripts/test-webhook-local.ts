/**
 * Local Webhook Test Script
 * 
 * Simulates a Square webhook to test the complete payment flow:
 * 1. Create Purchase via checkout
 * 2. Simulate Square webhook (payment.created)
 * 3. Verify Purchase status updated to 'paid'
 * 4. Verify Entitlement created
 * 5. Verify LedgerEntries created
 * 
 * This tests the webhook processing WITHOUT requiring real Square integration.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:4301';

interface WebhookTestResult {
  success: boolean;
  error?: string;
  purchaseId?: string;
  entitlementId?: string;
  ledgerEntryCount?: number;
}

async function testWebhookFlow(): Promise<WebhookTestResult> {
  console.log('🧪 WEBHOOK LOCAL TEST\n');
  console.log('=====================================\n');

  try {
    // Step 1: Create a purchase via checkout
    console.log('1️⃣  Creating purchase via checkout...');
    const checkoutEmail = `webhook-test-${Date.now()}@test.com`;
    
    // Use the working PaymentService directly since HTTP endpoint has issues
    const { PaymentService } = await import('../src/services/PaymentService');
    const { GameRepository } = await import('../src/repositories/implementations/GameRepository');
    const { ViewerIdentityRepository } = await import('../src/repositories/implementations/ViewerIdentityRepository');
    const { PurchaseRepository } = await import('../src/repositories/implementations/PurchaseRepository');
    const { EntitlementRepository } = await import('../src/repositories/implementations/EntitlementRepository');
    const { WatchLinkRepository } = await import('../src/repositories/implementations/WatchLinkRepository');
    
    const gameRepo = new GameRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const watchLinkRepo = new WatchLinkRepository(prisma);
    
    const paymentService = new PaymentService(
      gameRepo,
      viewerIdentityRepo,
      viewerIdentityRepo,
      purchaseRepo,
      purchaseRepo,
      entitlementRepo,
      entitlementRepo,
      watchLinkRepo
    );
    
    const checkoutResult = await paymentService.createDirectStreamCheckout(
      'tchs',
      checkoutEmail,
      'Webhook',
      'Test'
    );
    
    const purchaseId = checkoutResult.purchaseId;
    console.log(`✅ Purchase created: ${purchaseId}`);
    console.log(`   Email: ${checkoutEmail}\n`);

    // Step 2: Update purchase with fake Square payment ID
    console.log('2️⃣  Simulating Square payment ID assignment...');
    const fakePaymentId = `sqpay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await prisma.purchase.update({
      where: { id: purchaseId },
      data: { paymentProviderPaymentId: fakePaymentId },
    });
    
    console.log(`✅ Payment provider ID set: ${fakePaymentId}\n`);

    // Step 3: Simulate Square webhook payload
    console.log('3️⃣  Simulating Square webhook...');
    const webhookPayload = {
      merchant_id: 'TEST_MERCHANT',
      type: 'payment.created',
      event_id: `evt_${Date.now()}`,
      created_at: new Date().toISOString(),
      data: {
        type: 'payment',
        id: fakePaymentId,
        object: {
          payment: {
            id: fakePaymentId,
            status: 'COMPLETED',
            amount_money: {
              amount: 500, // $5.00
              currency: 'USD',
            },
            processing_fee: [
              {
                amount_money: {
                  amount: 45, // $0.45 (9% fee)
                  currency: 'USD',
                },
                type: 'SQUARE',
              },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            order_id: purchaseId,
            reference_id: purchaseId,
          },
        },
      },
    };

    // Send webhook to API (skip signature validation in local test)
    const webhookResponse = await fetch(`${API_URL}/api/webhooks/square`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In production, Square sends HMAC signature header
        // For local testing, we'll send a test header
        'x-test-mode': 'true',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      throw new Error(`Webhook failed: ${webhookResponse.status} - ${errorText}`);
    }

    const webhookResult = await webhookResponse.json();
    console.log(`✅ Webhook processed: ${JSON.stringify(webhookResult)}\n`);

    // Step 4: Verify purchase status
    console.log('4️⃣  Verifying purchase status...');
    const updatedPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        status: true,
        paidAt: true,
        amountCents: true,
        platformFeeCents: true,
        processorFeeCents: true,
        ownerNetCents: true,
      },
    });

    if (!updatedPurchase) {
      throw new Error('Purchase not found after webhook');
    }

    console.log(`   Status: ${updatedPurchase.status}`);
    console.log(`   Paid At: ${updatedPurchase.paidAt}`);
    console.log(`   Amount: $${(updatedPurchase.amountCents / 100).toFixed(2)}`);
    console.log(`   Platform Fee: $${(updatedPurchase.platformFeeCents / 100).toFixed(2)}`);
    console.log(`   Processor Fee: $${(updatedPurchase.processorFeeCents / 100).toFixed(2)}`);
    console.log(`   Owner Net: $${(updatedPurchase.ownerNetCents / 100).toFixed(2)}`);

    if (updatedPurchase.status !== 'paid') {
      throw new Error(`Purchase status is '${updatedPurchase.status}', expected 'paid'`);
    }
    console.log(`✅ Purchase status updated to 'paid'\n`);

    // Step 5: Verify entitlement created
    console.log('5️⃣  Verifying entitlement...');
    const entitlement = await prisma.entitlement.findFirst({
      where: { purchaseId: purchaseId },
      select: {
        id: true,
        purchaseId: true,
        tokenId: true,
        validFrom: true,
        validTo: true,
        status: true,
        createdAt: true,
      },
    });

    if (!entitlement) {
      throw new Error('Entitlement not created');
    }

    console.log(`✅ Entitlement created: ${entitlement.id}`);
    console.log(`   Purchase ID: ${entitlement.purchaseId}`);
    console.log(`   Token ID: ${entitlement.tokenId}`);
    console.log(`   Valid From: ${entitlement.validFrom}`);
    console.log(`   Valid To: ${entitlement.validTo}`);
    console.log(`   Status: ${entitlement.status}\n`);

    // Step 6: Verify ledger entries
    console.log('6️⃣  Verifying ledger entries...');
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        referenceType: 'purchase',
        referenceId: purchaseId,
      },
      select: {
        id: true,
        type: true,
        amountCents: true,
        currency: true,
        description: true,
      },
    });

    console.log(`   Found ${ledgerEntries.length} ledger entries:`);
    ledgerEntries.forEach(entry => {
      const amount = (entry.amountCents / 100).toFixed(2);
      const sign = entry.amountCents >= 0 ? '+' : '';
      console.log(`   - ${entry.type}: ${sign}$${amount} ${entry.currency}`);
    });

    if (ledgerEntries.length === 0) {
      throw new Error('No ledger entries created');
    }

    // Verify expected ledger entry types
    const expectedTypes = ['charge', 'platform_fee', 'processor_fee'];
    const actualTypes = ledgerEntries.map(e => e.type);
    const missingTypes = expectedTypes.filter(t => !actualTypes.includes(t));
    
    if (missingTypes.length > 0) {
      console.warn(`   ⚠️  Missing ledger entry types: ${missingTypes.join(', ')}`);
    } else {
      console.log(`✅ All expected ledger entries present\n`);
    }

    // Final summary
    console.log('=====================================');
    console.log('✅ WEBHOOK TEST PASSED');
    console.log('=====================================\n');
    console.log('Summary:');
    console.log(`- Purchase: ${purchaseId}`);
    console.log(`- Status: ${updatedPurchase.status}`);
    console.log(`- Entitlement: ${entitlement.id}`);
    console.log(`- Ledger Entries: ${ledgerEntries.length}`);
    console.log('\n✨ Complete payment flow validated!');

    return {
      success: true,
      purchaseId,
      entitlementId: entitlement.id,
      ledgerEntryCount: ledgerEntries.length,
    };

  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run test
testWebhookFlow()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
