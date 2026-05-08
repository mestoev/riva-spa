import Link from "next/link";
import { prisma } from "@/lib/db";
import { ToggleActive } from "./toggle-active";

const CATEGORY_LABELS: Record<string, string> = {
  massage: "Массажи",
  pool: "Бассейн",
  bath: "Сауна и хаммам",
  face: "Уход за лицом",
  duo: "Программы для двоих",
};

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5 sm:mb-6">
        <div>
          <div className="eyebrow">Каталог</div>
          <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 m-0">
            Услуги
          </h1>
        </div>
        <Link href="/admin/services/new" className="btn btn-primary !py-2.5 !px-4 !text-[13px] sm:!py-3.5 sm:!px-6 sm:!text-[14px]">
          + Добавить
        </Link>
      </div>

      {services.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          Услуг пока нет. Нажмите «Добавить».
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {services.map((s) => (
              <div
                key={s.id}
                className={`bg-bg-0 border border-line rounded-lg p-4 ${
                  s.active ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-tight">{s.name}</div>
                    <div className="text-[11px] text-ink-mute mt-0.5 font-mono">
                      {CATEGORY_LABELS[s.category] ?? s.category} · {s.duration} мин
                    </div>
                    {s.tag ? (
                      <div className="inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-bg-2 text-ink-soft">
                        {s.tag}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="serif text-[18px]">
                      {s.price.toLocaleString("ru-RU")}
                      <span className="text-[12px] text-ink-mute ml-0.5">₸</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[12px] text-ink-soft">
                    <ToggleActive id={s.id} active={s.active} />
                    <span>{s.active ? "активна" : "скрыта"}</span>
                  </div>
                  <Link
                    href={`/admin/services/${s.id}`}
                    className="text-[13px] text-ink border-b border-ink"
                  >
                    Редактировать →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-bg-0 border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-bg-1">
                  <tr className="font-mono text-[11px] uppercase tracking-wider text-ink-mute">
                    <th className="px-4 py-3">Услуга</th>
                    <th className="px-4 py-3">Категория</th>
                    <th className="px-4 py-3 text-right">Цена</th>
                    <th className="px-4 py-3 text-right">Время</th>
                    <th className="px-4 py-3">Тег</th>
                    <th className="px-4 py-3 text-center">Активна</th>
                    <th className="px-4 py-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-t border-line-soft ${s.active ? "" : "opacity-50"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-[11px] font-mono text-ink-mute">{s.id}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {CATEGORY_LABELS[s.category] ?? s.category}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {s.price.toLocaleString("ru-RU")} ₸
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink-mute">
                        {s.duration} мин
                      </td>
                      <td className="px-4 py-3 text-ink-mute">{s.tag ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <ToggleActive id={s.id} active={s.active} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/services/${s.id}`}
                          className="text-[13px] text-ink-soft border-b border-ink-soft hover:text-ink"
                        >
                          Редактировать
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
