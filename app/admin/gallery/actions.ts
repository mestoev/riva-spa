"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const galleryImageSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional().nullable(),
  imageUrl: z.string().min(1).max(500),
  sortOrder: z.coerce.number().int().default(0),
  active: z.coerce.boolean(),
});

export type GalleryFormState = { ok: true } | { ok: false; error: string } | null;

function fromFD(fd: FormData) {
  return {
    title: String(fd.get("title") ?? "").trim(),
    subtitle: (fd.get("subtitle") as string)?.trim() || null,
    imageUrl: String(fd.get("imageUrl") ?? "").trim(),
    sortOrder: fd.get("sortOrder") ?? 0,
    active: fd.get("active") === "on" || fd.get("active") === "true",
  };
}

export async function createGalleryImage(_p: GalleryFormState, fd: FormData): Promise<GalleryFormState> {
  const parsed = galleryImageSchema.safeParse(fromFD(fd));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  if (!parsed.data.imageUrl) {
    return { ok: false, error: "Сначала загрузите фото" };
  }
  await prisma.galleryImage.create({ data: parsed.data });
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

export async function updateGalleryImage(
  id: number,
  _p: GalleryFormState,
  fd: FormData,
): Promise<GalleryFormState> {
  const parsed = galleryImageSchema.safeParse(fromFD(fd));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  await prisma.galleryImage.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteGalleryImage(id: number) {
  await prisma.galleryImage.delete({ where: { id } });
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function toggleGalleryActive(id: number, next: boolean) {
  await prisma.galleryImage.update({ where: { id }, data: { active: next } });
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}
