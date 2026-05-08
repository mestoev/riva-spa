import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "./login/actions";

export const metadata: Metadata = {
  title: "RIVA admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Дашборд", exact: true },
  { href: "/admin/bookings", label: "Заявки" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/masters", label: "Мастера" },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/settings", label: "Настройки" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[240px_1fr] bg-bg-1">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col bg-ink text-bg-0 p-6 sticky top-0 h-screen">
        <Link href="/admin" className="serif text-[22px] font-light tracking-wider mb-1">
          RIVA
        </Link>
        <div className="font-mono text-[10px] tracking-[0.2em] text-bg-0/50 uppercase mb-8">
          admin panel
        </div>

        <nav className="flex flex-col gap-1 flex-1" aria-label="Админ-меню">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2.5 rounded-md text-sm text-bg-0/80 hover:bg-bg-0/10 hover:text-bg-0 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left px-4 py-2.5 rounded-md text-sm text-bg-0/60 hover:bg-bg-0/10"
          >
            Выйти
          </button>
        </form>
      </aside>

      {/* Mobile nav (top) */}
      <header className="lg:hidden bg-ink text-bg-0 px-5 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="serif text-[18px] font-light tracking-wider">
            RIVA admin
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-[12px] text-bg-0/60">
              Выйти
            </button>
          </form>
        </div>
        <div className="flex gap-1 overflow-x-auto -mx-5 px-5 mt-3 pb-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 px-3.5 py-2 rounded-full text-[12px] bg-bg-0/10 text-bg-0/80 hover:text-bg-0"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="p-5 sm:p-8 max-w-[1200px] w-full">{children}</main>
    </div>
  );
}
