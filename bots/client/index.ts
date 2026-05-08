/**
 * RIVA Pool Spa — Customer Telegram bot.
 *
 * Run locally:  npm run bot:client
 * In prod:      same script under PM2 / systemd / Railway.
 *
 * Architecture:
 *   - grammy + long-polling (no webhook needed during dev).
 *   - Conversation state held per-user in `sessions` Map (in-memory).
 *     For production we'll swap to a DB-backed store, but for a single
 *     long-running process this is fine.
 *   - Reads catalog (services / masters) and writes bookings via the
 *     same Prisma client used by the website. One DB, one source of truth.
 *
 * Commands:
 *   /start    — welcome + main menu
 *   /menu     — main menu
 *   /book     — start booking flow
 *   /my       — list customer's upcoming bookings (link by phone)
 *   /contact  — phone, address, hours
 *   /help     — help
 *
 * Booking flow (inline-keyboard wizard):
 *   pick category → pick service → pick master → pick day → pick time
 *   → enter name → request phone (Telegram contact share) → confirm.
 */
import "dotenv/config";
import { Bot, GrammyError, HttpError, InlineKeyboard, Keyboard } from "grammy";
import { PrismaClient, type Master, type Service } from "@prisma/client";
import { getSchedule } from "../../lib/schedule";
import {
  fmtDayFull,
  fmtDayShort,
  fmtDuration,
  fmtPrice,
  htmlEscape,
} from "../shared/format";
import { askAI, loadHistory } from "../../lib/ai";
import { getCustomerStats } from "../../lib/loyalty";

const TOKEN = process.env.TELEGRAM_CLIENT_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing TELEGRAM_CLIENT_BOT_TOKEN in .env");
  process.exit(1);
}

const prisma = new PrismaClient();
const bot = new Bot(TOKEN);

// ---- per-user wizard state ----
type Step =
  | "idle"
  | "pick_service"
  | "pick_master"
  | "pick_day"
  | "pick_time"
  | "enter_name"
  | "request_phone"
  | "confirm";

type Session = {
  step: Step;
  category?: string;
  serviceId?: string;
  masterId?: string;
  dayIso?: string;
  time?: string;
  name?: string;
  phone?: string;
};

const sessions = new Map<number, Session>();
const sess = (id: number): Session => {
  let s = sessions.get(id);
  if (!s) {
    s = { step: "idle" };
    sessions.set(id, s);
  }
  return s;
};

// ===== HELPERS =====

const CATEGORY_LABELS: Record<string, string> = {
  massage: "Массажи",
  pool: "Бассейн",
  bath: "Сауна и хаммам",
  face: "Уход за лицом",
  duo: "Программы для двоих",
};

async function listCategories(): Promise<{ id: string; label: string; count: number }[]> {
  const rows = await prisma.service.groupBy({
    by: ["category"],
    where: { active: true },
    _count: { _all: true },
  });
  return rows.map((r) => ({
    id: r.category,
    label: CATEGORY_LABELS[r.category] ?? r.category,
    count: r._count._all,
  }));
}

function mainMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📅 Записаться", "menu:book")
    .text("💆 Услуги", "menu:catalog")
    .row()
    .text("📋 Мои записи", "menu:my")
    .text("👤 Кабинет", "menu:me")
    .row()
    .text("📞 Контакты", "menu:contact");
}

async function showWelcome(ctx: Parameters<Parameters<typeof bot.command>[1]>[0]) {
  const text = [
    `<b>RIVA POOL SPA</b> — тишина у воды.`,
    ``,
    `Бассейн на террасе, банный комплекс и СПА в приватной обстановке.`,
    `Через этого бота можно посмотреть услуги и записаться за пару минут.`,
  ].join("\n");
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: mainMenu() });
}

// ===== /commands =====

bot.command("start", showWelcome);
bot.command("menu", showWelcome);
bot.command("contact", async (ctx) => {
  await ctx.reply(
    [
      `<b>Контакты</b>`,
      ``,
      `📍 ул. Загородная 17, Актобе`,
      `📞 +7 (727) 311-45-67`,
      `🕘 Пн–Чт 09:00–23:00, Пт–Вс 09:00–00:00`,
    ].join("\n"),
    { parse_mode: "HTML" },
  );
});
bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      `Команды:`,
      `/start — главное меню`,
      `/book — записаться`,
      `/my — мои записи`,
      `/contact — контакты`,
    ].join("\n"),
  );
});
bot.command("book", async (ctx) => {
  await startBookingFlow(ctx);
});
bot.command("my", async (ctx) => {
  await showMyBookings(ctx);
});
bot.command("me", async (ctx) => {
  await showMyProfile(ctx);
});

