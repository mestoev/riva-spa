"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createAdminBooking, type AdminBookingState } from "./actions";

type Service = { id: string; name: string; duration: number; price: number; category: string };
type Master = { id: string; name: string; specs: string[] };
type Day = {
  iso: string;
  dayLabel: string;
  closed: boolean;
  slots: { time: string; free: boolean }[];
};

export function NewBookingForm({
  services,
  masters,
  schedule,
}: {
  services: Service[];
  masters: Master[];
  schedule: Day[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [masterId, setMasterId] = useState(masters[0]?.id ?? "");
  const [dayIso, setDayIso] = useState(schedule.find((d) => !d.closed)?.iso ?? "");
  const [time, setTime] = useState("");
  const [state, action] = useFormState<AdminBookingState, FormData>(createAdminBooking, null);

  const selectedService = services.find((s) => s.id === serviceId);
  const eligibleMasters = useMemo(() => {
    if (!selectedService) return masters;
    return masters.filter(
      (m) => m.specs.includes(selectedService.category) || m.specs.includes("all"),
    );
  }, [masters, selectedService]);
  const selectedDay = schedule.find((d) => d.iso === dayIso);

  return (
    <form action={action} className="grid gap-6 max-w-[760px]">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="masterId" value={masterId} />
      <input type="hidden" name="date" value={dayIso} />
      <input type="hidden" name="time" value={time} />

      <Section title="Клиент">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Имя клиента" name="customerName" required placeholder="Айгуль" />
          <Field
            label="Телефон"
            name="customerPhone"
            required
            inputMode="tel"
            placeholder="+7 7XX XXX XX XX"
          />
        </div>
        <TextArea label="Заметка (необязательно)" name="notes" placeholder="Например: предпочитает вечер" />
        <div className="grid sm:grid-cols-2 gap-4 mt-3">
          <SelectField
            label="Источник"
            name="source"
            defaultValue="phone"
            options={[
              { value: "phone", label: "Звонок" },
              { value: "walkin", label: "Пришёл лично" },
            ]}
          />
          <label className="flex items-center gap-3 mt-7 sm:mt-9">
            <input type="checkbox" name="autoConfirm" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Сразу подтвердить запись</span>
          </label>
        </div>
      </Section>

      <Section title="Услуга и мастер">
        <div className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="px-3 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration} мин · {s.price.toLocaleString("ru-RU")} ₸
                </option>
              ))}
            </select>
            <select
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
              className="px-3 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
            >
              {eligibleMasters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Когда">
        <div className="grid gap-3">
          <select
            value={dayIso}
            onChange={(e) => {
              setDayIso(e.target.value);
              setTime("");
            }}
            className="px-3 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
          >
            {schedule
              .filter((d) => !d.closed)
              .map((d) => (
                <option key={d.iso} value={d.iso}>
                  {d.dayLabel}
                </option>
              ))}
          </select>
          {selectedDay && !selectedDay.closed ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {selectedDay.slots.map((sl) => {
                const active = time === sl.time;
                return (
                  <button
                    key={sl.time}
                    type="button"
                    onClick={() => sl.free && setTime(sl.time)}
                    disabled={!sl.free}
                    className="px-1 py-2.5 rounded-md text-[13px] font-mono transition-colors"
                    style={{
                      border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                      background: active ? "var(--ink)" : sl.free ? "var(--bg-0)" : "transparent",
                      color: active ? "var(--bg-0)" : sl.free ? "var(--ink)" : "var(--ink-mute)",
                      opacity: sl.free ? 1 : 0.4,
                      textDecoration: sl.free ? "none" : "line-through",
                      cursor: sl.free ? "pointer" : "not-allowed",
                    }}
                  >
                    {sl.time}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </Section>

      {state && !state.ok ? <div className="text-red-700 text-sm">{state.error}</div> : null}

      <Submit disabled={!serviceId || !masterId || !dayIso || !time} />
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="bg-bg-0 border border-line rounded-xl p-5 sm:p-6">
      <legend className="font-mono text-[11px] uppercase tracking-wider text-gold-3 px-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label, name, required, placeholder, inputMode,
}: {
  label: string; name: string; required?: boolean; placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <input
        type="text"
        name={name}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
      />
    </label>
  );
}

function TextArea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5 mt-3">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <textarea
        name={name}
        rows={2}
        placeholder={placeholder}
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[14px] resize-y outline-none focus:border-ink"
      />
    </label>
  );
}

function SelectField({
  label, name, defaultValue, options,
}: {
  label: string; name: string; defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="px-3 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn btn-primary self-start">
      {pending ? "Сохраняем…" : "Создать запись"}
    </button>
  );
}
