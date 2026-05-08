// Booking status transitions — shared between admin web and admin Telegram bot.
// Centralizing here keeps the two paths in sync (audit log, notifications, loyalty).
import { prisma } from "./db";
import { notifyCustomer, htmlEscape } from "./telegram";
import { awardPointsForBooking } from "./loyalty";

export type StatusTransition = "confirmed" | "cancelled" | "completed" | "no_show";

const RU_MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
function fmtDay(d: Date): string {
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]}`;
}

export async function transitionBooking(
  bookingId: string,
  status: StatusTransition,
  actor: string,
): Promise<{ awardedPoints?: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: bookingId },
      data: { status },
      include: { service: true, master: true, customer: true, slot: true },
    });
    await tx.adminEvent.create({
      data: { bookingId: b.id, actor, action: status },
    });
    return b;
  });

  // Loyalty: award points on completed
  let awardedPoints: number | undefined;
  if (status === "completed") {
    const award = await awardPointsForBooking(
      result.customerId,
      result.id,
      result.priceSnapshot,
    );
    if (award && award.awarded > 0) awardedPoints = award.awarded;
  }

  // Notify the customer via Telegram if they have a TG link
  if (result.customer.telegramId) {
    let body: string | null = null;
    if (status === "confirmed") {
      body = [
        `✅ <b>Запись подтверждена</b>`,
        ``,
        `${htmlEscape(result.service.name)}`,
        `${fmtDay(result.slot.date)}, ${result.slot.time}`,
        ``,
        `Ждём вас!`,
      ].join("\n");
    } else if (status === "cancelled") {
      body = [
        `❌ <b>Запись отменена</b>`,
        ``,
        `${htmlEscape(result.service.name)}`,
        `${fmtDay(result.slot.date)}, ${result.slot.time}`,
        ``,
        `Если это ошибка — позвоните нам.`,
      ].join("\n");
    }
    if (body) {
      await notifyCustomer(result.customer.telegramId, body);
    }
  }

  return { awardedPoints };
}
