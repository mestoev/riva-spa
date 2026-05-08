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
      <h1 className="serif text-[36px] sm:text-[44px] font-light leading-tight mt-2 mb-6">
        Мои записи
      </h1>

      <div className="bg-bg-0 border border-line rounded-xl overflow-hidden">
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
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-mute">
                    Записей пока нет.
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
