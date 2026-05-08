"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { MASTER_COOKIE, getMasterFromCookie } from "@/lib/master-auth";

async function requireMaster() {
  const m = await getMasterFromCookie(cookies().get(MASTER_COOKIE)?.value);
  if (!m) throw new Error("Unauthorized");
  return m;
}

/** Toggle a single time-slot blackout (called by per-slot form). */
export async function toggleSlotBlackout(formData: FormData) {
  const me = await requireMaster();
  const dateIso = String(formData.get("dateIso") ?? "");
  const time = String(formData.get("time") ?? "");
  const blackoutId = String(formData.get("blackoutId") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !/^\d{2}:\d{2}$/.test(time)) return;

  const date = new Date(`${dateIso}T00:00:00.000Z`);
  if (blackoutId) {
    // Currently blocked → unblock
    const id = Number(blackoutId);
    if (!Number.isFinite(id)) return;
    const bo = await prisma.masterBlackout.findUnique({ where: { id } });
    if (bo && bo.masterId === me.id) {
      await prisma.masterBlackout.delete({ where: { id } });
    }
  } else {
    // Currently free → block
    await prisma.masterBlackout.upsert({
      where: { masterId_date_time: { masterId: me.id, date, time } },
      create: { masterId: me.id, date, time },
      update: {},
    });
  }
  revalidatePath("/master/schedule");
  revalidatePath("/booking");
}

/** Toggle the "whole day off" state for a date. */
export async function toggleFullDayOff(formData: FormData) {
  const me = await requireMaster();
  const dateIso = String(formData.get("dateIso") ?? "");
  const fullDayOffId = String(formData.get("fullDayOffId") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return;

  const date = new Date(`${dateIso}T00:00:00.000Z`);
  if (fullDayOffId) {
    const id = Number(fullDayOffId);
    if (!Number.isFinite(id)) return;
    const bo = await prisma.masterBlackout.findUnique({ where: { id } });
    if (bo && bo.masterId === me.id) {
      await prisma.masterBlackout.delete({ where: { id } });
    }
  } else {
    // Mark whole day off, and remove any per-slot blackouts on that date.
    // Prisma's composite unique key doesn't accept `null` in where, so use findFirst + create.
    const existing = await prisma.masterBlackout.findFirst({
      where: { masterId: me.id, date, time: null },
    });
    if (!existing) {
      await prisma.masterBlackout.create({
        data: { masterId: me.id, date, time: null },
      });
    }
    await prisma.masterBlackout.deleteMany({
      where: { masterId: me.id, date, time: { not: null } },
    });
  }
  revalidatePath("/master/schedule");
  revalidatePath("/booking");
}
