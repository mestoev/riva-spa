/**
 * Seed the DB with initial catalog (services + masters) from lib/data.ts.
 * Run with: npm run db:seed
 *
 * Idempotent — safe to re-run; uses upsert.
 */
import { PrismaClient } from "@prisma/client";
import { SERVICES, MASTERS } from "../lib/data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding services…");
  for (const [i, s] of SERVICES.entries()) {
    await prisma.service.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        category: s.cat,
        name: s.name,
        desc: s.desc,
        duration: s.duration,
        price: s.price,
        tag: s.tag,
        sortOrder: i,
      },
      update: {
        category: s.cat,
        name: s.name,
        desc: s.desc,
        duration: s.duration,
        price: s.price,
        tag: s.tag,
        sortOrder: i,
      },
    });
  }
  console.log(`  ${SERVICES.length} services upserted`);

  console.log("Seeding masters…");
  for (const [i, m] of MASTERS.entries()) {
    await prisma.master.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        name: m.name,
        role: m.role,
        exp: m.exp,
        rating: m.rating ?? null,
        specs: m.specs as string[],
        sortOrder: i,
      },
      update: {
        name: m.name,
        role: m.role,
        exp: m.exp,
        rating: m.rating ?? null,
        specs: m.specs as string[],
        sortOrder: i,
      },
    });
  }
  console.log(`  ${MASTERS.length} masters upserted`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
