"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeBookingStatus, deleteBooking } from "./actions";
import type { StatusTransition } from "@/lib/bookings";

export function BookingActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (next: StatusTransition) =>
    start(async () => {
      await changeBookingStatus(id, next);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (!confirm("Удалить эту заявку из системы навсегда?")) return;
      await deleteBooking(id);
      router.refresh();
    });

  const buttonClass =
    "text-[12px] px-2 py-1 rounded border transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {status === "pending" ? (
        <>
          <button
            type="button"
            onClick={() => run("confirmed")}
            disabled={pending}
            className={`${buttonClass} border-green-300 text-green-900 hover:bg-green-50`}
          >
            ✅ Подтвердить
          </button>
          <button
            type="button"
            onClick={() => run("cancelled")}
            disabled={pending}
            className={`${buttonClass} border-red-300 text-red-900 hover:bg-red-50`}
          >
            ❌ Отменить
          </button>
        </>
      ) : null}

      {status === "confirmed" ? (
        <>
          <button
            type="button"
            onClick={() => run("completed")}
            disabled={pending}
            className={`${buttonClass} border-blue-300 text-blue-900 hover:bg-blue-50`}
          >
            ✓ Пришёл
          </button>
          <button
            type="button"
            onClick={() => run("no_show")}
            disabled={pending}
            className={`${buttonClass} border-stone-300 text-stone-700 hover:bg-stone-100`}
          >
            ⨉ Не пришёл
          </button>
          <button
            type="button"
            onClick={() => run("cancelled")}
            disabled={pending}
            className={`${buttonClass} border-red-300 text-red-900 hover:bg-red-50`}
          >
            Отменить
          </button>
        </>
      ) : null}

      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className={`${buttonClass} border-line text-ink-mute hover:bg-bg-1`}
        title="Удалить безвозвратно"
      >
        🗑
      </button>
    </div>
  );
}
