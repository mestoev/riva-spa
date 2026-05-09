import Link from "next/link";
import { prisma } from "@/lib/db";
import { PromoActions } from "./promo-actions";

export const dynamic = "force-dynamic";

const RU_MONTHS = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default async function PromotionsPage() {
  const promos = await prisma.promoCode.findMany({
    orderBy: [{ active: "desc" }, { id: "desc" }],
  });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5 sm:mb-6">
        <div>
          <div className="eyebrow">Маркетинг</div>
          <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 m-0">
            Промокоды
          </h1>
        </div>
        <Link
          href="/admin/promotions/new"
          className="btn btn-primary !py-2.5 !px-4 !text-[13px] sm:!py-3.5 sm:!px-6 sm:!text-[14px]"
        >
          + Новый код
        </Link>
      </div>
      <p className="text-ink-soft mb-6 sm:mb-8 max-w-[640px] text-sm sm:text-base">
        Клиент применяет код в форме записи на сайте или через бот командой <code>/promo</code>.
        Скидка фиксируется в момент создания заявки и не меняется потом.
      </p>

      {promos.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          Промокодов пока нет.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {promos.map((p) => (
              <div
                key={p.id}
                className={`bg-bg-0 border border-line rounded-lg p-4 ${
                  p.active ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="font-mono font-medium text-[15px]">{p.code}</div>
                  <div className="serif text-[18px]">
                    {p.type === "percent" ? `−${p.value}%` : `−${p.value.toLocaleString("ru-RU")} ₸`}
                  </div>
                </div>
                <div className="text-[12px] text-ink-mute mt-1.5">
                  {p.usageLimit > 0
                    ? `использовано: ${p.usageCount}/${p.usageLimit}`
                    : `использовано: ${p.usageCount}`}
                  {p.minTotal > 0 ? ` · мин: ${p.minTotal.toLocaleString("ru-RU")} ₸` : ""}
                </div>
                <div className="text-[11px] text-ink-mute mt-1">
                  {p.expiresAt ? `до ${fmtDate(p.expiresAt)}` : "без срока"}
                </div>
                <div className="mt-3 pt-3 border-t border-line-soft">
                  <PromoActions
                    id={p.id}
                    active={p.active}
                    code={p.code}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-bg-0 border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-1 text-left font-mono text-[11px] uppercase tracking-wider text-ink-mute">
                  <tr>
                    <th className="px-4 py-3">Код</th>
                    <th className="px-4 py-3">Скидка</th>
                    <th className="px-4 py-3 text-right">Использовано</th>
                    <th className="px-4 py-3">Действителен до</th>
                    <th className="px-4 py-3 text-center">Активен</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-t border-line-soft ${p.active ? "" : "opacity-50"}`}
                    >
                      <td className="px-4 py-3 font-mono font-medium">{p.code}</td>
                      <td className="px-4 py-3">
                        {p.type === "percent"
                          ? `−${p.value}%`
                          : `−${p.value.toLocaleString("ru-RU")} ₸`}
                        {p.minTotal > 0 ? (
                          <div className="text-[11px] text-ink-mute mt-0.5">
                            мин. сумма: {p.minTotal.toLocaleString("ru-RU")} ₸
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {p.usageLimit > 0 ? `${p.usageCount} / ${p.usageLimit}` : p.usageCount}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{fmtDate(p.expiresAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <PromoActions id={p.id} active={p.active} code={p.code} compact />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/promotions/${p.id}`}
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