// ===== Main menu callbacks =====

bot.callbackQuery("menu:book", async (ctx) => {
  await ctx.answerCallbackQuery();
  await startBookingFlow(ctx);
});

bot.callbackQuery("menu:catalog", async (ctx) => {
  await ctx.answerCallbackQuery();
  const cats = await listCategories();
  const kb = new InlineKeyboard();
  for (const c of cats) {
    kb.text(`${c.label} · ${c.count}`, `cat:${c.id}`).row();
  }
  kb.text("← Меню", "menu:home");
  await ctx.editMessageText("Выберите категорию:", { reply_markup: kb });
});

bot.callbackQuery("menu:my", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMyBookings(ctx);
});

bot.callbackQuery("menu:me", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMyProfile(ctx);
});

bot.callbackQuery("menu:contact", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    [
      `<b>Контакты</b>`,
      ``,
      `📍 ул. Загородная 17, Актобе`,
      `📞 +7 (727) 311-45-67`,
      `🕘 Пн–Чт 09:00–23:00, Пт–Вс 09:00–00:00`,
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("← Меню", "menu:home") },
  );
});

bot.callbackQuery("menu:home", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    [
      `<b>RIVA POOL SPA</b> — тишина у воды.`,
      ``,
      `Чем могу помочь?`,
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: mainMenu() },
  );
});

// ===== Catalog browsing (read-only) =====

bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const cat = ctx.match![1];
  const services = await prisma.service.findMany({
    where: { active: true, category: cat as never },
    orderBy: { sortOrder: "asc" },
  });
  if (services.length === 0) {
    await ctx.editMessageText("В этой категории сейчас пусто.");
    return;
  }
  const lines = services
    .map(
      (s) =>
        `<b>${htmlEscape(s.name)}</b>\n` +
        `<i>${htmlEscape(s.desc)}</i>\n` +
        `${fmtDuration(s.duration)} · ${fmtPrice(s.price)}`,
    )
    .join("\n\n");
  const kb = new InlineKeyboard()
    .text("📅 Записаться", "menu:book")
    .text("← Меню", "menu:home");
  await ctx.editMessageText(`<b>${CATEGORY_LABELS[cat] ?? cat}</b>\n\n${lines}`, {
    parse_mode: "HTML",
    reply_markup: kb,
  });
});

// ===== Booking wizard =====

async function startBookingFlow(ctx: Parameters<Parameters<typeof bot.command>[1]>[0]) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const s = sess(userId);
  s.step = "pick_service";
  s.category = undefined;
  s.serviceId = s.masterId = s.dayIso = s.time = s.name = s.phone = undefined;

  const cats = await listCategories();
  const kb = new InlineKeyboard();
  for (const c of cats) kb.text(c.label, `b:cat:${c.id}`).row();
  kb.text("Отмена", "b:cancel");
  await ctx.reply("Выберите категорию услуги:", { reply_markup: kb });
}

bot.callbackQuery("b:cancel", async (ctx) => {
  if (ctx.from) sessions.delete(ctx.from.id);
  await ctx.answerCallbackQuery({ text: "Отменено" });
  await ctx.editMessageText("Запись отменена.", { reply_markup: mainMenu() });
});

bot.callbackQuery(/^b:cat:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from!.id;
  const s = sess(userId);
  s.category = ctx.match![1];

  const services = await prisma.service.findMany({
    where: { active: true, category: s.category as never },
    orderBy: { sortOrder: "asc" },
  });
  const kb = new InlineKeyboard();
  for (const sv of services) {
    kb.text(`${sv.name} · ${fmtPrice(sv.price)}`, `b:svc:${sv.id}`).row();
  }
  kb.text("← Назад", "b:back:cat").text("Отмена", "b:cancel");
  await ctx.editMessageText("Выберите услугу:", { reply_markup: kb });
});

bot.callbackQuery("b:back:cat", async (ctx) => {
  await ctx.answerCallbackQuery();
  await startBookingFlow(ctx);
});

