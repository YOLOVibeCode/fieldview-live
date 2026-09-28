/**
 * Diagnostic Script - Check Checkout Readiness
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 CHECKOUT DIAGNOSTIC\n');

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

  console.log('\n2️⃣  Checking relay Connect Hub onboarding...');
  const owner = stream.ownerAccount;

  if (!owner) {
    console.log('❌ Owner account not found');
    return;
  }

  console.log(`   - Owner ID: ${owner.id}`);
  console.log(`   - Relay recipient key: ${owner.relayRecipientKey || '❌ MISSING'}`);
  console.log(`   - Agreement version: ${owner.agreementAcceptedVersion || '❌ MISSING'}`);
  console.log(`   - Square location: ${owner.squareLocationId || '❌ MISSING'}`);

  if (!owner.relayRecipientKey || !owner.agreementAcceptedVersion || !owner.squareLocationId) {
    console.log('\n❌ Owner not ready for paid checkout');
    console.log('   Connect at /owners/payments');
    return;
  }

  console.log('\n✅ All checks passed!');
}

diagnose()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
