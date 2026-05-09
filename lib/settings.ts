// Single source of truth for site contacts + meta.
// Used by sidebar/footer/contact page/layout metadata + Telegram bots.
import { prisma } from "./db";

export type FAQItem = { q: string; a: string };

export type SiteSettings = {
  id: number;
  name: string;
  tagline: string;
  city: string;
  addressLine: string;
  /** "ул. Загородная 17, Актобе" */
  address: string;
  phone: string;
  phoneRaw: string;
  email: string;
  instagram: string;
  telegramBotUrl: string;
  hoursMonThu: string;
  hoursFriSun: string;
  metaTitle: string;
  metaDescription: string;
  mapEmbedUrl: string;
  faq: FAQItem[];
};

/**
 * Returns site settings, creating the default row if missing.
 * Wraps the raw DB row to expose a derived `address` field.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  let row = await prisma.siteSettings.findFirst();
  if (!row) {
    row = await prisma.siteSettings.create({ data: {} });
  }
  let faq: FAQItem[] = [];
  try {
    const parsed = JSON.parse(row.faqJson || "[]");
    if (Array.isArray(parsed)) {
      faq = parsed
        .filter((x): x is FAQItem => x && typeof x.q === "string" && typeof x.a === "string")
        .slice(0, 30);
    }
  } catch {
    /* ignore */
  }
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    city: row.city,
    addressLine: row.addressLine,
    address: `${row.addressLine}, ${row.city}`,
    phone: row.phone,
    phoneRaw: row.phoneRaw,
    email: row.email,
    instagram: row.instagram,
    telegramBotUrl: row.telegramBotUrl,
    hoursMonThu: row.hoursMonThu,
    hoursFriSun: row.hoursFriSun,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    mapEmbedUrl: row.mapEmbedUrl ?? "",
    faq,
  };
}
