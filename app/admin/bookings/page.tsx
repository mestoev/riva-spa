import Link from "next/link";
import { prisma } from "@/lib/db";
import { BookingActions } from "./booking-actions";

export const dynamic = "force-dynamic";

const STATUSES = [
  { id: "all", label: "Все" },
  { id: "pending", label: "Ожидают" },
  { id: "confirmed", label: "Подтверждены" },
  { id: "completed", label: "Выполнены" },
  { id: "cancelled", label: "Отменены" },
  { id: "no_show", label: "Не пришли" },
];

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-900", label: "ожидает" },
  confirmed: { bg: "bg-green-100", text: "text-green-900", label: "подтверждено" },
  completed: { bg: "bg-blue-100", text: "text-blue-900", label: "выполнено" },
  cancelled: { bg: "bg-red-100", text: "text-red-900", label: "отменено" },
  no_show: { bg: "bg-stone-200", text: "text-stone-700", label: "не пришёл" },
};

const RU_MONTHS = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];
function fmtDay(d: Date): string {
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]}`;
}

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

      {bookings.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          Заявок не найдено.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {bookings.map((b) => {
              const badge = STATUS_BADGE[b.status] ?? {
                bg: "bg-stone-100",
                text: "text-stone-700",
                label: b.status,
              };
              return (
                <div
                  key={b.id}
                  className="bg-bg-0 border border-line rounded-lg p-4"
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="font-mono text-[13px] font-medium">
                      {fmtDay(b.slot.date)} · {b.slot.time}
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-2 font-medium leading-tight">
                    {b.service.name}
                  </div>
                  <div className="text-[12px] text-ink-mute mt-0.5">
                    {b.service.duration} мин · {b.master.name}
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-line-soft">
                    <div className="text-sm">{b.customer.name}</div>
                    <a
                      href={`tel:${b.customer.phone}`}
                      className="text-[12px] text-ink-soft border-b border-ink-soft inline-block"
                    >
                      {b.customer.phone}
                    </a>
                    {b.customer.telegramUsername ? (
                      <span className="text-[11px] text-ink-mute ml-2">
                        @{b.customer.telegramUsername}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-line-soft flex items-center justify-between gap-3">
                    <div className="serif text-[18px]">
                      {b.priceSnapshot.toLocaleString("ru-RU")}
                      <span className="text-[12px] text-ink-mute ml-0.5">₸</span>
                      <span className="text-[10px] font-mono text-ink-mute ml-2 align-middle">
                        {b.source}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <BookingActions id={b.id} status={b.status} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-bg-0 border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-1 text-left font-mono text-[11px] uppercase tracking-wider text-ink-mute">
                  <tr>
                    <th className="px-4 py-3">Когда</th>
                    <th className="px-4 py-3">Услуга</th>
                    <th className="px-4 py-3">Мастер</th>
                    <th className="px-4 py-3">Клиент</th>
                    <th className="px-4 py-3 text-right">Стоимость</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const badge = STATUS_BADGE[b.status] ?? {
                      bg: "bg-stone-100",
                      text: "text-stone-700",
                      label: b.status,
                    };
                    return (
                      <tr key={b.id} className="border-t border-line-soft align-top">
                        <td className="px-4 py-3 font-mono text-[12px]">
                          {fmtDay(b.slot.date)}
                          <br />
                          <span className="text-ink-mute">{b.slot.time}</span>
                        </td>
                        <td className="px-4 py-3">
                          {b.service.name}
                          <div className="text-[11px] text-ink-mute mt-0.5">
                            {b.service.duration} мин
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{b.master.name}</td>
                        <td className="px-4 py-3">
                          <div>{b.customer.name}</div>
                          <div className="text-[12px] text-ink-mute">{b.customer.phone}</div>
                          {b.customer.telegramUsername ? (
                            <div className="text-[11px] text-ink-mute">@{b.customer.telegramUsername}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {b.priceSnapshot.toLocaleString("ru-RU")} ₸
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          <div className="text-[10px] font-mono text-ink-mute mt-1">
                            {b.source}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <BookingActions id={b.id} status={b.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
