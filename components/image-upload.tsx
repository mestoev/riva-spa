"use client";

import { useRef, useState } from "react";

/**
 * Image upload widget for admin forms.
 *
 * Renders a preview of the current image (if any), a file picker, and an
 * "Удалить" button. The selected file is uploaded to /api/admin/upload, and
 * the resulting URL is stored in a hidden input so the parent <form> picks it
 * up via FormData on submit.
 */
export function ImageUpload({
  name,
  defaultValue,
  label = "Фото",
  aspect = "square",
}: {
  name: string;
  defaultValue?: string | null;
  label?: string;
  aspect?: "square" | "wide";
}) {
  const [url, setUrl] = useState<string>(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setErr(json.error ?? `upload failed (${res.status})`);
      } else {
        setUrl(json.url);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const aspectClass = aspect === "wide" ? "aspect-[16/10]" : "aspect-square";

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
        {label}
      </span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-start gap-3 flex-wrap">
        <div
          className={`${aspectClass} w-32 sm:w-40 rounded-md border border-line bg-bg-1 overflow-hidden flex items-center justify-center shrink-0`}
        >
          {url ? (
            // Use plain <img> so we don't need a remotePatterns config for self-hosted uploads
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-[11px] text-ink-mute font-mono">нет фото</div>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={pickFile}
            disabled={busy}
            className="text-[13px] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-ink file:text-bg-0 file:text-[12px] file:cursor-pointer disabled:opacity-50"
          />
          <div className="text-[11px] text-ink-mute leading-tight">
            JPEG/PNG/WebP, до 5 MB. Рекомендуем 1200×1200 (или 1600×1000 для широких).
          </div>
          {url ? (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-[12px] text-red-700 border-b border-red-300 self-start"
            >
              Удалить фото
            </button>
          ) : null}
          {busy ? <div className="text-[12px] text-ink-soft">Загружаем…</div> : null}
          {err ? <div className="text-[12px] text-red-700">{err}</div> : null}
        </div>
      </div>
    </div>
  );
}
