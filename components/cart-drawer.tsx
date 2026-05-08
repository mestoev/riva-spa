"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "./cart-store";
import { Icon } from "./icons";

export function CartDrawer() {
  const { items, remove, open, setOpen } = useCart();
  const total = items.reduce((s, c) => s + (c.service?.price || 0), 0);
  const closeBtn = useRef<HTMLButtonElement | null>(null);

  // a11y: lock scroll, focus, ESC to close (AUDIT §4.5)
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
    };
  }, [open, setOpen]);

  return (
    <>
      <button
        type="button"
        aria-label="Закрыть корзину"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[90] bg-ink/50 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Корзина"
        aria-hidden={!open}
        className={`fixed top-0 right-0 bottom-0 z-[100]
                   w-[min(420px,92vw)] bg-bg-0 shadow-lg
                   transition-transform duration-300 ease-out
                   flex flex-col
                   ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="px-5 sm:px-7 py-5 flex justify-between items-center border-b border-line">
          <div>
            <div className="eyebrow">Корзина</div>
            <div className="serif text-[20px] sm:text-[22px] mt-1">Ваши записи</div>
          </div>
          <button
            ref={closeBtn}
            type="button"
            onClick={() => setOpen(false)}
            className="w-10 h-10 rounded-full border border-line inline-flex items-center justify-center"
            aria-label="Закрыть корзину"
          >
            <Icon.close style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="text-center py-16 text-ink-mute">
              <div className="w-[72px] h-[72px] rounded-full bg-bg-1 inline-flex items-center justify-center mb-4">
                <Icon.basket style={{ width: 24, height: 24 }} />
              </div>
              <p className="m-0">
                Корзина пуста.<br />
                Выберите процедуру и забронируйте время.
              </p>
              <Link
                href="/services"
                onClick={() => setOpen(false)}
                className="btn btn-primary mt-4 inline-flex"
              >
                К услугам
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-md bg-bg-1 border border-line-soft"
                >
                  <div className="flex justify-between gap-2">
                    <div className="serif text-[16px] sm:text-[17px] font-medium">
                      {item.service.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`Удалить «${item.service.name}»`}
                      className="text-ink-mute"
                    >
                      <Icon.close style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                  <div className="mt-1.5 flex gap-2 text-[12px] text-ink-soft flex-wrap">
                    <span>{item.master?.name ?? "Любой мастер"}</span>
                    {item.day ? <span>· {item.day.day} {item.day.month}</span> : null}
                    {item.time ? <span>· {item.time}</span> : null}
                    <span>· {item.service.duration} мин</span>
                  </div>
                  <div className="mt-3 flex justify-between items-baseline">
                    <span className="text-[12px] text-ink-mute">
                      {item.day ? "Запись" : "В корзине"}
                    </span>
                    <span className="serif text-[18px] font-medium">
                      {item.service.price.toLocaleString("ru-RU")} ₸
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="p-6 border-t border-line bg-bg-1">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-[13px] text-ink-mute">Итого</span>
              <span className="serif text-[26px] sm:text-[28px]">
                {total.toLocaleString("ru-RU")} <span className="text-sm text-ink-mute">₸</span>
              </span>
            </div>
            <Link
              href="/booking"
              onClick={() => setOpen(false)}
              className="btn btn-primary w-full justify-center"
            >
              Перейти к записи
              <Icon.arrow style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}
