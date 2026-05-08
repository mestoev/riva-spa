import { prisma } from "@/lib/db";
import {
  Hero,
  ServicesPreview,
  PoolFeature,
  GalleryStrip,
  Reviews,
} from "@/components/home-sections";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });
  const mapped = services.map((s) => ({
    id: s.id,
    cat: s.category,
    name: s.name,
    desc: s.desc,
    duration: s.duration,
    price: s.price,
    tag: s.tag,
  }));
  return (
    <>
      <Hero />
      <ServicesPreview services={mapped} totalCount={services.length} />
      <PoolFeature />
      <GalleryStrip />
      <Reviews />
    </>
  );
}
