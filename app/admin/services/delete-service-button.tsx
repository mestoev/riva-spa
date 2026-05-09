"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteService, toggleServiceActive } from "./actions";

export function DeleteServiceButton({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    start(async () => {
      const res = await deleteService(id);
      if (res.ok) {
        router.refresh();
        return;
      }
      if (res.reason === "has_bookings") {
        const used = res.usedIn ?? "?";
        const ok = confirm(
          `Услугу «${name}» удалить нельзя — на неё уже есть ${used} запись(ей).\n\n` +
            `Можем вместо удаления СКРЫТЬ её — клиенты не увидят, но история записей сохранится.\n\n` +
            `Скрыть?`,
        );
        if (ok && active) {
          await toggleServiceActive(id, false);
          router.refresh();
        }
        return;
      }
      alert(`Не удалось удалить (${res.reason}).`);
    });
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(`Удалить услугу «${name}»?`)) return;
        onClick();
      }}
      disabled={pending}
      title="Удалить (или скрыть, если есть записи)"
      className="text-[13px] text-red-700 border-b border-red-300 hover:text-red-900 disabled:opacity-50"
    >
      🗑
    </button>
  );
}
