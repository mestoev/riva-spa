// Financial analytics — revenue, expenses, profit, master commissions.
// Used by /admin/analytics. Single source of truth for money numbers.
import { prisma } from "./db";

export type DayPoint = { date: string; value: number };

export type FinanceSummary = {
  revenue: number;        // sum of priceSnapshot - discount on completed bookings
  bookings: number;       // count of completed bookings
  averageCheck: number;   // revenue / bookings (or 0)
  expenses: number;       // sum of expenses in period
  commissions: number;    // sum of master commissions for completed
  profit: number;         // revenue - expenses - commissions
};

export type MasterCommission = {
  masterId: string;
  masterName: string;
  bookings: number;
  revenue: number;
  commissionPercent: number;
  commission: number;
};

function dateOnly(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Day-by-day revenue (completed bookings only) within [from, to] inclusive. */
export async function revenueByDay(from: Date, to: Date): Promise<DayPoint[]> {
  const fromD = dateOnly(from);
  const toD = dateOnly(to);
  toD.setUTCHours(23, 59, 59, 999);

  // We attribute revenue to the day the booking moved to "completed".
  // updatedAt is the closest signal we have without a "completedAt" column.
  const rows = await prisma.booking.findMany({
    where: {
      status: "completed",
      updatedAt: { gte: fromD, lte: toD },
    },
    select: { updatedAt: true, priceSnapshot: true, discount: true },
  });

  const map = new Map<string, number>();
  // Pre-fill all days with 0 so the chart has a continuous x-axis
  for (
    const d = new Date(fromD);
    d <= toD;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    map.set(toIso(d), 0);
  }
  for (const r of rows) {
    const key = toIso(r.updatedAt);
    map.set(key, (map.get(key) ?? 0) + (r.priceSnapshot - r.discount));
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export async function expensesByDay(from: Date, to: Date): Promise<DayPoint[]> {
  const fromD = dateOnly(from);
  const toD = dateOnly(to);
  toD.setUTCHours(23, 59, 59, 999);

  const rows = await prisma.expense.findMany({
    where: { date: { gte: fromD, lte: toD } },
    select: { date: true, amount: true },
  });

  const map = new Map<string, number>();
  for (const d = new Date(fromD); d <= toD; d.setUTCDate(d.getUTCDate() + 1)) {
    map.set(toIso(d), 0);
  }
  for (const r of rows) {
    const key = toIso(r.date);
    map.set(key, (map.get(key) ?? 0) + r.amount);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export async function commissionsForPeriod(from: Date, to: Date): Promise<MasterCommission[]> {
  const fromD = dateOnly(from);
  const toD = dateOnly(to);
  toD.setUTCHours(23, 59, 59, 999);

  const masters = await prisma.master.findMany({
    where: { id: { not: "any" } },
    orderBy: { sortOrder: "asc" },
  });

  const result: MasterCommission[] = [];
  for (const m of masters) {
    const bookings = await prisma.booking.findMany({
      where: {
        masterId: m.id,
        status: "completed",
        updatedAt: { gte: fromD, lte: toD },
      },
      select: { priceSnapshot: true, discount: true },
    });
    if (bookings.length === 0 && m.commissionPercent === 0) continue;
    const revenue = bookings.reduce((s, b) => s + (b.priceSnapshot - b.discount), 0);
    const commission = Math.floor((revenue * m.commissionPercent) / 100);
    result.push({
      masterId: m.id,
      masterName: m.name,
      bookings: bookings.length,
      revenue,
      commissionPercent: m.commissionPercent,
      commission,
    });
  }
  return result.sort((a, b) => b.revenue - a.revenue);
}

export async function summarize(from: Date, to: Date): Promise<FinanceSummary> {
  const [revPoints, expPoints, commissions] = await Promise.all([
    revenueByDay(from, to),
    expensesByDay(from, to),
    commissionsForPeriod(from, to),
  ]);
  const revenue = revPoints.reduce((s, p) => s + p.value, 0);
  const expenses = expPoints.reduce((s, p) => s + p.value, 0);
  const totalCommission = commissions.reduce((s, c) => s + c.commission, 0);
  const bookings = commissions.reduce((s, c) => s + c.bookings, 0);
  return {
    revenue,
    bookings,
    averageCheck: bookings > 0 ? Math.round(revenue / bookings) : 0,
    expenses,
    commissions: totalCommission,
    profit: revenue - expenses - totalCommission,
  };
}

/** Compare two periods of equal length. */
export async function comparePeriods(
  currentFrom: Date,
  currentTo: Date,
): Promise<{ current: FinanceSummary; previous: FinanceSummary; deltaPct: { revenue: number; profit: number } }> {
  const periodLen = currentTo.getTime() - currentFrom.getTime();
  const previousFrom = new Date(currentFrom.getTime() - periodLen - 1);
  const previousTo = new Date(currentFrom.getTime() - 1);

  const [current, previous] = await Promise.all([
    summarize(currentFrom, currentTo),
    summarize(previousFrom, previousTo),
  ]);

  const pct = (cur: number, prev: number): number => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };
  return {
    current,
    previous,
    deltaPct: {
      revenue: pct(current.revenue, previous.revenue),
      profit: pct(current.profit, previous.profit),
    },
  };
}
