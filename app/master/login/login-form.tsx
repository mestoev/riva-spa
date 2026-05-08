"use client";

import { useState } from "react";
import { masterLoginAction } from "./actions";

export function LoginForm({ next, error }: { next?: string; error?: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(error === "bad" ? "Неверный логин или пароль" : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await masterLoginAction(username, password, next ?? "/master");
    if (!res.ok) {
      setErr(res.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
          Логин
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          className="px-4 py-3.5 border border-line rounded-md bg-bg-1 text-[15px] outline-none focus:border-ink"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-mute">
          Пароль
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
