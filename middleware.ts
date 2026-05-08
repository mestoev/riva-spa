// Next.js middleware — gates /admin/* and /master/* behind their session cookies.
// Runs on the Edge runtime → only uses Web Crypto.
import { NextRequest, NextResponse } from "next/server";
import { verifySession, ADMIN_COOKIE } from "./lib/auth";
import { verifyMasterSession, MASTER_COOKIE } from "./lib/master-auth";

export const config = {
  matcher: ["/admin/:path*", "/master/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass current pathname to server components via header.
  // Used by /master/layout.tsx to skip rendering the sidebar on /master/login.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const passthrough = NextResponse.next({ request: { headers: requestHeaders } });

  // ===== /admin/* =====
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
      return passthrough;
    }
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const session = await verifySession(token);
    if (!session) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return passthrough;
  }

  // ===== /master/* =====
  if (pathname.startsWith("/master")) {
    if (pathname === "/master/login" || pathname.startsWith("/master/login/")) {
      return passthrough;
    }
    const token = req.cookies.get(MASTER_COOKIE)?.value;
    const session = await verifyMasterSession(token);
    if (!session) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/master/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return passthrough;
  }

  return passthrough;
}
