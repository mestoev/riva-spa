"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";

const promoSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Только латиница, цифры, _ и -")
    .transform((s) => s.toUpperCase()),
  type: z.enum(["percent", "amount"]),
  value: z.coerce.number().int().min(1).max(99_999_999),
  minTotal: z.coerce.number().int().min(0).max(99_999_999),
  expiresAt: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? new Date(v) : null)),
  usageLimit: z.coerce.number().int().min(0).max(100_000),
  active: z.coerce.boolean(),
});

export type PromoFormState = { ok: true } | { ok: false; error: string } | null;

function fromFD(fd: FormData) {
  return {
    code: String(fd.get("code") ?? "").trim(),
    type: String(fd.get("type") ?? "percent") as "percent" | "amount",
    value: fd.get("value"),
    minTotal: fd.get("minTotal") ?? 0,
    expiresAt: String(fd.get("expiresAt") ?? "").trim(),
    usageLimit: fd.get("usageLimit") ?? 0,
    active: fd.get("active") === "on" || fd.get("active") === "true",
  };
}

export async function createPromo(_p: PromoFormState, fd: FormData): Promise<PromoFormState> {
  const parsed = promoSchema.safeParse(fromFD(fd));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  if (parsed.data.type === "percent" && parsed.data.value > 100) {
    return { ok: false, error: "Процент не может быть больше 100" };
  }
  try {
    await prisma.promoCode.create({ data: parsed.data });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) {
      return { ok: false, error: "Код с таким именем уже существует" };
    }
    return { ok: false, error: "Ошибка БД" };
  }
  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

export async function updatePromo(
  id: number,
  _p: PromoFormState,
  fd: FormData,
): Promise<PromoFormState> {
  const parsed = promoSchema.safeParse(fromFD(fd));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  await prisma.promoCode.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

export async function deletePromo(id: number) {
  await prisma.promoCode.delete({ where: { id } });
  revalidatePath("/admin/promotions");
}

export async function togglePromoActive(id: number, next: boolean) {
  await prisma.promoCode.update({ where: { id }, data: { active: next } });
  revalidatePath("/admin/promotions");
}
