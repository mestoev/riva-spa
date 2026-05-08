"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  MASTER_COOKIE,
  MASTER_TTL_SEC,
  signMasterSession,
  verifyPassword,
} from "@/lib/master-auth";

export async function masterLoginAction(
  username: string,
  password: string,
  next: string,
): Promise<{ ok: false; error: string }> {
  // Slow down brute force a bit on every attempt
  await new Promise((r) => setTimeout(r, 300));

  if (!username || !password) {
    return { ok: false, error: "Заполните логин и пароль" };
  }

  const master = await prisma.master.findUnique({
    where: { username: username.trim() },
  });
  if (!master || !master.active) {
    return { ok: false, error: "Неверный логин или пароль" };
  }
  const ok = await verifyPassword(password, master.passwordHash);
  if (!ok) {
    return { ok: false, error: "Неверный логин или пароль" };
  }

  const token = await signMasterSession(master.id);
  cookies().set(MASTER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MASTER_TTL_SEC,
  });

  const safeNext =
    next && next.startsWith("/master") && !next.startsWith("//") ? next : "/master";
  redirect(safeNext);
}

export async function masterLogoutAction() {
  cookies().delete(MASTER_COOKIE);
  redirect("/master/login");
}
