/**
 * Reminder cron — runs every 5 minutes via system cron.
 *
 *   1. 24h before appt → DM customer (only confirmed bookings, only those
 *      who have a Telegram link).
 *   2. 2h before appt → DM again.
 *   3. 1h after a "completed" booking → request a star rating.
 *
 * Each row in `bookings` has remind24SentAt / remind2SentAt /
 * reviewRequestSentAt to prevent double-sending.
 *
 * Cron line on the server (every 5 minutes):
 *   *\/5 * * * * cd /root/riva-spa/spa-salon/web && /usr/bin/npm run reminders >> /var/log/riva-reminders.log 2>&1
 */
import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TOKEN = process.env.TELEGRAM_CLIENT_BOT_TOKEN;
if (!TOKEN) {
  console.error("[reminders] TELEGRAM_CLIENT_BOT_TOKEN missing");
  process.exit(1);
}
const bot = new Bot(TOKEN);

const RU_MONTHS = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря",
];

function fmtDay(d: Date): string {
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]}`;
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Combine slot date (UTC midnight) + "HH:MM" string into a UTC Date.
 *  Aqtobe local time is UTC+5 (no DST). */
function slotDateTime(slotDate: Date, time: string): Date {
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(slotDate);
  d.setUTCHours(hh - 5, mm, 0, 0);
  return d;
}

async function sendOrSkip(tgId: string, text: string, kb?: InlineKeyboard): Promise<boolean> {
  const id = Number(tgId);
  if (!Number.isFinite(id) || id <= 0) return false;
  try {
    await bot.api.sendMessage(id, text, {
      parse_mode: "HTML",
      reply_markup: kb,
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (err) {
    console.warn(`[reminders] send to ${tgId} failed:`, err);
    return false;
  }
}

async function send24hReminders() {
  const now = Date.now();
  // Find candidates: confirmed, has telegramId, not yet reminded, slot 23-25h ahead
  const candidates = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      remind24SentAt: null,
      customer: { telegramId: { not: null } },
    },
    include: { customer: true, service: true, master: true, slot: true },
    take: 200,
  });
  let sent = 0;
  for (const b of candidates) {
    const appt = slotDateTime(b.slot.date, b.slot.time).getTime();
    const hoursAhead = (appt - now) / (60 * 60 * 1000);
    if (hoursAhead < 23 || hoursAhead > 25) continue;

    const text = [
      `🔔 <b>Напоминание</b>`,
      ``,
      `Завтра в <b>${b.slot.time}</b> у вас:`,
      `${htmlEscape(b.service.name)} · ${htmlEscape(b.master.name)}`,
      `${fmtDay(b.slot.date)}, ${b.slot.time}`,
      ``,
      `Если планы поменялись — отмените заранее в /me, чтобы кто-то другой смог записаться.`,
    ].join("\n");

    const ok = await sendOrSkip(b.customer.telegramId!, text);
    if (ok) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { remind24SentAt: new Date() },
      });
      sent += 1;
    }
  }
  return sent;
}

async function send2hReminders() {
  const now = Date.now();
  const candidates = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      remind2SentAt: null,
      customer: { telegramId: { not: null } },
    },
    include: { customer: true, service: true, master: true, slot: true },
    take: 200,
  });
  let sent = 0;
  for (const b of candidates) {
    const appt = slotDateTime(b.slot.date, b.slot.time).getTime();
    const hoursAhead = (appt - now) / (60 * 60 * 1000);
    if (hoursAhead < 1 || hoursAhead > 3) continue;

    const text = [
      `⏰ <b>Через 2 часа</b>`,
      ``,
      `${htmlEscape(b.service.name)} · ${htmlEscape(b.master.name)}`,
      `Сегодня в ${b.slot.time}`,
      ``,
      `Адрес: ул. Загородная 17, Актобе.`,
      `Ждём вас!`,
    ].join("\n");

    const ok = await sendOrSkip(b.customer.telegramId!, text);
    if (ok) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { remind2SentAt: new Date() },
      });
      sent += 1;
    }
  }
  return sent;
}

async function sendReviewRequests() {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const candidates = await prisma.booking.findMany({
    where: {
      status: "completed",
      reviewRequestSentAt: null,
      updatedAt: { lte: oneHourAgo },
      customer: { telegramId: { not: null } },
    },
    include: { customer: true, service: true, master: true },
    take: 100,
  });
  let sent = 0;
  for (const b of candidates) {
    const text = [
      `Как прошёл визит?`,
      ``,
      `${htmlEscape(b.service.name)} · ${htmlEscape(b.master.name)}`,
      ``,
      `Поставьте оценку — это поможет нам стать лучше:`,
    ].join("\n");
    const kb = new InlineKeyboard()
      .text("⭐", `cli:review:${b.id}:1`)
      .text("⭐⭐", `cli:review:${b.id}:2`)
      .text("⭐⭐⭐", `cli:review:${b.id}:3`)
      .row()
      .text("⭐⭐⭐⭐", `cli:review:${b.id}:4`)
      .text("⭐⭐⭐⭐⭐", `cli:review:${b.id}:5`);

    const ok = await sendOrSkip(b.customer.telegramId!, text, kb);
    if (ok) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { reviewRequestSentAt: new Date() },
      });
      sent += 1;
    }
  }
  return sent;
}

async function main() {
  const r24 = await send24hReminders();
  const r2 = await send2hReminders();
  const rev = await sendReviewRequests();
  console.log(`[reminders] 24h=${r24} 2h=${r2} review=${rev}`);
}

main()
  .catch((e) => {
    console.error("[reminders] fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
