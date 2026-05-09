import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PromoForm } from "../promo-form";

export default async function EditPromoPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) notFound();
  return (
    <div>
      <Link href="/admin/promotions" className="text-[13px] text-ink-mute">
        ← Промокоды
      </Link>
      <h1 className="serif text-[26px] sm:text-[38px] font-light leading-tight mt-3 mb-7">
        {promo.code}
      </h1>
      <PromoForm promo={promo} />
    </div>
  );
}
