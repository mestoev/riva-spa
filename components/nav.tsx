"use client";

/**
 * Navigation header — fully rebuilt per AUDIT §2.1.
 * On <840px: hamburger button + slide-down sheet.
 * On >=840px: inline nav like the prototype.
 *
 * Uses real <Link> elements (AUDIT §4.1), aria-current for active route (§4.2),
 * focus management on sheet open/close, body-scroll lock when sheet is open.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, Logo } from "./icons";
import { useCart } from "./cart-store";
import type { SiteSettings } from "@/lib/settings";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/services", label: "Услуги" },
  { href: "/booking", label: "Запись" },
  { href: "/gallery", label: "Галерея" },
  { href: "/contact", label: "Контакты" },
] as const;

export function Nav({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const openBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body scroll lock + focus management
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      openBtnRef.current?.focus();
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-line-soft backdrop-blur-xl bg-bg-0/85">
      <div className="container-x flex items-center justify-between gap-4 h-[64px] md:h-[76px]">
        <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="RIVA POOL SPA — на главную">
          <Logo size={20} />
          <span className="hidden sm:inline-block pl-3 border-l border-line font-mono text-[10px] tracking-[0.24em] text-ink-mute">
            POOL · SPA
          </span>
        </Link>

        {/* Desktop nav (>=840px) */}
        <nav className="hidden lg:flex gap-1" aria-label="Главное меню">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`px-4 py-[10px] rounded-full text-sm transition-all ${
                isActive(item.href)
                  ? "text-ink bg-bg-1"
                  : "text-ink-soft hover:text-ink hover:bg-bg-1/60"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cart.setOpen(true)}
            aria-label={`Корзина${cart.items.length ? `, ${cart.items.length} позиций` : ", пусто"}`}
            className="relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-line"
          >
            <Icon.basket style={{ width: 16, height: 16 }} />
            {cart.items.length > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-pool-2 text-white text-[11px] font-semibold inline-flex items-center justify-center"
              >
                {cart.items.length}
              </span>
            ) : null}
          </button>

          <Link
            href="/booking"
            className="hidden sm:inline-flex btn btn-primary !py-[10px] !px-[18px] !text-[13px]"
          >
            Записаться
            <Icon.arrow style={{ width: 14, height: 14 }} />
          </Link>

          {/* Mobile hamburger (<840px) */}
          <button
            ref={openBtnRef}
            type="button"
            onClick={() => setOpen(true)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-line"
            aria-label="Открыть меню"
            aria-expanded={open}
            aria-controls={sheetId}
          >
            <Icon.menu style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-[60]" id={sheetId} role="dialog" aria-modal="true" aria-label="Меню">
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-in fade-in"
          />
          <div className="absolute top-0 left-0 right-0 bg-bg-0 shadow-lg p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Logo size={22} />
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setOpen(false)}
                className="w-11 h-11 rounded-full border border-line inline-flex items-center justify-center"
                aria-label="Закрыть"
              >
                <Icon.close style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <nav aria-label="Меню" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center justify-between px-4 py-4 rounded-md text-base ${
                    isActive(item.href) ? "bg-bg-1 text-ink" : "text-ink-soft hover:bg-bg-1"
                  }`}
                >
                  <span>{item.label}</span>
                  <Icon.arrow style={{ width: 16, height: 16, opacity: 0.5 }} />
                </Link>
              ))}
            </nav>

            <Link
              href="/booking"
              className="btn btn-gold w-full mt-6 justify-center !py-4"
            >
              Записаться на процедуру
              <Icon.arrow style={{ width: 16, height: 16 }} />
            </Link>

            <div className="mt-6 pt-6 border-t border-line text-sm text-ink-soft">
              <a href={`tel:${settings.phoneRaw}`} className="block py-2">
                {settings.phone}
              </a>
              <a href={`mailto:${settings.email}`} className="block py-2">
                {settings.email}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
