import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { MASTER_COOKIE, getMasterFromCookie } from "@/lib/master-auth";
import { getSchedule } from "@/lib/schedule";
import { toggleSlotBlackout, toggleFullDayOff } from "./actions";

export const dynamic = "force-dynamic";

export default async function MasterSchedulePage() {
  const master = (await getMasterFromCookie(cookies().get(MASTER_COOKIE)?.value))!;

  const days = await getSchedule(14);
  const blackouts = await prisma.masterBlackout.findMany({
    where: { masterId: master.id },
    orderBy: { date: "asc" },
  });

  // Group blackouts by date for quick lookup
  type BO = (typeof blackouts)[number];
  const blackoutByDate = new Map<string, BO[]>();
  for (const b of blackouts) {
    const iso = b.date.toISOString().slice(0, 10);
    const arr = blackoutByDate.get(iso) ?? [];
    arr.push(b);
    blackoutByDate.set(iso, arr);
  }

  return (
    <div>
      <div className="eyebrow">Расписание</div>
      <h1 className="serif text-[26px] sm:text-[44px] font-light leading-tight mt-2 mb-2">
        Моё расписание
      </h1>
      <p className="text-ink-soft mb-6 sm:mb-8 max-w-[640px] text-sm sm:text-base">
        Слоты задаются администратором в общем расписании салона. Если в какой-то день вы не работаете —
        отметьте это здесь, и клиенты не смогут записаться к вам в этот день.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((d) => {
          const myBlackouts = blackoutByDate.get(d.iso) ?? [];
          const fullDayOff = myBlackouts.find((b) => b.time === null) ?? null;
          const slotBlackouts = new Map(
            myBlackouts.filter((b) => b.time !== null).map((b) => [b.time as string, b]),
          );

          return (
            <div key={d.iso} className="bg-bg-0 border border-line rounded-lg p-4">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <div className="font-medium">
                    {d.weekday} {d.day} {d.month}
                  </div>
                  {d.closed ? (
                    <div className="text-[11px] text-red-700 mt-0.5">
                      салон закрыт{d.reason ? ` · ${d.reason}` : ""}
                    </div>
                  ) : null}
                </div>
                {fullDayOff ? (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-red-100 text-red-800 rounded">
                    выходной
                  </span>
                ) : null}
              </div>

              {!d.closed ? (
                <>
                  <div className="grid grid-cols-3 gap-1.5 my-3">
                    {d.slots.map((sl) => {
                      const bo = slotBlackouts.get(sl.time);
                      const isBlocked = !!bo;
                      return (
                        <form key={sl.time} action={toggleSlotBlackout}>
                          <input type="hidden" name="dateIso" value={d.iso} />
                          <input type="hidden" name="time" value={sl.time} />
                          <input
                            type="hidden"
                            name="blackoutId"
                            value={bo ? String(bo.id) : ""}
                          />
                          <button
                            type="submit"
                            disabled={!!fullDayOff}
                            className={`w-full px-1 py-2 rounded text-[12px] font-mono transition-colors ${
                              isBlocked
                                ? "bg-red-100 text-red-800 line-through"
                                : "bg-bg-1 hover:bg-bg-2 text-ink"
                            } ${fullDayOff ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            {sl.time}
                          </button>
                        </form>
                      );
                    })}
                  </div>

                  <form action={toggleFullDayOff}>
                    <input type="hidden" name="dateIso" value={d.iso} />
                    <input
                      type="hidden"
                      name="fullDayOffId"
                      value={fullDayOff ? String(fullDayOff.id) : ""}
                    />
                    <button
                      type="submit"
                      className={`w-full text-[12px] rounded py-1.5 transition-colors ${
                        fullDayOff
                          ? "border border-line text-ink-soft hover:bg-bg-1"
                          : "border border-red-300 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      {fullDayOff ? "Включить день обратно" : "Не работаю весь день"}
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
