"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const pairSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  beforeUrl: z.string().min(1).max(500),
  afterUrl: z.string().min(1).max(500),
  serviceId: z.string().max(64).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  active: z.coerce.boolean(),
});

export type PairFormState = { ok: true } | { ok: false; error: string } | null;

function fromFD(fd: FormData) {
  return {
    title: String(fd.get("title") ?? "").trim(),
    description: (fd.get("description") as string)?.trim() || null,
    beforeUrl: String(fd.get("beforeUrl") ?? "").trim(),
    afterUrl: String(fd.get("afterUrl") ?? "").trim(),
    serviceId: (fd.get("serviceId") as string)?.trim() || null,
    sortOrder: fd.get("sortOrder") ?? 0,
    active: fd.get("active") === "on" || fd.get("active") === "true",
  };
}

export async function createPair(_p: PairFormState, fd: FormData): Promise<PairFormState> {
  const parsed = pairSchema.safeParse(fromFD(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка" };
  if (!parsed.data.beforeUrl || !parsed.data.afterUrl) {
    return { ok: false, error: "Загрузите оба фото — «до» и «после»" };
  }
  await prisma.beforeAfterPair.create({ data: parsed.data });
  revalidatePath("/admin/results");
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

export async function updatePair(
  id: number,
  _p: PairFormState,
  fd: FormData,
): Promise<PairFormState> {
  const parsed = pairSchema.safeParse(fromFD(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка" };
  await prisma.beforeAfterPair.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/results");
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

export async function deletePair(id: number) {
  await prisma.beforeAfterPair.delete({ where: { id } });
  revalidatePath("/admin/results");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function togglePairActive(id: number, next: boolean) {
  await prisma.beforeAfterPair.update({ where: { id }, data: { active: next } });
  revalidatePath("/admin/results");
  revalidatePath("/gallery");
  revalidatePath("/");
}
