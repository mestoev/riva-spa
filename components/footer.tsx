import Link from "next/link";
import { Icon, Logo } from "./icons";
import type { SiteSettings } from "@/lib/settings";

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="bg-ink text-bg-0 pt-16 md:pt-24 pb-8">
      <div className="container-x">
        <div className="grid gap-10 md:gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Logo size={28} />
            <p className="mt-6 text-[14px] leading-[1.6] text-bg-0/70 max-w-[320px]">
              {settings.tagline}. Бассейн на террасе и СПА в приватной обстановке.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/booking" className="btn btn-gold">
                Записаться
              </Link>
              <Link
                href="/contact"
                className="btn btn-ghost"
                style={{ borderColor: "rgba(232,201,138,.25)", color: "var(--bg-0)" }}
              >
                <Icon.chat style={{ width: 16, height: 16 }} /> Чат
              </Link>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ color: "var(--gold-1)" }}>Навигация</div>
            <ul className="list-none p-0 mt-5 flex flex-col gap-3 text-sm">
              {[
                ["/", "Главная"],
                ["/services", "Услуги"],
                ["/booking", "Запись"],
                ["/gallery", "Галерея"],
                ["/contact", "Контакты"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-bg-0/80 hover:text-bg-0">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="eyebrow" style={{ color: "var(--gold-1)" }}>Адрес</div>
            <p className="mt-5 text-sm leading-[1.6] text-bg-0/80">
              {settings.addressLine}
              <br />
              {settings.city}
              <br />
              <br />
              Пн–Чт: {settings.hoursMonThu}
              <br />
              Пт–Вс: {settings.hoursFriSun}
            </p>
          </div>

          <div>
            <div className="eyebrow" style={{ color: "var(--gold-1)" }}>Связь</div>
            <p className="mt-5 text-sm leading-[1.8] text-bg-0/80">
              <a href={`tel:${settings.phoneRaw}`}>{settings.phone}</a>
              <br />
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
              <br />
              {settings.instagram}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gold-1/15 flex flex-wrap justify-between gap-4 text-[12px] font-mono tracking-widest text-bg-0/40">
          <span>© {new Date().getFullYear()} {settings.name}</span>
          <span>POOL · SPA · TERRACE</span>
        </div>
      </div>
    </footer>
  );
}
