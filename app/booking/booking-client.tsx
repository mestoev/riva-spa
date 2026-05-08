"use client";

/**
 * Booking — 4-step flow.
 * Mobile-first: summary panel becomes sticky bottom bar on <lg.
 *
 * AUDIT fixes:
 *   §3.2 — no longer dual-pushes to cart; on confirm we POST to /api/bookings
 *          (TODO when backend lands) and clear the matching cart entry.
 *   §3.3 — pre-fills first service from cart if present.
 *   §3.7 — placeholder fetch shown; real submit will replace it in Этап 2.
 *   §2.6, §2.7 — responsive layout, padding scales down.
 *   §2.12 — calendar strip has scroll-fade.
 */
import { useEffect, useState } from "react";
import type { Master, ScheduleDay, Service, Category } from "@/lib/data";
import { CategoryFilter } from "@/components/service-card";
import { Icon } from "@/components/icons";
import { useCart } from "@/components/cart-store";
import { submitBooking } from "../actions/booking";

const STEP_LABELS = ["Услуга", "Мастер", "Дата и время", "Контакты", "Готово"];

type Contact = { name: string; phone: string; notes: string; notify: "sms" | "whatsapp" | "call" };

export function BookingClient({
  services,
  masters,
  categories,
  schedule,
}: {
  services: Service[];
  masters: Master[];
  categories: Category[];
  schedule: ScheduleDay[];
}) {
  const cart = useCart();

  const [step, setStep] = useState(0);
  const [service, setService] = useState<Service | null>(cart.items[0]?.service ?? null);
  const [master, setMaster] = useState<Master | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact>({
    name: "",
    phone: "",
    notes: "",
    notify: "sms",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // AUDIT §3.3 — auto-skip step 0 if cart pre-filled service
  useEffect(() => {
    if (cart.items[0]?.service && !service) {
      setService(cart.items[0].service);
      setStep((s) => Math.max(s, 1));
    }
  }, [cart.items, service]);

  const canNext = [
    !!service,
    !!master,
    !!time,
    contact.name.trim().length > 1 && contact.phone.trim().length >= 7,
  ][step];

  async function submit() {
    if (!service || !master || !time) return;
    const day = schedule[dayIdx];
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitBooking({
        serviceId: service.id,
        masterId: master.id,
        date: day.iso,
        time,
        contact: {
          name: contact.name,
          phone: contact.phone,
          notes: contact.notes,
          notify: contact.notify,
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Remove this service from cart if it's there (AUDIT §3.2 — no double entries)
      const matching = cart.items.find((it) => it.service.id === service.id);
      if (matching) cart.remove(matching.id);
      setConfirmed(true);
      setStep(4);
    } catch {
      setError("Не удалось записаться. Попробуйте ещё раз или позвоните нам.");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!canNext) return;
    if (step === 3) {
      void submit();
    } else if (step < 4) {
      setStep(step + 1);
    }
  }

  const day = schedule[dayIdx];

  return (
    <section className="pt-10 sm:pt-16 pb-32 lg:pb-32">
      <div className="container-x">
        <div className="eyebrow">Бронирование</div>
        <h1
          className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3 mb-8"
          style={{ fontSize: "clamp(36px, 7vw, 72px)" }}
        >
          {confirmed ? (
            <>
              Заявка{" "}
              <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>отправлена</span>
            </>
          ) : (
            <>
              Запишемся
              <br />
              <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>за 4 шага</span>
            </>
          )}
        </h1>

        <StepHeader step={step} />

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
          <div className="bg-bg-0 border border-line rounded-xl p-5 sm:p-8 lg:p-10 min-h-[400px]">
            {step === 0 ? (
              <StepService
                selected={service}
                onSelect={setService}
                services={services}
                categories={categories}
              />
            ) : null}
            {step === 1 ? (
              <StepMaster
                service={service}
                selected={master}
                onSelect={setMaster}
                masters={masters}
              />
            ) : null}
            {step === 2 ? (
              <StepDateTime
                schedule={schedule}
                dayIdx={dayIdx}
                onSelectDay={(i) => {
                  setDayIdx(i);
                  setTime(null);
                }}
                time={time}
                onSelectTime={setTime}
              />
            ) : null}
            {step === 3 ? <StepContact contact={contact} setContact={setContact} /> : null}
            {step === 4 && confirmed && service && master && day && time ? (
              <StepConfirmed
                service={service}
                master={master}
                day={day}
                time={time}
                contact={contact}
              />
            ) : null}

            {error ? (
              <div className="mt-4 p-3 rounded-md bg-red-50 text-red-800 text-sm">{error}</div>
            ) : null}

            {step < 4 ? (
              <div className="mt-8 pt-6 border-t border-line-soft flex justify-between items-center gap-3 flex-wrap">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStep(Math.max(0, step - 1))}
                    className="btn btn-ghost"
                  >
                    <Icon.arrowL style={{ width: 14, height: 14 }} /> Назад
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={next}
                  disabled={!canNext || submitting}
                  className="btn btn-primary"
                  style={{
                    opacity: canNext && !submitting ? 1 : 0.4,
                    cursor: canNext && !submitting ? "pointer" : "not-allowed",
                  }}
                >
                  {step === 3 ? (submitting ? "Записываем…" : "Подтвердить запись") : "Далее"}
                  <Icon.arrow style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ) : null}
          </div>

          {/* Summary — sticky on desktop, fixed bottom on mobile */}
          <Summary service={service} master={master} day={day} time={time} />
        </div>
      </div>
    </section>
  );
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 mb-8 sm:mb-12 flex-wrap" aria-label={`Шаг ${step + 1} из ${STEP_LABELS.length}`}>
      {STEP_LABELS.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold font-mono transition-all"
                style={{
                  background: done ? "var(--ink)" : active ? "var(--gold-2)" : "transparent",
                  color: done || active ? "white" : "var(--ink-mute)",
                  border: done || active ? "none" : "1px solid var(--line)",
                }}
                aria-hidden="true"
              >
                {done ? <Icon.check style={{ width: 14, height: 14 }} /> : i + 1}
              </div>
              <span
                className="text-[12px] sm:text-[13px]"
                style={{
                  color: active ? "var(--ink)" : "var(--ink-mute)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 ? (
              <div className="flex-1 min-w-[16px] sm:min-w-6 h-px bg-line mx-3 sm:mx-4" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StepService({
  selected,
  onSelect,
  services,
  categories,
}: {
  selected: Service | null;
  onSelect: (s: Service) => void;
  services: Service[];
  categories: Category[];
}) {
  const [cat, setCat] = useState<string>("all");
  const list = cat === "all" ? services : services.filter((s) => s.cat === cat);
  return (
    <div>
      <h2 className="serif text-[24px] sm:text-[28px] font-normal m-0">Выберите услугу</h2>
      <p className="text-ink-mute text-[14px] mt-2 mb-6">
        Можно записаться сразу на несколько процедур — добавьте их в корзину после.
      </p>
      <div className="mb-5">
        <CategoryFilter active={cat} onChange={setCat} categories={categories} size="sm" />
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => {
          const active = selected?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              aria-pressed={active}
              className="text-left p-4 sm:p-4.5 rounded-md transition-all"
              style={{
                border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                background: active ? "var(--bg-1)" : "var(--bg-0)",
              }}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="serif text-[16px] sm:text-[17px] font-medium leading-tight">
                  {s.name}
                </div>
                {active ? (
                  <div className="w-[22px] h-[22px] rounded-full bg-ink text-white shrink-0 flex items-center justify-center">
                    <Icon.check style={{ width: 12, height: 12 }} />
                  </div>
                ) : null}
              </div>
              <div className="mt-1.5 text-[12px] text-ink-soft leading-relaxed">{s.desc}</div>
              <div className="mt-3 flex justify-between items-center text-[12px] text-ink-mute">
                <span className="inline-flex items-center gap-1">
                  <Icon.clock style={{ width: 11, height: 11 }} /> {s.duration} мин
                </span>
                <span className="serif text-[16px] sm:text-[17px] text-ink">
                  {s.price.toLocaleString("ru-RU")} ₸
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepMaster({
  service,
  selected,
  onSelect,
  masters,
}: {
  service: Service | null;
  selected: Master | null;
  onSelect: (m: Master) => void;
  masters: Master[];
}) {
  const filtered = service
    ? masters.filter((m) => m.specs.includes(service.cat) || m.specs.includes("all"))
    : masters;
  return (
    <div>
      <h2 className="serif text-[24px] sm:text-[28px] font-normal m-0">Выберите мастера</h2>
      <p className="text-ink-mute text-[14px] mt-2 mb-6">
        Все мастера прошли отбор и аттестацию. Можете выбрать «Любой свободный» — мы подберём.
      </p>
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => {
          const active = selected?.id === m.id;
          const isAny = m.id === "any";
          const initials = m.name
            .split(" ")
            .map((n) => n[0])
            .join("");
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              aria-pressed={active}
              className="text-left p-5 rounded-md transition-all flex flex-col gap-3"
              style={{
                border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                background: active ? "var(--bg-1)" : "var(--bg-0)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[24px] font-serif"
                style={{
                  background: isAny
                    ? "linear-gradient(135deg, var(--gold-1), var(--gold-2))"
                    : "linear-gradient(135deg, var(--wood-1), var(--wood-3))",
                }}
                aria-hidden="true"
              >
                {isAny ? "✺" : initials}
              </div>
              <div>
                <div className="serif text-[16px] sm:text-[17px] font-medium">{m.name}</div>
                <div className="text-[12px] text-ink-soft mt-0.5">{m.role}</div>
              </div>
              <div className="flex justify-between items-center text-[12px] text-ink-mute">
                <span>{m.exp}</span>
                {m.rating ? (
                  <span className="inline-flex items-center gap-1 text-gold-3">
                    <Icon.star style={{ width: 11, height: 11 }} /> {m.rating}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDateTime({
  schedule,
  dayIdx,
  onSelectDay,
  time,
  onSelectTime,
}: {
  schedule: ScheduleDay[];
  dayIdx: number;
  onSelectDay: (i: number) => void;
  time: string | null;
  onSelectTime: (t: string) => void;
}) {
  const day = schedule[dayIdx];
  return (
    <div>
      <h2 className="serif text-[24px] sm:text-[28px] font-normal m-0">Дата и время</h2>
      <p className="text-ink-mute text-[14px] mt-2 mb-6">
        Календарь обновляется в реальном времени. Серым отмечены занятые слоты.
      </p>

      {/* AUDIT — calendar grid (7 cols × 2 rows = 14 days), no horizontal scroll */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-6">
        {schedule.map((d, i) => {
          const active = dayIdx === i;
          const free = d.slots.filter((s) => s.free).length;
          const allBooked = free === 0;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => !allBooked && onSelectDay(i)}
              disabled={allBooked}
              aria-pressed={active}
              aria-label={`${d.weekday} ${d.day} ${d.month}, свободно ${free} слотов`}
              className="flex flex-col items-center justify-center
                         aspect-square sm:aspect-auto sm:min-h-[80px]
                         p-1 sm:p-2 rounded-md transition-all"
              style={{
                border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                background: active ? "var(--ink)" : allBooked ? "transparent" : "var(--bg-0)",
                color: active ? "var(--bg-0)" : allBooked ? "var(--ink-mute)" : "var(--ink)",
                opacity: allBooked ? 0.45 : 1,
                cursor: allBooked ? "not-allowed" : "pointer",
              }}
            >
              <div className="text-[9px] sm:text-[11px] uppercase opacity-70">
                {d.weekday}
              </div>
              <div className="serif text-[18px] sm:text-[24px] leading-none mt-0.5 sm:mt-1">
                {d.day}
              </div>
              <div className="text-[9px] sm:text-[11px] opacity-60 mt-0.5">
                {d.month}
              </div>
              <div className="hidden sm:block text-[10px] mt-1 opacity-75">
                {allBooked ? "занято" : `${free} слот${free === 1 ? "" : free < 5 ? "а" : "ов"}`}
              </div>
            </button>
          );
        })}
      </div>

      <div className="eyebrow mb-3.5">Время</div>
      <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
        {day.slots.map((s, i) => {
          const active = time === s.time;
          return (
            <button
              key={i}
              type="button"
              onClick={() => s.free && onSelectTime(s.time)}
              disabled={!s.free}
              aria-pressed={active}
              className="px-2 py-3.5 rounded-sm text-[14px] font-medium transition-colors"
              style={{
                border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                background: active ? "var(--ink)" : !s.free ? "transparent" : "var(--bg-0)",
                color: active ? "var(--bg-0)" : !s.free ? "var(--ink-mute)" : "var(--ink)",
                opacity: !s.free ? 0.4 : 1,
                cursor: s.free ? "pointer" : "not-allowed",
                textDecoration: !s.free ? "line-through" : "none",
              }}
            >
              {s.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepContact({
  contact,
  setContact,
}: {
  contact: Contact;
  setContact: (c: Contact) => void;
}) {
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setContact({ ...contact, [k]: v });
  return (
    <div>
      <h2 className="serif text-[24px] sm:text-[28px] font-normal m-0">Контакты</h2>
      <p className="text-ink-mute text-[14px] mt-2 mb-6">
        Мы пришлём подтверждение и напомним за 2 часа до визита.
      </p>
      <div className="grid gap-4 max-w-[480px]">
        <Field label="Имя" value={contact.name} onChange={(v) => set("name", v)} placeholder="Анна" id="name" autoComplete="name" />
        <Field
          label="Телефон"
          value={contact.phone}
          onChange={(v) => set("phone", v)}
          placeholder="+7 ___ ___ __ __"
          id="phone"
          inputMode="tel"
          autoComplete="tel"
        />
        <Field
          label="Пожелания (необязательно)"
          value={contact.notes}
          onChange={(v) => set("notes", v)}
          placeholder="Например: усиленная работа с поясницей"
          id="notes"
          multi
        />
        <div>
          <div className="eyebrow mb-2">Способ напоминания</div>
          <div className="flex gap-1.5 flex-wrap">
            {(
              [
                ["sms", "SMS"],
                ["whatsapp", "WhatsApp"],
                ["call", "Звонок"],
              ] as const
            ).map(([id, l]) => (
              <button
                key={id}
                type="button"
                onClick={() => set("notify", id)}
                aria-pressed={contact.notify === id}
                className="px-4 py-2.5 rounded-full text-[13px]"
                style={{
                  background: contact.notify === id ? "var(--ink)" : "transparent",
                  color: contact.notify === id ? "var(--bg-0)" : "var(--ink-soft)",
                  border: `1px solid ${contact.notify === id ? "var(--ink)" : "var(--line)"}`,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-[12px] text-ink-mute leading-snug mt-2">
          <input type="checkbox" defaultChecked className="mt-0.5" />
          <span>Согласен на обработку персональных данных и получение уведомлений о визите</span>
        </label>
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
          rows={3}
          className="px-4 py-3.5 border border-line rounded-md bg-bg-0 text-[14px]
                     resize-y outline-none focus:border-ink"
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
          className="px-4 py-3.5 border border-line rounded-md bg-bg-0 text-[15px]
                     outline-none focus:border-ink"
        />
      )}
    </label>
  );
}

function StepConfirmed({
  service,
  master,
  day,
  time,
  contact,
}: {
  service: Service;
  master: Master;
  day: ScheduleDay;
  time: string;
  contact: Contact;
}) {
  return (
    <div className="text-center py-6">
      <div
        className="w-20 h-20 rounded-full inline-flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, var(--gold-1), var(--gold-2))",
          boxShadow: "0 12px 32px rgba(201,163,86,.3)",
        }}
        aria-hidden="true"
      >
        <Icon.check style={{ width: 36, height: 36, color: "white" }} />
      </div>
      <h2 className="serif text-[28px] sm:text-[32px] font-normal m-0">Заявка получена</h2>
      <p className="text-ink-soft text-[15px] mt-3 mb-8 max-w-[440px] mx-auto">
        {contact.name}, ваша заявка ушла администратору. Мы свяжемся с вами на номер {contact.phone},
        чтобы подтвердить запись — обычно в течение нескольких минут в рабочее время.
      </p>
      <div className="inline-block text-left p-7 rounded-lg bg-bg-1 min-w-[280px]">
        <div className="eyebrow mb-4">Детали визита</div>
        <div className="flex flex-col gap-3">
          <SummaryRow label="Услуга" value={service.name} />
          <SummaryRow label="Мастер" value={master.name} />
          <SummaryRow label="Дата" value={`${day.day} ${day.month}, ${time}`} />
          <SummaryRow label="Адрес" value="ул. Загородная 17, Актобе" />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-3 text-[14px]">
      <span className="text-ink-mute text-[12px]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Summary({
  service,
  master,
  day,
  time,
}: {
  service: Service | null;
  master: Master | null;
  day: ScheduleDay | null;
  time: string | null;
}) {
  return (
    <>
      {/* Desktop sticky panel */}
      <aside className="hidden lg:block bg-bg-1 rounded-xl p-7 sticky top-24">
        <div className="eyebrow">Ваша запись</div>
        <div className="mt-4 flex flex-col gap-3.5">
          <SummaryRow label="Услуга" value={service?.name || "—"} />
          <SummaryRow label="Мастер" value={master?.name || "—"} />
          <SummaryRow label="Дата" value={day && time ? `${day.day} ${day.month}` : "—"} />
          <SummaryRow label="Время" value={time || "—"} />
          <SummaryRow label="Длительность" value={service ? `${service.duration} мин` : "—"} />
        </div>
        <div className="mt-5 pt-5 border-t border-line flex justify-between items-baseline">
          <span className="text-[13px] text-ink-mute">Итого</span>
          <span className="serif text-[28px]">
            {service ? service.price.toLocaleString("ru-RU") : "—"}
            <span className="text-sm text-ink-mute ml-1">₸</span>
          </span>
        </div>
        <div className="mt-4 p-3.5 bg-bg-0 rounded-sm text-[12px] text-ink-soft leading-snug">
          Оплата на месте. Бесплатная отмена за 6 часов до визита.
        </div>
      </aside>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed left-0 right-0 bottom-0 z-30 bg-bg-0 border-t border-line p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-ink-mute truncate">
              {service?.name || "Выберите услугу"}
            </div>
            <div className="serif text-[20px] leading-tight">
              {service ? service.price.toLocaleString("ru-RU") : "—"}
              <span className="text-[12px] text-ink-mute ml-1">₸</span>
            </div>
          </div>
          <div className="text-right shrink-0 text-[12px] text-ink-mute">
            {day && time ? `${day.day} ${day.month}, ${time}` : "Дата и время"}
          </div>
        </div>
      </div>
    </>
  );
}
