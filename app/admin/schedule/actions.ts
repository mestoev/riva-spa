"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

function parseSlotTimes(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => /^\d{1,2}:\d{2}$/.test(s))
    .map((s) => {
      const [h, m] = s.split(":").map(Number);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    });
}

export async function saveWorkingHours(weekday: number, raw: string) {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
  const slots = parseSlotTimes(raw);
  await prisma.workingHours.upsert({
    where: { weekday },
    create: { weekday, slotTimes: slots },
    update: { slotTimes: slots },
  });
  revalidatePath("/admin/schedule");
  revalidatePath("/booking");
}

export async function setDayClosed(weekday: number) {
  await prisma.workingHours.upsert({
    where: { weekday },
    create: { weekday, slotTimes: [] },
    update: { slotTimes: [] },
  });
  revalidatePath("/admin/schedule");
  revalidatePath("/booking");
}

export async function addException(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const dateStr = String(formData.get("date") ?? "").trim();
  const slotsRaw = String(formData.get("slots") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ok: false, error: "Дата в формате YYYY-MM-DD" };
  }
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const slots = parseSlotTimes(slotsRaw);
  await prisma.scheduleException.upsert({
    where: { date },
    create: { date, slotTimes: slots, reason },
    update: { slotTimes: slots, reason },
  });
  revalidatePath("/admin/schedule");
  revalidatePath("/booking");
  return { ok: true };
}

export async function deleteException(id: number) {
  await prisma.scheduleException.delete({ where: { id } });
  revalidatePath("/admin/schedule");
  revalidatePath("/booking");
}
