"use client";

import Link from "next/link";

type Day = { date: Date; iso: string; label: string; isToday: boolean };
type Booking = {
  id: string;
  status: string;
  dateIso: string;
  time: string;
  serviceName: string;
  duration: number;
  masterName: string;
  customerName: string;
  customerPhone: string;
  price: number;
};

const STATUS_BG: Record<string, string> = {
  pending: "bg-yellow-100 border-yellow-300 text-yellow-900",
  confirmed: "bg-green-100 border-green-300 text-green-900",
  completed: "bg-blue-100 border-blue-300 text-blue-900",
  cancelled: "bg-red-100 border-red-300 text-red-900",
  no_show: "bg-stone-200 border-stone-300 text-stone-700",
};

export function CalendarView({
  days,
  bookings,
}: {
  days: Day[];
  bookings: Booking[];
}) {
  // Group bookings by day
  const byDay = new Map<string, Booking[]>();
  for (const b of bookings) {
    const arr = byDay.get(b.dateIso) ?? [];
    arr.push(b);
    byDay.set(b.dateIso, arr);
  }

  return (
    <div className="bg-bg-0 border border-line rounded-xl overflow-hidden">
      {/* Mobile: columns stacked */}
      <div className="lg:hidden">
        {days.map((d) => {
          const dayBookings = (byDay.get(d.iso) ?? []).sort((a, b) =>
            a.time.localeCompare(b.time),
          );
          return (
            <div key={d.iso} className="border-b border-line-soft last:border-b-0">
              <div
                className={`px-4 py-3 font-medium text-[14px] ${
                  d.isToday ? "bg-gold-1/15 text-ink" : "bg-bg-1 text-ink-soft"
                }`}
              >
                {d.label} {d.isToday ? <span className="text-gold-3">· сегодня</span> : null}
                <span className="text-[12px] text-ink-mute ml-2">
                  ({dayBookings.length})
                </span>
              </div>
              {dayBookings.length === 0 ? (
                <div className="px-4 py-3 text-[12px] text-ink-mute">пусто</div>
              ) : (
                <div className="flex flex-col">
                  {dayBookings.map((b) => (
                    <BookingChip key={b.id} b={b} compact />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden lg:grid lg:grid-cols-7">
        {days.map((d) => (
          <div
            key={d.iso}
            className={`border-r border-line-soft last:border-r-0 ${
              d.isToday ? "bg-gold-1/10" : ""
            }`}
          >
            <div
              className={`px-3 py-3 text-[12px] font-medium border-b border-line-soft ${
                d.isToday ? "text-gold-3" : "text-ink-soft"
              }`}
            >
              {d.label}
            </div>
            <div className="p-2 flex flex-col gap-1.5 min-h-[200px]">
              {(byDay.get(d.iso) ?? [])
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((b) => (
                  <BookingChip key={b.id} b={b} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingChip({ b, compact }: { b: Booking; compact?: boolean }) {
  const cls = STATUS_BG[b.status] ?? "bg-stone-100 border-stone-300";
  return (
    <Link
      href={`/admin/bookings`}
      className={`block px-2 py-1.5 rounded border text-[11px] leading-tight ${cls} ${
        compact ? "rounded-none border-0 border-b border-line-soft px-4 py-2.5 text-[12px]" : ""
      }`}
      title={`${b.customerName} · ${b.customerPhone}`}
    >
      <div className="font-mono font-medium">
        {b.time} <span className="opacity-60">· {b.duration}м</span>
      </div>
      <div className="truncate">{b.serviceName}</div>
      <div className="truncate opacity-75">
        {b.masterName} · {b.customerName}
      </div>
    </Link>
  );
}
