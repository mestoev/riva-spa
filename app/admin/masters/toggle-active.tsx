"use client";

import { useTransition } from "react";
import { toggleMasterActive } from "./actions";

export function ToggleActive({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={pending}
      onClick={() => startTransition(async () => { await toggleMasterActive(id, !active); })}
      className={`inline-flex items-center w-10 h-6 rounded-full transition-colors ${
        active ? "bg-ink" : "bg-line"
      } ${pending ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block w-5 h-5 rounded-full bg-white shadow transition-transform ${
          active ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}
