import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "./login/actions";
import { AdminMobileNav } from "./admin-mobile-nav";

export const metadata: Metadata = {
  title: "RIVA admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Дашборд", exact: true },
  { href: "/admin/bookings", label: "Заявки" },
  { href: "/admin/calendar", label: "Календарь" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/masters", label: "Мастера" },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/gallery", label: "Галерея" },
  { href: "/admin/promotions", label: "Промокоды" },
  { href: "/admin/reviews", label: "Отзывы" },
  { href: "/admin/settings", label: "Настройки" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const logoutButton = (
    <form action={logoutAction}>
      <button
        type="submit"
        className="w-full text-left px-4 py-3 rounded-md text-[14px] text-bg-0/70 hover:bg-bg-0/10"
      >
        Выйти
      </button>
    </form>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr] bg-bg-1">
      {/* Sidebar — desktop only */}
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
        {logoutButton}
      </aside>

      {/* Mobile bar with hamburger sheet */}
      <AdminMobileNav logout={logoutButton} />

      <main className="p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
