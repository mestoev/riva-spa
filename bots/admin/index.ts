/**
 * RIVA Pool Spa — Admin Telegram bot.
 *
 * Run locally: npm run bot:admin
 *
 * Whitelisting:
 *   - /start, /whoami, /help — доступны всем (это намеренно, чтобы было удобно
 *     добавляться).
 *   - Все остальные команды требуют, чтобы у user был ряд в `admin_users`
 *     (active=true) или его ID был в TELEGRAM_ADMIN_USER_IDS.
 *
 * Bootstrap:
 *   - При первом /start от user'а, чей ID есть в ENV TELEGRAM_ADMIN_USER_IDS,
 *     мы автоматически создаём ему запись в admin_users с role=owner.
 *     Дальше owner может /admin add <id> кого угодно.
 *
 * Команды:
 *   /start     — приветствие, регистрация
 *   /whoami    — показать свой Telegram ID и роль
 *   /pending   — заявки в статусе pending (с inline-кнопками confirm/cancel)
 *   /today     — заявки на сегодня
 *   /upcoming  — confirmed на ближайшие 14 дней
 *   /stats     — KPI за день/неделю/месяц/всё
 *   /admin     — управление списком админов (только owner)
 *   /help      — список команд
 */
import "dotenv/config";
import {
  Bot,
  GrammyError,
  HttpError,
  InlineKeyboard,
  type Context,
} from "grammy";
import { PrismaClient } from "@prisma/client";
import { fmtDayFull, fmtPrice, htmlEscape } from "../shared/format";
// stats moved to lib/ for sharing with the web dashboard
import { getStats, type Period } from "../../lib/stats";
import { askAI, getAISettings } from "../../lib/ai";
import { awardPointsForBooking, getLoyaltySettings } from "../../lib/loyalty";

const TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_ADMIN_BOT_TOKEN in .env");
  process.exit(1);
}

const prisma = new PrismaClient();
const bot = new Bot(TOKEN);

// Separate Bot instance just for sending messages to customers.
const customerBotToken = process.env.TELEGRAM_CLIENT_BOT_TOKEN;
const customerBot = customerBotToken ? new Bot(customerBotToken) : null;

// =====================================================================
// AUTH
// =====================================================================

type AdminRow = { id: number; role: string; active: boolean };

async function getAdmin(telegramId: number): Promise<AdminRow | null> {
  const row = await prisma.adminUser.findUnique({
    where: { telegramId: String(telegramId) },
  });
  if (!row || !row.active) return null;
  return { id: row.id, role: row.role, active: row.active };
}

function envOwners(): number[] {
  return (process.env.TELEGRAM_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

async function ensureOwner(ctx: Context): Promise<AdminRow | null> {
  const userId = ctx.from?.id;
  if (!userId) return null;
  const existing = await getAdmin(userId);
  if (existing) return existing;
  // ENV bootstrap — first time someone in TELEGRAM_ADMIN_USER_IDS hits the bot,
  // promote them to owner.
  if (envOwners().includes(userId)) {
    const created = await prisma.adminUser.create({
      data: {
        telegramId: String(userId),
        telegramUsername: ctx.from?.username ?? null,
        displayName: ctx.from?.first_name ?? null,
        role: "owner",
        notify: true,
        active: true,
      },
    });
    console.log(`[bot:admin] bootstrapped owner ${userId} via ENV`);
    return { id: created.id, role: "owner", active: true };
  }
  return null;
}

/** Middleware-helper: bail with a friendly message if user isn't admin. */
async function requireAdmin(ctx: Context): Promise<AdminRow | null> {
  const me = await ensureOwner(ctx);
  if (!me) {
    await ctx.reply(
      "У вас нет прав для этой команды. Попросите владельца добавить вас через /admin add <ваш ID>.\n\nВаш ID можно узнать командой /whoami.",
    );
    return null;
  }
  return me;
}

async function requireOwner(ctx: Context): Promise<AdminRow | null> {
  const me = await requireAdmin(ctx);
  if (!me) return null;
  if (me.role !== "owner") {
    await ctx.reply("Эта команда доступна только владельцу (role=owner).");
    return null;
  }
  return me;
}

// =====================================================================
// /start /menu /whoami /help
// =====================================================================

function mainMenu(role: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("📥 Заявки", "m:pending")
    .text("📅 Сегодня", "m:today")
    .row()
    .text("🗓 14 дней", "m:upcoming")
    .text("📊 Статистика", "m:stats")
    .row()
    .text("🤖 AI-ассистент", "m:ai")
    .text("🎁 Баллы", "m:loyalty")
    .row();
  if (role === "owner") {
    kb.text("👥 Админы", "m:admins").row();
  }
  kb.text("ℹ️ Помощь", "m:help").text("🪪 Whoami", "m:whoami");
  return kb;
}

function homeButton(): InlineKeyboard {
  return new InlineKeyboard().text("🏠 Главное меню", "m:home");
}

async function showHomeMenu(
  ctx: Context,
  edit = false,
): Promise<void> {
  const me = await ensureOwner(ctx);
  const lines = [
    `<b>RIVA POOL SPA — admin</b>`,
    ``,
    `Бот для просмотра заявок и статистики.`,
  ];
  if (me) {
    lines.push(``, `Вы вошли как <b>${me.role}</b>. Выберите раздел:`);
  } else {
    lines.push(``, `<i>Вы пока не админ.</i> Попросите владельца добавить ваш ID:`);
    lines.push(`<code>${ctx.from?.id ?? "?"}</code>`);
  }
  const text = lines.join("\n");
  const reply_markup = me ? mainMenu(me.role) : undefined;
  if (edit && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup });
      return;
    } catch {
      /* fall through to reply */
    }
  }
  await ctx.reply(text, { parse_mode: "HTML", reply_markup });
}

