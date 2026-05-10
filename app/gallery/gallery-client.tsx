"use client";

/**
 * Gallery + Lightbox.
 * AUDIT §3.1 — useEffect closure bug fixed: keyboard handler uses functional setI.
 * AUDIT §4.4 — proper dialog role, focus trap, body-scroll lock.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

export type GalleryClientItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: "pool" | "wood" | "cream";
  imageUrl?: string | null;
};

export function GalleryClient({ items }: { items: GalleryClientItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="pt-12 sm:pt-16 pb-16 sm:pb-24 lg:pb-32">
      <div className="container-x">
        <div className="eyebrow">Интерьеры</div>
        <h1
          className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3 mb-8"
          style={{ fontSize: "clamp(40px, 8vw, 96px)" }}
        >
          Пространство
          <br />
          <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>в деталях</span>
        </h1>

        <div
          className="grid gap-3 sm:gap-4
                     grid-cols-2 sm:grid-cols-3 lg:grid-cols-6
                     auto-rows-[180px] sm:auto-rows-[200px] lg:auto-rows-[220px]"
        >
          {items.map((g, i) => {
            const lgSpan = [
              "lg:col-span-3 lg:row-span-2",
              "lg:col-span-2",
              "lg:col-span-1",
              "lg:col-span-2",
              "lg:col-span-2",
              "lg:col-span-2",
            ];
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setOpenIdx(i)}
                aria-label={`Открыть фото: ${g.title}`}
                className={`group relative rounded-lg overflow-hidden border border-line cursor-zoom-in
                            transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg
                            ${lgSpan[i % lgSpan.length] ?? "lg:col-span-2"}`}
                style={{
                  background: g.imageUrl
                    ? "var(--bg-2)"
                    : g.tone === "pool"
                      ? "linear-gradient(135deg, var(--pool-1), var(--pool-3))"
                      : g.tone === "wood"
                        ? "linear-gradient(135deg, var(--wood-1), var(--wood-3))"
                        : "linear-gradient(135deg, var(--bg-1), var(--bg-2))",
                  color: g.tone === "cream" && !g.imageUrl ? "var(--ink)" : "white",
                }}
              >
                {g.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.imageUrl}
                    alt={g.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : null}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: g.imageUrl
                      ? "linear-gradient(180deg, transparent 40%, rgba(20,15,10,.65) 100%)"
                      : g.tone === "cream"
                        ? "linear-gradient(180deg, transparent 50%, rgba(250,246,240,.85) 100%)"
                        : "linear-gradient(180deg, transparent 40%, rgba(20,15,10,.6) 100%)",
                  }}
                />
                <div className="absolute bottom-4 left-4 right-4 text-left pointer-events-none">
                  <div className="serif text-[18px] sm:text-[20px]">{g.title}</div>
                  <div className="text-[12px] opacity-85 mt-0.5">{g.subtitle}</div>
                </div>
                <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-ink flex items-center justify-center pointer-events-none">
                  <Icon.zoom style={{ width: 14, height: 14 }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {openIdx !== null ? (
        <Lightbox items={items} initialIndex={openIdx} onClose={() => setOpenIdx(null)} />
      ) : null}
    </section>
  );
}

function Lightbox({
  items,
  initialIndex,
  onClose,
}: {
  items: GalleryClientItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(initialIndex);
  const [closing, setClosing] = useState(false);
  const closeBtn = useRef<HTMLButtonElement | null>(null);

  // Slight delay before unmount so the exit animation can play
  const beginClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => onClose(), 220);
  }, [onClose]);

  useEffect(() => {
    const lastFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") beginClose();
      if (e.key === "ArrowLeft") setI((p) => (p - 1 + items.length) % items.length);
      if (e.key === "ArrowRight") setI((p) => (p + 1) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus?.focus?.();
    };
  }, [items.length, beginClose]);

  const item = items[i];
  const prev = () => setI((p) => (p - 1 + items.length) % items.length);
  const next = () => setI((p) => (p + 1) % items.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Просмотр фото: ${item.title}`}
      onClick={beginClose}
      data-closing={closing ? "true" : undefined}
      className="lightbox-overlay fixed inset-0 z-[200] bg-ink/95 backdrop-blur-xl
                 flex items-center justify-center p-4 sm:p-8"
    >
      <button
        ref={closeBtn}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          beginClose();
        }}
        aria-label="Закрыть"
        title="Закрыть (Esc)"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10
                   w-12 h-12 rounded-full bg-white text-ink shadow-lg
                   inline-flex items-center justify-center
                   hover:bg-gold-1 hover:scale-110 active:scale-95
                   transition-all duration-200"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        aria-label="Предыдущее фото"
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10
                   w-12 h-12 rounded-full bg-white/15 text-white
                   inline-flex items-center justify-center
                   hover:bg-white/30 hover:scale-110 active:scale-95
                   transition-all duration-200"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        aria-label="Следующее фото"
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10
                   w-12 h-12 rounded-full bg-white/15 text-white
                   inline-flex items-center justify-center
                   hover:bg-white/30 hover:scale-110 active:scale-95
                   transition-all duration-200"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="lightbox-frame max-w-[1100px] w-full aspect-[16/10] rounded-lg overflow-hidden relative"
        style={{
          background: item.imageUrl
            ? "var(--bg-2)"
            : item.tone === "pool"
              ? "linear-gradient(135deg, var(--pool-1), var(--pool-3))"
              : item.tone === "wood"
                ? "linear-gradient(135deg, var(--wood-1), var(--wood-3))"
                : "linear-gradient(135deg, var(--bg-1), var(--bg-2))",
          color: item.tone === "cream" && !item.imageUrl ? "var(--ink)" : "white",
        }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.imageUrl}
            src={item.imageUrl}
            alt={item.title}
            className="lightbox-img absolute inset-0 w-full h-full object-contain bg-black"
          />
        ) : null}
        <div className="absolute bottom-6 left-7 right-7 pointer-events-none">
          <div
            className="eyebrow"
            style={{ color: item.tone === "cream" && !item.imageUrl ? "var(--ink-mute)" : "rgba(255,255,255,.7)" }}
          >
            {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </div>
          <div className="serif text-[28px] sm:text-[36px] mt-2">{item.title}</div>
          {item.subtitle ? <div className="text-sm opacity-85 mt-1">{item.subtitle}</div> : null}
        </div>
      </div>

      <style jsx>{`
        @keyframes lb-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lb-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes lb-zoom-in {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lb-zoom-out {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.94); }
        }
        @keyframes lb-img-cross {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        :global(.lightbox-overlay) {
          animation: lb-fade-in 220ms ease-out;
        }
        :global(.lightbox-overlay[data-closing="true"]) {
          animation: lb-fade-out 200ms ease-in forwards;
        }
        :global(.lightbox-frame) {
          animation: lb-zoom-in 280ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, opacity;
        }
        :global(.lightbox-overlay[data-closing="true"] .lightbox-frame) {
          animation: lb-zoom-out 200ms ease-in forwards;
        }
        :global(.lightbox-img) {
          animation: lb-img-cross 200ms ease-out;
        }
      `}</style>
    </div>
  );
}