bot.callbackQuery(/^b:svc:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from!.id;
  const s = sess(userId);
  const serviceId = ctx.match![1];
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    await ctx.editMessageText("Услуга не найдена. Начните заново через /book.");
    return;
  }
  s.serviceId = service.id;
  s.step = "pick_master";

  // Filter masters by service category, plus "any"
  const masters = await prisma.master.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  const matching = masters.filter(
    (m) => m.specs.includes(service.category) || m.specs.includes("all"),
  );
  const kb = new InlineKeyboard();
  for (const m of matching) {
    const star = m.rating ? ` ⭐${m.rating}` : "";
    kb.text(`${m.name}${star}`, `b:mst:${m.id}`).row();
  }
  kb.text("← Назад", `b:cat:${service.category}`).text("Отмена", "b:cancel");
  await ctx.editMessageText(
    `<b>${htmlEscape(service.name)}</b>\n${fmtDuration(service.duration)} · ${fmtPrice(service.price)}\n\nВыберите мастера:`,
    { parse_mode: "HTML", reply_markup: kb },
  );
});

bot.callbackQuery(/^b:mst:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from!.id;
  const s = sess(userId);
  s.masterId = ctx.match![1];
  s.step = "pick_day";

  const days = await getSchedule(14);
  const kb = new InlineKeyboard();
  // 2 days per row to fit on mobile
  for (let i = 0; i < days.length; i += 2) {
    const a = days[i];
    const b = days[i + 1];
    kb.text(fmtDayShort(a.date), `b:day:${a.iso}`);
    if (b) kb.text(fmtDayShort(b.date), `b:day:${b.iso}`);
    kb.row();
  }
  kb.text("Отмена", "b:cancel");
  await ctx.editMessageText("Выберите день:", { reply_markup: kb });
});

bot.callbackQuery(/^b:day:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from!.id;
  const s = sess(userId);
  s.dayIso = ctx.match![1];
  s.step = "pick_time";

  const day = (await getSchedule(14)).find((d) => d.iso === s.dayIso);
  if (!day) return;
  // Filter slots that conflict with already-booked slots in DB
  const taken = await prisma.slot.findMany({
    where: { date: new Date(`${s.dayIso}T00:00:00.000Z`), masterId: s.masterId },
    select: { time: true, blocked: true, booking: { select: { id: true } } },
  });
  const takenSet = new Set(
    taken.filter((t) => t.blocked || t.booking).map((t) => t.time),
  );

  const kb = new InlineKeyboard();
  for (let i = 0; i < day.slots.length; i += 3) {
    for (let j = 0; j < 3 && i + j < day.slots.length; j += 1) {
      const sl = day.slots[i + j];
      const free = sl.free && !takenSet.has(sl.time);
      kb.text(free ? sl.time : `· ${sl.time} ·`, free ? `b:t:${sl.time}` : "b:t:taken");
    }
    kb.row();
  }
  kb.text("← Назад", "b:back:day").text("Отмена", "b:cancel");

  await ctx.editMessageText(`Свободные слоты на <b>${fmtDayFull(day.date)}</b>:`, {
    parse_mode: "HTML",
    reply_markup: kb,
  });
});

bot.callbackQuery("b:back:day", async (ctx) => {
  await ctx.answerCallbackQuery();
  // re-enter pick_master then pick_day
  const userId = ctx.from!.id;
  const s = sess(userId);
  if (s.serviceId) {
    // simulate the master callback
    await ctx.api.answerCallbackQuery(ctx.callbackQuery.id);
    s.step = "pick_master";
  }
  await ctx.editMessageText("Выберите день заново через /book.");
});

bot.callbackQuery("b:t:taken", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Этот слот уже занят", show_alert: false });
});