bot.command("start", (ctx) => showHomeMenu(ctx));
bot.command("menu", (ctx) => showHomeMenu(ctx));

bot.callbackQuery("m:home", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showHomeMenu(ctx, true);
});

bot.callbackQuery("m:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    [
      `<b>Что умеет бот:</b>`,
      ``,
      `📥 <b>Заявки</b> — список ожидающих подтверждения, с кнопками подтвердить/отменить`,
      `📅 <b>Сегодня</b> — записи на текущий день`,
      `🗓 <b>14 дней</b> — записи на ближайшие 2 недели`,
      `📊 <b>Статистика</b> — KPI, выручка, топ услуг и мастеров`,
      `🤖 <b>AI-ассистент</b> — настройка и тест AI, который отвечает клиентам`,
      `👥 <b>Админы</b> — добавлять/удалять других админов (только owner)`,
      ``,
      `Уведомления о новых заявках приходят автоматически с кнопками действий.`,
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: homeButton() },
  );
});

bot.callbackQuery("m:whoami", async (ctx) => {
  await ctx.answerCallbackQuery();
  const me = await getAdmin(ctx.from?.id ?? 0);
  await ctx.editMessageText(
    [
      `Telegram ID: <code>${ctx.from?.id ?? "?"}</code>`,
      `Username: ${ctx.from?.username ? "@" + ctx.from.username : "—"}`,
      `Имя: ${ctx.from?.first_name ?? "—"}`,
      `Роль: ${me ? me.role : "не админ"}`,
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: homeButton() },
  );
});

bot.command("whoami", async (ctx) => {
  const me = await getAdmin(ctx.from?.id ?? 0);
  await ctx.reply(
    [
      `Telegram ID: <code>${ctx.from?.id ?? "?"}</code>`,
      `Username: ${ctx.from?.username ? "@" + ctx.from.username : "—"}`,
      `Имя: ${ctx.from?.first_name ?? "—"}`,
      `Роль: ${me ? me.role : "не админ"}`,
    ].join("\n"),
    { parse_mode: "HTML" },
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      `<b>Команды</b>`,
      `/start — главный экран`,
      `/whoami — ваш ID и роль`,
      `/pending — заявки, ожидающие подтверждения`,
      `/today — заявки на сегодня`,
      `/upcoming — подтверждённые на ближайшие 14 дней`,
      `/stats — KPI`,
      `/admin — управление админами (только owner)`,
      `/ai — настройки AI-ассистента`,
    ].join("\n"),
    { parse_mode: "HTML" },
  );
});

// =====================================================================
// /ai — manage AI assistant settings
// =====================================================================

bot.callbackQuery("m:ai", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireAdmin(ctx))) return;
  const s = await getAISettings();
  const apiOk = !!process.env.GROQ_API_KEY;
  const kb = new InlineKeyboard()
    .text(s.enabled ? "🔴 Выключить" : "🟢 Включить", "ai:toggle")
    .row()
    .text("🧪 Тест", "ai:test_hint")
    .text("📜 История", "ai:history")
    .row()
    .text("🏠 Главное меню", "m:home");
  await ctx.editMessageText(
    [
      `<b>AI-ассистент</b>`,
      ``,
      `Состояние: ${s.enabled ? "🟢 включён" : "🔴 выключен"}`,
      `Модель: <code>${htmlEscape(s.model)}</code>`,
      `Temperature: ${s.temperature}`,
      `API key: ${apiOk ? "✅" : "❌ не задан"}`,
      ``,
      `<b>Команды для тонкой настройки:</b>`,
      `<code>/ai prompt &lt;текст&gt;</code> — стиль/роль`,
      `<code>/ai facts &lt;текст&gt;</code> — доп. факты`,
      `<code>/ai model &lt;имя&gt;</code> — модель`,
      `<code>/ai temp &lt;0..1&gt;</code> — креативность`,
      `<code>/ai test &lt;вопрос&gt;</code> — задать вопрос как клиент`,
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: kb },
  );
});

bot.callbackQuery("ai:toggle", async (ctx) => {
  if (!(await requireAdmin(ctx))) return ctx.answerCallbackQuery();
  const s = await getAISettings();
  await prisma.aISettings.update({
    where: { id: s.id },
    data: { enabled: !s.enabled },
  });
  await ctx.answerCallbackQuery({ text: !s.enabled ? "Включён" : "Выключен" });
  // Re-show settings panel
  const fresh = await getAISettings();
  const apiOk = !!process.env.GROQ_API_KEY;
  const kb = new InlineKeyboard()
    .text(fresh.enabled ? "🔴 Выключить" : "🟢 Включить", "ai:toggle")
    .row()
    .text("🧪 Тест", "ai:test_hint")
    .text("📜 История", "ai:history")
    .row()
    .text("🏠 Главное меню", "m:home");
  await ctx.editMessageText(
    [
      `<b>AI-ассистент</b>`,
      ``,
      `Состояние: ${fresh.enabled ? "🟢 включён" : "🔴 выключен"}`,
      `Модель: <code>${htmlEscape(fresh.model)}</code>`,
      `Temperature: ${fresh.temperature}`,
      `API key: ${apiOk ? "✅" : "❌ не задан"}`,
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: kb },
  );
});

