import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { MASTER_COOKIE, getMasterFromCookie } from "@/lib/master-auth";

export const dynamic = "force-dynamic";

const RU_MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function fmtDay(d: Date): string {
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]}`;
}
function fmtPrice(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₸`;
}

export default async function MasterBookingsPage() {
  const master = (await getMasterFromCookie(cookies().get(MASTER_COOKIE)?.value))!;

  const bookings = await prisma.booking.findMany({
    where: { masterId: master.id },
    include: { service: true, customer: true, slot: true },
    orderBy: [{ slot: { date: "desc" } }, { slot: { time: "desc" } }],
    take: 100,
  });

  return (
    <div>
      <div className="eyebrow">Все записи</div>
      <h1 className="serif text-[26px] sm:text-[44px] font-light leading-tight mt-2 mb-5 sm:mb-6">
        Мои записи
      </h1>

      {bookings.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          Записей пока нет.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-2.5">
            {bookings.map((b) => (
              <div key={b.id} className="bg-bg-0 border border-line rounded-lg p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-mono text-[13px] font-medium">
                    {fmtDay(b.slot.date)} · {b.slot.time}
                  </div>
                  <span className="text-[11px] text-ink-soft">{b.status}</span>
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
                  <div className="serif text-[16px] shrink-0">{fmtPrice(b.priceSnapshot)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-bg-0 border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-bg-1 font-mono text-[11px] uppercase tracking-wider text-ink-mute">
                  <tr>
                    <th className="px-4 py-3">Дата</th>
                    <th className="px-4 py-3">Время</th>
                    <th className="px-4 py-3">Услуга</th>
                    <th className="px-4 py-3">Клиент</th>
                    <th className="px-4 py-3 text-right">Стоимость</th>
                    <th className="px-4 py-3">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-line-soft">
                      <td className="px-4 py-3">{fmtDay(b.slot.date)}</td>
                      <td className="px-4 py-3 font-mono">{b.slot.time}</td>
                      <td className="px-4 py-3">{b.service.name}</td>
                      <td className="px-4 py-3">
                        {b.customer.name}
                        <span className="text-ink-mute ml-1">{b.customer.phone}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{fmtPrice(b.priceSnapshot)}</td>
                      <td className="px-4 py-3 text-ink-soft">{b.status}</td>
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
