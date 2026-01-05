/**
 * Setup STORMFC Paths for stormfc@darkware.net
 * 
 * Creates organization and channels similar to the TCHS setup:
 * - Organization: STORMFC
 * - Channels: 2010, 2008
 * 
 * Usage (local): DATABASE_URL="..." pnpm --filter=api exec tsx scripts/setup-stormfc-paths.ts
 * Usage (production via Railway): railway run --service api pnpm exec tsx scripts/setup-stormfc-paths.ts
 */

import { PrismaClient } from '@prisma/client';

// Prisma will use DATABASE_URL from environment automatically
const prisma = new PrismaClient();

async function setupStormFCPaths() {
  const email = 'stormfc@darkware.net';
  
  console.log(`Setting up STORMFC paths for ${email}...`);

  try {
    // Find or create the owner user
    let ownerUser = await prisma.ownerUser.findUnique({
      where: { email },
      include: { ownerAccount: true },
    });

    if (!ownerUser) {
      console.log(`User ${email} not found. Creating user...`);
      
      // Create owner account
      const ownerAccount = await prisma.ownerAccount.create({
        data: {
          contactEmail: email,
          name: 'Storm FC',
          type: 'association',
          status: 'active',
        },
      });

      // Hash password (using bcryptjs)
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash(process.env.DEFAULT_PASSWORD || 'changeme123', 10);

      // Create owner user
      ownerUser = await prisma.ownerUser.create({
        data: {
          ownerAccountId: ownerAccount.id,
          email,
          passwordHash,
          role: 'association_admin',
        },
        include: { ownerAccount: true },
      });

      console.log(`✓ Created user: ${email} (password: ${process.env.DEFAULT_PASSWORD || 'changeme123'})`);
    } else {
      console.log(`Found existing user: ${email}`);
    }

    console.log(`Owner account ID: ${ownerUser.ownerAccountId}`);

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
            streamType: 'byo_hls', // Default stream type (can be updated later)
            hlsManifestUrl: 'https://placeholder.m3u8', // Placeholder URL
            accessMode: 'public_free',
            requireEventCode: false,
          },
        });
        console.log(`Created channel: ${channel.id} (${team.slug})`);
      }
    }

    // Ensure the owner user is an org_admin member (if OrganizationMember table exists)
    try {
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
    } catch (error: any) {
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        console.log(`⚠️  OrganizationMember table not found - skipping membership creation`);
        console.log(`   (This is OK if migrations haven't been run yet)`);
      } else {
        throw error;
      }
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

