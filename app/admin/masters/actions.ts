"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generatePassword, hashPassword, suggestUsername } from "@/lib/master-auth";

const SPECS = ["massage", "pool", "bath", "face", "duo", "all"] as const;
const FLASH_COOKIE = "master_creds";

/** Server action — clears the one-time credentials flash cookie. */
export async function clearCredsFlash() {
  cookies().delete(FLASH_COOKIE);
  revalidatePath("/admin/masters");
  redirect("/admin/masters");
}

const masterSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефисы"),
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(120),
  exp: z.string().min(2).max(120),
  rating: z
    .union([z.literal(""), z.coerce.number().min(0).max(5)])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  specs: z.array(z.enum(SPECS)).min(1, "Выберите хотя бы одну специализацию"),
  avatarUrl: z.string().max(500).optional().nullable(),
  active: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});

export type MasterFormState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

function fromFD(fd: FormData) {
  const specs = fd.getAll("specs").map(String).filter(Boolean);
  return {
    id: String(fd.get("id") ?? "").trim(),
    name: String(fd.get("name") ?? "").trim(),
    role: String(fd.get("role") ?? "").trim(),
    exp: String(fd.get("exp") ?? "").trim(),
    rating: fd.get("rating") === "" || fd.get("rating") === null ? "" : fd.get("rating"),
    specs,
    avatarUrl: (fd.get("avatarUrl") as string)?.trim() || null,
    active: fd.get("active") === "on" || fd.get("active") === "true",
    sortOrder: fd.get("sortOrder") ?? 0,
  };
}

export async function createMaster(_p: MasterFormState, fd: FormData): Promise<MasterFormState> {
  const parsed = masterSchema.safeParse(fromFD(fd));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  // Generate login + password — master will see them once after creation.
  let username = suggestUsername(parsed.data.name, parsed.data.id);
  // Ensure uniqueness
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? username : `${username}${suffix}`;
    const exists = await prisma.master.findUnique({ where: { username: candidate } });
    if (!exists) {
      username = candidate;
      break;
    }
    suffix += 1;
    if (suffix > 100) break;
  }
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  try {
    await prisma.master.create({
      data: { ...parsed.data, username, passwordHash },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) {
      return { ok: false, error: "Такой ID уже занят" };
    }
    return { ok: false, error: "Ошибка БД" };
  }

  // Stash credentials so the next page (redirect target) can show them once.
  cookies().set(FLASH_COOKIE, JSON.stringify({ username, password, name: parsed.data.name }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 300, // 5 min
  });

  revalidatePath("/admin/masters");
  revalidatePath("/booking");
  redirect(`/admin/masters?credsFor=${encodeURIComponent(parsed.data.id)}`);
}

/** Reset password for an existing master. Returns the new plaintext (shown once). */
export async function resetMasterPassword(masterId: string): Promise<{ ok: true; password: string } | { ok: false; error: string }> {
  const master = await prisma.master.findUnique({ where: { id: masterId } });
  if (!master) return { ok: false, error: "Мастер не найден" };
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  let username = master.username;
  if (!username) {
    username = suggestUsername(master.name, master.id);
    let suffix = 0;
    while (true) {
      const candidate = suffix === 0 ? username : `${username}${suffix}`;
      const exists = await prisma.master.findUnique({ where: { username: candidate } });
      if (!exists || exists.id === masterId) {
        username = candidate;
        break;
      }
      suffix += 1;
      if (suffix > 100) break;
    }
  }
  await prisma.master.update({
    where: { id: masterId },
    data: { username, passwordHash },
  });
  cookies().set(FLASH_COOKIE, JSON.stringify({ username, password, name: master.name }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 300,
  });
  revalidatePath("/admin/masters");
  return { ok: true, password };
}

export async function updateMaster(
  id: string,
  _p: MasterFormState,
  fd: FormData,
): Promise<MasterFormState> {
  const parsed = masterSchema.safeParse({ ...fromFD(fd), id });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  try {
    await prisma.master.update({
      where: { id },
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        exp: parsed.data.exp,
        rating: parsed.data.rating,
        specs: parsed.data.specs,
        avatarUrl: parsed.data.avatarUrl,
        active: parsed.data.active,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch {
    return { ok: false, error: "Не удалось сохранить" };
  }
  revalidatePath("/admin/masters");
  revalidatePath("/booking");
  redirect("/admin/masters");
}

export async function toggleMasterActive(id: string, next: boolean) {
  await prisma.master.update({ where: { id }, data: { active: next } });
  revalidatePath("/admin/masters");
  revalidatePath("/booking");
}

export async function deleteMaster(
  id: string,
): Promise<{ ok: true } | { ok: false; reason: "has_bookings" | "not_found" | "error"; usedIn?: number }> {
  if (id === "any") {
    return { ok: false, reason: "error" };
  }
  const master = await prisma.master.findUnique({ where: { id } });
  if (!master) return { ok: false, reason: "not_found" };

  const usedIn = await prisma.booking.count({ where: { masterId: id } });
  if (usedIn > 0) return { ok: false, reason: "has_bookings", usedIn };

  try {
    await prisma.masterBlackout.deleteMany({ where: { masterId: id } });
    await prisma.slot.deleteMany({ where: { masterId: id } });
    await prisma.master.delete({ where: { id } });
  } catch (err) {
    console.error("[deleteMaster]", err);
    return { ok: false, reason: "error" };
  }
  revalidatePath("/admin/masters");
  revalidatePath("/booking");
  return { ok: true };
}
