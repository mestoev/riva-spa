/**
 * Seed the site with themed stock photos (spa / pool) from Pexels.
 *
 *   npm run db:seed-images           # download + write DB
 *   npm run db:seed-images -- --clear # remove seeded files + reset DB rows
 *
 * - Downloads each photo to public/uploads/seed/<filename>
 * - Updates SiteSettings.heroImageUrl
 * - Recreates GalleryImage rows tagged as "seed" (URLs starting /uploads/seed/)
 * - Updates Service.imageUrl by matching service IDs
 *
 * Idempotent — re-running skips already-cached files and re-syncs the DB.
 *
 * Failures: if a particular photo fails to download, that slot stays empty
 * and the existing SVG fallback kicks in. The owner can always upload real
 * photos via /admin/settings, /admin/gallery, /admin/services — those override
 * the seeded ones (admin uploads go to /uploads/<YYYY-MM>/, not /uploads/seed/).
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

// ==== Photo set ===========================================================
// All URLs are stable Unsplash CDN photo IDs. Free for commercial use under
// the Unsplash License (https://unsplash.com/license).

type Photo = {
  /** Internal stable key */
  key: string;
  /**
   * One or more candidate URLs to try in order. Pexels CDN is preferred
   * (https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg) — free
   * for commercial use under the Pexels License. The script tries each
   * URL in turn and uses the first one that returns a real image. Provide
   * 2-3 candidates per slot so a single dead photo ID doesn't leave a hole.
   */
  urls: string[];
  /** Output filename inside public/uploads/seed/ */
  filename: string;
  // Optional metadata for DB writes
  /** Used as the hero photo on the home page */
  isHero?: boolean;
  /** If set — creates a GalleryImage with this title/subtitle */
  gallery?: { title: string; subtitle?: string; sortOrder: number };
  /** Apply this image to all services with these IDs */
  serviceIds?: string[];
};