bot.callbackQuery("ai:test_hint", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "Чтобы проверить ответ AI — отправь команду:\n\n<code>/ai test ваш вопрос</code>\n\nНапример: <code>/ai test Сколько стоит хаммам?</code>",
    { parse_mode: "HTML", reply_markup: homeButton() },
  );
});

bot.callbackQuery("ai:history", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireAdmin(ctx))) return;
  const rows = await prisma.aIMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (rows.length === 0) {
    await ctx.reply("История пустая.", { reply_markup: homeButton() });
    return;
  }
  const lines = rows.reverse().map((r) => {
    const who = r.role === "user" ? "👤" : "🤖";
    return `${who} <code>${r.telegramId}</code>\n${htmlEscape(r.content.slice(0, 200))}`;
  });
  await ctx.reply(lines.join("\n\n"), {
    parse_mode: "HTML",
    reply_markup: homeButton(),
  });
});

bot.command("ai", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const raw = (ctx.match ?? "").trim();
  // Split sub-command from rest
  const firstSpace = raw.indexOf(" ");
  const sub = firstSpace === -1 ? raw : raw.slice(0, firstSpace);
  const rest = firstSpace === -1 ? "" : raw.slice(firstSpace + 1).trim();

  // No subcommand → show current settings
  if (!sub) {
    const s = await getAISettings();
    const apiOk = !!process.env.GROQ_API_KEY;
    await ctx.reply(
      [
        `<b>AI-ассистент</b>`,
        ``,
        `Состояние: ${s.enabled ? "🟢 включён" : "🔴 выключен"}`,
        `Модель: <code>${htmlEscape(s.model)}</code>`,
        `Temperature: ${s.temperature}`,
        `Max tokens: ${s.maxTokens}`,
        `API key: ${apiOk ? "✅ задан" : "❌ нет, AI не сможет отвечать"}`,
        ``,
        `<b>System prompt:</b>`,
        `<pre>${htmlEscape(s.systemPrompt)}</pre>`,
        s.customFacts
          ? `<b>Дополнительные факты:</b>\n<pre>${htmlEscape(s.customFacts)}</pre>`
          : `<i>Дополнительные факты не заданы.</i>`,
        ``,
        `<b>Команды:</b>`,
        `/ai on — включить`,
        `/ai off — выключить`,
        `/ai prompt &lt;текст&gt; — изменить роль/стиль`,
        `/ai facts &lt;текст&gt; — добавить факты (парковка, оплата и т.п.)`,
        `/ai facts clear — очистить факты`,
        `/ai model &lt;имя&gt; — сменить модель Groq`,
        `/ai temp &lt;0..1&gt; — креативность`,
        `/ai maxtok &lt;100..4000&gt; — макс длина ответа`,
        `/ai test &lt;вопрос&gt; — задать вопрос как клиент`,
        `/ai history — последние 10 диалогов`,
        `/ai purge — удалить всю историю диалогов`,
        ``,
        `<b>Доступные модели Groq:</b>`,
        `· <code>llama-3.3-70b-versatile</code> — лучшее качество (default)`,
        `· <code>llama-3.1-8b-instant</code> — самое быстрое`,
        `· <code>mixtral-8x7b-32768</code> — длинный контекст`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );
    return;
  }

  if (sub === "on" || sub === "off") {
    await prisma.aISettings.upsert({
      where: { id: 1 },
      create: { id: 1, enabled: sub === "on" },
      update: { enabled: sub === "on" },
    });
    await ctx.reply(`AI ${sub === "on" ? "🟢 включён" : "🔴 выключен"}`);
    return;
  }

  if (sub === "prompt") {
    if (!rest) return ctx.reply("Использование: /ai prompt <текст>");
    const s = await getAISettings();
    await prisma.aISettings.update({ where: { id: s.id }, data: { systemPrompt: rest } });
    await ctx.reply(`✅ System prompt обновлён (${rest.length} символов).`);
    return;
  }

  if (sub === "facts") {
    const s = await getAISettings();
    if (rest === "clear") {
      await prisma.aISettings.update({ where: { id: s.id }, data: { customFacts: "" } });
      await ctx.reply("Дополнительные факты очищены.");
      return;
    }
    if (!rest) return ctx.reply("Использование: /ai facts <текст> или /ai facts clear");
    await prisma.aISettings.update({ where: { id: s.id }, data: { customFacts: rest } });
    await ctx.reply(`✅ Факты обновлены (${rest.length} символов).`);
    return;
  }

  if (sub === "model") {
    if (!rest) return ctx.reply("Использование: /ai model <имя_модели>");
    const s = await getAISettings();
    await prisma.aISettings.update({ where: { id: s.id }, data: { model: rest } });
    await ctx.reply(`✅ Модель: ${rest}`);
    return;
  }

  if (sub === "temp") {
    const v = Number(rest);
    if (!Number.isFinite(v) || v < 0 || v > 1.5) {
      return ctx.reply("Использование: /ai temp <число от 0 до 1.5>");
    }
    const s = await getAISettings();
    await prisma.aISettings.update({ where: { id: s.id }, data: { temperature: v } });
    await ctx.reply(`✅ Temperature: ${v}`);
    return;
  }

  if (sub === "maxtok") {
    const v = Number(rest);
    if (!Number.isInteger(v) || v < 100 || v > 4000) {
      return ctx.reply("Использование: /ai maxtok <100..4000>");
    }
    const s = await getAISettings();
    await prisma.aISettings.update({ where: { id: s.id }, data: { maxTokens: v } });
    await ctx.reply(`✅ Max tokens: ${v}`);
    return;
  }

  if (sub === "test") {
    if (!rest) return ctx.reply("Использование: /ai test <вопрос>");
    await ctx.replyWithChatAction("typing").catch(() => null);
    const result = await askAI(`admin:${ctx.from!.id}`, rest, []);
    if (!result) {
      await ctx.reply(
        "AI не ответил. Проверь GROQ_API_KEY в .env, статус (/ai), и логи бота.",
      );
      return;
    }
    await ctx.reply(
      [
        `🧪 <b>Тестовый ответ AI</b>`,
        ``,
        result.text,
        ``,
        `<i>tokens: ${result.promptTokens ?? "?"} → ${result.completionTokens ?? "?"} · ${result.latencyMs}ms</i>`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );
    return;
  }

  if (sub === "history") {
    const rows = await prisma.aIMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    if (rows.length === 0) {
      await ctx.reply("История пустая.");
      return;
    }
    const lines = rows.reverse().map((r) => {
      const who = r.role === "user" ? "👤" : "🤖";
      const tail = r.completionTokens ? ` (${r.completionTokens}t)` : "";
      return `${who} <code>${r.telegramId}</code>${tail}\n${htmlEscape(r.content.slice(0, 300))}`;
    });
    // Telegram limit
    let buf = "";
    const chunks: string[] = [];
    for (const ln of lines) {
      if (buf.length + ln.length + 2 > 3500) {
        chunks.push(buf);
        buf = "";
      }
      buf += (buf ? "\n\n" : "") + ln;
    }
    if (buf) chunks.push(buf);
    for (const c of chunks) await ctx.reply(c, { parse_mode: "HTML" });
    return;
  }

  if (sub === "purge") {
    if (!(await requireOwner(ctx))) return;
    const r = await prisma.aIMessage.deleteMany({});
    await ctx.reply(`Удалено ${r.count} сообщений из истории.`);
    return;
  }

  await ctx.reply("Неизвестная подкоманда. /ai без аргументов — список и помощь.");
});

// =====================================================================
// /pending /today /upcoming
// =====================================================================

function bookingCard(b: {
  id: string;
  status: string;
  priceSnapshot: number;
  service: { name: string };
  master: { name: string };
  customer: { name: string; phone: string; telegramUsername: string | null };
  slot: { date: Date; time: string };
}) {
  return [
    `📅 <b>${fmtDayFull(b.slot.date)}, ${b.slot.time}</b>`,
    `${htmlEscape(b.service.name)} · ${htmlEscape(b.master.name)} · ${fmtPrice(b.priceSnapshot)}`,
    `${htmlEscape(b.customer.name)} · ${htmlEscape(b.customer.phone)}${b.customer.telegramUsername ? " · @" + b.customer.telegramUsername : ""}`,
    `Статус: ${b.status} · ID <code>${b.id}</code>`,
  ].join("\n");
}

function bookingButtons(id: string, status: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (status === "pending") {
    kb.text("✅ Подтвердить", `b:confirm:${id}`).text("❌ Отменить", `b:cancel:${id}`).row();
  } else if (status === "confirmed") {
    kb.text("✓ Пришёл (completed)", `b:complete:${id}`)
      .text("⨉ Не пришёл", `b:noshow:${id}`)
      .row()
      .text("Отменить", `b:cancel:${id}`);
  }
  return kb;
}

async function showPending(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;
  const list = await prisma.booking.findMany({
    where: { status: "pending" },
    include: { service: true, master: true, customer: true, slot: true },
    orderBy: { slot: { date: "asc" } },
    take: 20,
  });
  if (list.length === 0) {
    await ctx.reply("Заявок в обработке нет 🎉", { reply_markup: homeButton() });
    return;
  }
  await ctx.reply(`<b>Ожидают подтверждения · ${list.length}</b>`, { parse_mode: "HTML" });
  for (const b of list) {
    await ctx.reply(bookingCard(b), {
      parse_mode: "HTML",
      reply_markup: bookingButtons(b.id, b.status),
    });
  }
  await ctx.reply("Готово ↑", { reply_markup: homeButton() });
}

bot.command("pending", showPending);
bot.callbackQuery("m:pending", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showPending(ctx);
});

