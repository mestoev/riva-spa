"use client";

import { useState } from "react";
import type { FAQItem } from "@/lib/settings";

export function FAQSection({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <section className="pb-16 sm:pb-24 lg:pb-32">
      <div className="container-x">
        <div className="max-w-[760px] mx-auto">
          <div className="eyebrow text-center">Вопросы</div>
          <h2
            className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3 mb-8 sm:mb-10 text-center"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            Часто <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>спрашивают</span>
          </h2>

          <div className="flex flex-col gap-3">
            {items.map((it, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={i}
                  className="bg-bg-0 border border-line rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <span className="font-medium text-[15px] sm:text-[16px]">{it.q}</span>
                    <span
                      className="shrink-0 text-ink-mute text-[20px] leading-none transition-transform"
                      style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="px-5 pb-5 text-ink-soft text-[14px] sm:text-[15px] leading-relaxed">
                      {it.a}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
