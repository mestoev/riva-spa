import Link from "next/link";
import { ServiceForm } from "../service-form";

export default function NewServicePage() {
  return (
    <div>
      <Link href="/admin/services" className="text-[13px] text-ink-mute">
        ← Услуги
      </Link>
      <h1 className="serif text-[32px] sm:text-[38px] font-light leading-tight mt-3 mb-7">
        Новая услуга
      </h1>
      <ServiceForm />
    </div>
  );
}
