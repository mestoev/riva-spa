"use client";

import { useTransition } from "react";
import { resetMasterPassword } from "./actions";
import { useRouter } from "next/navigation";

export function ResetPasswordButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Сбросить пароль мастера и сгенерировать новый?")) return;
        start(async () => {
          await resetMasterPassword(id);
          router.refresh();
        });
      }}
      className="text-[13px] text-ink-mute hover:text-ink"
      title="Сбросить пароль"
    >
      🔑 Пароль
    </button>
  );
}
