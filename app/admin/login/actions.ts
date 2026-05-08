"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_TTL_SEC, checkPassword, signSession } from "@/lib/auth";

export async function loginAction(
  password: string,
  next: string,
): Promise<{ ok: false; error: string }> {
  if (!checkPassword(password)) {
    // Slow down brute force a tiny bit
    await new Promise((r) => setTimeout(r, 400));
    return { ok: false, error: "Неверный пароль" };
  }

  const token = await signSession();
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_TTL_SEC,
  });

  // Validate `next` — only allow same-origin paths under /admin
  const safeNext =
    next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  redirect(safeNext);
}

export async function logoutAction() {
  cookies().delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
