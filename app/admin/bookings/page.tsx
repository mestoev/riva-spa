import Link from "next/link";
import { prisma } from "@/lib/db";
import { BookingsTable, type BookingRow } from "./bookings-table";

export const dynamic = "force-dynamic";

const STATUSES = [
  { id: "all", label: "Все" },
  { id: "pending", label: "Ожидают" },
  { id: "confirmed", label: "Подтверждены" },
  { id: "completed", label: "Выполнены" },
  { id: "cancelled", label: "Отменены" },
  { id: "no_show", label: "Не пришли" },
];


export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; master?: string };
}) {
  const status = searchParams.status ?? "all";
  const masterFilter = searchParams.master ?? "all";

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (masterFilter !== "all") where.masterId = masterFilter;

  const [bookings, masters] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { service: true, master: true, customer: true, slot: true },
      orderBy: [{ slot: { date: "desc" } }, { slot: { time: "desc" } }],
      take: 100,
    }),
    prisma.master.findMany({
      where: { active: true, id: { not: "any" } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const buildHref = (s: string, m?: string) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    const mFilter = m ?? masterFilter;
    if (mFilter !== "all") params.set("master", mFilter);
    const q = params.toString();
    return q ? `/admin/bookings?${q}` : "/admin/bookings";
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5 sm:mb-6">
        <div>
          <div className="eyebrow">Журнал</div>
          <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 m-0">
            Заявки
          </h1>
        </div>
        <Link
          href="/admin/bookings/new"
          className="btn btn-primary !py-2.5 !px-4 !text-[13px] sm:!py-3.5 sm:!px-6 sm:!text-[14px]"
        >
          📞 Новая запись
        </Link>
      </div>

      {/* Status filters — horizontal scroll on mobile so they don't break layout */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0">
          {STATUSES.map((s) => {
            const active = status === s.id;
            return (
              <Link
                key={s.id}
                href={buildHref(s.id)}
                className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-[12px] sm:text-[13px] border transition-colors ${
                  active
                    ? "bg-ink text-bg-0 border-ink"
                    : "bg-bg-0 text-ink-soft border-line hover:bg-bg-1"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-5 sm:mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max sm:flex-wrap sm:min-w-0 text-[12px] sm:text-[13px]">
          <span className="text-ink-mute shrink-0">Мастер:</span>
          <Link
            href={buildHref(status, "all")}
            className={`shrink-0 px-3 py-1.5 rounded-full border ${
              masterFilter === "all"
                ? "bg-ink text-bg-0 border-ink"
                : "bg-bg-0 text-ink-soft border-line hover:bg-bg-1"
            }`}
          >
            Все
          </Link>
          {masters.map((m) => {
            const active = masterFilter === m.id;
            return (
              <Link
                key={m.id}
                href={buildHref(status, m.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full border ${
                  active
                    ? "bg-ink text-bg-0 border-ink"
                    : "bg-bg-0 text-ink-soft border-line hover:bg-bg-1"
                }`}
              >
                {m.name.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </div>

      <BookingsTable
        bookings={bookings.map<BookingRow>((b) => ({
          id: b.id,
          status: b.status,
          source: b.source,
          priceSnapshot: b.priceSnapshot,
          service: { name: b.service.name, duration: b.service.duration },
          master: { name: b.master.name },
          customer: {
            name: b.customer.name,
            phone: b.customer.phone,
            telegramUsername: b.customer.telegramUsername,
          },
          slot: { date: b.slot.date.toISOString(), time: b.slot.time },
        }))}
      />
    </div>
  );
}
