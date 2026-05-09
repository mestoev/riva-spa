"use server";

/**
 * Server action — submit a booking from the website.
 * Flow:
 *   1. Validate input (zod).
 *   2. Find / create the Customer by phone.
 *   3. Lock the Slot (atomic — no double-booking).
 *   4. Create Booking with status=pending, snapshot price.
 *   5. Notify admins via Telegram (async — failure here doesn't roll back DB).
 *   6. Return { ok, bookingId } to client.
 */
import { prisma } from "@/lib/db";
import { bookingSubmitSchema, type BookingSubmitInput } from "@/lib/validators";
import { htmlEscape, notifyAdmins } from "@/lib/telegram";
import { rateLimit } from "@/lib/ratelimit";
import { validatePromo, consumePromo } from "@/lib/promo";
import type { BookingSource } from "@prisma/client";

export type BookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string; field?: string };

export async function submitBooking(
  input: BookingSubmitInput,
  source: BookingSource = "website",
): Promise<BookingResult> {
  const parsed = bookingSubmitSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Некорректные данные",
      field: first?.path.join(".") ?? undefined,
    };
  }
  const data = parsed.data;

  // Rate-limit by phone — 5 booking attempts per hour from one phone
  const rl = rateLimit(`booking:${data.contact.phone}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return {
      ok: false,
      error: "Слишком много попыток. Попробуйте через час или позвоните нам.",
    };
  }

  // Pull service to snapshot price + verify it exists / is active
  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) {
    return { ok: false, error: "Услуга недоступна", field: "serviceId" };
  }

  const master = await prisma.master.findUnique({ where: { id: data.masterId } });
  if (!master || !master.active) {
    return { ok: false, error: "Мастер недоступен", field: "masterId" };
  }

  // Validate promo (if provided) BEFORE transaction so we know the discount.
  let discount = 0;
  let promoCodeStr: string | null = null;
  let promoId: number | null = null;
  if (data.promoCode && data.promoCode.trim()) {
    const r = await validatePromo(data.promoCode, service.price);
    if (!r.ok) return { ok: false, error: r.error, field: "promoCode" };
    discount = r.discount;
    promoCodeStr = r.code;
    promoId = r.promoId;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find or create the slot. masterId is part of the unique key so we
      // can have separate slots per master, plus a "shared" slot when
      // master is "any".
      const slotDate = new Date(`${data.date}T00:00:00.000Z`);
      const slot = await tx.slot.upsert({
        where: {
          date_time_masterId: {
            date: slotDate,
            time: data.time,
            masterId: data.masterId,
          },
        },
        create: {
          date: slotDate,
          time: data.time,
          masterId: data.masterId,
        },
        update: {},
      });

      if (slot.blocked) {
        throw new Error("SLOT_BLOCKED");
      }

      // Find existing booking on this slot (unique constraint)
      const existing = await tx.booking.findUnique({ where: { slotId: slot.id } });
      if (existing) {
        throw new Error("SLOT_TAKEN");
      }

      // Honor master's own blackouts
      const dayOff = await tx.masterBlackout.findFirst({
        where: {
          masterId: master.id,
          date: slotDate,
          OR: [{ time: null }, { time: data.time }],
        },
      });
      if (dayOff) {
        throw new Error("MASTER_OFF");
      }

      // Find / create customer by phone
      const customer = await tx.customer.upsert({
        where: { phone: data.contact.phone },
        create: {
          phone: data.contact.phone,
          name: data.contact.name,
        },
        update: {
          // Update name if changed (latest wins)
          name: data.contact.name,
        },
      });

      const booking = await tx.booking.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          masterId: master.id,
          slotId: slot.id,
          status: "pending",
          source,
          notes: data.contact.notes || null,
          notify: data.contact.notify,
          priceSnapshot: service.price,
          promoCode: promoCodeStr,
          discount,
        },
      });

      if (promoId) await consumePromo(tx, promoId);

      await tx.adminEvent.create({
        data: {
          bookingId: booking.id,
          actor: "system",
          action: "created",
          payload: { source, promoCode: promoCodeStr, discount },
        },
      });

      return { booking, customer };
    });

    // Fire-and-forget admin notification — don't block the response.
    // bookingId attaches inline confirm/cancel buttons.
    const finalTotal = service.price - discount;
    void notifyAdmins(
      [
        `🆕 <b>Новая запись</b>`,
        ``,
        `<b>Услуга:</b> ${htmlEscape(service.name)} · ${service.price.toLocaleString("ru-RU")} ₸`,
        promoCodeStr
          ? `<b>Промокод:</b> ${htmlEscape(promoCodeStr)} · −${discount.toLocaleString("ru-RU")} ₸ → итого ${finalTotal.toLocaleString("ru-RU")} ₸`
          : ``,
        `<b>Мастер:</b> ${htmlEscape(master.name)}`,
        `<b>Когда:</b> ${data.date} ${data.time}`,
        ``,
        `<b>Клиент:</b> ${htmlEscape(result.customer.name)}`,
        `<b>Телефон:</b> ${htmlEscape(result.customer.phone)}`,
        data.contact.notes
          ? `<b>Пожелания:</b> ${htmlEscape(data.contact.notes)}`
          : ``,
        ``,
        `ID: <code>${result.booking.id}</code>`,
      ]
        .filter(Boolean)
        .join("\n"),
      { bookingId: result.booking.id },
    );

    return { ok: true, bookingId: result.booking.id };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "SLOT_TAKEN" || err.message === "SLOT_BLOCKED") {
        return {
          ok: false,
          error: "Это время уже занято. Выберите другое.",
          field: "time",
        };
      }
      if (err.message === "MASTER_OFF") {
        return {
          ok: false,
          error: "Мастер не работает в это время. Выберите другое.",
          field: "time",
        };
      }
    }
    console.error("[submitBooking] unexpected error:", err);
    return { ok: false, error: "Ошибка сервера. Попробуйте ещё раз." };
  }
}
