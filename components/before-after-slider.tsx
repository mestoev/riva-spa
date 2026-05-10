"use client";

/**
 * Interactive before/after slider — drag the divider to compare photos.
 * Touch + mouse + keyboard friendly.
 */
import { useRef, useState } from "react";

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  title,
  description,
}: {
  beforeUrl: string;
  afterUrl: string;
  title: string;
  description?: string | null;
}) {
  const [pos, setPos] = useState(50); // percent 0..100
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  function handleMove(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    setPos(Math.round((x / rect.width) * 100));
  }

  return (
    <figure className="rounded-lg overflow-hidden border border-line bg-bg-1">
      <div
        ref={containerRef}
        role="slider"
        aria-label={`Сравнение до и после: ${title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pos}
        tabIndex={0}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          handleMove(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) handleMove(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
          if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
        }}
        className="relative aspect-[4/3] sm:aspect-[3/2] cursor-ew-resize select-none touch-none"
      >
        {/* After (background) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt={`${title} — после`}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        {/* Before (clipped to left side via inset-clip) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${pos}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt={`${title} — до`}
            className="absolute inset-0 h-full object-cover"
            style={{ width: `calc(100% * 100 / ${pos || 1})` }}
            draggable={false}
          />
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-ink/70 text-bg-0 text-[11px] font-mono uppercase tracking-wider pointer-events-none">
          До
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded bg-ink/70 text-bg-0 text-[11px] font-mono uppercase tracking-wider pointer-events-none">
          После
        </div>

        {/* Divider line + handle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white shadow-md pointer-events-none"
          style={{ left: `${pos}%`, transform: "translateX(-1px)" }}
        />
        <div
          className="absolute top-1/2 w-10 h-10 -mt-5 -ml-5 rounded-full bg-white shadow-lg flex items-center justify-center text-ink pointer-events-none"
          style={{ left: `${pos}%` }}
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <figcaption className="p-4">
        <div className="serif text-[18px] leading-tight">{title}</div>
        {description ? (
          <div className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{description}</div>
        ) : null}
      </figcaption>
    </figure>
  );
}
