"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveSettings, type SettingsState } from "./actions";
import type { SiteSettings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useFormState<SettingsState, FormData>(saveSettings, null);

  return (
    <form action={action} className="grid gap-6 max-w-[760px]">
      <Section title="Бренд">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Название" name="name" defaultValue={settings.name} />
          <Field label="Слоган" name="tagline" defaultValue={settings.tagline} />
        </div>
      </Section>

      <Section title="Адрес">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Город" name="city" defaultValue={settings.city} />
          <Field label="Адрес" name="addressLine" defaultValue={settings.addressLine} />
        </div>
      </Section>

      <Section title="Связь">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Телефон (для отображения)"
            name="phone"
            defaultValue={settings.phone}
            placeholder="+7 (777) 123-45-67"
          />
          <Field
            label="Телефон (для tel:)"
            name="phoneRaw"
            defaultValue={settings.phoneRaw}
            placeholder="+77771234567"
          />
          <Field label="Email" name="email" type="email" defaultValue={settings.email} />
          <Field label="Instagram" name="instagram" defaultValue={settings.instagram} />
          <Field
            label="Telegram-бот URL"
            name="telegramBotUrl"
            defaultValue={settings.telegramBotUrl}
            placeholder="https://t.me/rivaspa_bot"
          />
        </div>
      </Section>

      <Section title="Часы работы (текст)">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Пн – Чт" name="hoursMonThu" defaultValue={settings.hoursMonThu} />
          <Field label="Пт – Вс" name="hoursFriSun" defaultValue={settings.hoursFriSun} />
        </div>
        <p className="text-[12px] text-ink-mute mt-2">
          Это просто текст для футера. Реальные слоты задаются в{" "}
          <a href="/admin/schedule" className="underline">
            /admin/schedule
          </a>
          .
        </p>
      </Section>

      <Section title="SEO">
        <div className="grid gap-4">
          <Field label="Meta title" name="metaTitle" defaultValue={settings.metaTitle} />
          <TextArea
            label="Meta description"
            name="metaDescription"
            defaultValue={settings.metaDescription}
          />
        </div>
      </Section>

      {state ? (
        state.ok ? (
          <div className="text-green-700 text-sm">✓ Сохранено.</div>
        ) : (
          <div className="text-red-700 text-sm">{state.error}</div>
        )
      ) : null}

      <div>
        <Submit />
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="bg-bg-0 border border-line rounded-xl p-4 sm:p-6">
      <legend className="font-mono text-[11px] uppercase tracking-wider text-gold-3 px-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label, name, type = "text", defaultValue, placeholder,
}: {
  label: string; name: string; type?: string; defaultValue?: string; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
      />
    </label>
  );
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[15px] resize-y outline-none focus:border-ink"
      />
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Сохраняем…" : "Сохранить"}
    </button>
  );
}
