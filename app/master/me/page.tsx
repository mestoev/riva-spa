import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { MASTER_COOKIE, getMasterFromCookie } from "@/lib/master-auth";

const SPEC_LABELS: Record<string, string> = {
  massage: "Массажи",
  pool: "Бассейн",
  bath: "Сауна и хаммам",
  face: "Уход за лицом",
  duo: "Программы для двоих",
  all: "Все",
};

function fmtPrice(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₸`;
}

export default async function MasterMePage() {
  const master = (await getMasterFromCookie(cookies().get(MASTER_COOKIE)?.value))!;

  const stats = await prisma.booking.aggregate({
    where: {
      masterId: master.id,
      status: { in: ["confirmed", "completed"] },
    },
    _count: { _all: true },
    _sum: { priceSnapshot: true },
    _avg: { priceSnapshot: true },
  });
  const completed = await prisma.booking.count({
    where: { masterId: master.id, status: "completed" },
  });
  const noShow = await prisma.booking.count({
    where: { masterId: master.id, status: "no_show" },
  });

  return (
    <div>
      <div className="eyebrow">Профиль</div>
      <h1 className="serif text-[26px] sm:text-[44px] font-light leading-tight mt-2 mb-5 sm:mb-6">
        {master.name}
      </h1>

      <section className="bg-bg-0 border border-line rounded-xl p-5 sm:p-7 mb-6 max-w-[640px]">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Должность" value={master.role} />
          <Field label="Опыт" value={master.exp} />
          <Field label="Рейтинг" value={master.rating ? `⭐ ${master.rating}` : "—"} />
          <Field label="Логин" value={master.username ?? "—"} />
        </div>
        <div className="mt-4 pt-4 border-t border-line-soft">
          <div className="text-[11px] text-ink-mute uppercase tracking-wider font-mono mb-1.5">
            Специализации
          </div>
          <div className="text-sm">
            {(master.specs as string[]).map((s) => SPEC_LABELS[s] ?? s).join(", ")}
          </div>
        </div>
      </section>

      <section className="bg-bg-0 border border-line rounded-xl p-5 sm:p-7 max-w-[640px]">
        <h2 className="serif text-[22px] m-0 mb-4">Статистика</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Kpi label="Записей всего" value={stats._count._all} />
          <Kpi label="Выполнено" value={completed} />
          <Kpi label="Не пришли" value={noShow} />
          <Kpi label="Сумма" value={fmtPrice(stats._sum.priceSnapshot ?? 0)} wide />
          <Kpi
            label="Средний чек"
            value={fmtPrice(Math.round(stats._avg.priceSnapshot ?? 0))}
            wide
          />
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-ink-mute uppercase tracking-wider font-mono">{label}</div>
      <div className="text-[15px] mt-1">{value}</div>
    </div>
  );
}

function Kpi({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={`bg-bg-1 rounded-md p-4 ${wide ? "sm:col-span-1" : ""}`}>
      <div className="text-[11px] text-ink-mute uppercase tracking-wider font-mono">{label}</div>
      <div className="serif text-[20px] sm:text-[22px] font-light mt-1">{value}</div>
    </div>
  );
}
