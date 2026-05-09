"use server";

import { validatePromo } from "@/lib/promo";

/** Server action — used by booking-client to "preview" a promo discount. */
export async function previewPromo(code: string, totalKzt: number) {
  if (!code || code.length < 2) {
    return { ok: false as const, error: "Введите код" };
  }
  const r = await validatePromo(code, totalKzt);
  if (!r.ok) return { ok: false as const, error: r.error };
  return {
    ok: true as const,
    code: r.code,
    discount: r.discount,
    finalTotal: r.finalTotal,
  };
}