async function showToday(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);

  const list = await prisma.booking.findMany({
    where: {
      slot: { date: { gte: start, lte: end } },
      status: { in: ["pending", "confirmed"] },
    },
    include: { service: true, master: true, customer: true, slot: true },
    orderBy: { slot: { time: "asc" } },
  });
  if (list.length === 0) {
    await ctx.reply("На сегодня записей нет.", { reply_markup: homeButton() });
    return;
  }
  await ctx.reply(`<b>Сегодня · ${list.length}</b>`, { parse_mode: "HTML" });
  for (const b of list) {
    await ctx.reply(bookingCard(b), {
      parse_mode: "HTML",
      reply_markup: bookingButtons(b.id, b.status),
    });
  }
  await ctx.reply("Готово ↑", { reply_markup: homeButton() });
}

bot.command("today", showToday);
bot.callbackQuery("m:today", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showToday(ctx);
});

async function showUpcoming(ctx: Context) {
  if (!(await requireAdmin(ctx))) return;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 14);

  const list = await prisma.booking.findMany({
    where: {
      slot: { date: { gte: start, lte: end } },
      status: { in: ["pending", "confirmed"] },
    },
    include: { service: true, master: true, customer: true, slot: true },
    orderBy: [{ slot: { date: "asc" } }, { slot: { time: "asc" } }],
    take: 50,
  });
  if (list.length === 0) {
    await ctx.reply("На ближайшие 14 дней записей нет.", { reply_markup: homeButton() });
    return;
  }
  const lines = list.map(
    (b) =>
      `<b>${fmtDayFull(b.slot.date)} ${b.slot.time}</b> · ${htmlEscape(b.service.name)} · ${htmlEscape(b.customer.name)} (${b.status})`,
  );
  const chunks: string[] = [];
  let buf = "";
  for (const ln of lines) {
    if (buf.length + ln.length + 1 > 3500) {
      chunks.push(buf);
      buf = "";
    }
    buf += (buf ? "\n" : "") + ln;
  }
  if (buf) chunks.push(buf);
  for (let i = 0; i < chunks.length; i += 1) {
    const isLast = i === chunks.length - 1;
    await ctx.reply(chunks[i], {
      parse_mode: "HTML",
      reply_markup: isLast ? homeButton() : undefined,
    });
  }
}

