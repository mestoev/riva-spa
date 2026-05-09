"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReview, hideReview, deleteReview } from "./actions";

export function ReviewActions({
  id,
  approved,
  hidden,
}: {
  id: number;
  approved: boolean;
  hidden: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!approved && !hidden ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => approveReview(id, true))}
          className="text-[12px] px-2.5 py-1 rounded border border-green-300 bg-green-50 text-green-900"
        >
          ✅ Опубликовать
        </button>
      ) : null}
      {approved ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => approveReview(id, false))}
          className="text-[12px] px-2.5 py-1 rounded border border-line text-ink-soft"
        >
          Снять с публикации
        </button>
      ) : null}
      {!hidden ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => hideReview(id, true))}
          className="text-[12px] px-2.5 py-1 rounded border border-stone-300 text-stone-700"
        >
          Скрыть
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => hideReview(id, false))}
          className="text-[12px] px-2.5 py-1 rounded border border-line text-ink-soft"
        >
          Вернуть
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Удалить отзыв навсегда?")) return;
          run(() => deleteReview(id));
        }}
        className="text-[12px] text-red-700 border-b border-red-300"
      >
        🗑
      </button>
    </div>
  );
}
