"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExpense } from "./actions";

export function DeleteExpenseButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Удалить расход?")) return;
        start(async () => {
          await deleteExpense(id);
          router.refresh();
        });
      }}
      className="text-[13px] text-red-700 border-b border-red-300"
    >
      🗑
    </button>
  );
}
