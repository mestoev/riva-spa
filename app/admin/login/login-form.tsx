"use client";

import { useState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ next, error }: { next?: string; error?: string }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(error === "bad" ? "Неверный пароль" : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await loginAction(pw, next ?? "/admin");
    if (!res.ok) {
      setErr(res.error);
      setBusy(false);
    }
    // On success the action redirects — no further code runs here.
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
          Пароль
        </span>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
          autoComplete="current-password"
          className="px-4 py-3.5 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
        />
      </label>
      {err ? <div className="text-red-700 text-sm">{err}</div> : null}
      <button type="submit" disabled={busy} className="btn btn-primary justify-center">
        {busy ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
