// Statistics — re-exported helper used by both the Telegram admin bot and the web dashboard.
// Single source of truth so the numbers always match.
import { prisma } from "./db";

export type Period = "today" | "week" | "month" | "all";

export type Stats = {
  period: Period;
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    noShow: number;
  };
  revenue: {
    confirmed: number;
    completed: number;
  };
  bySource: { website: number; telegram: number; phone: number; walkin: number };
  topServices: { id: string; name: string; count: number; revenue: number }[];
  topMasters: { id: string; name: string; count: number; revenue: number }[];
};

function periodRange(p: Period): { from: Date; to: Date } | null {
  const now = new Date();
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  if (p === "today") {
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    return { from, to };
  }
  if (p === "week") {
    const from = new Date(now);
    from.setUTCDate(now.getUTCDate() - 6);
    from.setUTCHours(0, 0, 0, 0);
    return { from, to };
  }
  if (p === "month") {
    const from = new Date(now);
    from.setUTCDate(now.getUTCDate() - 29);
    from.setUTCHours(0, 0, 0, 0);
    return { from, to };
  }
  return null;
}

export async function getStats(p: Period): Promise<Stats> {
  const range = periodRange(p);
  const where = range ? { createdAt: { gte: range.from, lte: range.to } } : {};

  const all = await prisma.booking.findMany({
    where,
    include: { service: true, master: true },
  });

  const counts = {
    total: all.length,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    noShow: 0,
  };
  const revenue = { confirmed: 0, completed: 0 };
  const bySource = { website: 0, telegram: 0, phone: 0, walkin: 0 };
  const services = new Map<string, { name: string; count: number; revenue: number }>();
  const masters = new Map<string, { name: string; count: number; revenue: number }>();

  for (const b of all) {
    if (b.status === "pending") counts.pending += 1;
    else if (b.status === "confirmed") {
      counts.confirmed += 1;
      revenue.confirmed += b.priceSnapshot;
    } else if (b.status === "cancelled") counts.cancelled += 1;
    else if (b.status === "completed") {
      counts.completed += 1;
      revenue.completed += b.priceSnapshot;
      revenue.confirmed += b.priceSnapshot;
    } else if (b.status === "no_show") counts.noShow += 1;

    bySource[b.source as keyof typeof bySource] += 1;

    const svc = services.get(b.serviceId) ?? { name: b.service.name, count: 0, revenue: 0 };
    svc.count += 1;
    if (b.status !== "cancelled") svc.revenue += b.priceSnapshot;
    services.set(b.serviceId, svc);

    const mst = masters.get(b.masterId) ?? { name: b.master.name, count: 0, revenue: 0 };
    mst.count += 1;
    if (b.status !== "cancelled") mst.revenue += b.priceSnapshot;
    masters.set(b.masterId, mst);
  }

  const topServices = Array.from(services.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topMasters = Array.from(masters.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { period: p, bookings: counts, revenue, bySource, topServices, topMasters };
}
