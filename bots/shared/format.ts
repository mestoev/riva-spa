// Shared formatting helpers used by both bots.
import type { Service, Master } from "@prisma/client";

export function fmtPrice(kzt: number): string {
  return `${kzt.toLocaleString("ru-RU")} ₸`;
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

export function fmtService(s: Service): string {
  return `${s.name} · ${fmtDuration(s.duration)} · ${fmtPrice(s.price)}`;
}

export function fmtMaster(m: Master): string {
  const stars = m.rating ? ` ⭐ ${m.rating}` : "";
  return `${m.name}${stars}`;
}

const RU_MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const RU_WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export function fmtDayShort(date: Date): string {
  return `${RU_WEEKDAYS_SHORT[date.getUTCDay()]} ${date.getUTCDate()} ${RU_MONTHS_GEN[date.getUTCMonth()].slice(0, 3)}`;
}

export function fmtDayFull(date: Date): string {
  return `${date.getUTCDate()} ${RU_MONTHS_GEN[date.getUTCMonth()]}`;
}

export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