bot.command("upcoming", showUpcoming);
bot.callbackQuery("m:upcoming", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showUpcoming(ctx);
});

// =====================================================================
// /stats
// =====================================================================

async function showStatsMenu(ctx: Context, edit = false) {
  if (!(await requireAdmin(ctx))) return;
  const kb = new InlineKeyboard()
    .text("Сегодня", "stats:today")
    .text("7 дней", "stats:week")
    .row()
    .text("30 дней", "stats:month")
    .text("Всё время", "stats:all")
    .row()
    .text("🏠 Главное меню", "m:home");
  const text = "Выберите период:";
  if (edit && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { reply_markup: kb });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, { reply_markup: kb });
}

bot.command("stats", (ctx) => showStatsMenu(ctx));
bot.callbackQuery("m:stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showStatsMenu(ctx, true);
});

bot.callbackQuery(/^stats:(today|week|month|all)$/, async (ctx) => {
  if (!(await requireAdmin(ctx))) {
    await ctx.answerCallbackQuery();
    return;
  }
  await ctx.answerCallbackQuery({ text: "Считаю…" });
  const period = ctx.match![1] as Period;
  const s = await getStats(period);

  const periodLabel = {
    today: "Сегодня",
    week: "За 7 дней",
    month: "За 30 дней",
    all: "За всё время",
  }[period];

  const lines: string[] = [
    `<b>${periodLabel}</b>`,
    ``,
    `<b>Заявки:</b> всего ${s.bookings.total}`,
    `· ожидают: ${s.bookings.pending}`,
    `· подтверждены: ${s.bookings.confirmed}`,
    `· выполнены: ${s.bookings.completed}`,
    `· отменены: ${s.bookings.cancelled}`,
    `· не пришли: ${s.bookings.noShow}`,
    ``,
    `<b>Выручка:</b>`,
    `· все подтверждённые: ${fmtPrice(s.revenue.confirmed)}`,
    `· фактически выполнено: ${fmtPrice(s.revenue.completed)}`,
    ``,
    `<b>Источники:</b> сайт ${s.bySource.website} · Telegram ${s.bySource.telegram} · телефон ${s.bySource.phone} · с улицы ${s.bySource.walkin}`,
  ];

  if (s.topServices.length > 0) {
    lines.push("", "<b>Топ услуг:</b>");
    for (const t of s.topServices) {
      lines.push(`· ${htmlEscape(t.name)} — ${t.count} (${fmtPrice(t.revenue)})`);
    }
  }
  if (s.topMasters.length > 0) {
    lines.push("", "<b>Топ мастеров:</b>");
    for (const t of s.topMasters) {
      lines.push(`· ${htmlEscape(t.name)} — ${t.count} (${fmtPrice(t.revenue)})`);
    }
  }

  const navKb = new InlineKeyboard()
    .text("← Период", "m:stats")
    .text("🏠 Меню", "m:home");
  await ctx.editMessageText(lines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: navKb,
  });
});

// =====================================================================
// Booking actions
// =====================================================================

