const { PrismaClient } = require('@prisma/client');

const LOCAL_DATABASE = "postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: { url: LOCAL_DATABASE }
  },
  log: ['error'],
});

async function main() {
  console.log('\n🏃 Creating TCHS Soccer Streams - LOCAL\n');
  
  // Check what models are available
  console.log('Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
  
  // Find owner - try to get it from existing tchs stream
  let owner = await prisma.ownerAccount.findFirst({
    where: { 
      name: { contains: 'Twin City', mode: 'insensitive' }
    }
  });
  
  // If not found, try to find by looking at existing tchs streams
  if (!owner) {
    const existingStream = await prisma.directStream.findFirst({
      where: { slug: { startsWith: 'tchs/' } },
      include: { ownerAccount: true },
    });
    
    if (existingStream) {
      owner = existingStream.ownerAccount;
      console.log(`✅ Found owner from existing stream: ${owner.name}\n`);
    }
  }
  
  if (!owner) {
    // List available owners and use the first one
    const owners = await prisma.ownerAccount.findMany({ take: 10 });
    if (owners.length === 0) {
      console.log('❌ No owners found in database');
      return;
    }
    
    console.log('📋 Available owners:');
    owners.forEach((o, i) => console.log(`   ${i + 1}. ${o.name} (${o.contactEmail})`));
    
    // Use first owner
    owner = owners[0];
    console.log(`\n✅ Using owner: ${owner.name}\n`);
  }
  
  console.log(`✅ Found owner: ${owner.name}\n`);
  
  // Create streams
  const streams = [
    { slug: 'tchs/soccer-20260120-jv2', title: 'TCHS Soccer JV2 - January 20, 2026', team: 'TCHS JV2' },
    { slug: 'tchs/soccer-20260120-jv', title: 'TCHS Soccer JV - January 20, 2026', team: 'TCHS JV' },
    { slug: 'tchs/soccer-20260120-varsity', title: 'TCHS Soccer Varsity - January 20, 2026', team: 'TCHS Varsity' },
  ];
  
  for (const s of streams) {
    const stream = await prisma.directStream.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        title: s.title,
        streamUrl: `https://stream.mux.com/placeholder-${s.team.toLowerCase().replace(/\s+/g, '-')}.m3u8`,
        ownerAccount: { connect: { id: owner.id } },
        adminPassword: 'tchs2026',
        chatEnabled: true,
        paywallEnabled: false,
        priceInCents: 0,
        scoreboardEnabled: true,
      },
      update: {
        title: s.title,
        scoreboardEnabled: true,
      },
    });
    
    await prisma.gameScoreboard.upsert({
      where: { directStreamId: stream.id },
      create: {
        directStreamId: stream.id,
        homeTeamName: s.team,
        awayTeamName: 'Away Team',
        homeJerseyColor: '#003366',
        awayJerseyColor: '#CC0000',
        homeScore: 0,
        awayScore: 0,
        clockMode: 'stopped',
        clockSeconds: 0,
        isVisible: true,
        position: 'top',
      },
      update: { homeTeamName: s.team },
    });
    
    console.log(`✅ ${s.slug}`);
  }
  
  console.log('\n✅ Done! LOCAL URLs:');
  console.log('   • http://localhost:4300/direct/tchs/soccer-20260120-jv2');
  console.log('   • http://localhost:4300/direct/tchs/soccer-20260120-jv');
  console.log('   • http://localhost:4300/direct/tchs/soccer-20260120-varsity\n');
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