// Pexels CDN — themed stock photos, free for commercial use under Pexels License.
// IDs picked from photos that have lived on Pexels for years (popular, indexed,
// widely embedded). If any of these ever 404, replace with another id from
// pexels.com/search/<theme>/.
const px = (id: number, w = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const PHOTOS: Photo[] = [
  // ---- HERO ----
  {
    key: "hero",
    urls: [px(261101, 2000), px(258154, 2000), px(261410, 2000)],
    filename: "hero-pool.jpg",
    isHero: true,
  },

  // ---- GALLERY ----
  {
    key: "g-pool-terrace",
    urls: [px(261101), px(258154), px(261410)],
    filename: "g-pool-terrace.jpg",
    gallery: { title: "Бассейн на террасе", subtitle: "Главный зал с панорамным остеклением", sortOrder: 10 },
  },
  {
    key: "g-pool-evening",
    urls: [px(358010), px(261410), px(1480807)],
    filename: "g-pool-evening.jpg",
    gallery: { title: "Вечер у бассейна", subtitle: "Свечи, тёплая вода, тишина", sortOrder: 20 },
  },
  {
    key: "g-hammam",
    urls: [px(6663460), px(7195729), px(3998012), px(3997989)],
    filename: "g-hammam.jpg",
    gallery: { title: "Хаммам", subtitle: "Мраморный лежак, мягкая пена", sortOrder: 30 },
  },
  {
    key: "g-sauna",
    urls: [px(7195729), px(6663460), px(3997991), px(3865711)],
    filename: "g-sauna.jpg",
    gallery: { title: "Спа-зона", subtitle: "Кедр, эфирные масла, тёплый свет", sortOrder: 40 },
  },
  {
    key: "g-massage-room",
    urls: [px(3865711), px(3997991), px(6724435)],
    filename: "g-massage-room.jpg",
    gallery: { title: "Массажный кабинет", subtitle: "Приватное крыло, тёплый свет", sortOrder: 50 },
  },
  {
    key: "g-stones",
    urls: [px(3997381), px(3997386), px(6663379)],
    filename: "g-stones.jpg",
    gallery: { title: "Стоун-терапия", subtitle: "Базальтовые камни и масла", sortOrder: 60 },
  },
  {
    key: "g-candles",
    urls: [px(4046716), px(6663382), px(6707633), px(7146470)],
    filename: "g-candles.jpg",
    gallery: { title: "Свечи и аромамасла", subtitle: "Авторские смеси по сезону", sortOrder: 70 },
  },
  {
    key: "g-towels",
    urls: [px(3997991), px(6663379), px(3997381)],
    filename: "g-towels.jpg",
    gallery: { title: "Зона ухода", subtitle: "Тёплые полотенца и натуральная косметика", sortOrder: 80 },
  },
  {
    key: "g-lounge",
    urls: [px(3997989), px(6627574), px(6663382)],
    filename: "g-lounge.jpg",
    gallery: { title: "Лаунж после процедур", subtitle: "Чайная церемония, фрукты, мёд", sortOrder: 90 },
  },
  {
    key: "g-facial",
    urls: [px(3985333), px(3985328), px(3997983)],
    filename: "g-facial.jpg",
    gallery: { title: "Уход за лицом", subtitle: "Профессиональная косметология", sortOrder: 100 },
  },

  // ---- SERVICES ----
  {
    key: "svc-classic-massage",
    urls: [px(3865711, 1200), px(3997991, 1200), px(6724435, 1200)],
    filename: "svc-classic-massage.jpg",
    serviceIds: ["classic-massage"],
  },
  {
    key: "svc-spa-massage",
    urls: [px(3997989, 1200), px(6663382, 1200), px(6627574, 1200)],
    filename: "svc-spa-massage.jpg",
    serviceIds: ["spa-massage", "aroma-massage"],
  },
  {
    key: "svc-stone",
    urls: [px(3997381, 1200), px(3997386, 1200), px(6663379, 1200)],
    filename: "svc-stone.jpg",
    serviceIds: ["stone-massage"],
  },
  {
    key: "svc-pool-day",
    urls: [px(261101, 1200), px(258154, 1200)],
    filename: "svc-pool-day.jpg",
    serviceIds: ["pool-day"],
  },
  {
    key: "svc-pool-evening",
    urls: [px(358010, 1200), px(261410, 1200), px(1480807, 1200)],
    filename: "svc-pool-evening.jpg",
    serviceIds: ["pool-evening"],
  },
  {
    key: "svc-sauna",
    urls: [px(7195729, 1200), px(6663460, 1200), px(3997991, 1200)],
    filename: "svc-sauna.jpg",
    serviceIds: ["sauna"],
  },
  {
    key: "svc-hammam",
    urls: [px(6663460, 1200), px(3998012, 1200), px(7195729, 1200)],
    filename: "svc-hammam.jpg",
    serviceIds: ["hammam"],
  },
  {
    key: "svc-facial-deep",
    urls: [px(3985333, 1200), px(3985328, 1200), px(3997983, 1200)],
    filename: "svc-facial-deep.jpg",
    serviceIds: ["facial-deep"],
  },
  {
    key: "svc-facial-antiage",
    urls: [px(7755515, 1200), px(3985328, 1200), px(3997983, 1200)],
    filename: "svc-facial-antiage.jpg",
    serviceIds: ["facial-anti-age"],
  },
  {
    key: "svc-duo-spa",
    urls: [px(3997992, 1200), px(6627574, 1200), px(3997989, 1200)],
    filename: "svc-duo-spa.jpg",
    serviceIds: ["duo-spa"],
  },
  {
    key: "svc-duo-honey",
    urls: [px(4046716, 1200), px(6707633, 1200), px(6663382, 1200)],
    filename: "svc-duo-honey.jpg",
    serviceIds: ["duo-honey"],
  },
];

// ==== Helpers =============================================================

const SEED_DIR = path.resolve(process.cwd(), "public", "uploads", "seed");

function publicUrl(p: Photo): string {
  return `/uploads/seed/${p.filename}`;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.size > 1000; // tiny files = failed download
  } catch {
    return false;
  }
}

async function tryFetch(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "RIVA-spa-seed/1.0" } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    return buf;
  } catch {
    return null;
  }
}

