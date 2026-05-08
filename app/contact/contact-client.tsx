"use client";

/**
 * Contact page.
 * AUDIT §3.4 — form is now real (state + submit).
 * AUDIT §3.5 — chat tab points to Telegram instead of fake setTimeout reply.
 */
import { useState } from "react";
import type { SiteSettings } from "@/lib/settings";
import { Icon } from "@/components/icons";
import { submitContact } from "../actions/contact";

type Tab = "form" | "call" | "chat";

export function ContactClient({ settings }: { settings: SiteSettings }) {
  const [tab, setTab] = useState<Tab>("form");
  const CONTACT = settings;

  return (
    <section className="pt-12 sm:pt-16 pb-16 sm:pb-24 lg:pb-32">
      <div className="container-x">
        <div className="eyebrow">Связь</div>
        <h1
          className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3 mb-8"
          style={{ fontSize: "clamp(40px, 8vw, 96px)" }}
        >
          Поговорим
          <br />
          <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>напрямую</span>
        </h1>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-8 items-start">
          <div className="bg-bg-0 border border-line rounded-xl p-5 sm:p-8 min-h-[440px] flex flex-col">
            <div className="flex gap-1.5 mb-6 flex-wrap" role="tablist" aria-label="Способы связи">
              {(
                [
                  ["form", "Форма"],
                  ["call", "Звонок"],
                  ["chat", "Telegram"],
                ] as const
              ).map(([id, l]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className="px-4 py-2.5 rounded-full text-[13px]"
                  style={{
                    background: tab === id ? "var(--ink)" : "transparent",
                    color: tab === id ? "var(--bg-0)" : "var(--ink-soft)",
                    border: `1px solid ${tab === id ? "var(--ink)" : "var(--line)"}`,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            {tab === "form" ? <ContactForm /> : null}
            {tab === "call" ? <CallTab settings={CONTACT} /> : null}
            {tab === "chat" ? <TelegramTab settings={CONTACT} /> : null}
          </div>

          <div className="flex flex-col gap-4">
            <InfoCard title="Адрес">
              <p className="serif text-[20px] sm:text-[22px] m-0 leading-tight">
                {CONTACT.addressLine},
                <br />
                {CONTACT.city}
              </p>
              <p className="text-[13px] text-ink-soft mt-3 mb-0">
                Парковка для гостей · вход со двора
              </p>
            </InfoCard>

            <InfoCard title="График">
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Пн – Чт</span>
                  <span className="text-ink-soft">{CONTACT.hoursMonThu}</span>
                </div>
                <div className="flex justify-between">
                  <span>Пт – Вс</span>
                  <span className="text-ink-soft">{CONTACT.hoursFriSun}</span>
                </div>
              </div>
            </InfoCard>

            <a
              href={`tel:${CONTACT.phoneRaw}`}
              className="block p-6 rounded-lg bg-ink text-bg-0"
            >
              <div className="eyebrow" style={{ color: "var(--gold-1)" }}>Позвонить</div>
              <div className="serif text-[26px] mt-3">{CONTACT.phone}</div>
              <div className="text-[12px] text-bg-0/60 mt-2">Ежедневно 09:00 — 23:00</div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-lg bg-bg-1">
      <div className="eyebrow">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!form.name || !form.phone || !form.message) {
      setStatus("error");
      setErrorMsg("Заполните имя, телефон и сообщение.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await submitContact(form);
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(res.error);
        return;
      }
      setStatus("ok");
      setForm({ name: "", phone: "", message: "" });
    } catch {
      setStatus("error");
      setErrorMsg("Ошибка сети. Попробуйте ещё раз.");
    }
  }

  if (status === "ok") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--gold-1), var(--gold-2))" }}
          aria-hidden="true"
        >
          <Icon.check style={{ width: 28, height: 28, color: "white" }} />
        </div>
        <div className="serif text-[22px]">Сообщение отправлено</div>
        <div className="text-ink-soft text-sm max-w-[320px]">
          Мы свяжемся с вами в течение 5 минут в рабочее время.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 flex-1">
      <Field
        id="cname"
        label="Имя"
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        placeholder="Ваше имя"
        autoComplete="name"
      />
      <Field
        id="cphone"
        label="Телефон"
        value={form.phone}
        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
        placeholder="+7 ___ ___ __ __"
        inputMode="tel"
        autoComplete="tel"
      />
      <Field
        id="cmsg"
        label="Сообщение"
        value={form.message}
        onChange={(v) => setForm((f) => ({ ...f, message: v }))}
        placeholder="О чём хотели бы спросить?"
        multi
      />
      {status === "error" && errorMsg ? (
        <div className="text-red-700 text-sm">{errorMsg}</div>
      ) : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn btn-primary self-start"
      >
        {status === "submitting" ? "Отправляем…" : "Отправить"}
      </button>
    </form>
  );
}

function CallTab({ settings }: { settings: SiteSettings }) {
  return (
    <div className="flex-1 flex flex-col justify-center text-center gap-4">
      <div className="serif text-[36px] sm:text-[48px] font-light">{settings.phone}</div>
      <div className="text-ink-soft">Ежедневно с 09:00 до 23:00</div>
      <div className="mt-4">
        <a href={`tel:${settings.phoneRaw}`} className="btn btn-primary">
          Позвонить сейчас
        </a>
      </div>
    </div>
  );
}

function TelegramTab({ settings }: { settings: SiteSettings }) {
  return (
    <div className="flex-1 flex flex-col justify-center text-center gap-4">
      <div className="serif text-[24px] sm:text-[28px] font-light">
        Чат-бот в Telegram
      </div>
      <p className="text-ink-soft text-sm max-w-[420px] mx-auto">
        Бот покажет каталог, свободные слоты и поможет записаться. Среднее время ответа &lt; 1 минуты.
      </p>
      <div className="mt-2">
        <a
          href={settings.telegramBotUrl || "https://t.me/rivaspa_bot"}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Открыть Telegram-бот
          <Icon.arrow style={{ width: 14, height: 14 }} />
        </a>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  multi,
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multi?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
        {label}
      </span>
      {multi ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="px-4 py-3.5 border border-line rounded-md bg-bg-1 text-[14px] resize-y outline-none focus:border-ink"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="px-4 py-3.5 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
        />
      )}
    </label>
  );
}
