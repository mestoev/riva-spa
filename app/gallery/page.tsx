import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { GALLERY as STATIC_GALLERY } from "@/lib/data";
import { GalleryClient } from "./gallery-client";
import { BeforeAfterSlider } from "@/components/before-after-slider";

export const metadata: Metadata = {
  title: "Галерея",
  description: "Интерьеры RIVA POOL SPA: бассейн на террасе, хаммам, массажные кабинеты, лаунж-зона.",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const [dbImages, pairs] = await Promise.all([
    prisma.galleryImage.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    prisma.beforeAfterPair.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
    }),
  ]);

  const items =
    dbImages.length > 0
      ? dbImages.map((g) => ({
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
      <GalleryClient items={items} />
      {pairs.length > 0 ? (
        <section className="pb-16 sm:pb-24 lg:pb-32 bg-bg-1">
          <div className="container-x pt-12 sm:pt-16">
            <div className="eyebrow">Результаты</div>
            <h2
              className="serif font-light leading-none -tracking-[0.02em] m-0 mt-3 mb-8 sm:mb-10"
              style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
            >
              До <span style={{ fontStyle: "italic", color: "var(--gold-3)" }}>и после</span>
            </h2>
            <p className="text-ink-soft max-w-[600px] mb-8 sm:mb-10">
              Перетягивайте разделитель, чтобы сравнить фото до процедуры и после.
            </p>
            <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              {pairs.map((p) => (
                <BeforeAfterSlider
                  key={p.id}
                  beforeUrl={p.beforeUrl}
                  afterUrl={p.afterUrl}
                  title={p.title}
                  description={p.description}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