bot.callbackQuery(/^b:t:(\d{2}:\d{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from!.id;
  const s = sess(userId);
  s.time = ctx.match![1];
  s.step = "enter_name";
  await ctx.editMessageText("Как к вам обращаться? Напишите имя в ответ на это сообщение.");
});

// Free-text handler: name + (manual phone fallback) + AI fallback
bot.on("message:text", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  // Skip slash-commands — they're handled by their own command handlers above.
  if (ctx.message.text.startsWith("/")) return;

  const s = sessions.get(userId);

  // 1) Active booking session? handle booking-specific text input.
  if (s && s.step === "enter_name") {
    const name = ctx.message.text.trim();
    if (name.length < 2 || name.length > 80) {
      await ctx.reply("Имя должно быть от 2 до 80 символов. Попробуйте ещё раз.");
      return;
    }
    s.name = name;
    s.step = "request_phone";
    const kb = new Keyboard()
      .requestContact("📱 Поделиться номером телефона")
      .resized()
      .oneTime();
    await ctx.reply(
      "Поделитесь номером телефона — пришлём подтверждение и напомним перед визитом. " +
        "Можно нажать кнопку ниже или ввести номер вручную (например +7 727 1234567).",
      { reply_markup: kb },
    );
    return;
  }

  if (s && s.step === "request_phone") {
    const phone = ctx.message.text.replace(/[\s()-]/g, "");
    if (!/^\+?\d{7,15}$/.test(phone)) {
      await ctx.reply("Не распознал номер. Введите в формате +7 7XX XXX XX XX.");
      return;
    }
    s.phone = phone;
    await finalizeBooking(ctx, s);
    return;
  }

  // 2) No active flow → ask the AI assistant.
  await handleAIMessage(ctx);
});

async function handleAIMessage(
  ctx: Parameters<Parameters<typeof bot.on>[1]>[0],
) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const userText = ("text" in ctx.message! && ctx.message.text) || "";
  if (!userText.trim()) return;

  // Show "typing…" while we wait for the model
  try {
    await ctx.replyWithChatAction("typing");
  } catch {
    /* ignore */
  }

  const history = await loadHistory(userId, 6);
  const result = await askAI(userId, userText, history);

  if (!result) {
    await ctx.reply(
      "Сейчас не могу ответить. Можно посмотреть услуги через /book или позвонить +7 (727) 311-45-67.",
    );
    return;
  }

  await ctx.reply(result.text);
}

// Phone via Telegram's "share contact" button
bot.on("message:contact", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const s = sessions.get(userId);
  if (!s || s.step !== "request_phone") return;
  const phone = ctx.message.contact.phone_number;
  s.phone = phone.startsWith("+") ? phone : `+${phone}`;
  await finalizeBooking(ctx, s);
});

async function finalizeBooking(
  ctx: Parameters<Parameters<typeof bot.on>[1]>[0],
  s: Session,
) {
  const userId = ctx.from!.id;
  const username = ctx.from?.username ?? null;

  if (!s.serviceId || !s.masterId || !s.dayIso || !s.time || !s.name || !s.phone) {
    await ctx.reply("Не хватает данных. Начните заново через /book.", {
      reply_markup: { remove_keyboard: true },
    });
    sessions.delete(userId);
    return;
  }

  try {
    const service = await prisma.service.findUnique({ where: { id: s.serviceId } });
    const master = await prisma.master.findUnique({ where: { id: s.masterId } });
    if (!service || !master) throw new Error("Service or master gone");

    const slotDate = new Date(`${s.dayIso}T00:00:00.000Z`);

    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.upsert({
        where: { date_time_masterId: { date: slotDate, time: s.time!, masterId: s.masterId! } },
        create: { date: slotDate, time: s.time!, masterId: s.masterId! },
        update: {},
      });
      if (slot.blocked) throw new Error("SLOT_BLOCKED");
      const existing = await tx.booking.findUnique({ where: { slotId: slot.id } });
      if (existing) throw new Error("SLOT_TAKEN");

      // Master's own day-off / time-off
      const dayOff = await tx.masterBlackout.findFirst({
        where: {
          masterId: master.id,
          date: slotDate,
          OR: [{ time: null }, { time: s.time! }],
        },
      });
      if (dayOff) throw new Error("MASTER_OFF");

      const customer = await tx.customer.upsert({
        where: { phone: s.phone! },
        create: {
          phone: s.phone!,
          name: s.name!,
          telegramId: String(userId),
          telegramUsername: username,
        },
        update: {
          name: s.name!,
          telegramId: String(userId),
          telegramUsername: username,
        },
      });

      const booking = await tx.booking.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          masterId: master.id,
          slotId: slot.id,
          status: "pending",
          source: "telegram",
          notify: "telegram",
          priceSnapshot: service.price,
        },
      });
      await tx.adminEvent.create({
        data: {
          bookingId: booking.id,
          actor: `telegram:${userId}`,
          action: "created",
          payload: { source: "telegram" },
        },
      });
      return { booking, customer, service, master };
    });

    sessions.delete(userId);

    const day = (await getSchedule(14)).find((d) => d.iso === s.dayIso)!;
    const priceSnapshot = result.booking.priceSnapshot;

    await ctx.reply(
      [
        `🟡 <b>Заявка получена</b>`,
        ``,
        `<b>Услуга:</b> ${htmlEscape(result.service.name)}`,
        `<b>Мастер:</b> ${htmlEscape(result.master.name)}`,
        `<b>Когда:</b> ${fmtDayFull(day.date)}, ${s.time}`,
        `<b>Стоимость:</b> ${fmtPrice(priceSnapshot)}`,
        ``,
        `Администратор подтвердит запись в течение нескольких минут — придёт отдельное сообщение.`,
        `Адрес: ул. Загородная 17, Актобе.`,
      ].join("\n"),
      {
        parse_mode: "HTML",
        reply_markup: { remove_keyboard: true },
      },
    );

    // Notify admins with inline confirm/cancel buttons (DB → ENV fallback)
    await notifyAdmins(
      [
        `🆕 <b>Новая запись через Telegram</b>`,
        ``,
        `<b>Услуга:</b> ${htmlEscape(result.service.name)} · ${fmtPrice(priceSnapshot)}`,
        `<b>Мастер:</b> ${htmlEscape(result.master.name)}`,
        `<b>Когда:</b> ${s.dayIso} ${s.time}`,
        ``,
        `<b>Клиент:</b> ${htmlEscape(result.customer.name)}`,
        `<b>Телефон:</b> ${htmlEscape(result.customer.phone)}`,
        username ? `<b>Telegram:</b> @${username}` : ``,
        ``,
        `ID: <code>${result.booking.id}</code>`,
      ]
        .filter(Boolean)
        .join("\n"),
      result.booking.id,
    );
  } catch (err) {
    // Always reset session so /book starts a fresh flow next time.
    sessions.delete(userId);

    if (err instanceof Error && (err.message === "SLOT_TAKEN" || err.message === "SLOT_BLOCKED")) {
      await ctx.reply(
        "Это время только что заняли. Выберите другое — /book.",
        { reply_markup: { remove_keyboard: true } },
      );
      return;
    }
    if (err instanceof Error && err.message === "MASTER_OFF") {
      await ctx.reply(
        "Мастер не работает в это время. Выберите другое — /book.",
        { reply_markup: { remove_keyboard: true } },
      );
      return;
    }
    console.error("[bot:client] booking error:", err);
    await ctx.reply("Произошла ошибка. Попробуйте ещё раз через /book или позвоните нам.", {
      reply_markup: { remove_keyboard: true },
    });
  }
}

