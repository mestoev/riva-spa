import Link from "next/link";
import {
  revenueByDay,
  expensesByDay,
  commissionsForPeriod,
  comparePeriods,
} from "@/lib/analytics";
import { AdminChart } from "@/components/admin-chart";

export const dynamic = "force-dynamic";

const PERIODS = [
  { id: "7", label: "7 дней", days: 7 },
  { id: "30", label: "30 дней", days: 30 },
  { id: "90", label: "90 дней", days: 90 },
  { id: "365", label: "Год", days: 365 },
];

function fmtPrice(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₸`;
}

function deltaBadge(pct: number) {
  if (pct === 0) return <span className="text-[12px] text-ink-mute">±0%</span>;
  const positive = pct > 0;
  return (
    <span
      className={`text-[12px] px-1.5 py-0.5 rounded ${
        positive
          ? "bg-green-100 text-green-900"
          : "bg-red-100 text-red-900"
      }`}
    >
      {positive ? "+" : ""}
      {pct}%
    </span>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const periodId = searchParams.period ?? "30";
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1];

  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - period.days + 1);
  from.setUTCHours(0, 0, 0, 0);

  const [revPoints, expPoints, commissions, compare] = await Promise.all([
    revenueByDay(from, to),
    expensesByDay(from, to),
    commissionsForPeriod(from, to),
    comparePeriods(from, to),
  ]);
  const { current, deltaPct } = compare;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5 sm:mb-6">
        <div>
          <div className="eyebrow">Финансы</div>
          <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 m-0">
            Аналитика
          </h1>
        </div>
        <Link
          href="/admin/analytics/expenses"
          className="btn btn-ghost !py-2.5 !px-4 !text-[13px]"
        >
          Расходы →
        </Link>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERIODS.map((p) => {
          const active = periodId === p.id;
          return (
            <Link
              key={p.id}
              href={`/admin/analytics?period=${p.id}`}
              className={`px-3.5 py-2 rounded-full text-[13px] border transition-colors ${
                active
                  ? "bg-ink text-bg-0 border-ink"
                  : "bg-bg-0 text-ink-soft border-line hover:bg-bg-1"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        <Kpi
          label="Выручка"
          value={fmtPrice(current.revenue)}
          delta={deltaPct.revenue}
        />
        <Kpi
          label="Расходы"
          value={fmtPrice(current.expenses)}
        />
        <Kpi
          label="Комиссии"
          value={fmtPrice(current.commissions)}
          hint={`${commissions.length} мастеров`}
        />
        <Kpi
          label="Прибыль"
          value={fmtPrice(current.profit)}
          delta={deltaPct.profit}
          highlight={current.profit > 0}
        />
      </div>

      {/* Revenue / expenses chart */}
      <section className="bg-bg-0 border border-line rounded-xl p-4 sm:p-7 mb-6">
        <h2 className="serif text-[20px] sm:text-[22px] m-0 mb-1">
          Выручка vs расходы
        </h2>
        <p className="text-[12px] text-ink-mute mb-4">
          Завершённые записи и расходы за {period.label.toLowerCase()}
        </p>
        <AdminChart
          height={240}
          series={[
            { label: "Выручка", color: "#2fa5b7", points: revPoints },
            { label: "Расходы", color: "#c9a356", points: expPoints },
          ]}
          formatTooltip={(v) => v.toLocaleString("ru-RU")}
        />
      </section>

      {/* Master commissions */}
      <section className="bg-bg-0 border border-line rounded-xl p-4 sm:p-7 mb-6">
        <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="serif text-[20px] sm:text-[22px] m-0">
              Комиссии мастеров
            </h2>
            <p className="text-[12px] text-ink-mute mt-1">
              Процент задаётся в карточке каждого мастера
            </p>
          </div>
          <Link
            href="/admin/masters"
            className="text-[13px] text-ink-soft border-b border-ink-soft"
          >
            К мастерам →
          </Link>
        </div>
        {commissions.length === 0 ? (
          <p className="text-ink-mute text-sm m-0">
            За этот период нет ни одной завершённой записи.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-mute font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-2 py-2">Мастер</th>
                  <th className="px-2 py-2 text-right">Записей</th>
                  <th className="px-2 py-2 text-right">Выручка</th>
                  <th className="px-2 py-2 text-right">%</th>
                  <th className="px-2 py-2 text-right">К выплате</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.masterId} className="border-t border-line-soft">
                    <td className="px-2 py-2.5">{c.masterName}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{c.bookings}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{fmtPrice(c.revenue)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{c.commissionPercent}%</td>
                    <td className="px-2 py-2.5 text-right serif font-medium">
                      {fmtPrice(c.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick stats */}
      <section className="bg-bg-0 border border-line rounded-xl p-4 sm:p-7">
        <h2 className="serif text-[20px] sm:text-[22px] m-0 mb-4">Сводка</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Завершённых записей" value={current.bookings.toString()} />
          <Row label="Средний чек" value={fmtPrice(current.averageCheck)} />
          <Row
            label="Выручка / расходы"
            value={
              current.expenses > 0
                ? `${(current.revenue / current.expenses).toFixed(2)}×`
                : "—"
            }
          />
          <Row
            label="Маржинальность"
            value={
              current.revenue > 0
                ? `${Math.round((current.profit / current.revenue) * 100)}%`
                : "—"
            }
          />
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label, value, hint, delta, highlight,
}: {
  label: string; value: string; hint?: string; delta?: number; highlight?: boolean;
}) {
  return (
    <div
      className={`bg-bg-0 border rounded-lg p-3.5 sm:p-5 ${
        highlight ? "border-gold-2" : "border-line"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-[10px] sm:text-[11px] tracking-wider uppercase text-ink-mute">
          {label}
        </div>
        {typeof delta === "number" ? deltaBadge(delta) : null}
      </div>
      <div className="serif text-[20px] sm:text-[26px] font-light leading-tight mt-2 break-words">
        {value}
      </div>
      {hint ? (
        <div className="text-[11px] sm:text-[12px] text-ink-mute mt-1 leading-tight">{hint}</div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2">
      <span className="text-[13px] text-ink-mute">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
