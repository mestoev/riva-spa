/**
 * Generate an .ics calendar file for a booking — clients tap once, opens in
 * Apple/Google Calendar with all details pre-filled.
 *
 * No auth: bookingId is a CUID (effectively unguessable), and the file only
 * contains time + service name + address — nothing private.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format Date as YYYYMMDDTHHmmssZ in UTC for VCALENDAR. */
function fmtUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/** Escape commas, semicolons and newlines per RFC5545. */
function esc(s: string): string {
  return s.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { service: true, master: true, slot: true },
  });
  if (!booking) {
    return new NextResponse("not found", { status: 404 });
  }

  const settings = await getSiteSettings();

  // Slot.date is the date (00:00 UTC), Slot.time is "HH:MM" string.
  // Construct full Date in local Asia/Aqtobe (UTC+5) → adjust to UTC.
  // Asia/Aqtobe = UTC+5 (no DST).
  const [hh, mm] = booking.slot.time.split(":").map((s) => Number(s));
  const start = new Date(booking.slot.date);
  start.setUTCHours(hh - 5, mm, 0, 0); // local Aqtobe → UTC
  const end = new Date(start.getTime() + booking.service.duration * 60_000);

  const uid = `${booking.id}@${(process.env.NEXT_PUBLIC_SITE_URL || "riva.spa").replace(/^https?:\/\//, "")}`;

  const summary = `${booking.service.name} · ${booking.master.name}`;
  const description = [
    `Запись в ${settings.name}.`,
    `Услуга: ${booking.service.name}`,
    `Мастер: ${booking.master.name}`,
    `Длительность: ${booking.service.duration} мин`,
    `Стоимость: ${(booking.priceSnapshot - booking.discount).toLocaleString("ru-RU")} ₸`,
    booking.notes ? `Пожелания: ${booking.notes}` : "",
  ]
    .filter(Boolean)
    .join("\\n");
  const location = settings.address;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${settings.name}//RU`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(start)}`,
    `DTEND:${fmtUtc(end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(location)}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT2H",
    `DESCRIPTION:${esc(`Скоро запись: ${booking.service.name}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const body = lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="riva-${booking.id}.ics"`,
    },
  });
}