async function updateBookingStatus(
  bookingId: string,
  status: "confirmed" | "cancelled" | "completed" | "no_show",
  actor: string,
) {
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: bookingId },
      data: { status },
      include: { service: true, master: true, customer: true, slot: true },
    });
    await tx.adminEvent.create({
      data: {
        bookingId: b.id,
        actor,
        action: status,
      },
    });
    return b;
  });
}

async function notifyCustomerByBooking(b: {
  id: string;
  status: string;
  service: { name: string };
  slot: { date: Date; time: string };
  customer: { telegramId: string | null };
}) {
  if (!customerBot || !b.customer.telegramId) return;
  const tgId = Number(b.customer.telegramId);
  if (!Number.isFinite(tgId) || tgId <= 0) return;
  const text =
    b.status === "confirmed"
      ? `✅ <b>Запись подтверждена</b>\n\n${htmlEscape(b.service.name)}\n${fmtDayFull(b.slot.date)}, ${b.slot.time}\n\nЖдём вас!`
      : b.status === "cancelled"
        ? `❌ <b>Запись отменена</b>\n\n${htmlEscape(b.service.name)}\n${fmtDayFull(b.slot.date)}, ${b.slot.time}\n\nЕсли это ошибка — позвоните +7 (727) 311-45-67.`
        : null;
  if (!text) return;
  try {
    await customerBot.api.sendMessage(tgId, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.warn("[bot:admin] could not notify customer", tgId, err);
  }
}

bot.callbackQuery(/^b:confirm:(.+)$/, async (ctx) => {
  if (!(await requireAdmin(ctx))) {
    await ctx.answerCallbackQuery();
    return;
  }
  const id = ctx.match![1];
  try {
    const b = await updateBookingStatus(id, "confirmed", `tg:${ctx.from!.id}`);
    await ctx.answerCallbackQuery({ text: "Подтверждено" });
    await ctx.editMessageText(bookingCard({ ...b, status: "confirmed" }), {
      parse_mode: "HTML",
      reply_markup: bookingButtons(id, "confirmed"),
    });
    await notifyCustomerByBooking(b);
  } catch (err) {
    console.error("[bot:admin] confirm failed:", err);
    await ctx.answerCallbackQuery({ text: "Ошибка", show_alert: true });
  }
});

bot.callbackQuery(/^b:cancel:(.+)$/, async (ctx) => {
  if (!(await requireAdmin(ctx))) {
    await ctx.answerCallbackQuery();
    return;
  }
  const id = ctx.match![1];
  try {
    const b = await updateBookingStatus(id, "cancelled", `tg:${ctx.from!.id}`);
    await ctx.answerCallbackQuery({ text: "Отменено" });
    await ctx.editMessageText(bookingCard({ ...b, status: "cancelled" }), {
      parse_mode: "HTML",
    });
    await notifyCustomerByBooking(b);
  } catch (err) {
    console.error("[bot:admin] cancel failed:", err);
    await ctx.answerCallbackQuery({ text: "Ошибка", show_alert: true });
  }
});

bot.callbackQuery(/^b:complete:(.+)$/, async (ctx) => {
  if (!(await requireAdmin(ctx))) {
    await ctx.answerCallbackQuery();
    return;
  }
  const id = ctx.match![1];
  try {
    const b = await updateBookingStatus(id, "completed", `tg:${ctx.from!.id}`);
    // Award loyalty points
    const award = await awardPointsForBooking(b.customerId, b.id, b.priceSnapshot);
    await ctx.answerCallbackQuery({ text: "Выполнено" });
    await ctx.editMessageText(bookingCard({ ...b, status: "completed" }), {
      parse_mode: "HTML",
    });
    if (award && award.awarded > 0) {
      await ctx.reply(
        `🎁 Клиенту начислено <b>${award.awarded}</b> баллов (баланс: ${award.total}).`,
        { parse_mode: "HTML" },
      );
    }
  } catch (err) {
    console.error("[bot:admin] complete failed:", err);
    await ctx.answerCallbackQuery({ text: "Ошибка", show_alert: true });
  }
});

bot.callbackQuery(/^b:noshow:(.+)$/, async (ctx) => {
  if (!(await requireAdmin(ctx))) {
    await ctx.answerCallbackQuery();
    return;
  }
  const id = ctx.match![1];
  try {
    const b = await updateBookingStatus(id, "no_show", `tg:${ctx.from!.id}`);
    await ctx.answerCallbackQuery({ text: "Отметили" });
    await ctx.editMessageText(bookingCard({ ...b, status: "no_show" }), {
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("[bot:admin] noshow failed:", err);
    await ctx.answerCallbackQuery({ text: "Ошибка", show_alert: true });
  }
});

// =====================================================================
// /admin — manage admin list (owner only)
// =====================================================================

// =====================================================================
// /loyalty — bonus points settings
// =====================================================================

async function showLoyaltyPanel(ctx: Context, edit = false) {
  if (!(await requireAdmin(ctx))) return;
  const s = await getLoyaltySettings();
  const totalCustomers = await prisma.customer.count();
  const totalEarned = await prisma.bonusTransaction.aggregate({
    _sum: { points: true },
    where: { points: { gt: 0 } },
  });
  const totalRedeemed = await prisma.bonusTransaction.aggregate({
    _sum: { points: true },
    where: { points: { lt: 0 } },
  });
  const balance = await prisma.customer.aggregate({
    _sum: { bonusPoints: true },
  });

  const kb = new InlineKeyboard()
    .text(s.enabled ? "🔴 Выключить" : "🟢 Включить", "loy:toggle")
    .row()
    .text("🏠 Главное меню", "m:home");

  const text = [
    `<b>🎁 Программа лояльности</b>`,
    ``,
    `Состояние: ${s.enabled ? "🟢 включена" : "🔴 выключена"}`,
    `Начисление: <b>${s.earnPercent}%</b> от суммы выполненной услуги`,
    `Курс: <b>1 балл = ${s.perPointKzt} ₸</b>`,
    `Можно списать: до <b>${s.redeemMaxPct}%</b> от чека`,
    ``,
    `<b>Статистика:</b>`,
    `Клиентов всего: ${totalCustomers}`,
    `Начислено баллов: ${totalEarned._sum.points ?? 0}`,
    `Списано: ${Math.abs(totalRedeemed._sum.points ?? 0)}`,
    `На балансах сейчас: ${balance._sum.bonusPoints ?? 0}`,
    ``,
    `<b>Команды:</b>`,
    `<code>/loyalty earn &lt;%&gt;</code> — % начисления`,
    `<code>/loyalty perpoint &lt;₸&gt;</code> — стоимость одного балла`,
    `<code>/loyalty maxredeem &lt;%&gt;</code> — лимит списания`,
    `<code>/loyalty give &lt;tgId&gt; &lt;баллы&gt;</code> — начислить вручную`,
    `<code>/loyalty take &lt;tgId&gt; &lt;баллы&gt;</code> — списать вручную`,
  ].join("\n");

  if (edit && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
}

bot.callbackQuery("m:loyalty", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showLoyaltyPanel(ctx, true);
});

bot.callbackQuery("loy:toggle", async (ctx) => {
  if (!(await requireAdmin(ctx))) return ctx.answerCallbackQuery();
  const s = await getLoyaltySettings();
  await prisma.loyaltySettings.update({
    where: { id: s.id },
    data: { enabled: !s.enabled },
  });
  await ctx.answerCallbackQuery({ text: !s.enabled ? "Включено" : "Выключено" });
  await showLoyaltyPanel(ctx, true);
});

bot.command("loyalty", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const args = (ctx.match ?? "").trim().split(/\s+/).filter(Boolean);
  if (args.length === 0) return showLoyaltyPanel(ctx);

  const sub = args[0];
  const s = await getLoyaltySettings();

  if (sub === "earn") {
    const v = Number(args[1]);
    if (!Number.isFinite(v) || v < 0 || v > 50) {
      return ctx.reply("Использование: /loyalty earn <0..50>");
    }
    await prisma.loyaltySettings.update({ where: { id: s.id }, data: { earnPercent: v } });
    return ctx.reply(`✅ Начисление: ${v}%`);
  }
  if (sub === "perpoint") {
    const v = Number(args[1]);
    if (!Number.isInteger(v) || v < 1 || v > 1000) {
      return ctx.reply("Использование: /loyalty perpoint <1..1000>");
    }
    await prisma.loyaltySettings.update({ where: { id: s.id }, data: { perPointKzt: v } });
    return ctx.reply(`✅ 1 балл = ${v} ₸`);
  }
  if (sub === "maxredeem") {
    const v = Number(args[1]);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return ctx.reply("Использование: /loyalty maxredeem <0..100>");
    }
    await prisma.loyaltySettings.update({ where: { id: s.id }, data: { redeemMaxPct: v } });
    return ctx.reply(`✅ Лимит списания: ${v}%`);
  }
  if (sub === "give" || sub === "take") {
    const tgId = args[1];
    const points = Number(args[2]);
    if (!tgId || !Number.isInteger(points) || points <= 0) {
      return ctx.reply(`Использование: /loyalty ${sub} <tgId> <баллы>`);
    }
    const customer = await prisma.customer.findFirst({ where: { telegramId: tgId } });
    if (!customer) return ctx.reply("Клиент с таким Telegram ID не найден.");
    const delta = sub === "give" ? points : -points;
    const { adjustPoints } = await import("../../lib/loyalty");
    const total = await adjustPoints(
      customer.id,
      delta,
      sub === "give" ? "adjustment" : "redeemed",
      `Через админ-бот ${ctx.from?.id}`,
    );
    return ctx.reply(`✅ ${sub === "give" ? "Начислено" : "Списано"} ${points}. Баланс: ${total}.`);
  }

  await ctx.reply("Неизвестная подкоманда. Без аргументов — список и помощь.");
});

bot.callbackQuery("m:admins", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await requireAdmin(ctx))) return;
  const list = await prisma.adminUser.findMany({ orderBy: { id: "asc" } });
  const lines = list.map(
    (a) =>
      `${a.role === "owner" ? "👑" : "👤"} <code>${a.telegramId}</code> · ${a.role}` +
      (a.displayName ? ` · ${htmlEscape(a.displayName)}` : "") +
      (a.telegramUsername ? ` · @${a.telegramUsername}` : "") +
      (a.notify ? "" : " · 🔕") +
      (a.active ? "" : " · ❌"),
  );
  await ctx.editMessageText(
    [
      `<b>Админы (${list.length})</b>`,
      ...lines,
      ``,
      `<b>Команды (только owner):</b>`,
      `<code>/admin add &lt;tgId&gt; [имя]</code>`,
      `<code>/admin remove &lt;tgId&gt;</code>`,
      `<code>/admin promote &lt;tgId&gt;</code>`,
      `<code>/admin mute &lt;tgId&gt;</code> / <code>unmute</code>`,
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: homeButton() },
  );
});

