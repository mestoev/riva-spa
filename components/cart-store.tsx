"use client";

/**
 * Tiny cart store with localStorage persistence (AUDIT §3.8).
 * Used by Nav, ServiceCard "В корзину" buttons, BookingPage finalize, CartDrawer.
 *
 * AUDIT §3.2 — single source of truth: cart items added by ServiceCard
 *   are turned into bookings in BookingPage. No duplicates.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Service, Master, ScheduleDay } from "@/lib/data";

export type CartItem = {
  id: string;
  service: Service;
  master?: Master | null;
  day?: ScheduleDay | null;
  time?: string | null;
};

type CartCtx = {
  items: CartItem[];
  add: (s: Service) => void;
  remove: (id: string) => void;
  clear: () => void;
  update: (id: string, patch: Partial<CartItem>) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);

const STORAGE_KEY = "riva.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const add = useCallback((service: Service) => {
    setItems((c) => [
      ...c,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        service,
        master: null,
        day: null,
        time: null,
      },
    ]);
    setOpen(true);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((c) => c.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const update = useCallback((id: string, patch: Partial<CartItem>) => {
    setItems((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const value = useMemo<CartCtx>(
    () => ({ items, add, remove, clear, update, open, setOpen }),
    [items, add, remove, clear, update, open, setOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
