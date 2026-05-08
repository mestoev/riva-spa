"use client";

import { useMemo, useState } from "react";
import type { Service, Category } from "@/lib/data";
import { CategoryFilter, ServiceCard } from "@/components/service-card";
import { useCart } from "@/components/cart-store";

export function ServicesPageClient({
  services,
  categories,
}: {
  services: Service[];
  categories: Category[];
}) {
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "duration">("default");
  const cart = useCart();

  const filtered = useMemo(() => {
    let list = cat === "all" ? services : services.filter((s) => s.cat === cat);
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "duration") list = [...list].sort((a, b) => a.duration - b.duration);
    return list;
  }, [cat, sort, services]);

  return (
    <section className="pt-12 sm:pt-16 pb-16 sm:pb-24 lg:pb-32">
      <div className="container-x">
        <div className="eyebrow">Каталог</div>
        <h1
          className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3"
          style={{ fontSize: "clamp(40px, 8vw, 96px)" }}
        >
          Все ритуалы
          <br />
          <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>и процедуры</span>
        </h1>
        <p className="mt-5 max-w-[540px] text-ink-soft text-base leading-relaxed">
          Выбирайте по настроению — от бассейна на четверть дня до парных ритуалов с маслами.
          Цены указаны за одного гостя, если не отмечено иное.
        </p>

        <div
          className="mt-10 sm:mt-12 flex flex-col md:flex-row md:items-center md:justify-between
                     gap-4 pb-6 border-b border-line"
        >
          <CategoryFilter
            categories={categories}
            active={cat}
            onChange={setCat}
          />
          <div className="flex items-center gap-2.5">
            <label htmlFor="sort" className="text-[12px] text-ink-mute">
              Сортировка:
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="px-3.5 py-2 rounded-full border border-line bg-transparent text-[13px]"
            >
              <option value="default">По умолчанию</option>
              <option value="price-asc">Цена: ↑</option>
              <option value="price-desc">Цена: ↓</option>
              <option value="duration">Длительность</option>
            </select>
          </div>
        </div>

        <div className="mt-8 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <ServiceCard key={s.id} service={s} onAdd={cart.add} />
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-ink-mute">Ничего не найдено</div>
        ) : null}
      </div>
    </section>
  );
}
