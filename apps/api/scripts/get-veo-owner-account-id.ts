/**
 * Resolve FieldView OwnerAccount UUID by owner email.
 * Use this value for VEO_OWNER_ACCOUNT_ID in .env so the Veo scraper ties streams to your account.
 *
 * Usage: dotenv -e .env -- tsx scripts/get-veo-owner-account-id.ts [email]
 * Example: dotenv -e .env -- tsx scripts/get-veo-owner-account-id.ts rvegajr@noctusoft.com
 */

import { prisma } from '../src/lib/prisma';

async function main(): Promise<void> {
  const email = process.argv[2] ?? process.env.VEO_EMAIL?.trim();
  if (!email) {
    console.error('Usage: tsx scripts/get-veo-owner-account-id.ts <owner-email>');
    console.error('   or set VEO_EMAIL in .env and run without args.');
    process.exit(1);
  }

  const ownerUser = await prisma.ownerUser.findFirst({
    where: { email },
    select: { ownerAccountId: true, ownerAccount: { select: { name: true } } },
  });

  if (!ownerUser) {
    console.error(`No owner found with email: ${email}`);
    process.exit(1);
  }

  console.log('Owner account ID for VEO_OWNER_ACCOUNT_ID:');
  console.log(ownerUser.ownerAccountId);
  console.log(`(Account: ${ownerUser.ownerAccount.name})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
