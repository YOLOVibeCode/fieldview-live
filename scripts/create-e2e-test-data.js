#!/usr/bin/env node
/**
 * Create test owner and game for E2E tests
 */

const { PrismaClient } = require('@fieldview/data-model');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating E2E test data...');

  // Create or find test owner
  let owner = await prisma.ownerAccount.findFirst({
    where: { email: 'e2e-test@fieldview.live' },
  });

  if (!owner) {
    console.log('Creating test owner account...');
    owner = await prisma.ownerAccount.create({
      data: {
        email: 'e2e-test@fieldview.live',
        type: 'coach',
        contactEmail: 'e2e-test@fieldview.live',
        firstName: 'E2E',
        lastName: 'Test',
        // Add any other required fields
      },
    });
    console.log(`✅ Created owner: ${owner.id}`);
  } else {
    console.log(`✅ Owner exists: ${owner.id}`);
  }

  // Create or find test game
  let game = await prisma.game.findFirst({
    where: { title: 'E2E Test Game' },
  });

  if (!game) {
    console.log('Creating test game...');
    game = await prisma.game.create({
      data: {
        ownerAccountId: owner.id,
        title: 'E2E Test Game',
        homeTeam: 'E2E',
        awayTeam: 'Test',
        startsAt: new Date(),
        priceCents: 0,
        currency: 'USD',
        keywordCode: `E2E-TEST-${Date.now()}`,
        qrUrl: '',
        state: 'live',
      },
    });
    console.log(`✅ Created game: ${game.id}`);
  } else {
    console.log(`✅ Game exists: ${game.id}`);
  }

  console.log('\n🎉 E2E test data ready!');
  console.log(`Game ID: ${game.id}`);
  console.log(`Owner ID: ${owner.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

