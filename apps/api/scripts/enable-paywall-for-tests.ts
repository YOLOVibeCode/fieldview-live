/**
 * Enable Paywall for E2E Testing
 * 
 * This script enables paywall on the tchs stream for testing
 */

import { PrismaClient as DataModelPrismaClient } from '@fieldview/data-model/client';

const prisma = new DataModelPrismaClient();

async function main() {
  console.log('🔧 Enabling paywall for tchs stream...');
  
  // Enable paywall on tchs stream
  const updated = await prisma.directStream.update({
    where: { slug: 'tchs' },
    data: {
      paywallEnabled: true,
      priceInCents: 500, // $5.00
      paywallMessage: 'Support our team! Purchase access to watch the live stream.',
      allowSavePayment: true,
    },
  });
  
  console.log('✅ Paywall enabled for tchs stream:');
  console.log('   - Price: $5.00');
  console.log('   - Message:', updated.paywallMessage);
  console.log('   - Allow Save Payment:', updated.allowSavePayment);
  
  console.log('\n🔧 Ensuring stormfc is free...');
  
  // Ensure stormfc stays free for comparison tests
  await prisma.directStream.update({
    where: { slug: 'stormfc' },
    data: {
      paywallEnabled: false,
      priceInCents: 0,
      paywallMessage: null,
    },
  });
  
  console.log('✅ stormfc stream confirmed as free');
  console.log('\n🎬 Ready for paywall testing!');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
