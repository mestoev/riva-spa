"use client";

import { Icon } from "./icons";
import type { Service, Category } from "@/lib/data";

const CATEGORY_LABELS: Record<string, string> = {
  massage: "Массажи",
  pool: "Бассейн",
  bath: "Сауна и хаммам",
  face: "Уход за лицом",
  duo: "Программы для двоих",
};

function CategoryArt({ cat }: { cat: Service["cat"] }) {
  const bg =
    cat === "pool"
      ? "linear-gradient(135deg, var(--pool-1), var(--pool-3))"
      : cat === "duo"
        ? "linear-gradient(135deg, var(--gold-1), var(--wood-1))"
        : cat === "face"
          ? "linear-gradient(135deg, var(--bg-1), var(--bg-2))"
          : cat === "bath"
            ? "linear-gradient(135deg, var(--wood-1), var(--wood-2))"
            : "linear-gradient(135deg, var(--bg-2), var(--wood-1))";

  return (
    <div className="relative w-full h-full" style={{ background: bg }}>
      <svg viewBox="0 0 200 200" className="w-full h-full opacity-35" aria-hidden="true">
        {cat === "pool" &&
          [0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M0 ${50 + i * 40} Q 50 ${30 + i * 40}, 100 ${50 + i * 40} T 200 ${50 + i * 40}`}
              fill="none"
              stroke="white"
              strokeWidth="1.2"
              opacity={0.5 + i * 0.1}
            />
          ))}
        {cat === "massage" && (
          <g stroke="white" strokeWidth="1" fill="none" opacity="0.6">
            <circle cx="100" cy="100" r="40" />
            <circle cx="100" cy="100" r="60" />
            <circle cx="100" cy="100" r="80" />
          </g>
        )}
        {cat === "bath" &&
          [0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${i * 50} 200 Q ${i * 50 + 25} ${100 + Math.sin(i) * 30}, ${i * 50 + 50} 200`}
              fill="none"
              stroke="white"
              strokeWidth="1.2"
              opacity="0.6"
            />
          ))}
        {cat === "face" && (
          <g stroke="var(--wood-2)" strokeWidth="1" fill="none" opacity="0.6">
            <ellipse cx="100" cy="100" rx="50" ry="60" />
            <ellipse cx="100" cy="100" rx="30" ry="40" />
          </g>
        )}
        {cat === "duo" && (
          <g fill="none" stroke="var(--wood-3)" strokeWidth="1.2" opacity="0.5">
            <circle cx="80" cy="100" r="30" />
            <circle cx="120" cy="100" r="30" />
          </g>
        )}
      </svg>
    </div>
  );
}

export function ServiceCard({
  service,
  layout = "grid",
  onAdd,
}: {
  service: Service;
  layout?: "grid" | "list" | "featured";
  onAdd?: (s: Service) => void;
}) {
  const isList = layout === "list";

  return (
    <article
      className={`group bg-bg-0 border border-line rounded-lg overflow-hidden
                  flex transition-all duration-200 hover:-translate-y-1 hover:shadow-md
                  ${isList ? "flex-col sm:flex-row" : "flex-col"}`}
    >
      <div
        className={`relative shrink-0 overflow-hidden ${
          isList ? "h-44 sm:h-auto sm:w-48" : "h-44 sm:h-52"
        }`}
      >
        {service.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <CategoryArt cat={service.cat} />
        )}

        {service.tag ? (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-ink
                          text-[10px] font-semibold tracking-wide uppercase">
            {service.tag}
          </div>
        ) : null}

        <div className="absolute bottom-3 right-3 font-mono text-[10px] tracking-[0.2em]
                        uppercase text-white/85">
          {CATEGORY_LABELS[service.cat]}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="serif m-0 text-[20px] sm:text-[22px] font-normal leading-tight">
          {service.name}
        </h3>
        <p className="mt-2 mb-4 text-[14px] text-ink-soft leading-relaxed flex-1">
          {service.desc}
        </p>

        <div className="pt-4 border-t border-line-soft flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-1.5 text-[12px] text-ink-mute">
              <Icon.clock style={{ width: 12, height: 12 }} />
              {service.duration} мин
            </div>
            <div className="serif text-[20px] sm:text-[22px] mt-1">
              {service.price.toLocaleString("ru-RU")}{" "}
              <span className="text-[13px] text-ink-mute">₸</span>
            </div>
          </div>
          {onAdd ? (
            <button
              type="button"
              onClick={() => onAdd(service)}
              className="px-4 py-2.5 rounded-full bg-ink text-bg-0 text-[13px]
                         inline-flex items-center gap-1.5"
            >
              В корзину
              <Icon.arrow style={{ width: 14, height: 14 }} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CategoryFilter({
  active,
  onChange,
  categories,
  size = "md",
}: {
  active: string;
  onChange: (id: string) => void;
  categories: Category[];
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {categories.map((c) => {
        const on = active === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            aria-pressed={on}
            className={`rounded-full transition-colors ${
              size === "sm" ? "px-3 py-2 text-[12px]" : "px-4 py-2.5 text-[13px]"
            } ${
              on
                ? "bg-ink text-bg-0 border border-ink"
                : "bg-transparent text-ink-soft border border-line hover:bg-bg-1"
            }`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