bot.command("admin", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const args = (ctx.match ?? "").trim().split(/\s+/).filter(Boolean);

  if (args.length === 0) {
    const list = await prisma.adminUser.findMany({ orderBy: { id: "asc" } });
    const lines = list.map(
      (a) =>
        `${a.role === "owner" ? "👑" : "👤"} <code>${a.telegramId}</code> · ${a.role}` +
        (a.displayName ? ` · ${htmlEscape(a.displayName)}` : "") +
        (a.telegramUsername ? ` · @${a.telegramUsername}` : "") +
        (a.notify ? "" : " · 🔕") +
        (a.active ? "" : " · ❌"),
    );
    await ctx.reply(
      [
        `<b>Админы (${list.length})</b>`,
        ...lines,
        ``,
        `Команды:`,
        `/admin add &lt;tgId&gt; [имя] — добавить (только owner)`,
        `/admin remove &lt;tgId&gt; — удалить (только owner)`,
        `/admin promote &lt;tgId&gt; — сделать owner (только owner)`,
        `/admin mute &lt;tgId&gt; — выключить уведомления`,
        `/admin unmute &lt;tgId&gt; — включить`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );
    return;
  }

  const sub = args[0];
  const tgId = args[1];

  if (sub === "add") {
    if (!(await requireOwner(ctx))) return;
    if (!tgId) {
      await ctx.reply("Использование: /admin add <tgId> [имя]");
      return;
    }
    const displayName = args.slice(2).join(" ") || null;
    const created = await prisma.adminUser.upsert({
      where: { telegramId: tgId },
      create: { telegramId: tgId, displayName, role: "manager", notify: true, active: true },
      update: { displayName, active: true },
    });
    await ctx.reply(`✅ Добавлен: <code>${created.telegramId}</code> (${created.role})`, {
      parse_mode: "HTML",
    });
    return;
  }

  if (sub === "remove") {
    if (!(await requireOwner(ctx))) return;
    if (!tgId) return ctx.reply("Использование: /admin remove <tgId>");
    if (Number(tgId) === ctx.from?.id) {
      await ctx.reply("Себя удалять нельзя — попросите другого owner.");
      return;
    }
    await prisma.adminUser.update({ where: { telegramId: tgId }, data: { active: false } }).catch(() => null);
    await ctx.reply(`Деактивирован: <code>${tgId}</code>`, { parse_mode: "HTML" });
    return;
  }

  if (sub === "promote") {
    if (!(await requireOwner(ctx))) return;
    if (!tgId) return ctx.reply("Использование: /admin promote <tgId>");
    await prisma.adminUser.update({
      where: { telegramId: tgId },
      data: { role: "owner" },
    }).catch(() => null);
    await ctx.reply(`👑 ${tgId} теперь owner`);
    return;
  }

  if (sub === "mute" || sub === "unmute") {
    if (!(await requireAdmin(ctx))) return;
    if (!tgId) return ctx.reply(`Использование: /admin ${sub} <tgId>`);
    await prisma.adminUser.update({
      where: { telegramId: tgId },
      data: { notify: sub === "unmute" },
    }).catch(() => null);
    await ctx.reply(`${sub === "mute" ? "🔕" : "🔔"} ${tgId}`);
    return;
  }

  await ctx.reply("Неизвестная подкоманда. /admin без аргументов — список и помощь.");
});

