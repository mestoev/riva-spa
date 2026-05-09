/**
 * Weekly backup script — exports all rows of every table to a single JSON file.
 *
 * Run on the server via cron:
 *   0 3 * * 0  cd /root/riva-spa/spa-salon/web && npx tsx bin/backup.ts >> /var/log/riva-backup.log 2>&1
 *
 * Saves to ./backups/<YYYY-MM-DD>.json. Old files (>30 days) get pruned.
 */
import "dotenv/config";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const data: Record<string, unknown[]> = {
    services: await prisma.service.findMany(),
    masters: await prisma.master.findMany(),
    customers: await prisma.customer.findMany(),
    bookings: await prisma.booking.findMany(),
    slots: await prisma.slot.findMany(),
    contactRequests: await prisma.contactRequest.findMany(),
    bonusTransactions: await prisma.bonusTransaction.findMany(),
    loyaltySettings: await prisma.loyaltySettings.findMany(),
    aiSettings: await prisma.aISettings.findMany(),
    aiMessages: await prisma.aIMessage.findMany({ take: 1000, orderBy: { createdAt: "desc" } }),
    workingHours: await prisma.workingHours.findMany(),
    scheduleExceptions: await prisma.scheduleException.findMany(),
    masterBlackouts: await prisma.masterBlackout.findMany(),
    siteSettings: await prisma.siteSettings.findMany(),
    galleryImages: await prisma.galleryImage.findMany(),
    promoCodes: await prisma.promoCode.findMany(),
    adminUsers: await prisma.adminUser.findMany(),
    adminEvents: await prisma.adminEvent.findMany({ take: 5000, orderBy: { createdAt: "desc" } }),
  };

  const dir = join(process.cwd(), "backups");
  await fs.mkdir(dir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const file = join(dir, `${today}.json`);
  await fs.writeFile(
    file,
    JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2),
  );
  const size = (await fs.stat(file)).size;
  console.log(
    `[backup] saved ${file} — ${(size / 1024 / 1024).toFixed(2)} MB, ` +
      `${Object.entries(data)
        .map(([k, v]) => `${k}=${v.length}`)
        .join(", ")}`,
  );

  // Prune older than 30 days
  const all = await fs.readdir(dir);
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  let pruned = 0;
  for (const f of all) {
    if (!f.endsWith(".json")) continue;
    const stat = await fs.stat(join(dir, f));
    if (stat.mtimeMs < cutoff) {
      await fs.unlink(join(dir, f));
      pruned += 1;
    }
  }
  if (pruned > 0) console.log(`[backup] pruned ${pruned} old file(s)`);
}

main()
  .catch((e) => {
    console.error("[backup] failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
