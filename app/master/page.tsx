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
      <h1 className="serif text-[26px] sm:text-[44px] font-light leading-tight mt-2 mb-6 sm:mb-8">
        Сегодня · {master.name.split(" ")[0]}
      </h1>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
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

      <section className="bg-bg-0 border border-line rounded-xl p-4 sm:p-7">
        <h2 className="serif text-[20px] sm:text-[22px] m-0 mb-4">Записи на сегодня</h2>
        {today.length === 0 ? (
          <p className="text-ink-mute text-sm m-0">На сегодня записей нет.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2.5">
              {today.map((b) => (
                <div key={b.id} className="bg-bg-1 rounded-md p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-mono text-[14px] font-medium">
                      {b.slot.time}
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-1 text-[14px]">{b.service.name}</div>
                  <div className="mt-2 pt-2 border-t border-line-soft flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px]">{b.customer.name}</div>
                      <a
                        href={`tel:${b.customer.phone}`}
                        className="text-[12px] text-ink-soft border-b border-ink-soft inline-block"
                      >
                        {b.customer.phone}
                      </a>
                    </div>
                    <div className="serif text-[16px] shrink-0">
                      {fmtPrice(b.priceSnapshot)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-ink-mute font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-1 py-2">Время</th>
                    <th className="px-1 py-2">Услуга</th>
                    <th className="px-1 py-2">Клиент</th>
                    <th className="px-1 py-2 text-right">Стоимость</th>
                    <th className="px-1 py-2">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {today.map((b) => (
                    <tr key={b.id} className="border-t border-line-soft">
                      <td className="px-1 py-2 font-mono">{b.slot.time}</td>
                      <td className="px-1 py-2">{b.service.name}</td>
                      <td className="px-1 py-2">
                        {b.customer.name}
                        <span className="text-ink-mute ml-1">{b.customer.phone}</span>
                      </td>
                      <td className="px-1 py-2 text-right font-mono">
                        {fmtPrice(b.priceSnapshot)}
                      </td>
                      <td className="px-1 py-2">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-bg-0 border border-line rounded-lg p-3.5 sm:p-5">
      <div className="font-mono text-[10px] sm:text-[11px] tracking-wider uppercase text-ink-mute leading-tight">
        {label}
      </div>
      <div className="serif text-[22px] sm:text-[32px] font-light leading-none mt-1.5 sm:mt-2 break-words">
        {value}
      </div>
      {hint ? (
        <div className="text-[11px] sm:text-[12px] text-ink-mute mt-1.5 leading-tight">{hint}</div>
      ) : null}
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
