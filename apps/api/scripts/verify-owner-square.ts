/**
 * Verify OwnerAccount relay Connect Hub payment readiness.
 */

import { prisma } from '../src/lib/prisma';

async function verifyOwnerSquare() {
  try {
    console.log('🔍 Searching for OwnerAccount...\n');

    const ownerAccount = await prisma.ownerAccount.findFirst({
      where: { type: 'owner' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        contactEmail: true,
        payoutProviderRef: true,
        relayRecipientKey: true,
        agreementAcceptedVersion: true,
        paymentsConnectedAt: true,
        squareLocationId: true,
      },
    });

    if (!ownerAccount) {
      console.error('❌ No OwnerAccount found');
      process.exit(1);
    }

    console.log('✅ OwnerAccount found:', ownerAccount.id);
    console.log('   Name:', ownerAccount.name);
    console.log('   Email:', ownerAccount.contactEmail);
    console.log('   Square Merchant ID:', ownerAccount.payoutProviderRef || '❌ NOT SET');
    console.log('   Relay recipient key:', ownerAccount.relayRecipientKey || '❌ NOT SET');
    console.log('   Agreement:', ownerAccount.agreementAcceptedVersion || '❌ NOT SET');
    console.log('   Square Location ID:', ownerAccount.squareLocationId || '❌ NOT SET');
    console.log('   Connected at:', ownerAccount.paymentsConnectedAt?.toISOString() || '—');

    const isReady =
      Boolean(ownerAccount.relayRecipientKey) &&
      Boolean(ownerAccount.agreementAcceptedVersion) &&
      Boolean(ownerAccount.squareLocationId);

    console.log('\n🎯 Payment Processing Ready:', isReady ? '✅ YES' : '❌ NO');

    if (!isReady) {
      console.log('\n⚠️  Connect payments at /owners/payments');
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyOwnerSquare().catch((err) => {
  console.error(err);
  process.exit(1);
});
