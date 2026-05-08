"use client";

/**
 * Home page sections — mobile-first port of the prototype.
 * AUDIT fixes applied:
 *  §2.2 — Hero stacks on <lg, image card hidden below sm to avoid clutter.
 *  §2.3 — Hero padding scales (64px mobile → 120px desktop).
 *  §2.4 — Floating price card moved INSIDE the card on mobile.
 *  §2.5 — Hero stats: 1 col on xs, 3 cols only from sm+.
 *  §2.8 — Gallery cell: width:300px hardcode removed.
 *  §2.10 — Footer split is in components/footer.tsx (1 → 2 → 4 cols).
 */
import Link from "next/link";
import { Icon } from "./icons";
import { ServiceCard } from "./service-card";
import { GALLERY, REVIEWS, type Service } from "@/lib/data";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background — animated water on >=sm, simple gradient on xs to save battery/perf */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 hidden sm:block water" />
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--pool-3) 0%, var(--pool-2) 50%, var(--wood-1) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,15,10,.15) 0%, rgba(20,15,10,.55) 100%)",
          }}
        />
      </div>

      <div
        className="container-x relative z-10 text-white
                   grid items-center
                   grid-cols-1 lg:grid-cols-[1.2fr_1fr]
                   gap-12 lg:gap-16
                   py-16 sm:py-24 lg:py-32"
        style={{ minHeight: "min(86vh, 760px)" }}
      >
        <div>
          <div
            className="rise inline-flex items-center gap-3 px-4 py-2 rounded-full mb-7
                       bg-white/15 backdrop-blur-md border border-white/20"
          >
            <span
              className="inline-block w-2 h-2 rounded-full bg-gold-1"
              style={{ boxShadow: "0 0 12px var(--gold-1)" }}
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase">
              Открыто · Запись на май–июнь
            </span>
          </div>

          <h1
            className="rise rise-d1 serif font-light m-0 -tracking-[0.02em]"
            style={{
              fontSize: "clamp(48px, 9vw, 124px)",
              lineHeight: 0.98,
            }}
          >
            Тишина
            <br />
            <span style={{ fontStyle: "italic", color: "var(--gold-1)" }}>у воды</span>
          </h1>

          <p className="rise rise-d2 mt-6 sm:mt-8 max-w-[480px] text-base sm:text-lg leading-relaxed text-white/85">
            Бассейн на террасе, банный комплекс и СПА в приватной обстановке.
            Тёплое дерево, мягкий свет и ритуалы, которые хочется повторить.
          </p>

          <div className="rise rise-d3 mt-8 sm:mt-10 flex gap-3 flex-wrap">
            <Link href="/booking" className="btn btn-gold">
              Записаться на процедуру
              <Icon.arrow style={{ width: 16, height: 16 }} />
            </Link>
            <Link
              href="/services"
              className="btn btn-ghost"
              style={{ borderColor: "rgba(255,255,255,.3)", color: "white" }}
            >
              Посмотреть услуги
            </Link>
          </div>

          <div className="rise rise-d4 mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-[540px]">
            {[
              ["12", "процедур\nв авторской программе"],
              ["28°", "температура\nводы в бассейне"],
              ["4.96", "средняя оценка\nпо отзывам"],
            ].map(([num, label]) => (
              <div
                key={num}
                className="border-t border-white/25 pt-4"
              >
                <div className="serif text-[32px] sm:text-[38px] leading-none font-light">
                  {num}
                </div>
                <div className="text-[12px] mt-2 opacity-75 leading-snug whitespace-pre-line">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — pool card. Hidden on xs (saves vertical space, perf) */}
        <div
          className="rise rise-d2 relative hidden md:block"
          style={{ height: "min(70vh, 620px)" }}
        >
          <div
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{ boxShadow: "0 40px 80px rgba(20,15,10,.4)" }}
          >
            <div className="water absolute inset-0" />
            <svg
              viewBox="0 0 400 600"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="arch" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="rgba(255,255,255,.25)" />
                  <stop offset="1" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              <path d="M0 200 Q 200 0, 400 200 L 400 0 L 0 0 Z" fill="url(#arch)" />
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <line
                  key={i}
                  x1={i * 70}
                  y1={Math.max(20, 200 - Math.sin((i / 6) * Math.PI) * 180)}
                  x2={i * 70}
                  y2={600}
                  stroke="rgba(74,53,39,.25)"
                  strokeWidth="2"
                />
              ))}
              <path
                d="M0 200 Q 200 0, 400 200"
                fill="none"
                stroke="rgba(74,53,39,.3)"
                strokeWidth="2"
              />
            </svg>

            {/* corner live label */}
            <div
              className="absolute top-5 left-5 px-3.5 py-2 rounded-full
                         bg-ink/50 backdrop-blur-md text-white
                         font-mono text-[10px] tracking-[0.2em] uppercase
                         flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e5e]" aria-hidden="true" />
              live · бассейн открыт
            </div>
          </div>

          {/* Floating price card — moved inside on small screens */}
          <div
            className="absolute bg-bg-0 text-ink rounded-lg shadow-lg border border-line
                       p-5 min-w-[220px]
                       bottom-[-28px] left-[-28px]"
          >
            <div className="eyebrow mb-2">Дневной пропуск</div>
            <div className="serif text-[28px] sm:text-[32px] font-light leading-none">
              18 000 <span className="text-[15px] sm:text-base text-ink-mute">₸ / 4 часа</span>
            </div>
            <div className="text-[12px] text-ink-mute mt-1">
              Бассейн · лежаки · чай и фрукты
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ServicesPreview({
  services,
  totalCount,
}: {
  services: Service[];
  totalCount: number;
}) {
  const featured = services.slice(0, 6);
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="container-x">
        <div className="flex items-end justify-between gap-6 mb-10 sm:mb-14 flex-wrap">
          <div>
            <div className="eyebrow">Программа · 02</div>
            <h2
              className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3"
              style={{ fontSize: "clamp(36px, 5.5vw, 72px)" }}
            >
              Ритуалы
              <br />
              <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>и процедуры</span>
            </h2>
          </div>
          <div className="max-w-[380px]">
            <p className="m-0 text-ink-soft text-base leading-relaxed">
              Программа выстроена так, чтобы вы могли провести у нас час или весь день.
              Каждый ритуал — отдельная глава.
            </p>
            <Link
              href="/services"
              className="mt-5 inline-flex items-center gap-2 text-[13px] text-ink
                         border-b border-ink pb-1"
            >
              Все услуги · {totalCount}
              <Icon.arrow style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PoolFeature() {
  return (
    <section className="pb-16 sm:pb-24 lg:pb-32">
      <div className="container-x">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 bg-ink text-bg-0 rounded-xl overflow-hidden"
          style={{ minHeight: 420 }}
        >
          <div className="p-7 sm:p-10 lg:p-14 flex flex-col justify-between gap-12">
            <div>
              <div className="eyebrow" style={{ color: "var(--gold-1)" }}>
                Бассейн на террасе
              </div>
              <h2
                className="serif font-light m-0 mt-5 leading-none"
                style={{ fontSize: "clamp(32px, 4.5vw, 64px)" }}
              >
                Открытая вода
                <br />
                под стеклянной аркой
              </h2>
              <p className="mt-6 text-base leading-relaxed text-bg-0/75 max-w-[420px]">
                Раздвижное остекление превращает крытый бассейн в террасу за минуту.
                Подогрев до 28°, лежаки из тика, вид на закат.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:gap-6">
              {[
                ["28°C", "Температура воды круглый год"],
                ["12 м", "Длина основной чаши"],
                ["8 лежаков", "Тик, мягкие подушки"],
                ["Чайная", "Каркаде, мята, имбирь"],
              ].map(([n, t]) => (
                <div key={n} className="border-t border-gold-1/25 pt-3">
                  <div className="serif text-[20px] sm:text-[22px] text-gold-2">{n}</div>
                  <div className="text-[12px] text-bg-0/60 mt-1">{t}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="water relative min-h-[260px] lg:min-h-0"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(42,31,23,.4), transparent 30%)",
              }}
            />
            <div
              className="absolute top-10 right-10 w-[72px] h-[72px] rounded-full"
              style={{
                background: "radial-gradient(circle, var(--gold-1), var(--gold-2))",
                boxShadow: "0 0 60px var(--gold-1)",
              }}
            />
            <div
              className="absolute bottom-10 left-10 px-5 py-3.5 rounded-md
                         bg-ink/55 backdrop-blur-md text-white
                         font-mono text-[11px] tracking-[0.2em] uppercase"
            >
              28°C · открыто до 23:00
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function GalleryStrip() {
  return (
    <section className="pb-16 sm:pb-24 lg:pb-32">
      <div className="container-x">
        <div className="flex items-end justify-between gap-6 mb-10 sm:mb-14 flex-wrap">
          <div>
            <div className="eyebrow">Интерьеры · 03</div>
            <h2
              className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3"
              style={{ fontSize: "clamp(36px, 5.5vw, 72px)" }}
            >
              Пространство
              <br />
              <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>в деталях</span>
            </h2>
          </div>
          <Link
            href="/gallery"
            className="text-[13px] text-ink border-b border-ink pb-1
                       inline-flex items-center gap-2"
          >
            Смотреть все · {GALLERY.length}
            <Icon.arrow style={{ width: 14, height: 14 }} />
          </Link>
        </div>

        <div
          className="grid gap-3 sm:gap-4
                     grid-cols-2 sm:grid-cols-3 lg:grid-cols-6
                     auto-rows-[180px] sm:auto-rows-[200px] lg:auto-rows-[220px]"
        >
          {GALLERY.map((g, i) => {
            const lgSpan = [
              "lg:col-span-3 lg:row-span-2",
              "lg:col-span-2",
              "lg:col-span-1",
              "lg:col-span-2",
              "lg:col-span-2",
              "lg:col-span-2",
            ];
            return (
              <Link
                key={g.id}
                href="/gallery"
                aria-label={`Открыть фото: ${g.title}`}
                className={`relative rounded-lg overflow-hidden border border-line
                            ${lgSpan[i] ?? "lg:col-span-2"}`}
                style={{
                  background:
                    g.tone === "pool"
                      ? "linear-gradient(135deg, var(--pool-1), var(--pool-3))"
                      : g.tone === "wood"
                        ? "linear-gradient(135deg, var(--wood-1), var(--wood-3))"
                        : "linear-gradient(135deg, var(--bg-1), var(--bg-2))",
                  color: g.tone === "cream" ? "var(--ink)" : "white",
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      g.tone === "cream"
                        ? "linear-gradient(180deg, transparent 50%, rgba(250,246,240,.85) 100%)"
                        : "linear-gradient(180deg, transparent 40%, rgba(20,15,10,.6) 100%)",
                  }}
                />
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                  <div className="serif text-[18px] sm:text-[20px]">{g.title}</div>
                  <div className="text-[12px] opacity-85 mt-0.5">{g.subtitle}</div>
                </div>
                <div
                  className="absolute top-3 right-3 w-9 h-9 rounded-full
                             bg-white/90 text-ink flex items-center justify-center
                             pointer-events-none"
                >
                  <Icon.zoom style={{ width: 14, height: 14 }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Reviews() {
  return (
    <section className="bg-bg-1 pb-16 sm:pb-24 lg:pb-32">
      <div className="container-x pt-16 sm:pt-24 lg:pt-32">
        <div className="flex items-end justify-between gap-6 mb-10 sm:mb-14 flex-wrap">
          <div>
            <div className="eyebrow">Отзывы · 04</div>
            <h2
              className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3"
              style={{ fontSize: "clamp(36px, 5.5vw, 72px)" }}
            >
              О чём говорят
              <br />
              <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>гости</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="serif text-[44px] sm:text-[56px] leading-none font-light">4.96</div>
            <div>
              <div className="flex gap-0.5 text-gold-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Icon.star key={i} style={{ width: 14, height: 14 }} />
                ))}
              </div>
              <div className="text-[12px] text-ink-mute mt-1">312 отзывов · Яндекс</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REVIEWS.map((r) => (
            <article
              key={r.id}
              className="bg-bg-0 p-7 rounded-lg border border-line"
            >
              <div className="flex gap-0.5 text-gold-2 mb-4">
                {Array(r.rating)
                  .fill(0)
                  .map((_, i) => (
                    <Icon.star key={i} style={{ width: 14, height: 14 }} />
                  ))}
              </div>
              <p className="serif text-[18px] sm:text-[20px] leading-tight italic m-0 text-ink">
                «{r.text}»
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--wood-1), var(--wood-2))",
                    fontFamily: "var(--serif)",
                    fontSize: 16,
                  }}
                  aria-hidden="true"
                >
                  {r.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-[12px] text-ink-mute">{r.when}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
