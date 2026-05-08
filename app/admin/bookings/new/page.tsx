import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSchedule } from "@/lib/schedule";
import { NewBookingForm } from "./new-booking-form";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const [services, masters, schedule] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.master.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSchedule(30),
  ]);

  return (
    <div>
      <Link href="/admin/bookings" className="text-[13px] text-ink-mute">
        ← Заявки
      </Link>
      <h1 className="serif text-[32px] sm:text-[44px] font-light leading-tight mt-3 mb-2">
        Новая запись
      </h1>
      <p className="text-ink-soft mb-8 max-w-[640px]">
        Используйте, когда клиент звонит или пришёл лично. Запись сразу попадает в журнал и
        видна мастеру в его кабинете.
      </p>

      <NewBookingForm
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: s.price,
          category: s.category as string,
        }))}
        masters={masters.map((m) => ({
          id: m.id,
          name: m.name,
          specs: m.specs as string[],
        }))}
        schedule={schedule.map((d) => ({
          iso: d.iso,
          dayLabel: `${d.weekday} ${d.day} ${d.month}`,
          closed: d.closed,
          slots: d.slots,
        }))}
      />
    </div>
  );
}
