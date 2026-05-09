import Link from "next/link";
import { PromoForm } from "../promo-form";

export default function NewPromoPage() {
  return (
    <div>
      <Link href="/admin/promotions" className="text-[13px] text-ink-mute">
        ← Промокоды
      </Link>
      <h1 className="serif text-[26px] sm:text-[38px] font-light leading-tight mt-3 mb-7">
        Новый промокод
      </h1>
      <PromoForm />
    </div>
  );
}
