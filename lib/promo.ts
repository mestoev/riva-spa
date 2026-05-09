// Promo-code validation and discount calculation.
// Used by booking server action, AI tools, and the admin promotion CRUD.
import { prisma } from "./db";

export type PromoApplyResult =
  | { ok: true; code: string; discount: number; finalTotal: number; promoId: number }
  | { ok: false; error: string };

/**
 * Validate a promo code against `totalKzt` and return discount details.
 * Doesn't increment usageCount — that happens inside booking transaction.
 */
export async function validatePromo(rawCode: string, totalKzt: number): Promise<PromoApplyResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Введите код" };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) {
    return { ok: false, error: "Код не найден или неактивен" };
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { ok: false, error: "Код просрочен" };
  }
  if (promo.usageLimit > 0 && promo.usageCount >= promo.usageLimit) {
    return { ok: false, error: "Лимит использования исчерпан" };
  }
  if (promo.minTotal > 0 && totalKzt < promo.minTotal) {
    return {
      ok: false,
      error: `Сумма заказа меньше ${promo.minTotal.toLocaleString("ru-RU")} ₸`,
    };
  }

  let discount = 0;
  if (promo.type === "percent") {
    discount = Math.floor((totalKzt * promo.value) / 100);
  } else {
    discount = promo.value;
  }
  // Don't allow discount to exceed 100%
  if (discount > totalKzt) discount = totalKzt;

  return {
    ok: true,
    code: promo.code,
    discount,
    finalTotal: totalKzt - discount,
    promoId: promo.id,
  };
}

/** Increment usageCount when booking is actually created. Use inside a tx. */
export async function consumePromo(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  promoId: number,
): Promise<void> {
  await tx.promoCode.update({
    where: { id: promoId },
    data: { usageCount: { increment: 1 } },
  });
}
