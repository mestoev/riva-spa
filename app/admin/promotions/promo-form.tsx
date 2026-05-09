"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { PromoCode } from "@prisma/client";
import { createPromo, updatePromo, type PromoFormState } from "./actions";

export function PromoForm({ promo }: { promo?: PromoCode }) {
  const isEdit = !!promo;
  const action = isEdit
    ? (updatePromo.bind(null, promo!.id) as (
        prev: PromoFormState,
        fd: FormData,
      ) => Promise<PromoFormState>)
    : createPromo;
  const [state, formAction] = useFormState<PromoFormState, FormData>(action, null);

  // Format expiresAt for <input type="datetime-local">
  const isoLocal =
    promo?.expiresAt
      ? promo.expiresAt.toISOString().slice(0, 16)
      : "";

  return (
    <form action={formAction} className="grid gap-5 max-w-[640px]">
      <Field
        label="Код *"
        name="code"
        defaultValue={promo?.code}
        disabled={isEdit}
        required
        placeholder="LETO2026 или RIVA10"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Тип скидки"
          name="type"
          defaultValue={promo?.type ?? "percent"}
          options={[
            { value: "percent", label: "Процент (%)" },
            { value: "amount", label: "Сумма (₸)" },
          ]}
        />
        <Field
          label="Значение *"
          name="value"
          type="number"
          defaultValue={promo?.value?.toString() ?? "10"}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Мин. сумма заказа (0 = без)"
          name="minTotal"
          type="number"
          defaultValue={promo?.minTotal?.toString() ?? "0"}
        />
        <Field
          label="Лимит использований (0 = без)"
          name="usageLimit"
          type="number"
          defaultValue={promo?.usageLimit?.toString() ?? "0"}
        />
      </div>

      <Field
        label="Действует до (необязательно)"
        name="expiresAt"
        type="datetime-local"
        defaultValue={isoLocal}
      />

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="active"
          defaultChecked={promo?.active ?? true}
          className="w-4 h-4"
        />
        <span className="text-sm">Активен</span>
      </label>

      {state && !state.ok ? (
        <div className="text-red-700 text-sm">{state.error}</div>
      ) : null}

      <div className="flex gap-3 flex-wrap">
        <Submit label={isEdit ? "Сохранить" : "Создать"} />
        <Link href="/admin/promotions" className="btn btn-ghost">
          Отмена
        </Link>
      </div>
    </form>
  );
}

function Field({
  label, name, type = "text", defaultValue, required, placeholder, disabled,
}: {
  label: string; name: string; type?: string; defaultValue?: string;
  required?: boolean; placeholder?: string; disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink disabled:opacity-50"
      />
    </label>
  );
}

function SelectField({
  label, name, options, defaultValue,
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
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Сохраняем…" : label}
    </button>
  );
}
