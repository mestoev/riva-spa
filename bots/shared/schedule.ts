// Helper: build the "next 14 days" calendar with availability.
// Used by both the website (Этап 1) and the customer bot.
//
// Today this is pseudo-random (matches the prototype's logic so seeded data
// is consistent). When we replace it with a real schedule from the masters'
// rosters, only this file changes — callers stay the same.

const SLOT_TIMES = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30"];

export type DaySlots = {
  iso: string; // "2026-05-08"
  date: Date;
  slots: { time: string; free: boolean }[];
};

export function buildSchedule(daysCount = 14): DaySlots[] {
  const out: DaySlots[] = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < daysCount; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      date: d,
      slots: SLOT_TIMES.map((t, idx) => ({
        time: t,
        free: ((i * 7 + idx * 3) % 11) > 3,
      })),
    });
  }
  return out;
}

export { SLOT_TIMES };
