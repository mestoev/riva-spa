import Link from "next/link";
import { prisma } from "@/lib/db";
import { addExpense, deleteExpense } from "./actions";
import { DeleteExpenseButton } from "./delete-button";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Аренда",
  salary: "Зарплаты",
  supplies: "Расходники",
  utilities: "Коммуналка",
  marketing: "Маркетинг",
  equipment: "Оборудование",
  other: "Прочее",
};

const RU_MONTHS = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
function fmtDate(d: Date): string {
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`;
}

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    take: 100,
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Link href="/admin/analytics" className="text-[13px] text-ink-mute">
        ← Аналитика
      </Link>
      <h1 className="serif text-[26px] sm:text-[44px] font-light leading-tight mt-3 mb-6">
        Расходы
      </h1>

      {/* Add expense form */}
      <form
        action={addExpense}
        className="bg-bg-0 border border-line rounded-xl p-5 sm:p-6 mb-6 grid gap-4 max-w-[760px]"
      >
        <h2 className="serif text-[18px] m-0">Добавить расход</h2>
        <div className="grid sm:grid-cols-[160px_180px_1fr] gap-3">
          <Field label="Дата" name="date" type="date" defaultValue={today} required />
          <Field label="Сумма ₸" name="amount" type="number" required placeholder="50000" />
          <SelectField
            label="Категория"
            name="category"
            options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
        </div>
        <Field label="Заметка (необязательно)" name="note" placeholder="Зарплата мастеров за неделю" />
        <div>
          <button type="submit" className="btn btn-primary !py-2.5 !px-4 !text-[13px]">
            Добавить
          </button>
        </div>
      </form>

      {expenses.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          Расходов пока нет.
        </div>
      ) : (
        <div className="bg-bg-0 border border-line rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left bg-bg-1 font-mono text-[11px] uppercase tracking-wider text-ink-mute">
                <tr>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Категория</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                  <th className="px-4 py-3">Заметка</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-line-soft">
                    <td className="px-4 py-3 font-mono text-[12px]">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 text-ink-soft">{CATEGORY_LABELS[e.category] ?? e.category}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {e.amount.toLocaleString("ru-RU")} ₸
                    </td>
                    <td className="px-4 py-3 text-ink-soft text-[13px]">{e.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <DeleteExpenseButton id={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, name, type = "text", defaultValue, required, placeholder,
}: {
  label: string; name: string; type?: string; defaultValue?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="px-3 py-2.5 border border-line rounded-md bg-bg-1 text-[14px] outline-none focus:border-ink"
      />
    </label>
  );
}

function SelectField({
  label, name, options, defaultValue,
}: {
  label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="px-3 py-2.5 border border-line rounded-md bg-bg-1 text-[14px] outline-none focus:border-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
