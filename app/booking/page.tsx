import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/data";
import { getSchedule } from "@/lib/schedule";
import { BookingClient } from "./booking-client";

export const metadata: Metadata = {
  title: "Запись на процедуру",
  description:
    "Запишитесь в RIVA POOL SPA онлайн за 4 шага: выбор услуги, мастера, даты и времени.",
};

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [services, masters, schedule] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.master.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSchedule(14),
  ]);

  return (
    <BookingClient
      services={services.map((s) => ({
        id: s.id,
        cat: s.category,
        name: s.name,
        desc: s.desc,
        duration: s.duration,
        price: s.price,
        tag: s.tag,
        imageUrl: s.imageUrl,
      }))}
      masters={masters.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        exp: m.exp,
        specs: (m.specs as string[]) as never,
        rating: m.rating,
        avatarUrl: m.avatarUrl,
      }))}
      categories={CATEGORIES}
      schedule={schedule.map((d) => ({
        iso: d.iso,
        date: d.date,
        day: d.day,
        month: d.month,
        weekday: d.weekday,
        slots: d.slots,
      }))}
    />
  );
}
