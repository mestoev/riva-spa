// Loyalty / bonus points module.
// Single source of truth — used by:
//   - admin TG bot (when marking a booking as completed)
//   - client TG bot (showing balance in /me)
//   - web admin (future)
import { prisma } from "./db";

export type LoyaltySettings = {
  id: number;
  enabled: boolean;
  earnPercent: number;
  redeemMaxPct: number;
  perPointKzt: number;
};

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const existing = await prisma.loyaltySettings.findFirst();
  if (existing) return existing;
  return prisma.loyaltySettings.create({ data: {} });
}

/** Award points for a completed booking. Idempotent per (customerId, bookingId, reason="earned"). */
export async function awardPointsForBooking(
  customerId: string,
  bookingId: string,
  totalKzt: number,
): Promise<{ awarded: number; total: number } | null> {
  const settings = await getLoyaltySettings();
  if (!settings.enabled) return null;

  // Avoid double-awarding if marked completed twice
  const existing = await prisma.bonusTransaction.findFirst({
    where: { customerId, bookingId, reason: "earned" },
  });
  if (existing) {
    const total = await getBalance(customerId);
    return { awarded: 0, total };
  }

  const points = Math.floor((totalKzt * settings.earnPercent) / 100 / settings.perPointKzt);
  if (points <= 0) return null;

  await prisma.$transaction([
    prisma.bonusTransaction.create({
      data: {
        customerId,
        bookingId,
        points,
        reason: "earned",
        note: `${settings.earnPercent}% от ${totalKzt.toLocaleString("ru-RU")} ₸`,
      },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { bonusPoints: { increment: points } },
    }),
  ]);

  const total = await getBalance(customerId);
  return { awarded: points, total };
}

export async function adjustPoints(
  customerId: string,
  delta: number,
  reason: "adjustment" | "redeemed" | "expired",
  note?: string,
): Promise<number> {
  await prisma.$transaction([
    prisma.bonusTransaction.create({
      data: { customerId, points: delta, reason, note: note ?? null },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { bonusPoints: { increment: delta } },
    }),
  ]);
  return getBalance(customerId);
}

export async function getBalance(customerId: string): Promise<number> {
  const c = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { bonusPoints: true },
  });
  return c?.bonusPoints ?? 0;
}

export type CustomerStats = {
  visits: number;
  totalSpent: number;
  bonusPoints: number;
  lastVisit: Date | null;
};

export async function getCustomerStats(customerId: string): Promise<CustomerStats> {
  const completed = await prisma.booking.findMany({
    where: { customerId, status: "completed" },
    select: { priceSnapshot: true, slot: { select: { date: true } } },
    orderBy: { slot: { date: "desc" } },
  });
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { bonusPoints: true },
  });
  return {
    visits: completed.length,
    totalSpent: completed.reduce((s, b) => s + b.priceSnapshot, 0),
    bonusPoints: customer?.bonusPoints ?? 0,
    lastVisit: completed[0]?.slot.date ?? null,
  };
}
