// Tiny wrapper around grammy for sending notifications from server actions.
// We only use the Bot API send-message endpoint here — the bots themselves
// (long-polling / webhook handlers) live in separate scripts.
import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "./db";

let _adminBot: Bot | null = null;
let _clientBot: Bot | null = null;

function adminBot(): Bot | null {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!token) return null;
  if (!_adminBot) _adminBot = new Bot(token);
  return _adminBot;
}

function clientBot(): Bot | null {
  const token = process.env.TELEGRAM_CLIENT_BOT_TOKEN;
  if (!token) return null;
  if (!_clientBot) _clientBot = new Bot(token);
  return _clientBot;
}

function envAdminUserIds(): number[] {
  const raw = process.env.TELEGRAM_ADMIN_USER_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Resolve which Telegram user IDs should receive admin notifications.
 * Source of truth = `admin_users` table (active + notify=true).
 * Fallback = ENV var TELEGRAM_ADMIN_USER_IDS (useful before DB is set up).
 *
 * Caveat: this is async — callers must await it.
 */
async function resolveAdminRecipients(): Promise<number[]> {
  try {
    const rows = await prisma.adminUser.findMany({
      where: { active: true, notify: true },
      select: { telegramId: true },
    });
    if (rows.length > 0) {
      return rows
        .map((r) => Number(r.telegramId))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
  } catch (err) {
    // DB might not be set up yet (early dev) — fall back to env
    console.warn("[telegram] could not query admin_users, using ENV fallback:", err);
  }
  return envAdminUserIds();
}

/**
 * Check whether a Telegram user is an admin.
 * Used by the admin bot to gate command handlers.
 */
export async function isAdmin(telegramId: string | number): Promise<boolean> {
  const id = String(telegramId);
  try {
    const row = await prisma.adminUser.findUnique({
      where: { telegramId: id },
      select: { active: true },
    });
    if (row) return row.active;
  } catch (err) {
    console.warn("[telegram] isAdmin DB lookup failed:", err);
  }
  // Fallback: env list
  return envAdminUserIds().includes(Number(id));
}

/**
 * Send a message to every admin Telegram user.
 * Recipients come from the `admin_users` table (with ENV fallback).
 *
 * If `bookingId` is supplied, the message gets inline buttons
 * "✅ Подтвердить" / "❌ Отменить" wired to the admin bot's callback
 * handlers (see bots/admin/index.ts → b:confirm / b:cancel).
 *
 * Silent no-op if bot token or admin list are empty — we don't want
 * to break the booking flow if the bot is down or unconfigured.
 */
export async function notifyAdmins(
  text: string,
  opts?: {
    parse_mode?: "HTML" | "MarkdownV2";
    bookingId?: string;
  },
) {
  const bot = adminBot();
  if (!bot) {
    console.warn("[telegram] admin bot token not set, skipping notifyAdmins");
    return { ok: false, sent: 0 };
  }
  const ids = await resolveAdminRecipients();
  if (ids.length === 0) {
    console.warn(
      "[telegram] no admin recipients (admin_users empty + ENV empty). " +
        "Add yourself via the bot's /start command once it's running.",
    );
    return { ok: false, sent: 0 };
  }

  // If a booking id is provided, attach inline action buttons
  const reply_markup = opts?.bookingId
    ? new InlineKeyboard()
        .text("✅ Подтвердить", `b:confirm:${opts.bookingId}`)
        .text("❌ Отменить", `b:cancel:${opts.bookingId}`)
    : undefined;

  let sent = 0;
  await Promise.all(
    ids.map(async (id) => {
      try {
        await bot.api.sendMessage(id, text, {
          parse_mode: opts?.parse_mode ?? "HTML",
          link_preview_options: { is_disabled: true },
          reply_markup,
        });
        sent += 1;
      } catch (err) {
        console.error(`[telegram] failed to notify admin ${id}:`, err);
      }
    }),
  );
  return { ok: sent > 0, sent };
}

/**
 * Send a message to a specific Telegram user via the customer bot.
 * Used for booking confirmations when the customer linked their TG.
 */
export async function notifyCustomer(telegramId: string | number, text: string) {
  const bot = clientBot();
  if (!bot) {
    console.warn("[telegram] client bot token not set, skipping notifyCustomer");
    return { ok: false };
  }
  try {
    await bot.api.sendMessage(Number(telegramId), text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    return { ok: true };
  } catch (err) {
    console.error(`[telegram] failed to notify customer ${telegramId}:`, err);
    return { ok: false };
  }
}

// HTML-escape for safe message bodies
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
