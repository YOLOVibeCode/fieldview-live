import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:yrCdfWDvdeHwLfEvqGuKgLWjxASIMoZV@gondola.proxy.rlwy.net:42430/railway',
    },
  },
});

async function main() {
  console.log('✓ Applying migration to production...');
  
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EarlyAccessSignup" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "email" TEXT NOT NULL,
      "name" TEXT,
      "source" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EarlyAccessSignup_pkey" PRIMARY KEY ("id")
    );
  `);
  
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "EarlyAccessSignup_email_key" ON "EarlyAccessSignup"("email")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EarlyAccessSignup_email_idx" ON "EarlyAccessSignup"("email")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EarlyAccessSignup_source_idx" ON "EarlyAccessSignup"("source")');
  
  console.log('✓ Migration applied successfully!');
  
  const count = await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "EarlyAccessSignup"`;
  console.log(`✓ Current signups: ${count[0].count}`);
}

main()
  .catch((e) => {
    console.error('✗ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
