"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { Master } from "@prisma/client";
import { createMaster, updateMaster, type MasterFormState } from "./actions";

const SPECS = [
  { id: "massage", label: "Массажи" },
  { id: "pool", label: "Бассейн" },
  { id: "bath", label: "Сауна и хаммам" },
  { id: "face", label: "Уход за лицом" },
  { id: "duo", label: "Программы для двоих" },
  { id: "all", label: "Все (любая категория)" },
];

export function MasterForm({ master }: { master?: Master }) {
  const isEdit = !!master;
  const action = isEdit
    ? (updateMaster.bind(null, master!.id) as (
        prev: MasterFormState,
        fd: FormData,
      ) => Promise<MasterFormState>)
    : createMaster;
  const [state, formAction] = useFormState<MasterFormState, FormData>(action, null);
  const currentSpecs = (master?.specs as string[] | undefined) ?? [];

  return (
    <form action={formAction} className="grid gap-5 max-w-[640px]">
      <Field
        label="ID"
        name="id"
        defaultValue={master?.id}
        disabled={isEdit}
        required
        placeholder="m1, anna, ivan"
      />
      <Field label="Имя" name="name" defaultValue={master?.name} required />
      <Field
        label="Должность / роль"
        name="role"
        defaultValue={master?.role}
        required
        placeholder="Старший мастер СПА"
      />
      <div className="grid sm:grid-cols-2 gap-5">
        <Field
          label="Опыт"
          name="exp"
          defaultValue={master?.exp}
          required
          placeholder="12 лет опыта"
        />
        <Field
          label="Рейтинг (0–5, можно пусто)"
          name="rating"
          type="number"
          defaultValue={master?.rating?.toString() ?? ""}
          placeholder="4.97"
        />
      </div>

      <fieldset>
        <legend className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute mb-2">
          Специализации
        </legend>
        <div className="grid sm:grid-cols-2 gap-2">
          {SPECS.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-line bg-bg-0 cursor-pointer hover:bg-bg-1"
            >
              <input
                type="checkbox"
                name="specs"
                value={s.id}
                defaultChecked={currentSpecs.includes(s.id)}
                className="w-4 h-4"
              />
              <span className="text-sm">{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Порядок (sort)"
        name="sortOrder"
        type="number"
        defaultValue={master?.sortOrder?.toString() ?? "0"}
      />
      <label className="flex items-center gap-3 mt-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={master?.active ?? true}
          className="w-4 h-4"
        />
        <span className="text-sm">Активен</span>
      </label>

      {state && !state.ok ? (
        <div className="text-red-700 text-sm">{state.error}</div>
      ) : null}

      <div className="flex gap-3 mt-2 flex-wrap">
        <SubmitButton label={isEdit ? "Сохранить" : "Создать"} />
        <Link href="/admin/masters" className="btn btn-ghost">Отмена</Link>
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
        step={type === "number" ? "any" : undefined}
        className="px-4 py-3 border border-line rounded-md bg-bg-0 text-[15px] outline-none focus:border-ink disabled:opacity-50"
      />
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
