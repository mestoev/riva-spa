import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { MASTER_COOKIE, getMasterFromCookie } from "@/lib/master-auth";
import { masterLogoutAction } from "./login/actions";
import { MasterMobileNav } from "./master-mobile-nav";

export const metadata: Metadata = {
  title: "RIVA · кабинет мастера",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/master", label: "Сегодня" },
  { href: "/master/bookings", label: "Все записи" },
  { href: "/master/schedule", label: "Моё расписание" },
  { href: "/master/me", label: "Профиль" },
];

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  // /master/login is public — render bare content, no sidebar / auth check.
  // (Middleware sets x-pathname on every request.)
  const path = headers().get("x-pathname") ?? "";
  if (path === "/master/login" || path.startsWith("/master/login/")) {
    return <>{children}</>;
  }

  // Protected branch — middleware already gated it, but read master for sidebar.
  const token = cookies().get(MASTER_COOKIE)?.value;
  const master = await getMasterFromCookie(token);
  if (!master) {
    // Should not happen because middleware redirects, but be safe.
    return <>{children}</>;
  }

  const logoutButton = (
    <form action={masterLogoutAction}>
      <button
        type="submit"
        className="w-full text-left px-4 py-3 rounded-md text-[14px] text-bg-0/70 hover:bg-bg-0/10"
      >
        Выйти
      </button>
    </form>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr] bg-bg-1">
      <aside className="hidden lg:flex flex-col bg-ink text-bg-0 p-6 sticky top-0 h-screen">
        <div className="serif text-[22px] font-light tracking-wider mb-1">RIVA</div>
        <div className="font-mono text-[10px] tracking-[0.2em] text-bg-0/50 uppercase mb-6">
          кабинет мастера
        </div>
        <div className="bg-bg-0/10 rounded-lg p-3 mb-6">
          <div className="text-[11px] text-bg-0/60">Вы вошли как</div>
          <div className="font-medium mt-0.5">{master.name}</div>
          <div className="text-[12px] text-bg-0/60 mt-0.5">{master.role}</div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2.5 rounded-md text-sm text-bg-0/80 hover:bg-bg-0/10 hover:text-bg-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {logoutButton}
      </aside>

      <MasterMobileNav
        masterName={master.name}
        masterRole={master.role}
        logout={logoutButton}
      />

      <main className="p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full">{children}</main>
    </div>
  );
}
