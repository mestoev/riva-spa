import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MasterForm } from "../master-form";

export default async function EditMasterPage({ params }: { params: { id: string } }) {
  const master = await prisma.master.findUnique({ where: { id: params.id } });
  if (!master) notFound();

  return (
    <div>
      <Link href="/admin/masters" className="text-[13px] text-ink-mute">← Мастера</Link>
      <h1 className="serif text-[32px] sm:text-[38px] font-light leading-tight mt-3 mb-7">
        {master.name}
      </h1>
      <MasterForm master={master} />
    </div>
  );
}
