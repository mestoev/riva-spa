"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const settingsSchema = z.object({
  name: z.string().min(1).max(100),
  tagline: z.string().min(1).max(200),
  city: z.string().min(1).max(80),
  addressLine: z.string().min(1).max(200),
  phone: z.string().min(3).max(40),
  phoneRaw: z.string().min(3).max(40),
  email: z.string().email().max(120),
  instagram: z.string().max(80).default(""),
  telegramBotUrl: z.string().url().or(z.literal("")).default(""),
  hoursMonThu: z.string().min(1).max(60),
  hoursFriSun: z.string().min(1).max(60),
  metaTitle: z.string().min(1).max(200),
  metaDescription: z.string().min(1).max(400),
});

export type SettingsState = { ok: true } | { ok: false; error: string } | null;

export async function saveSettings(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const obj: Record<string, string> = {};
  for (const k of [
    "name", "tagline", "city", "addressLine", "phone", "phoneRaw", "email",
    "instagram", "telegramBotUrl", "hoursMonThu", "hoursFriSun",
    "metaTitle", "metaDescription",
  ]) {
    obj[k] = String(fd.get(k) ?? "").trim();
  }
  const parsed = settingsSchema.safeParse(obj);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  const existing = await prisma.siteSettings.findFirst();
  if (existing) {
    await prisma.siteSettings.update({ where: { id: existing.id }, data: parsed.data });
  } else {
    await prisma.siteSettings.create({ data: parsed.data });
  }
  // Revalidate everything that uses these fields
  revalidatePath("/", "layout");
  return { ok: true };
}
