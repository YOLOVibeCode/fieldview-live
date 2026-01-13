#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

// Check for DATABASE_URL env var, if not use production
if (!process.env.DATABASE_URL) {
  console.log('No DATABASE_URL found, please set it as an environment variable');
  process.exit(1);
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllEvents() {
  console.log('🔍 Listing all DirectStreamEvents...\n');

  try {
    const events = await prisma.directStreamEvent.findMany({
      include: {
        directStream: {
          select: { slug: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${events.length} total events:\n`);
    events.forEach((event, i) => {
      console.log(`${i + 1}. Slug: ${event.eventSlug}`);
      console.log(`   Title: ${event.title}`);
      console.log(`   Parent: ${event.directStream?.slug || 'N/A'}`);
      console.log(`   Start: ${event.scheduledStartAt || 'Not scheduled'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listAllEvents();

