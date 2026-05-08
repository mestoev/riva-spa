import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ToggleActive } from "./toggle-active";
import { ResetPasswordButton } from "./reset-password-button";
import { clearCredsFlash } from "./actions";

const FLASH_COOKIE = "master_creds";

const SPEC_LABELS: Record<string, string> = {
  massage: "Массажи",
  pool: "Бассейн",
  bath: "Сауна и хаммам",
  face: "Уход за лицом",
  duo: "Программы для двоих",
  all: "Все",
};

export default async function MastersPage() {
  const masters = await prisma.master.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  // Read the one-time credentials flash cookie set by createMaster / resetPassword.
  // Clearing happens in a Server Action — see <CloseCredsButton/> below.
  const flashRaw = cookies().get(FLASH_COOKIE)?.value;
  let flash: { username: string; password: string; name: string } | null = null;
  if (flashRaw) {
    try {
      flash = JSON.parse(flashRaw);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5 sm:mb-6">
        <div>
          <div className="eyebrow">Команда</div>
          <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 m-0">
            Мастера
          </h1>
        </div>
        <Link
          href="/admin/masters/new"
          className="btn btn-primary !py-2.5 !px-4 !text-[13px] sm:!py-3.5 sm:!px-6 sm:!text-[14px]"
        >
          + Добавить
        </Link>
      </div>

      {flash ? (
        <div className="mb-6 p-5 sm:p-6 rounded-xl bg-gold-1/15 border border-gold-2 max-w-[640px]">
          <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
            <div className="font-mono text-[11px] tracking-wider uppercase text-gold-3">
              Доступ для мастера ({flash.name})
            </div>
            <form action={clearCredsFlash}>
              <button
                type="submit"
                className="text-[12px] text-ink-soft border-b border-ink-soft hover:text-ink"
              >
                Я скопировал · скрыть ✕
              </button>
            </form>
          </div>
          <p className="text-sm text-ink-soft m-0 mb-3">
            Передайте мастеру эти данные — пароль показывается <b>один раз</b>.
            Кабинет: <code>/master/login</code>
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 bg-bg-0 rounded-md">
              <div className="text-[11px] text-ink-mute uppercase">Логин</div>
              <div className="font-mono text-[15px] mt-1 select-all">{flash.username}</div>
            </div>
            <div className="p-3 bg-bg-0 rounded-md">
              <div className="text-[11px] text-ink-mute uppercase">Пароль</div>
              <div className="font-mono text-[15px] mt-1 select-all">{flash.password}</div>
            </div>
          </div>
        </div>
      ) : null}

      {masters.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          Мастеров пока нет.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {masters.map((m) => (
              <div
                key={m.id}
                className={`bg-bg-0 border border-line rounded-lg p-4 ${
                  m.active ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-tight">{m.name}</div>
                    <div className="text-[12px] text-ink-soft mt-0.5">{m.role}</div>
                    <div className="text-[11px] text-ink-mute mt-0.5">{m.exp}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[13px]">
                    {m.rating ? `⭐ ${m.rating}` : ""}
                  </div>
                </div>
                <div className="mt-2 text-[12px] text-ink-soft">
                  {(m.specs as string[]).map((s) => SPEC_LABELS[s] ?? s).join(", ")}
                </div>
                {m.username ? (
                  <div className="mt-2 text-[11px] font-mono text-ink-mute">
                    логин: {m.username}
                  </div>
                ) : null}
                <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-[12px] text-ink-soft">
                    <ToggleActive id={m.id} active={m.active} />
                    <span>{m.active ? "активен" : "скрыт"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ResetPasswordButton id={m.id} />
                    <Link
                      href={`/admin/masters/${m.id}`}
                      className="text-[13px] text-ink border-b border-ink"
                    >
                      Изменить →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-bg-0 border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-bg-1">
                  <tr className="font-mono text-[11px] uppercase tracking-wider text-ink-mute">
                    <th className="px-4 py-3">Мастер</th>
                    <th className="px-4 py-3">Опыт</th>
                    <th className="px-4 py-3">Специализации</th>
                    <th className="px-4 py-3 text-center">Рейтинг</th>
                    <th className="px-4 py-3">Логин</th>
                    <th className="px-4 py-3 text-center">Активен</th>
                    <th className="px-4 py-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {masters.map((m) => (
                    <tr
                      key={m.id}
                      className={`border-t border-line-soft ${m.active ? "" : "opacity-50"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-[12px] text-ink-soft">{m.role}</div>
                        <div className="text-[11px] font-mono text-ink-mute">{m.id}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{m.exp}</td>
                      <td className="px-4 py-3 text-ink-soft text-[12px]">
                        {(m.specs as string[]).map((s) => SPEC_LABELS[s] ?? s).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {m.rating ? `⭐ ${m.rating}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px]">
                        {m.username ?? <span className="text-ink-mute">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ToggleActive id={m.id} active={m.active} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <ResetPasswordButton id={m.id} />
                          <Link
                            href={`/admin/masters/${m.id}`}
                            className="text-[13px] text-ink-soft border-b border-ink-soft hover:text-ink"
                          >
                            Редактировать
                          </Link>
                        </div>
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
