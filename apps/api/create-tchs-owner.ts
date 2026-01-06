import { prisma } from './src/lib/prisma';

async function main() {
  console.log('🔍 Checking for TCHS owner account...');
  
  let owner = await prisma.ownerAccount.findFirst({
    where: {
      OR: [
        { name: { contains: 'TCHS', mode: 'insensitive' } },
        { contactEmail: { contains: 'tchs', mode: 'insensitive' } },
      ],
    },
  });

  if (owner) {
    console.log('✅ Found existing TCHS owner:', owner.name, owner.id);
  } else {
    console.log('❌ No TCHS owner found. Creating...');
    owner = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'TCHS',
        status: 'active',
        contactEmail: 'admin@tchs.example.com',
      },
    });
    console.log('✅ Created TCHS owner:', owner.name, owner.id);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
