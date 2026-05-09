import { prisma } from "@/lib/db";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

const RU_MONTHS = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
function fmtDate(d: Date): string {
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`;
}

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const counts = {
    waiting: reviews.filter((r) => !r.approved && !r.hidden).length,
    approved: reviews.filter((r) => r.approved).length,
    hidden: reviews.filter((r) => r.hidden).length,
  };

  return (
    <div>
      <div className="eyebrow">Соцдок</div>
      <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 mb-2">
        Отзывы
      </h1>
      <p className="text-ink-soft mb-6 max-w-[640px] text-sm sm:text-base">
        Клиенты оставляют оценку через Telegram-бот после визита. Чтобы отзыв появился
        на сайте — одобрите его. Можно скрыть позже без удаления.
      </p>

      <div className="flex gap-2 mb-6 text-[13px] flex-wrap">
        <span className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-900">
          На модерации: {counts.waiting}
        </span>
        <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-900">
          Опубликовано: {counts.approved}
        </span>
        <span className="px-3 py-1.5 rounded-full bg-stone-200 text-stone-700">
          Скрыто: {counts.hidden}
        </span>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          Отзывов пока нет.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => {
            const stateLabel = r.hidden
              ? "🚫 скрыто"
              : r.approved
                ? "✅ опубликовано"
                : "🟡 ожидает модерации";
            return (
              <div
                key={r.id}
                className="bg-bg-0 border border-line rounded-lg p-4 sm:p-5"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium">{r.customer.name}</div>
                    <div className="text-[12px] text-ink-mute">
                      {r.customer.phone} · {fmtDate(r.createdAt)}
                    </div>
                  </div>
                  <div className="text-gold-2 text-[16px]">
                    {"⭐".repeat(r.rating)}
                    <span className="text-ink-mute">{"⭐".repeat(5 - r.rating).replace(/⭐/g, "·")}</span>
                  </div>
                </div>
                {r.text ? (
                  <p className="text-[14px] text-ink-soft mt-3 mb-0 leading-relaxed italic">
                    «{r.text}»
                  </p>
                ) : (
                  <p className="text-[12px] text-ink-mute mt-3 mb-0 italic">
                    Только оценка, без текста.
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[12px] text-ink-mute">{stateLabel}</span>
                  <ReviewActions
                    id={r.id}
                    approved={r.approved}
                    hidden={r.hidden}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
