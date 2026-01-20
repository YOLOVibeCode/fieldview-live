/**
 * Test PaymentService Initialization
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { PaymentService } from '../src/services/PaymentService';
import { GameRepository } from '../src/repositories/implementations/GameRepository';
import { ViewerIdentityRepository } from '../src/repositories/implementations/ViewerIdentityRepository';
import { PurchaseRepository } from '../src/repositories/implementations/PurchaseRepository';
import { EntitlementRepository } from '../src/repositories/implementations/EntitlementRepository';
import { WatchLinkRepository } from '../src/repositories/implementations/WatchLinkRepository';

console.log('🧪 Testing PaymentService Initialization\n');

try {
  console.log('1️⃣  Creating repositories...');
  const gameRepo = new GameRepository(prisma);
  const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
  const purchaseRepo = new PurchaseRepository(prisma);
  const entitlementRepo = new EntitlementRepository(prisma);
  const watchLinkRepo = new WatchLinkRepository(prisma);
  console.log('✅ Repositories created\n');
  
  console.log('2️⃣  Creating PaymentService...');
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
  console.log('✅ PaymentService created\n');
  
  console.log('3️⃣  Testing createDirectStreamCheckout...');
  paymentService.createDirectStreamCheckout(
    'tchs',
    'service-test@test.com',
    'Service',
    'Test'
  )
    .then(result => {
      console.log('✅ Checkout successful!');
      console.log(`   Purchase ID: ${result.purchaseId}`);
      console.log(`   Checkout URL: ${result.checkoutUrl}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Checkout failed:');
      console.error('   Name:', error.name);
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      process.exit(1);
    });
    
} catch (error: any) {
  console.error('❌ Initialization failed:');
  console.error('   Name:', error.name);
  console.error('   Message:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}
