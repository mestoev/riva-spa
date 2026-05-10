"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ImageUpload } from "@/components/image-upload";
import {
  createPair, updatePair, deletePair, togglePairActive, type PairFormState,
} from "./actions";

type Pair = {
  id: number;
  title: string;
  description: string | null;
  beforeUrl: string;
  afterUrl: string;
  serviceId: string | null;
  sortOrder: number;
  active: boolean;
};
type ServiceLite = { id: string; name: string };

export function ResultsAdmin({ pairs, services }: { pairs: Pair[]; services: ServiceLite[] }) {
  const [editing, setEditing] = useState<Pair | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="mb-5">
        <button
          type="button"
          onClick={() => { setEditing(null); setAdding(true); }}
          className="btn btn-primary !py-2.5 !px-4 !text-[13px]"
        >
          + Добавить пару
        </button>
      </div>

      {(adding || editing) && (
        <PairForm
          pair={editing ?? undefined}
          services={services}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); router.refresh(); }}
        />
      )}

      {pairs.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          Пока ничего нет. Нажмите «Добавить пару».
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {pairs.map((p) => (
            <PairCard
              key={p.id}
              pair={p}
              services={services}
              onEdit={() => { setAdding(false); setEditing(p); }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function PairCard({
  pair, services, onEdit,
}: {
  pair: Pair; services: ServiceLite[]; onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const service = services.find((s) => s.id === pair.serviceId);

  return (
    <div
      className={`bg-bg-0 border border-line rounded-lg overflow-hidden ${
        pair.active ? "" : "opacity-60"
      }`}
    >
      <div className="grid grid-cols-2 aspect-[2/1] bg-bg-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pair.beforeUrl} alt="до" className="w-full h-full object-cover" loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pair.afterUrl} alt="после" className="w-full h-full object-cover border-l-2 border-bg-0" loading="lazy" />
      </div>
      <div className="p-3.5">
        <div className="font-medium leading-tight">{pair.title}</div>
        {service ? (
          <div className="text-[11px] text-ink-mute mt-0.5">{service.name}</div>
        ) : null}
        {pair.description ? (
          <div className="text-[12px] text-ink-soft mt-1.5 line-clamp-2">{pair.description}</div>
        ) : null}
        <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={pair.active}
              disabled={pending}
              onChange={() => start(async () => {
                await togglePairActive(pair.id, !pair.active);
                router.refresh();
              })}
              className="w-4 h-4"
            />
            <span>{pair.active ? "Активно" : "Скрыто"}</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="text-[13px] text-ink border-b border-ink"
            >
              Изменить
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Удалить «${pair.title}»?`)) return;
                start(async () => {
                  await deletePair(pair.id);
                  router.refresh();
                });
              }}
              className="text-[13px] text-red-700 border-b border-red-300"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PairForm({
  pair, services, onCancel, onSaved,
}: {
  pair?: Pair; services: ServiceLite[]; onCancel: () => void; onSaved: () => void;
}) {
  const isEdit = !!pair;
  const action = isEdit
    ? (updatePair.bind(null, pair!.id) as (p: PairFormState, fd: FormData) => Promise<PairFormState>)
    : createPair;
  const [state, formAction] = useFormState<PairFormState, FormData>(action, null);
  if (state?.ok) queueMicrotask(onSaved);

  return (
    <div className="bg-bg-0 border border-line rounded-xl p-5 sm:p-6 mb-6">
      <h2 className="serif text-[20px] m-0 mb-4">
        {isEdit ? "Изменить пару" : "Новая пара до/после"}
      </h2>
      <form action={formAction} className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <ImageUpload name="beforeUrl" defaultValue={pair?.beforeUrl} label="Фото «До»" aspect="square" />
          <ImageUpload name="afterUrl" defaultValue={pair?.afterUrl} label="Фото «После»" aspect="square" />
        </div>
        <Field label="Заголовок *" name="title" defaultValue={pair?.title} required placeholder="Anti-age программа" />
        <TextArea label="Описание" name="description" defaultValue={pair?.description ?? ""} placeholder="Курс из 5 процедур" />
        <SelectField
          label="Привязать к услуге (опционально)"
          name="serviceId"
          defaultValue={pair?.serviceId ?? ""}
          options={[{ value: "", label: "— без услуги —" }, ...services.map((s) => ({ value: s.id, label: s.name }))]}
        />
        <Field label="Порядок" name="sortOrder" type="number" defaultValue={pair?.sortOrder?.toString() ?? "0"} />
        <label className="flex items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={pair?.active ?? true} className="w-4 h-4" />
          <span className="text-sm">Активно (показывать на сайте)</span>
        </label>
        {state && !state.ok ? <div className="text-red-700 text-sm">{state.error}</div> : null}
        <div className="flex gap-3 flex-wrap">
          <Submit label={isEdit ? "Сохранить" : "Добавить"} />
          <button type="button" onClick={onCancel} className="btn btn-ghost">Отмена</button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, name, type = "text", defaultValue, required, placeholder,
}: {
  label: string; name: string; type?: string; defaultValue?: string; required?: boolean; placeholder?: string;
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
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
      />
    </label>
  );
}
function TextArea({
  label, name, defaultValue, placeholder,
}: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={2}
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[14px] resize-y outline-none focus:border-ink"
      />
    </label>
  );
}
function SelectField({
  label, name, options, defaultValue,
}: {
  label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string;
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