// =====================================================================
// Error handler & startup
// =====================================================================

bot.catch((err) => {
  const e = err.error;
  if (e instanceof GrammyError) console.error("[grammy] request error:", e.description);
  else if (e instanceof HttpError) console.error("[grammy] network error:", e);
  else console.error("[bot:admin] error:", e);
});

(async () => {
  console.log("[bot:admin] starting…");
  const me = await bot.api.getMe();
  console.log(`[bot:admin] running as @${me.username}`);
  await bot.api.setMyCommands([
    { command: "start", description: "Главное меню" },
    { command: "menu", description: "Главное меню" },
    { command: "pending", description: "Заявки на подтверждение" },
    { command: "today", description: "Заявки на сегодня" },
    { command: "upcoming", description: "Ближайшие 14 дней" },
    { command: "stats", description: "Статистика" },
    { command: "ai", description: "Настройки AI-ассистента" },
    { command: "loyalty", description: "Программа лояльности" },
    { command: "admin", description: "Управление админами" },
    { command: "whoami", description: "Мой ID и роль" },
    { command: "help", description: "Помощь" },
  ]);
  await bot.start({
    onStart: () => console.log("[bot:admin] long-polling started"),
  });
})();

process.on("SIGINT", async () => {
  console.log("[bot:admin] stopping…");
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});
