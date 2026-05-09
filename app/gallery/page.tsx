import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { GALLERY as STATIC_GALLERY } from "@/lib/data";
import { GalleryClient } from "./gallery-client";

export const metadata: Metadata = {
  title: "Галерея",
  description: "Интерьеры RIVA POOL SPA: бассейн на террасе, хаммам, массажные кабинеты, лаунж-зона.",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const dbImages = await prisma.galleryImage.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

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

  return <GalleryClient items={items} />;
}
