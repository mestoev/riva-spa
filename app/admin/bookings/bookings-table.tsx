"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookingActions } from "./booking-actions";
import { bulkChangeStatus, bulkDelete } from "./actions";
import type { StatusTransition } from "@/lib/bookings";

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-900", label: "ожидает" },
  confirmed: { bg: "bg-green-100", text: "text-green-900", label: "подтверждено" },
  completed: { bg: "bg-blue-100", text: "text-blue-900", label: "выполнено" },
  cancelled: { bg: "bg-red-100", text: "text-red-900", label: "отменено" },
  no_show: { bg: "bg-stone-200", text: "text-stone-700", label: "не пришёл" },
};

const RU_MONTHS = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
function fmtDay(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getUTCDate()} ${RU_MONTHS[date.getUTCMonth()]}`;
}

export type BookingRow = {
  id: string;
  status: string;
  source: string;
  priceSnapshot: number;
  service: { name: string; duration: number };
  master: { name: string };
  customer: { name: string; phone: string; telegramUsername: string | null };
  slot: { date: string; time: string };
};

export function BookingsTable({ bookings }: { bookings: BookingRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => bookings.map((b) => b.id), [bookings]);
  const allSelected = selected.size > 0 && selected.size === bookings.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allIds));
  }
  function clearAll() {
    setSelected(new Set());
  }

  function bulk(status: StatusTransition | "delete") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const labels: Record<string, string> = {
      confirmed: `Подтвердить ${ids.length} заявок?`,
      cancelled: `Отменить ${ids.length} заявок? Клиентам уйдут уведомления.`,
      completed: `Отметить ${ids.length} как выполненные? Будут начислены бонусы.`,
      no_show: `Отметить ${ids.length} как «не пришли»?`,
      delete: `Удалить ${ids.length} заявок навсегда?`,
    };
    if (!confirm(labels[status])) return;

    startTransition(async () => {
      if (status === "delete") {
        await bulkDelete(ids);
      } else {
        await bulkChangeStatus(ids, status);
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
        Заявок не найдено.
      </div>
    );
  }

  return (
    <>
      <BulkBar
        count={selected.size}
        total={bookings.length}
        allSelected={allSelected}
        pending={pending}
        onSelectAll={selectAll}
        onClear={clearAll}
        onAction={bulk}
      />

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3 mt-3">
        {bookings.map((b) => {
          const isOn = selected.has(b.id);
          const badge = STATUS_BADGE[b.status] ?? {
            bg: "bg-stone-100", text: "text-stone-700", label: b.status,
          };
          return (
            <label
              key={b.id}
              className={`block bg-bg-0 border rounded-lg p-4 cursor-pointer transition-colors ${
                isOn ? "border-ink ring-1 ring-ink" : "border-line"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(b.id)}
                  className="w-5 h-5 mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="font-mono text-[13px] font-medium">
                      {fmtDay(b.slot.date)} · {b.slot.time}
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-1.5 font-medium leading-tight">{b.service.name}</div>
                  <div className="text-[12px] text-ink-mute mt-0.5">
                    {b.service.duration} мин · {b.master.name}
                  </div>
                  <div className="mt-2 text-sm">{b.customer.name}</div>
                  <a
                    href={`tel:${b.customer.phone}`}
                    className="text-[12px] text-ink-soft border-b border-ink-soft inline-block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {b.customer.phone}
                  </a>
                  {b.customer.telegramUsername ? (
                    <span className="text-[11px] text-ink-mute ml-2">@{b.customer.telegramUsername}</span>
                  ) : null}
                  <div className="mt-2.5 pt-2.5 border-t border-line-soft flex items-center justify-between gap-2">
                    <div className="serif text-[18px]">
                      {b.priceSnapshot.toLocaleString("ru-RU")}
                      <span className="text-[12px] text-ink-mute ml-0.5">₸</span>
                      <span className="text-[10px] font-mono text-ink-mute ml-2 align-middle">
                        {b.source}
                      </span>
                    </div>
                  </div>
                  <div
                    className="mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BookingActions id={b.id} status={b.status} />
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-bg-0 border border-line rounded-xl overflow-hidden mt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-1 text-left font-mono text-[11px] uppercase tracking-wider text-ink-mute">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Выбрать всё"
                    onChange={() => (allSelected ? clearAll() : selectAll())}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-4 py-3">Когда</th>
                <th className="px-4 py-3">Услуга</th>
                <th className="px-4 py-3">Мастер</th>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3 text-right">Стоимость</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const isOn = selected.has(b.id);
                const badge = STATUS_BADGE[b.status] ?? {
                  bg: "bg-stone-100", text: "text-stone-700", label: b.status,
                };
                return (
                  <tr
                    key={b.id}
                    className={`border-t border-line-soft align-top ${isOn ? "bg-bg-1" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => toggle(b.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">
                      {fmtDay(b.slot.date)}<br />
                      <span className="text-ink-mute">{b.slot.time}</span>
                    </td>
                    <td className="px-4 py-3">
                      {b.service.name}
                      <div className="text-[11px] text-ink-mute mt-0.5">{b.service.duration} мин</div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{b.master.name}</td>
                    <td className="px-4 py-3">
                      <div>{b.customer.name}</div>
                      <div className="text-[12px] text-ink-mute">{b.customer.phone}</div>
                      {b.customer.telegramUsername ? (
                        <div className="text-[11px] text-ink-mute">@{b.customer.telegramUsername}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {b.priceSnapshot.toLocaleString("ru-RU")} ₸
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      <div className="text-[10px] font-mono text-ink-mute mt-1">{b.source}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BookingActions id={b.id} status={b.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function BulkBar({
  count, total, allSelected, pending,
  onSelectAll, onClear, onAction,
}: {
  count: number;
  total: number;
  allSelected: boolean;
  pending: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onAction: (s: StatusTransition | "delete") => void;
}) {
  if (count === 0) {
    return (
      <div className="text-[12px] text-ink-mute mb-2">
        Чтобы массово действовать — отметьте заявки чекбоксами.
      </div>
    );
  }
  const btn =
    "text-[12px] px-2.5 py-1.5 rounded border transition-colors disabled:opacity-50";
  return (
    <div className="sticky top-[60px] lg:top-2 z-30 bg-ink text-bg-0 rounded-lg shadow-md px-4 py-3 mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="text-[13px] font-medium">
        Выбрано: <span className="font-mono">{count}</span>
      </div>
      <button
        type="button"
        onClick={allSelected ? onClear : onSelectAll}
        className="text-[12px] underline opacity-70 hover:opacity-100"
      >
        {allSelected ? "Снять всё" : `Выбрать все (${total})`}
      </button>
      <div className="ml-auto flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction("confirmed")}
          className={`${btn} border-green-300 text-green-900 bg-green-50 hover:bg-green-100`}
        >
          ✅ Подтвердить
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction("completed")}
          className={`${btn} border-blue-300 text-blue-900 bg-blue-50 hover:bg-blue-100`}
        >
          ✓ Выполнено
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction("cancelled")}
          className={`${btn} border-red-300 text-red-900 bg-red-50 hover:bg-red-100`}
        >
          ❌ Отменить
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction("delete")}
          className={`${btn} border-stone-400 text-stone-800 bg-stone-100 hover:bg-stone-200`}
        >
          🗑 Удалить
        </button>
      </div>
    </div>
  );
}
