// Inline SVG icons — ported from prototype shell.jsx with TypeScript types
import { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export const Icon = {
  arrow: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  arrowL: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  ),
  close: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  check: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M5 12l5 5L20 6" />
    </svg>
  ),
  star: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M12 2l2.9 6.5 7.1.8-5.3 4.9 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 9.3l7.1-.8z" />
    </svg>
  ),
  zoom: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...p}>
      <circle cx="11" cy="11" r="6" />
      <path d="M21 21l-5-5M9 11h4M11 9v4" />
    </svg>
  ),
  chat: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
    </svg>
  ),
  menu: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  play: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M7 4v16l13-8z" />
    </svg>
  ),
  pin: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  clock: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  basket: (p: Props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M4 8h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 8zM8 8a4 4 0 0 1 8 0" />
    </svg>
  ),
};

export function Logo({ size = 22, gold = true }: { size?: number; gold?: boolean }) {
  return (
    <span
      className="inline-flex items-baseline gap-[6px] font-display font-light"
      style={{ fontSize: size, letterSpacing: "0.18em" }}
    >
      <span style={{ letterSpacing: "0.22em" }}>RIV</span>
      <span
        style={{
          display: "inline-block",
          width: size * 0.7,
          height: size * 0.85,
          position: "relative",
          transform: "translateY(2px)",
        }}
      >
        <svg viewBox="0 0 30 36" style={{ width: "100%", height: "100%" }} aria-hidden="true">
          <path
            d="M3 4 L15 32 L27 4"
            fill="none"
            stroke={gold ? "var(--gold-2)" : "currentColor"}
            strokeWidth="2"
            strokeLinejoin="miter"
          />
          <path
            d="M5 30 Q 9 27, 13 30 T 21 30 T 28 30"
            fill="none"
            stroke={gold ? "var(--gold-2)" : "currentColor"}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </span>
  );
}
