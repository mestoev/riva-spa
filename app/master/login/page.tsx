import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход — кабинет мастера",
  robots: { index: false, follow: false },
};

export default function MasterLoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-1 px-5">
      <div className="w-full max-w-[380px] bg-bg-0 border border-line rounded-xl p-7 shadow-md">
        <div className="eyebrow">RIVA · мастер</div>
        <h1 className="serif text-[28px] font-light leading-tight mt-2 mb-6">
          Кабинет мастера
        </h1>
        <LoginForm next={searchParams.next} error={searchParams.error} />
      </div>
    </div>
  );
}
