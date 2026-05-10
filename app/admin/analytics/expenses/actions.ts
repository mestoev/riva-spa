"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const CATEGORIES = [
  "rent", "salary", "supplies", "utilities", "marketing", "equipment", "other",
] as const;

const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().int().min(1).max(999_999_999),
  category: z.enum(CATEGORIES),
  note: z.string().max(500).optional().nullable(),
});

export async function addExpense(formData: FormData) {
  const obj = {
    date: String(formData.get("date") ?? "").trim(),
    amount: formData.get("amount"),
    category: String(formData.get("category") ?? "other"),
    note: (formData.get("note") as string)?.trim() || null,
  };
  const parsed = expenseSchema.safeParse(obj);
  if (!parsed.success) return;
  await prisma.expense.create({
    data: {
      date: new Date(`${parsed.data.date}T00:00:00.000Z`),
      amount: parsed.data.amount,
      category: parsed.data.category,
      note: parsed.data.note,
    },
  });
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/analytics/expenses");
}

export async function deleteExpense(id: number) {
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/analytics/expenses");
}
