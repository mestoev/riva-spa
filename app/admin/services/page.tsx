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
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="eyebrow">Каталог</div>
          <h1 className="serif text-[36px] sm:text-[44px] font-light leading-tight mt-2 m-0">
            Услуги
          </h1>
        </div>
        <Link href="/admin/services/new" className="btn btn-primary">
          + Добавить услугу
        </Link>
      </div>

      <div className="bg-bg-0 border border-line rounded-xl overflow-hidden">
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
              {services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-mute">
                    Услуг пока нет. Нажмите «Добавить услугу».
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
