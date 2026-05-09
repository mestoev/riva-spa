"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMaster, toggleMasterActive } from "./actions";

export function DeleteMasterButton({
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
      const res = await deleteMaster(id);
      if (res.ok) {
        router.refresh();
        return;
      }
      if (res.reason === "has_bookings") {
        const used = res.usedIn ?? "?";
        const ok = confirm(
          `Мастера «${name}» удалить нельзя — за ним числится ${used} запись(ей).\n\n` +
            `Можем СКРЫТЬ — клиенты не увидят, история сохранится.\n\nСкрыть?`,
        );
        if (ok && active) {
          await toggleMasterActive(id, false);
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
        if (!confirm(`Удалить мастера «${name}»?`)) return;
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