// ===== /me — personal cabinet (stats + bonus points) =====

async function showMyProfile(
  ctx: Parameters<Parameters<typeof bot.command>[1]>[0],
) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Find any customer linked to this Telegram user
  const customer = await prisma.customer.findFirst({
    where: { telegramId: String(userId) },
    orderBy: { createdAt: "desc" },
  });
  if (!customer) {
    await ctx.reply(
      [
        `<b>Личный кабинет</b>`,
        ``,
        `Похоже, у вас ещё нет ни одной записи через этот бот.`,
        `Запишитесь на процедуру — после посещения сюда подтянется история и баллы.`,
      ].join("\n"),
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("📅 Записаться", "menu:book")
          .text("← Меню", "menu:home"),
      },
    );
    return;
  }

  const stats = await getCustomerStats(customer.id);
  const recent = await prisma.booking.findMany({
    where: { customerId: customer.id },
    include: { service: true, slot: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const lines: string[] = [
    `<b>👤 Личный кабинет</b>`,
    ``,
    `Имя: ${htmlEscape(customer.name)}`,
    `Телефон: ${htmlEscape(customer.phone)}`,
    ``,
    `<b>📊 Статистика</b>`,
    `Посещений: <b>${stats.visits}</b>`,
    `Потрачено всего: <b>${fmtPrice(stats.totalSpent)}</b>`,
    stats.lastVisit
      ? `Последний визит: ${fmtDayFull(stats.lastVisit)}`
      : `Последний визит: —`,
    ``,
    `<b>🎁 Клубные баллы</b>`,
    `Баланс: <b>${stats.bonusPoints}</b>`,
    `(1 балл = 1 ₸ при оплате)`,
  ];

  if (recent.length > 0) {
    lines.push(``, `<b>Последние записи:</b>`);
    for (const b of recent) {
      const dot =
        b.status === "completed"
          ? "✅"
          : b.status === "confirmed"
            ? "🟢"
            : b.status === "cancelled"
              ? "❌"
              : b.status === "no_show"
                ? "⨉"
                : "🟡";
      lines.push(
        `${dot} ${fmtDayFull(b.slot.date)} ${b.slot.time} · ${htmlEscape(b.service.name)}`,
      );
    }
  }

  await ctx.reply(lines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .text("📅 Новая запись", "menu:book")
      .text("📋 Все записи", "menu:my")
      .row()
      .text("← Меню", "menu:home"),
  });
}

// ===== /my — show user's upcoming bookings =====

async function showMyBookings(ctx: Parameters<Parameters<typeof bot.command>[1]>[0]) {
  const userId = ctx.from?.id;
  if (!userId) return;
  // telegramId is non-unique (one TG user can book for multiple people),
  // so we look up ALL customers linked to this Telegram account.
  const customers = await prisma.customer.findMany({
    where: { telegramId: String(userId) },
    select: { id: true },
  });
  if (customers.length === 0) {
    await ctx.reply(
      "У нас пока нет ваших записей в этом боте. Запишитесь через /book — и они появятся здесь.",
    );
    return;
  }
  const bookings = await prisma.booking.findMany({
    where: {
      customerId: { in: customers.map((c) => c.id) },
      status: { in: ["pending", "confirmed"] },
    },
    include: { service: true, master: true, slot: true, customer: true },
    orderBy: { slot: { date: "asc" } },
    take: 10,
  });
  if (bookings.length === 0) {
    await ctx.reply("Активных записей нет. Записаться — /book.");
    return;
  }
  const lines = bookings.map((b) => {
    const d = b.slot.date;
    // If TG user booked for several customers, show whose record this is
    const sharedTg = customers.length > 1;
    return [
      `📅 <b>${fmtDayFull(d)}, ${b.slot.time}</b>`,
      `${htmlEscape(b.service.name)} · ${htmlEscape(b.master.name)}`,
      `${fmtPrice(b.priceSnapshot)} · статус: ${b.status === "pending" ? "ожидает подтверждения" : "подтверждено"}`,
      sharedTg ? `Клиент: ${htmlEscape(b.customer.name)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  await ctx.reply(lines.join("\n\n"), { parse_mode: "HTML" });
}

// ===== Notify admins helper (mirror of lib/telegram.ts notifyAdmins) =====
// We can't import the Next.js server lib from here without bundler help,
// so we replicate it inline. Kept tiny on purpose.

async function notifyAdmins(text: string, bookingId?: string) {
  const adminToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!adminToken) return;

  let ids: number[] = [];
  try {
    const rows = await prisma.adminUser.findMany({
      where: { active: true, notify: true },
      select: { telegramId: true },
    });
    ids = rows
      .map((r) => Number(r.telegramId))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    /* fall through to env */
  }
  if (ids.length === 0) {
    ids = (process.env.TELEGRAM_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  if (ids.length === 0) return;

  const reply_markup = bookingId
    ? new InlineKeyboard()
        .text("✅ Подтвердить", `b:confirm:${bookingId}`)
        .text("❌ Отменить", `b:cancel:${bookingId}`)
    : undefined;

  const adminBotInstance = new Bot(adminToken);
  await Promise.all(
    ids.map(async (id) => {
      try {
        await adminBotInstance.api.sendMessage(id, text, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
          reply_markup,
        });
      } catch (e) {
        console.error(`[notifyAdmins] failed for ${id}:`, e);
      }
    }),
  );
}

// ===== Error handler =====

bot.catch((err) => {
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("[grammy] request error:", e.description);
  } else if (e instanceof HttpError) {
    console.error("[grammy] network error:", e);
  } else {
    console.error("[bot:client] error:", e);
  }
});

// ===== Start =====

(async () => {
  console.log("[bot:client] starting…");
  const me = await bot.api.getMe();
  console.log(`[bot:client] running as @${me.username}`);
  // Set bot commands so they appear in the Telegram UI menu
  await bot.api.setMyCommands([
    { command: "start", description: "Главное меню" },
    { command: "book", description: "Записаться" },
    { command: "me", description: "Личный кабинет" },
    { command: "my", description: "Мои записи" },
    { command: "contact", description: "Контакты" },
    { command: "help", description: "Помощь" },
  ]);
  await bot.start({
    onStart: () => console.log("[bot:client] long-polling started"),
  });
})();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[bot:client] stopping…");
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});