async function downloadOne(p: Photo): Promise<"downloaded" | "cached" | "failed"> {
  const dest = path.join(SEED_DIR, p.filename);
  if (await fileExists(dest)) return "cached";

  // Try each candidate URL in order; first one that returns a real image wins.
  // No random-photo fallback — random pictures (e.g. fitness gym instead of pool)
  // make the site look broken. If every candidate fails, leave the slot empty
  // and the existing SVG / category gradient kicks in. The owner can always
  // upload a real photo via /admin/settings, /admin/gallery, or /admin/services.
  for (let i = 0; i < p.urls.length; i++) {
    const buf = await tryFetch(p.urls[i]);
    if (!buf) continue;
    await fs.writeFile(dest, buf);
    const tag = i === 0 ? "" : ` (fallback #${i + 1})`;
    console.log(`  ✓ ${p.filename} (${(buf.length / 1024).toFixed(0)} KB)${tag}`);
    return "downloaded";
  }

  console.warn(
    `  ✗ ${p.key}: all ${p.urls.length} candidate URLs failed — upload via admin instead`,
  );
  return "failed";
}

// ==== Main ================================================================

async function main() {
  const clear = process.argv.includes("--clear");

  if (clear) {
    console.log("🧹 Clearing seeded photos and DB rows…");
    try {
      await fs.rm(SEED_DIR, { recursive: true, force: true });
    } catch {}
    // Reset hero
    const settings = await prisma.siteSettings.findFirst();
    if (settings?.heroImageUrl?.startsWith("/uploads/seed/")) {
      await prisma.siteSettings.update({ where: { id: settings.id }, data: { heroImageUrl: "" } });
    }
    // Remove gallery rows whose URL points at the seed dir
    const removed = await prisma.galleryImage.deleteMany({
      where: { imageUrl: { startsWith: "/uploads/seed/" } },
    });
    console.log(`  removed ${removed.count} gallery rows`);
    // Clear service.imageUrl that points at seed dir
    await prisma.service.updateMany({
      where: { imageUrl: { startsWith: "/uploads/seed/" } },
      data: { imageUrl: null },
    });
    console.log("  done.");
    return;
  }

  console.log(`📥 Downloading ${PHOTOS.length} photos to ${SEED_DIR}…`);
  await fs.mkdir(SEED_DIR, { recursive: true });

  const results = await Promise.all(PHOTOS.map(downloadOne));
  const downloaded = results.filter((r) => r === "downloaded").length;
  const cached = results.filter((r) => r === "cached").length;
  const failed = results.filter((r) => r === "failed").length;
  console.log(`   ${downloaded} downloaded, ${cached} cached, ${failed} failed`);

  if (failed > 0) {
    console.warn("\n⚠ Some photos failed to download. Re-run the script to retry.");
    console.warn("  If the failures persist, check your internet connection or replace the URLs.\n");
  }

  // Build a quick "which photos are usable" set so we don't write broken URLs to DB.
  const usable = new Set<string>();
  for (let i = 0; i < PHOTOS.length; i++) {
    if (results[i] === "downloaded" || results[i] === "cached") {
      usable.add(PHOTOS[i].key);
    }
  }

  // ---- HERO ----
  const hero = PHOTOS.find((p) => p.isHero && usable.has(p.key));
  if (hero) {
    const settings = await prisma.siteSettings.findFirst();
    const heroUrl = publicUrl(hero);
    if (settings) {
      await prisma.siteSettings.update({
        where: { id: settings.id },
        data: { heroImageUrl: heroUrl },
      });
    } else {
      await prisma.siteSettings.create({ data: { heroImageUrl: heroUrl } });
    }
    console.log(`🏞  Hero set: ${heroUrl}`);
  }

  // ---- GALLERY ----
  // Wipe previous seed gallery, re-create from scratch.
  await prisma.galleryImage.deleteMany({ where: { imageUrl: { startsWith: "/uploads/seed/" } } });
  let galleryCount = 0;
  for (const p of PHOTOS) {
    if (!p.gallery || !usable.has(p.key)) continue;
    await prisma.galleryImage.create({
      data: {
        title: p.gallery.title,
        subtitle: p.gallery.subtitle ?? null,
        imageUrl: publicUrl(p),
        sortOrder: p.gallery.sortOrder,
        active: true,
      },
    });
    galleryCount++;
  }
  console.log(`🖼  Gallery: ${galleryCount} rows`);

  // ---- SERVICES ----
  let serviceCount = 0;
  for (const p of PHOTOS) {
    if (!usable.has(p.key)) continue;
    if (p.serviceIds?.length) {
      const r = await prisma.service.updateMany({
        where: { id: { in: p.serviceIds } },
        data: { imageUrl: publicUrl(p) },
      });
      serviceCount += r.count;
    }
  }
  console.log(`✨ Services updated: ${serviceCount}`);

  console.log("\n✅ Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
