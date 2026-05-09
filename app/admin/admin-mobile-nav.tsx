"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const NAV = [
  { href: "/admin", label: "Дашборд", exact: true },
  { href: "/admin/bookings", label: "Заявки" },
  { href: "/admin/calendar", label: "Календарь" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/masters", label: "Мастера" },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/gallery", label: "Галерея" },
  { href: "/admin/promotions", label: "Промокоды" },
  { href: "/admin/reviews", label: "Отзывы" },
  { href: "/admin/settings", label: "Настройки" },
];

export function AdminMobileNav({ logout }: { logout: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const closeBtn = useRef<HTMLButtonElement | null>(null);
  const openBtn = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      openBtn.current?.focus();
    };
  }, [open]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href);

  const currentLabel =
    NAV.find((n) => isActive(n.href, n.exact))?.label ?? "Меню";

  return (
    <>
      <header className="lg:hidden bg-ink text-bg-0 px-4 py-3 sticky top-0 z-40 flex items-center justify-between gap-3">
        <Link href="/admin" className="flex items-center gap-2 min-w-0">
          <span className="serif text-[18px] font-light tracking-wider">RIVA</span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-bg-0/60 truncate">
            {currentLabel}
          </span>
        </Link>
        <button
          ref={openBtn}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть меню"
          aria-expanded={open}
          aria-controls={sheetId}
          className="w-10 h-10 inline-flex items-center justify-center rounded-md bg-bg-0/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {open ? (
        <div
          id={sheetId}
          role="dialog"
          aria-modal="true"
          aria-label="Меню админки"
          className="lg:hidden fixed inset-0 z-50"
        >
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
          />
          <div className="absolute top-0 left-0 right-0 bg-ink text-bg-0 p-5 pb-7 max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <span className="serif text-[20px] font-light tracking-wider">RIVA admin</span>
              <button
                ref={closeBtn}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть меню"
                className="w-10 h-10 inline-flex items-center justify-center rounded-md bg-bg-0/10"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1" aria-label="Админ-меню">
              {NAV.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-md text-[15px] ${
                      active
                        ? "bg-bg-0/15 text-bg-0"
                        : "text-bg-0/80 hover:bg-bg-0/10"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true" className="opacity-50">→</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-5 pt-5 border-t border-bg-0/10">{logout}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
