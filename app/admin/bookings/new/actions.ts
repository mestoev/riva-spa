"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { htmlEscape, notifyAdmins } from "@/lib/telegram";

const adminBookingSchema = z.object({
  serviceId: z.string().min(1),
  masterId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(7).max(32),
  notes: z.string().max(1000).optional().default(""),
  source: z.enum(["phone", "walkin"]).default("phone"),
  // If true, immediately confirmed instead of pending
  autoConfirm: z.coerce.boolean().default(true),
});

export type AdminBookingState =
  | { ok: true; bookingId: string }
  | { ok: false; error: string }
  | null;

export async function createAdminBooking(
  _prev: AdminBookingState,
  fd: FormData,
): Promise<AdminBookingState> {
  const obj = {
    serviceId: String(fd.get("serviceId") ?? ""),
    masterId: String(fd.get("masterId") ?? ""),
    date: String(fd.get("date") ?? ""),
    time: String(fd.get("time") ?? ""),
    customerName: String(fd.get("customerName") ?? "").trim(),
    customerPhone: String(fd.get("customerPhone") ?? "").trim(),
    notes: String(fd.get("notes") ?? "").trim(),
    source: String(fd.get("source") ?? "phone"),
    autoConfirm: fd.get("autoConfirm") === "on",
  };
  const parsed = adminBookingSchema.safeParse(obj);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  const data = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) {
    return { ok: false, error: "Услуга не найдена" };
  }
  const master = await prisma.master.findUnique({ where: { id: data.masterId } });
  if (!master || !master.active) {
    return { ok: false, error: "Мастер не найден" };
  }

  let bookingId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const slotDate = new Date(`${data.date}T00:00:00.000Z`);
      const slot = await tx.slot.upsert({
        where: { date_time_masterId: { date: slotDate, time: data.time, masterId: data.masterId } },
        create: { date: slotDate, time: data.time, masterId: data.masterId },
        update: {},
      });
      if (slot.blocked) throw new Error("SLOT_BLOCKED");
      const existing = await tx.booking.findUnique({ where: { slotId: slot.id } });
      if (existing) throw new Error("SLOT_TAKEN");

      const customer = await tx.customer.upsert({
        where: { phone: data.customerPhone },
        create: { phone: data.customerPhone, name: data.customerName },
        update: { name: data.customerName },
      });

      const booking = await tx.booking.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          masterId: master.id,
          slotId: slot.id,
          status: data.autoConfirm ? "confirmed" : "pending",
          source: data.source,
          notes: data.notes || null,
          notify: "call",
          priceSnapshot: service.price,
        },
      });
      await tx.adminEvent.create({
        data: {
          bookingId: booking.id,
          actor: "web:admin",
          action: data.autoConfirm ? "confirmed" : "created",
          payload: { source: data.source, manual: true },
        },
      });
      return booking;
    });
    bookingId = result.id;
  } catch (err) {
    if (err instanceof Error && (err.message === "SLOT_TAKEN" || err.message === "SLOT_BLOCKED")) {
      return { ok: false, error: "Это время уже занято" };
    }
    console.error("[createAdminBooking] failed:", err);
    return { ok: false, error: "Ошибка сервера" };
  }

  // Heads-up to other admins (not the creator) — they see new entry too
  void notifyAdmins(
    [
      `📞 <b>Запись по телефону</b>`,
      ``,
      `<b>Услуга:</b> ${htmlEscape(service.name)} · ${service.price.toLocaleString("ru-RU")} ₸`,
      `<b>Мастер:</b> ${htmlEscape(master.name)}`,
      `<b>Когда:</b> ${data.date} ${data.time}`,
      ``,
      `<b>Клиент:</b> ${htmlEscape(data.customerName)}`,
      `<b>Телефон:</b> ${htmlEscape(data.customerPhone)}`,
      data.notes ? `<b>Заметка:</b> ${htmlEscape(data.notes)}` : ``,
      ``,
      `Создал администратор · ID: <code>${bookingId}</code>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  redirect("/admin/bookings");
}

/** Lightweight client lookup (used by phone-autocomplete in the admin form). */
export async function searchCustomers(query: string) {
  const q = query.trim();
  if (q.length < 3) return [];
  return prisma.customer.findMany({
    where: {
      OR: [
        { phone: { contains: q } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, name: true, phone: true, bonusPoints: true },
  });
}
