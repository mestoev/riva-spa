"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { Service } from "@prisma/client";
import { createService, updateService, type ServiceFormState } from "./actions";

const CATEGORIES = [
  { id: "massage", label: "Массажи" },
  { id: "pool", label: "Бассейн" },
  { id: "bath", label: "Сауна и хаммам" },
  { id: "face", label: "Уход за лицом" },
  { id: "duo", label: "Программы для двоих" },
];

export function ServiceForm({ service }: { service?: Service }) {
  const isEdit = !!service;
  const action = isEdit
    ? (updateService.bind(null, service!.id) as (
        prev: ServiceFormState,
        fd: FormData,
      ) => Promise<ServiceFormState>)
    : createService;

  const [state, formAction] = useFormState<ServiceFormState, FormData>(action, null);

  return (
    <form action={formAction} className="grid gap-5 max-w-[640px]">
      <Field label="ID (slug)" name="id" defaultValue={service?.id} disabled={isEdit} required />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Категория"
          name="category"
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          defaultValue={service?.category ?? "massage"}
          required
        />
        <Field
          label="Тег (необязательно)"
          name="tag"
          defaultValue={service?.tag ?? ""}
          placeholder="Популярное / Новое / Авторское"
        />
      </div>
      <Field label="Название" name="name" defaultValue={service?.name} required />
      <TextArea label="Описание" name="desc" defaultValue={service?.desc} required />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Цена, ₸"
          name="price"
          type="number"
          defaultValue={service?.price?.toString() ?? "0"}
          required
        />
        <Field
          label="Длительность, мин"
          name="duration"
          type="number"
          defaultValue={service?.duration?.toString() ?? "60"}
          required
        />
        <Field
          label="Порядок (sort)"
          name="sortOrder"
          type="number"
          defaultValue={service?.sortOrder?.toString() ?? "0"}
        />
      </div>
      <label className="flex items-center gap-3 mt-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={service?.active ?? true}
          className="w-4 h-4"
        />
        <span className="text-sm">Активна (показывать клиентам)</span>
      </label>

      {state && !state.ok ? (
        <div className="text-red-700 text-sm">{state.error}</div>
      ) : null}

      <div className="flex gap-3 mt-2 flex-wrap">
        <SubmitButton label={isEdit ? "Сохранить" : "Создать"} />
        <Link href="/admin/services" className="btn btn-ghost">
          Отмена
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  disabled,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
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
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="px-4 py-3 border border-line rounded-md bg-bg-0 text-[15px] outline-none focus:border-ink disabled:opacity-50"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={3}
        className="px-4 py-3 border border-line rounded-md bg-bg-0 text-[15px] resize-y outline-none focus:border-ink"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="px-4 py-3 border border-line rounded-md bg-bg-0 text-[15px] outline-none focus:border-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Сохраняем…" : label}
    </button>
  );
}
