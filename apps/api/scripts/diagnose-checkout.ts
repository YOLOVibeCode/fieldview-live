/**
 * Diagnostic Script - Check Checkout Readiness
 * 
 * Verifies:
 * 1. DirectStream exists with paywall enabled
 * 2. Owner has Square credentials
 * 3. Attempts checkout and reports error
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 CHECKOUT DIAGNOSTIC\n');
  
  // 1. Check DirectStream
  console.log('1️⃣  Checking DirectStream...');
  const stream = await prisma.directStream.findUnique({
    where: { slug: 'tchs' },
    include: { ownerAccount: true },
  });
  
  if (!stream) {
    console.log('❌ DirectStream "tchs" not found');
    return;
  }
  
  console.log(`✅ Stream found: ${stream.title}`);
  console.log(`   - Paywall Enabled: ${stream.paywallEnabled}`);
  console.log(`   - Price: $${(stream.priceInCents / 100).toFixed(2)}`);
  console.log(`   - Owner: ${stream.ownerAccount?.name || 'Unknown'}`);
  
  if (!stream.paywallEnabled) {
    console.log('⚠️  Paywall not enabled!');
    return;
  }
  
  // 2. Check Owner Square Credentials
  console.log('\n2️⃣  Checking Square credentials...');
  const owner = stream.ownerAccount;
  
  if (!owner) {
    console.log('❌ Owner account not found');
    return;
  }
  
  console.log(`   - Owner ID: ${owner.id}`);
  console.log(`   - Square Token: ${owner.squareAccessTokenEncrypted ? '✅ SET' : '❌ MISSING'}`);
  console.log(`   - Square Location: ${owner.squareLocationId || '❌ MISSING'}`);
  console.log(`   - Token Expires: ${owner.squareTokenExpiresAt || '❌ NOT SET'}`);
  
  if (!owner.squareAccessTokenEncrypted || !owner.squareLocationId) {
    console.log('\n❌ Owner missing Square credentials');
    console.log('   Run: pnpm --filter api tsx scripts/connect-square-to-system-owner.js');
    return;
  }
  
  // 3. Check token expiry
  if (owner.squareTokenExpiresAt && new Date(owner.squareTokenExpiresAt) < new Date()) {
    console.log('\n❌ Square token EXPIRED');
    return;
  }
  
  console.log('\n✅ All checks passed!');
  console.log('\n3️⃣  Testing checkout endpoint...');
  
  // 4. Test checkout via API
  try {
    const response = await fetch('http://localhost:4301/api/direct/tchs/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'diagnostic@test.com',
        firstName: 'Diag',
        lastName: 'Test',
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Checkout successful!');
      console.log(`   Purchase ID: ${result.purchaseId}`);
      console.log(`   Checkout URL: ${result.checkoutUrl}`);
    } else {
      console.log(`❌ Checkout failed: HTTP ${response.status}`);
      console.log('   Error:', result);
    }
  } catch (error: any) {
    console.log('❌ Checkout request failed:', error.message);
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
