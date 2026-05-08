// Schedule — single source of truth used by:
//   - Public website (/booking)
//   - Customer Telegram bot
//   - Admin web + bot
//
// Reads:
//   1. WorkingHours per weekday (admin-editable)
//   2. ScheduleException per date (override / closure)
//   3. Slot rows for actual bookings or admin-blocked slots
//
// Returns a 14-day window with each day's slots and free/taken status.
import { prisma } from "./db";

const RU_WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const RU_MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export type DaySlots = {
  iso: string;
  date: Date;
  day: number;
  month: string;
  weekday: string;
  closed: boolean;
  reason: string | null;
  slots: { time: string; free: boolean }[];
};

// JS Date.getDay returns 0=Sun..6=Sat. Convert to 0=Mon..6=Sun.
function weekdayMonFirst(d: Date): number {
  const js = d.getUTCDay();
  return js === 0 ? 6 : js - 1;
}

function dateOnly(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export const DEFAULT_SLOT_TIMES = [
  "10:00",
  "11:30",
  "13:00",
  "14:30",
  "16:00",
  "17:30",
  "19:00",
  "20:30",
];

/** Returns the configured slot times for a given JS Date (Mon-first weekday). */
async function slotTimesForDate(d: Date): Promise<{ slots: string[]; closed: boolean; reason: string | null }> {
  const date = dateOnly(d);

  // 1) Check date-specific exception
  const exception = await prisma.scheduleException.findUnique({
    where: { date },
  });
  if (exception) {
    return {
      slots: exception.slotTimes,
      closed: exception.slotTimes.length === 0,
      reason: exception.reason ?? null,
    };
  }

  // 2) Fall back to weekday default
  const wd = weekdayMonFirst(d);
  const wh = await prisma.workingHours.findUnique({ where: { weekday: wd } });
  if (wh) {
    return { slots: wh.slotTimes, closed: wh.slotTimes.length === 0, reason: null };
  }
  // 3) Total fallback — default slot list (so a fresh DB still gives the user something)
  return { slots: DEFAULT_SLOT_TIMES, closed: false, reason: null };
}

/** Build the next `daysCount` days for the public booking calendar. */
export async function getSchedule(
  daysCount = 14,
  masterId?: string,
): Promise<DaySlots[]> {
  const today = dateOnly(new Date());
  const out: DaySlots[] = [];

  // Pre-load all booked/blocked slots in this window in one query
  const windowEnd = new Date(today);
  windowEnd.setUTCDate(today.getUTCDate() + daysCount);
  const taken = await prisma.slot.findMany({
    where: {
      date: { gte: today, lt: windowEnd },
      ...(masterId ? { masterId } : {}),
      OR: [{ blocked: true }, { booking: { isNot: null } }],
    },
    select: { date: true, time: true, masterId: true },
  });
  // Build a Set for O(1) lookup, keyed by ISO date|time|masterId
  const takenSet = new Set(
    taken.map((t) => `${t.date.toISOString().slice(0, 10)}|${t.time}|${t.masterId ?? ""}`),
  );

  for (let i = 0; i < daysCount; i += 1) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const { slots: configured, closed, reason } = await slotTimesForDate(d);

    out.push({
      iso,
      date: d,
      day: d.getUTCDate(),
      month: RU_MONTHS_SHORT[d.getUTCMonth()],
      weekday: RU_WEEKDAYS_SHORT[d.getUTCDay()],
      closed,
      reason,
      slots: configured.map((t) => ({
        time: t,
        free: !takenSet.has(`${iso}|${t}|${masterId ?? ""}`),
      })),
    });
  }
  return out;
}

/** Re-export for callers who only need a single day. */
export async function getDaySchedule(date: Date, masterId?: string): Promise<DaySlots> {
  const list = await getSchedule(15, masterId);
  const iso = dateOnly(date).toISOString().slice(0, 10);
  const found = list.find((d) => d.iso === iso);
  if (!found) {
    return {
      iso,
      date: dateOnly(date),
      day: date.getUTCDate(),
      month: RU_MONTHS_SHORT[date.getUTCMonth()],
      weekday: RU_WEEKDAYS_SHORT[date.getUTCDay()],
      closed: true,
      reason: null,
      slots: [],
    };
  }
  return found;
}
