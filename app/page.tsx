import { prisma } from "@/lib/db";
import {
  Hero,
  ServicesPreview,
  PoolFeature,
  GalleryStrip,
  Reviews,
} from "@/components/home-sections";
import { FAQSection } from "@/components/faq-section";
import { GALLERY as STATIC_GALLERY } from "@/lib/data";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [services, dbGallery, settings, dbReviews] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    prisma.galleryImage.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    getSiteSettings(),
    prisma.review.findMany({
      where: { approved: true, hidden: false, text: { not: "" } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const reviewItems =
    dbReviews.length > 0
      ? dbReviews.map((r) => {
          const days = Math.max(
            1,
            Math.floor((Date.now() - r.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
          );
          const when =
            days < 7 ? `${days} дн назад` : days < 30 ? `${Math.floor(days / 7)} нед назад` : `${Math.floor(days / 30)} мес назад`;
          return {
            id: String(r.id),
            name: r.customer.name,
            when,
            text: r.text,
            rating: r.rating,
          };
        })
      : undefined;

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

  const galleryItems =
    dbGallery.length > 0
      ? dbGallery.map((g) => ({
          id: String(g.id),
          title: g.title,
          subtitle: g.subtitle ?? "",
          imageUrl: g.imageUrl as string | null,
          tone: "pool" as const,
        }))
      : STATIC_GALLERY.map((g) => ({
          id: g.id,
          title: g.title,
          subtitle: g.subtitle,
          imageUrl: null as string | null,
          tone: g.tone,
        }));

  return (
    <>
      <Hero heroImageUrl={settings.heroImageUrl || undefined} />
      <ServicesPreview services={mapped} totalCount={services.length} />
      <PoolFeature />
      <GalleryStrip items={galleryItems} />
      <Reviews items={reviewItems} />
      <FAQSection items={settings.faq} />
    </>
  );
}
