"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function approveReview(id: number, next: boolean) {
  await prisma.review.update({
    where: { id },
    data: { approved: next },
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/");
}

export async function hideReview(id: number, next: boolean) {
  await prisma.review.update({
    where: { id },
    data: { hidden: next },
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/");
}

export async function deleteReview(id: number) {
  await prisma.review.delete({ where: { id } });
  revalidatePath("/admin/reviews");
  revalidatePath("/");
}
