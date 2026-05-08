import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ServiceForm } from "../service-form";

export default async function EditServicePage({ params }: { params: { id: string } }) {
  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service) notFound();

  return (
    <div>
      <Link href="/admin/services" className="text-[13px] text-ink-mute">
        ← Услуги
      </Link>
      <h1 className="serif text-[32px] sm:text-[38px] font-light leading-tight mt-3 mb-7">
        {service.name}
      </h1>
      <ServiceForm service={service} />
    </div>
  );
}
