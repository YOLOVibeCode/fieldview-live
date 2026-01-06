import { prisma } from "./src/lib/prisma";

async function main() {
  console.log("🌱 Creating E2E test data...");

  // Create or find test owner
  let owner = await prisma.ownerAccount.findFirst({
    where: { contactEmail: "e2e-test@fieldview.live" },
  });

  if (!owner) {
    console.log("Creating test owner account...");
    owner = await prisma.ownerAccount.create({
      data: {
        type: "coach",
        name: "E2E Test Owner",
        status: "active",
        contactEmail: "e2e-test@fieldview.live",
      },
    });
    console.log(`✅ Created owner: ${owner.id}`);
  } else {
    console.log(`✅ Owner exists: ${owner.id}`);
  }

  console.log("\\n🎉 E2E test data ready!");
  console.log(`Owner ID: ${owner.id}`);
  console.log("\\nNow the bootstrap endpoint should create games automatically.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
