import { prisma } from "@/lib/db";
import { GalleryAdmin } from "./gallery-admin";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const images = await prisma.galleryImage.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  return (
    <div>
      <div className="eyebrow">Интерьеры</div>
      <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 mb-2">
        Галерея
      </h1>
      <p className="text-ink-soft mb-6 sm:mb-8 max-w-[640px] text-sm sm:text-base">
        Фото показываются на главной странице и в разделе «Галерея». Порядок задаётся
        вручную (sortOrder) — меньше число = выше в списке.
      </p>

      <GalleryAdmin
        images={images.map((g) => ({
          id: g.id,
          title: g.title,
          subtitle: g.subtitle,
          imageUrl: g.imageUrl,
          sortOrder: g.sortOrder,
          active: g.active,
        }))}
      />
    </div>
  );
}
