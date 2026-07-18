import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.directStreamEvent.findMany({
    where: { directStream: { slug: 'tchs' } },
    select: { 
      eventSlug: true, 
      title: true, 
      scheduledStartAt: true,
      chatEnabled: true,
      scoreboardEnabled: true
    },
    orderBy: { scheduledStartAt: 'asc' }
  });

  console.log('📊 TCHS Events in Local Database:\n');
  
  if (events.length === 0) {
    console.log('❌ No events found!\n');
  } else {
    events.forEach((e, i) => {
      console.log(`${i + 1}. ${e.eventSlug}`);
      console.log(`   Name: ${e.title}`);
      console.log(`   Scheduled: ${e.scheduledStartAt}`);
      console.log(`   Chat: ${e.chatEnabled ? '✅' : '❌'} | Scoreboard: ${e.scoreboardEnabled ? '✅' : '❌'}`);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);

