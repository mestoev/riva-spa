import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/data";
import { ServicesPageClient } from "./services-client";

export const metadata: Metadata = {
  title: "Услуги — массажи, бассейн, хаммам",
  description:
    "Полный каталог услуг RIVA POOL SPA: классический и СПА-массаж, стоун-терапия, бассейн на террасе, хаммам, программы для двоих.",
};

// Read live from DB so changes in /admin/services show up immediately
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  // Map DB rows to the shape the client component expects
  const mapped = services.map((s) => ({
    id: s.id,
    cat: s.category,
    name: s.name,
    desc: s.desc,
    duration: s.duration,
    price: s.price,
    tag: s.tag,
    imageUrl: s.imageUrl,
  }));
  return <ServicesPageClient services={mapped} categories={CATEGORIES} />;
}
