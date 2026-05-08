// Admin dashboard — first screen after login.
// Server component: fetches stats directly from DB on every request.
import { getStats } from "@/lib/stats";
import { prisma } from "@/lib/db";
import Link from "next/link";

function fmtPrice(kzt: number): string {
  return `${kzt.toLocaleString("ru-RU")} ₸`;
}

export default async function AdminDashboard() {
  const [today, week, month, pendingCount, todayBookings] = await Promise.all([
    getStats("today"),
    getStats("week"),
    getStats("month"),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.booking.findMany({
      where: {
        status: { in: ["pending", "confirmed"] },
        slot: {
          date: {
            gte: (() => {
              const d = new Date();
              d.setUTCHours(0, 0, 0, 0);
              return d;
            })(),
            lte: (() => {
              const d = new Date();
              d.setUTCHours(23, 59, 59, 999);
              return d;
            })(),
          },
        },
      },
      include: { service: true, master: true, customer: true, slot: true },
      orderBy: { slot: { time: "asc" } },
    }),
  ]);

  return (
    <div>
      <div className="eyebrow">Дашборд</div>
      <h1 className="serif text-[36px] sm:text-[44px] font-light leading-tight mt-2 mb-8">
        Сегодня
      </h1>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <Kpi label="Заявок сегодня" value={today.bookings.total} hint={`${today.bookings.pending} в ожидании`} />
        <Kpi
          label="Сегодня к посещению"
          value={today.bookings.confirmed + today.bookings.completed}
          hint={`${today.bookings.completed} уже посетили`}
        />
        <Kpi
          label="Выручка за день"
          value={fmtPrice(today.revenue.confirmed)}
          hint={`По факту: ${fmtPrice(today.revenue.completed)}`}
        />
        <Kpi label="В обработке" value={pendingCount} hint="всего по системе" highlight={pendingCount > 0} />
      </div>

      {/* Today's bookings table */}
      <section className="bg-bg-0 border border-line rounded-xl p-5 sm:p-7 mb-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="serif text-[22px] font-normal m-0">Записи на сегодня</h2>
          <Link href="/admin/bookings" className="text-[13px] text-ink-soft border-b border-ink-soft">
            Все заявки →
          </Link>
        </div>
        {todayBookings.length === 0 ? (
          <p className="text-ink-mute text-sm m-0">Записей на сегодня нет.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-mute font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 sm:px-1">Время</th>
                  <th className="px-3 py-2 sm:px-1">Услуга</th>
                  <th className="px-3 py-2 sm:px-1">Мастер</th>
                  <th className="px-3 py-2 sm:px-1">Клиент</th>
                  <th className="px-3 py-2 sm:px-1">Статус</th>
                </tr>
              </thead>
              <tbody>
                {todayBookings.map((b) => (
                  <tr key={b.id} className="border-t border-line-soft">
                    <td className="px-3 py-2 sm:px-1 font-mono">{b.slot.time}</td>
                    <td className="px-3 py-2 sm:px-1">{b.service.name}</td>
                    <td className="px-3 py-2 sm:px-1">{b.master.name}</td>
                    <td className="px-3 py-2 sm:px-1">
                      {b.customer.name}
                      <span className="text-ink-mute ml-1">{b.customer.phone}</span>
                    </td>
                    <td className="px-3 py-2 sm:px-1">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Period summaries */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PeriodCard title="За 7 дней" s={week} />
        <PeriodCard title="За 30 дней" s={month} />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-bg-0 border rounded-lg p-5 ${highlight ? "border-gold-2" : "border-line"}`}
    >
      <div className="eyebrow">{label}</div>
      <div className="serif text-[28px] sm:text-[32px] font-light leading-none mt-2">{value}</div>
      {hint ? <div className="text-[12px] text-ink-mute mt-1.5">{hint}</div> : null}
    </div>
  );
}

function PeriodCard({ title, s }: { title: string; s: Awaited<ReturnType<typeof getStats>> }) {
  return (
    <div className="bg-bg-0 border border-line rounded-xl p-5 sm:p-7">
      <div className="eyebrow">{title}</div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <Stat label="Заявок" value={s.bookings.total} />
        <Stat label="Подтверждено" value={s.bookings.confirmed + s.bookings.completed} />
        <Stat label="Отменено" value={s.bookings.cancelled} />
      </div>
      <div className="mt-4 pt-4 border-t border-line-soft">
        <div className="flex justify-between items-baseline">
          <span className="text-[13px] text-ink-mute">Выручка (подтверждённые)</span>
          <span className="serif text-[20px]">{fmtPrice(s.revenue.confirmed)}</span>
        </div>
        <div className="flex justify-between items-baseline mt-1">
          <span className="text-[13px] text-ink-mute">Источники</span>
          <span className="text-[12px] text-ink-mute">
            сайт {s.bySource.website} · TG {s.bySource.telegram}
          </span>
        </div>
      </div>
      {s.topServices.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-line-soft">
          <div className="eyebrow mb-2">Топ услуг</div>
          <ul className="text-sm flex flex-col gap-1.5 m-0 p-0 list-none">
            {s.topServices.slice(0, 3).map((t) => (
              <li key={t.id} className="flex justify-between gap-3">
                <span className="truncate">{t.name}</span>
                <span className="text-ink-mute shrink-0">
                  {t.count} · {fmtPrice(t.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] text-ink-mute uppercase tracking-wide">{label}</div>
      <div className="serif text-[22px] font-light mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-900", label: "ожидает" },
    confirmed: { bg: "bg-green-100", text: "text-green-900", label: "подтверждено" },
    completed: { bg: "bg-blue-100", text: "text-blue-900", label: "выполнено" },
    cancelled: { bg: "bg-red-100", text: "text-red-900", label: "отменено" },
    no_show: { bg: "bg-stone-200", text: "text-stone-700", label: "не пришёл" },
  };
  const s = styles[status] ?? { bg: "bg-stone-100", text: "text-stone-700", label: status };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}
