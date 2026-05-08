import { prisma } from "@/lib/db";
import { DEFAULT_SLOT_TIMES } from "@/lib/schedule";
import { saveWorkingHours, setDayClosed, addException, deleteException } from "./actions";

const WEEKDAYS = [
  "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье",
];

export default async function SchedulePage() {
  const [hours, exceptions] = await Promise.all([
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.scheduleException.findMany({ orderBy: { date: "asc" } }),
  ]);
  const byWd = new Map(hours.map((h) => [h.weekday, h.slotTimes]));

  return (
    <div>
      <div className="eyebrow">Календарь</div>
      <h1 className="serif text-[36px] sm:text-[44px] font-light leading-tight mt-2 mb-2">
        Расписание
      </h1>
      <p className="text-ink-soft max-w-[640px] mb-8">
        Слоты задаются на каждый день недели. На отдельные даты можно сделать исключение
        (закрыть день или поменять часы). Эти настройки сразу применяются к сайту и Telegram-ботам.
      </p>

      {/* Working hours per weekday */}
      <section className="bg-bg-0 border border-line rounded-xl p-5 sm:p-7 mb-8">
        <h2 className="serif text-[22px] m-0 mb-2">Часы работы</h2>
        <p className="text-ink-soft text-sm mb-5">
          Введите слоты через запятую или пробел в формате <code>10:00, 11:30, 13:00</code>.
          Пустое поле или кнопка «Закрыто» — день не работает.
        </p>
        <div className="flex flex-col gap-3">
          {WEEKDAYS.map((label, wd) => {
            const slots = byWd.get(wd) ?? DEFAULT_SLOT_TIMES;
            const isClosed = byWd.has(wd) && slots.length === 0;
            return (
              <form
                key={wd}
                action={async (fd) => {
                  "use server";
                  const intent = String(fd.get("intent") ?? "save");
                  if (intent === "close") {
                    await setDayClosed(wd);
                  } else {
                    await saveWorkingHours(wd, String(fd.get("slots") ?? ""));
                  }
                }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-md border border-line-soft bg-bg-1"
              >
                <div className="font-medium w-full sm:w-32 flex items-center gap-2">
                  <span>{label}</span>
                  {isClosed ? (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-red-100 text-red-800 rounded">
                      закрыто
                    </span>
                  ) : null}
                </div>
                <input
                  type="text"
                  name="slots"
                  defaultValue={slots.join(", ")}
                  placeholder={DEFAULT_SLOT_TIMES.join(", ")}
                  className="flex-1 px-3 py-2 border border-line rounded-md bg-bg-0 text-[14px] outline-none focus:border-ink"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    name="intent"
                    value="save"
                    className="btn btn-primary !py-2 !px-4 !text-[13px]"
                  >
                    Сохранить
                  </button>
                  <button
                    type="submit"
                    name="intent"
                    value="close"
                    className="btn btn-ghost !py-2 !px-4 !text-[13px]"
                    title="Сделать день нерабочим"
                  >
                    Закрыто
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>

      {/* Exceptions */}
      <section className="bg-bg-0 border border-line rounded-xl p-5 sm:p-7">
        <h2 className="serif text-[22px] m-0 mb-2">Исключения по дате</h2>
        <p className="text-ink-soft text-sm mb-5">
          Например: 1 января — закрыто; 9 мая — короткий день. Перебивает обычные часы для
          конкретной даты.
        </p>

        <form
          action={addException}
          className="grid sm:grid-cols-[160px_1fr_180px_auto] gap-3 mb-5 items-end"
        >
          <Field label="Дата" name="date" type="date" required />
          <Field label="Слоты (пусто = закрыто)" name="slots" placeholder="10:00, 12:00" />
          <Field label="Причина" name="reason" placeholder="Праздник" />
          <button type="submit" className="btn btn-primary">
            Добавить
          </button>
        </form>

        {exceptions.length === 0 ? (
          <p className="text-ink-mute text-sm m-0">Исключений нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-mute font-mono text-[11px] uppercase tracking-wider">
                  <th className="px-2 py-2">Дата</th>
                  <th className="px-2 py-2">Слоты</th>
                  <th className="px-2 py-2">Причина</th>
                  <th className="px-2 py-2 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((e) => (
                  <tr key={e.id} className="border-t border-line-soft">
                    <td className="px-2 py-2 font-mono">
                      {e.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-2 py-2">
                      {e.slotTimes.length === 0 ? (
                        <span className="text-red-700 font-medium">закрыто</span>
                      ) : (
                        e.slotTimes.join(", ")
                      )}
                    </td>
                    <td className="px-2 py-2 text-ink-soft">{e.reason ?? "—"}</td>
                    <td className="px-2 py-2 text-right">
                      <DeleteExceptionButton id={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label, name, type = "text", placeholder, required,
}: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="px-3 py-2 border border-line rounded-md bg-bg-0 text-[14px] outline-none focus:border-ink"
      />
    </label>
  );
}

function DeleteExceptionButton({ id }: { id: number }) {
  return (
    <form
      action={async () => {
        "use server";
        await deleteException(id);
      }}
    >
      <button
        type="submit"
        className="text-[13px] text-red-700 border-b border-red-700 hover:text-red-900"
      >
        Удалить
      </button>
    </form>
  );
}
