"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { ServiceCategory } from "@prisma/client";

const SERVICE_CATEGORIES = ["massage", "pool", "bath", "face", "duo"] as const;

const serviceSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефисы"),
  category: z.enum(SERVICE_CATEGORIES),
  name: z.string().min(2).max(120),
  desc: z.string().min(2).max(500),
  duration: z.coerce.number().int().min(5).max(720),
  price: z.coerce.number().int().min(0).max(99_999_999),
  tag: z.string().max(40).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  active: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});

export type ServiceFormState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

function parseFromFormData(fd: FormData) {
  return {
    id: String(fd.get("id") ?? "").trim(),
    category: String(fd.get("category") ?? "") as ServiceCategory,
    name: String(fd.get("name") ?? "").trim(),
    desc: String(fd.get("desc") ?? "").trim(),
    duration: fd.get("duration"),
    price: fd.get("price"),
    tag: (fd.get("tag") as string)?.trim() || null,
    imageUrl: (fd.get("imageUrl") as string)?.trim() || null,
    active: fd.get("active") === "on" || fd.get("active") === "true",
    sortOrder: fd.get("sortOrder") ?? 0,
  };
}

export async function createService(_prev: ServiceFormState, fd: FormData): Promise<ServiceFormState> {
  const parsed = serviceSchema.safeParse(parseFromFormData(fd));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  try {
    await prisma.service.create({ data: parsed.data });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) {
      return { ok: false, error: "Такой ID уже занят" };
    }
    return { ok: false, error: "Ошибка БД" };
  }
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
  redirect("/admin/services");
}

export async function updateService(
  id: string,
  _prev: ServiceFormState,
  fd: FormData,
): Promise<ServiceFormState> {
  const parsed = serviceSchema.safeParse({ ...parseFromFormData(fd), id });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  try {
    await prisma.service.update({
      where: { id },
      data: {
        category: parsed.data.category,
        name: parsed.data.name,
        desc: parsed.data.desc,
        duration: parsed.data.duration,
        price: parsed.data.price,
        tag: parsed.data.tag,
        imageUrl: parsed.data.imageUrl,
        active: parsed.data.active,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch {
    return { ok: false, error: "Не удалось сохранить" };
  }
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
  redirect("/admin/services");
}

export async function toggleServiceActive(id: string, next: boolean) {
  await prisma.service.update({ where: { id }, data: { active: next } });
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
}

/**
 * Permanently delete a service. Refuses if any bookings reference it —
 * caller should fall back to soft-hide (active=false) in that case.
 */
export async function deleteService(
  id: string,
): Promise<{ ok: true } | { ok: false; reason: "has_bookings" | "not_found" | "error"; usedIn?: number }> {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return { ok: false, reason: "not_found" };

  const usedIn = await prisma.booking.count({ where: { serviceId: id } });
  if (usedIn > 0) {
    return { ok: false, reason: "has_bookings", usedIn };
  }
  try {
    await prisma.service.delete({ where: { id } });
  } catch (err) {
    console.error("[deleteService]", err);
    return { ok: false, reason: "error" };
  }
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
  return { ok: true };
}
