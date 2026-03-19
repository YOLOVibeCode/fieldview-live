/**
 * Setup STORMFC Paths for stormfc@darkware.net
 * 
 * Creates organization and channels similar to the TCHS setup:
 * - Organization: STORMFC
 * - Channels: 2010, 2008
 * 
 * Usage: pnpm tsx scripts/setup-stormfc-paths.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupStormFCPaths() {
  const email = 'stormfc@darkware.net';
  
  console.log(`Setting up STORMFC paths for ${email}...`);

  try {
    // Find the owner user
    const ownerUser = await prisma.ownerUser.findUnique({
      where: { email },
      include: { ownerAccount: true },
    });

    if (!ownerUser) {
      throw new Error(`Owner user not found: ${email}`);
    }

    console.log(`Found owner account: ${ownerUser.ownerAccountId}`);

    // Check if organization already exists
    let org = await prisma.organization.findFirst({
      where: {
        ownerAccountId: ownerUser.ownerAccountId,
        shortName: 'STORMFC',
      },
    });

    if (org) {
      console.log(`Organization STORMFC already exists: ${org.id}`);
    } else {
      // Create organization
      org = await prisma.organization.create({
        data: {
          ownerAccountId: ownerUser.ownerAccountId,
          shortName: 'STORMFC',
          name: 'Storm FC',
        },
      });
      console.log(`Created organization: ${org.id} (${org.shortName})`);
    }

    // Create or update channels for 2010 and 2008
    const teams = [
      { slug: '2010', displayName: '2010 Team' },
      { slug: '2008', displayName: '2008 Team' },
    ];

    for (const team of teams) {
      const existingChannel = await prisma.watchChannel.findUnique({
        where: {
          organizationId_teamSlug: {
            organizationId: org.id,
            teamSlug: team.slug,
          },
        },
      });

      if (existingChannel) {
        console.log(`Channel ${team.slug} already exists: ${existingChannel.id}`);
      } else {
        const channel = await prisma.watchChannel.create({
          data: {
            organizationId: org.id,
            teamSlug: team.slug,
            displayName: team.displayName,
            streamType: null, // Will be set when stream is configured
            accessMode: 'public_free',
            linkPreset: 'preset_c', // /{org}/{teamSlug}/{urlKey}
            requireEventCode: false,
          },
        });
        console.log(`Created channel: ${channel.id} (${team.slug})`);
      }
    }

    // Ensure the owner user is an org_admin member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        ownerUserId_organizationId: {
          ownerUserId: ownerUser.id,
          organizationId: org.id,
        },
      },
    });

    if (!existingMembership) {
      await prisma.organizationMember.create({
        data: {
          ownerUserId: ownerUser.id,
          organizationId: org.id,
          role: 'org_admin',
        },
      });
      console.log(`Created org_admin membership for ${email}`);
    } else {
      console.log(`Membership already exists: ${existingMembership.role}`);
    }

    console.log('\n✅ Setup complete!');
    console.log(`\nPaths available:`);
    console.log(`  - /STORMFC/2010 (for events)`);
    console.log(`  - /STORMFC/2008 (for events)`);
    console.log(`\nTo create events, use:`);
    console.log(`  POST /api/owners/me/orgs/STORMFC/channels/2010/events`);
    console.log(`  POST /api/owners/me/orgs/STORMFC/channels/2008/events`);

  } catch (error) {
    console.error('Error setting up STORMFC paths:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupStormFCPaths()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });


