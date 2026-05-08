import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { MASTER_COOKIE, getMasterFromCookie } from "@/lib/master-auth";

function fmtPrice(kzt: number): string {
  return `${kzt.toLocaleString("ru-RU")} ₸`;
}

export default async function MasterDashboard() {
  const master = (await getMasterFromCookie(cookies().get(MASTER_COOKIE)?.value))!;

  const startToday = new Date();
  startToday.setUTCHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setUTCHours(23, 59, 59, 999);

  const startWeek = new Date(startToday);
  startWeek.setUTCDate(startToday.getUTCDate() - 6);

  const [today, week, allMine] = await Promise.all([
    prisma.booking.findMany({
      where: {
        masterId: master.id,
        slot: { date: { gte: startToday, lte: endToday } },
        status: { in: ["pending", "confirmed", "completed"] },
      },
      include: { service: true, customer: true, slot: true },
      orderBy: { slot: { time: "asc" } },
    }),
    prisma.booking.findMany({
      where: {
        masterId: master.id,
        createdAt: { gte: startWeek },
      },
      select: { status: true, priceSnapshot: true },
    }),
    prisma.booking.aggregate({
      where: {
        masterId: master.id,
        status: { in: ["confirmed", "completed"] },
      },
      _count: { _all: true },
      _sum: { priceSnapshot: true },
    }),
  ]);

  const weekConfirmed = week.filter(
    (b) => b.status === "confirmed" || b.status === "completed",
  ).length;
  const weekRevenue = week
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((s, b) => s + b.priceSnapshot, 0);

  return (
    <div>
      <div className="eyebrow">Кабинет</div>
      <h1 className="serif text-[36px] sm:text-[44px] font-light leading-tight mt-2 mb-8">
        Сегодня · {master.name.split(" ")[0]}
      </h1>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <Kpi label="Записей сегодня" value={today.length} />
        <Kpi
          label="К посещению"
          value={today.filter((b) => b.status !== "completed").length}
        />
        <Kpi label="За 7 дней" value={weekConfirmed} hint={fmtPrice(weekRevenue)} />
        <Kpi
          label="Всего"
          value={allMine._count._all}
          hint={fmtPrice(allMine._sum.priceSnapshot ?? 0)}
        />
      </div>

      <section className="bg-bg-0 border border-line rounded-xl p-5 sm:p-7">
        <h2 className="serif text-[22px] m-0 mb-4">Записи на сегодня</h2>
        {today.length === 0 ? (
          <p className="text-ink-mute text-sm m-0">На сегодня записей нет.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-mute font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 sm:px-1">Время</th>
                  <th className="px-3 py-2 sm:px-1">Услуга</th>
                  <th className="px-3 py-2 sm:px-1">Клиент</th>
                  <th className="px-3 py-2 sm:px-1 text-right">Стоимость</th>
                  <th className="px-3 py-2 sm:px-1">Статус</th>
                </tr>
              </thead>
              <tbody>
                {today.map((b) => (
                  <tr key={b.id} className="border-t border-line-soft">
                    <td className="px-3 py-2 sm:px-1 font-mono">{b.slot.time}</td>
                    <td className="px-3 py-2 sm:px-1">{b.service.name}</td>
                    <td className="px-3 py-2 sm:px-1">
                      {b.customer.name}
                      <span className="text-ink-mute ml-1">{b.customer.phone}</span>
                    </td>
                    <td className="px-3 py-2 sm:px-1 text-right font-mono">
                      {fmtPrice(b.priceSnapshot)}
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
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-bg-0 border border-line rounded-lg p-5">
      <div className="eyebrow">{label}</div>
      <div className="serif text-[28px] sm:text-[32px] font-light leading-none mt-2">{value}</div>
      {hint ? <div className="text-[12px] text-ink-mute mt-1.5">{hint}</div> : null}
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
