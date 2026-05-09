"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePromo, togglePromoActive } from "./actions";

export function PromoActions({
  id,
  active,
  code,
  compact,
}: {
  id: number;
  active: boolean;
  code: string;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggle = () =>
    start(async () => {
      await togglePromoActive(id, !active);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (!confirm(`Удалить промокод "${code}"?`)) return;
      await deletePromo(id);
      router.refresh();
    });

  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={pending}
        onClick={toggle}
        className={`inline-flex items-center w-10 h-6 rounded-full transition-colors ${
          active ? "bg-ink" : "bg-line"
        } ${pending ? "opacity-50" : ""}`}
      >
        <span
          className={`inline-block w-5 h-5 rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`px-2.5 py-1 rounded border ${
          active
            ? "border-line text-ink-soft"
            : "border-green-300 text-green-900 bg-green-50"
        }`}
      >
        {active ? "Деактивировать" : "Активировать"}
      </button>
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/promotions/${id}`}
          className="text-ink border-b border-ink"
        >
          Изменить
        </Link>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="text-red-700 border-b border-red-300"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
