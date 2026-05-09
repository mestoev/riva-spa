import Link from "next/link";
import { prisma } from "@/lib/db";
import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

const RU_MONTHS = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря",
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  // Mon-first weekday: 0=Mon..6=Sun
  const js = x.getUTCDay();
  const mon = js === 0 ? 6 : js - 1;
  x.setUTCDate(x.getUTCDate() - mon);
  return x;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: { week?: string; master?: string };
}) {
  // Anchor date — what week to show
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const anchor =
    searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week)
      ? new Date(`${searchParams.week}T00:00:00.000Z`)
      : today;
  const weekStart = startOfWeek(anchor);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const masterFilter = searchParams.master ?? "all";
  const where: Record<string, unknown> = {
    slot: { date: { gte: weekStart, lte: weekEnd } },
    status: { in: ["pending", "confirmed", "completed"] },
  };
  if (masterFilter !== "all") where.masterId = masterFilter;

  const [bookings, masters] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { service: true, master: true, customer: true, slot: true },
      orderBy: [{ slot: { date: "asc" } }, { slot: { time: "asc" } }],
    }),
    prisma.master.findMany({
      where: { active: true, id: { not: "any" } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const days: { date: Date; iso: string; label: string; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    days.push({
      date: d,
      iso: isoDate(d),
      label: `${["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][i]} ${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()].slice(0, 3)}`,
      isToday: isoDate(d) === isoDate(today),
    });
  }

  const prevWeek = new Date(weekStart);
  prevWeek.setUTCDate(weekStart.getUTCDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setUTCDate(weekStart.getUTCDate() + 7);

  const buildHref = (week: Date, m?: string) => {
    const params = new URLSearchParams();
    params.set("week", isoDate(week));
    const mFilter = m ?? masterFilter;
    if (mFilter !== "all") params.set("master", mFilter);
    return `/admin/calendar?${params.toString()}`;
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5 sm:mb-6">
        <div>
          <div className="eyebrow">Календарь</div>
          <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 m-0">
            Неделя
          </h1>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Link
          href={buildHref(prevWeek)}
          className="btn btn-ghost !py-2 !px-3 !text-[13px]"
        >
          ← Назад
        </Link>
        <div className="text-[13px] text-ink-soft text-center">
          {days[0].date.getUTCDate()} {RU_MONTHS[days[0].date.getUTCMonth()]} —{" "}
          {days[6].date.getUTCDate()} {RU_MONTHS[days[6].date.getUTCMonth()]}
        </div>
        <Link
          href={buildHref(nextWeek)}
          className="btn btn-ghost !py-2 !px-3 !text-[13px]"
        >
          Вперёд →
        </Link>
      </div>

      {/* Master filter */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max sm:flex-wrap sm:min-w-0 text-[12px] sm:text-[13px]">
          <span className="text-ink-mute shrink-0">Мастер:</span>
          <Link
            href={buildHref(weekStart, "all")}
            className={`shrink-0 px-3 py-1.5 rounded-full border ${
              masterFilter === "all"
                ? "bg-ink text-bg-0 border-ink"
                : "bg-bg-0 text-ink-soft border-line"
            }`}
          >
            Все
          </Link>
          {masters.map((m) => (
            <Link
              key={m.id}
              href={buildHref(weekStart, m.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full border ${
                masterFilter === m.id
                  ? "bg-ink text-bg-0 border-ink"
                  : "bg-bg-0 text-ink-soft border-line"
              }`}
            >
              {m.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      </div>

      <CalendarView
        days={days}
        bookings={bookings.map((b) => ({
          id: b.id,
          status: b.status,
          dateIso: isoDate(b.slot.date),
          time: b.slot.time,
          serviceName: b.service.name,
          duration: b.service.duration,
          masterName: b.master.name,
          customerName: b.customer.name,
          customerPhone: b.customer.phone,
          price: b.priceSnapshot - b.discount,
        }))}
      />
    </div>
  );
}
