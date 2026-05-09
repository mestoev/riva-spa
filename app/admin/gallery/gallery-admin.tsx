"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ImageUpload } from "@/components/image-upload";
import {
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  toggleGalleryActive,
  type GalleryFormState,
} from "./actions";

type Img = {
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};

export function GalleryAdmin({ images }: { images: Img[] }) {
  const [editing, setEditing] = useState<Img | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="mb-5">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
          className="btn btn-primary !py-2.5 !px-4 !text-[13px] sm:!py-3.5 sm:!px-6 sm:!text-[14px]"
        >
          + Добавить фото
        </button>
      </div>

      {adding ? (
        <ImageForm
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : null}

      {editing ? (
        <ImageForm
          image={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      {images.length === 0 ? (
        <div className="bg-bg-0 border border-line rounded-xl py-16 px-6 text-center text-ink-mute">
          В галерее пока нет фото. Нажмите «Добавить фото».
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <ImageCard
              key={img.id}
              img={img}
              onEdit={() => {
                setAdding(false);
                setEditing(img);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ImageCard({ img, onEdit }: { img: Img; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div
      className={`bg-bg-0 border border-line rounded-lg overflow-hidden flex flex-col ${
        img.active ? "" : "opacity-60"
      }`}
    >
      <div className="relative aspect-[16/10] bg-bg-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.imageUrl}
          alt={img.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {!img.active ? (
          <span className="absolute top-2 left-2 text-[10px] uppercase font-mono px-1.5 py-0.5 bg-red-100 text-red-800 rounded">
            скрыто
          </span>
        ) : null}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="font-medium leading-tight">{img.title}</div>
        {img.subtitle ? (
          <div className="text-[12px] text-ink-mute mt-0.5">{img.subtitle}</div>
        ) : null}
        <div className="text-[11px] font-mono text-ink-mute mt-1">
          порядок: {img.sortOrder}
        </div>
        <div className="mt-3 pt-3 border-t border-line-soft flex items-center gap-2 justify-between flex-wrap">
          <label className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={img.active}
              disabled={pending}
              onChange={() => {
                start(async () => {
                  await toggleGalleryActive(img.id, !img.active);
                  router.refresh();
                });
              }}
              className="w-4 h-4"
            />
            <span>{img.active ? "Активно" : "Скрыто"}</span>
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
                if (!confirm(`Удалить фото "${img.title}"?`)) return;
                start(async () => {
                  await deleteGalleryImage(img.id);
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

function ImageForm({
  image,
  onCancel,
  onSaved,
}: {
  image?: Img;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!image;
  const action = isEdit
    ? (updateGalleryImage.bind(null, image!.id) as (
        prev: GalleryFormState,
        fd: FormData,
      ) => Promise<GalleryFormState>)
    : createGalleryImage;

  const [state, formAction] = useFormState<GalleryFormState, FormData>(action, null);

  // When the action returns ok:true, parent triggers router.refresh()
  if (state?.ok) {
    queueMicrotask(onSaved);
  }

  return (
    <div className="bg-bg-0 border border-line rounded-xl p-5 sm:p-6 mb-6">
      <h2 className="serif text-[20px] sm:text-[22px] m-0 mb-4">
        {isEdit ? "Изменить фото" : "Новое фото в галерею"}
      </h2>
      <form action={formAction} className="grid gap-4">
        <ImageUpload
          name="imageUrl"
          defaultValue={image?.imageUrl}
          label="Фото *"
          aspect="wide"
        />
        <Field label="Заголовок *" name="title" defaultValue={image?.title} required />
        <Field label="Подпись" name="subtitle" defaultValue={image?.subtitle ?? ""} />
        <Field
          label="Порядок (sort)"
          name="sortOrder"
          type="number"
          defaultValue={image?.sortOrder?.toString() ?? "0"}
        />
        <label className="flex items-center gap-3 mt-1">
          <input
            type="checkbox"
            name="active"
            defaultChecked={image?.active ?? true}
            className="w-4 h-4"
          />
          <span className="text-sm">Активно (показывать на сайте)</span>
        </label>
        {state && !state.ok ? (
          <div className="text-red-700 text-sm">{state.error}</div>
        ) : null}
        <div className="flex gap-3 flex-wrap">
          <Submit label={isEdit ? "Сохранить" : "Добавить"} />
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, name, type = "text", defaultValue, required,
}: {
  label: string; name: string; type?: string; defaultValue?: string; required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="px-4 py-3 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
      />
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
