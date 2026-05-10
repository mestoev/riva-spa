import { prisma } from "@/lib/db";
import { ResultsAdmin } from "./results-admin";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const [pairs, services] = await Promise.all([
    prisma.beforeAfterPair.findMany({
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { id: "desc" }],
    }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <div className="eyebrow">Результаты</div>
      <h1 className="serif text-[28px] sm:text-[44px] font-light leading-tight mt-2 mb-2">
        До и после
      </h1>
      <p className="text-ink-soft mb-6 sm:mb-8 max-w-[640px] text-sm sm:text-base">
        Фото-результаты процедур. Отображаются на сайте в галерее. Можно опционально
        привязать к конкретной услуге.
      </p>
      <ResultsAdmin pairs={pairs} services={services} />
    </div>
  );
}
