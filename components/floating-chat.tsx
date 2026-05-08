"use client";

// AUDIT §2.9 — was overlapping booking CTA on mobile.
// Now: hidden on /booking and /contact, smaller on mobile, with a safe-area inset offset.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

export function FloatingChat() {
  const path = usePathname();
  if (path?.startsWith("/booking") || path?.startsWith("/contact")) return null;

  return (
    <Link
      href="/contact"
      aria-label="Открыть чат"
      className="fixed z-40 inline-flex items-center justify-center bg-ink text-bg-0 shadow-md
                 right-4 bottom-4 w-12 h-12 rounded-full
                 md:right-6 md:bottom-6 md:w-14 md:h-14"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Icon.chat style={{ width: 20, height: 20 }} />
    </Link>
  );
}
