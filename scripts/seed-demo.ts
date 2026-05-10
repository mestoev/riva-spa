/**
 * Seed the DB with one month worth of realistic demo activity.
 *
 *   npm run db:seed-demo            # add demo data on top of existing
 *   npm run db:seed-demo -- --clear # remove all demo rows (clients with @demo.local + their bookings/reviews/etc.)
 *
 * - ~80 customers (@demo.local emails so they're easy to wipe)
 * - ~150 bookings spread across the last 30 days + next 7 days
 *   - ~60% completed (past)
 *   - ~10% cancelled
 *   - ~10% no_show
 *   - ~15% confirmed (future)
 *   - ~5% pending
 * - Bonus point ledger entries for completed bookings (5% by default)
 * - ~30 reviews tied to completed bookings
 * - ~10 expenses (rent, salaries, supplies, utilities, marketing)
 * - 4 promo codes (some already used)
 * - ~10 ContactRequest rows
 *
 * Idempotent-ish: re-running adds *more* demo rows (different random phones/names).
 * To clean up demo data: --clear flag wipes everything tied to @demo.local customers.
 */

import { PrismaClient, BookingStatus, BookingSource, ExpenseCategory, PromoType } from "@prisma/client";

const prisma = new PrismaClient();

// ===== Config ============================================================

const TARGET_CUSTOMERS = 80;
const TARGET_BOOKINGS = 150;
const TARGET_REVIEWS = 30;
const TARGET_EXPENSES = 10;
const TARGET_PROMOS = 4;
const TARGET_CONTACTS = 10;

const PERIOD_DAYS_BACK = 30;
const PERIOD_DAYS_FORWARD = 7;

const DEMO_EMAIL_DOMAIN = "@demo.local";

// ===== Name pools ========================================================

const FIRST_NAMES_F = [
  "Айгерим", "Дина", "Алия", "Айдана", "Гульнара", "Жанна", "Сауле", "Ляззат",
  "Мадина", "Айжан", "Алма", "Назгуль", "Айнур", "Гаухар", "Раушан", "Жанар",
  "Данара", "Куралай", "Ботагоз", "Айгуль", "Гульмира", "Зарина", "Камила",
  "Анна", "Мария", "Ольга", "Татьяна", "Елена", "Светлана", "Юлия", "Ирина",
  "Наталья", "Екатерина", "Алёна", "Виктория",
];
const FIRST_NAMES_M = [
  "Айдар", "Тимур", "Ержан", "Бауыржан", "Куаныш", "Нурлан", "Серик", "Кайрат",
  "Мухтар", "Аскар", "Дамир", "Руслан", "Алибек", "Олжас", "Бахытжан", "Канат",
  "Айбек", "Ерлан", "Данияр", "Арман", "Талгат", "Жасулан", "Мирас",
  "Александр", "Сергей", "Дмитрий", "Иван", "Андрей", "Михаил", "Антон",
];
const LAST_NAMES_KZ = [
  "Нурланова", "Сатпаева", "Кенжебекова", "Алимова", "Касымов", "Ибрагимов",
  "Ержанов", "Тулегенов", "Ахметов", "Бекбулатов", "Жумабаев", "Кадыров",
  "Сулейменова", "Серикбаева", "Аубакиров", "Жунусов", "Калиев", "Омаров",
  "Бектаев", "Турсынов",
];
const LAST_NAMES_RU = [
  "Иванова", "Петрова", "Сидорова", "Смирнов", "Васильев", "Соколова",
  "Морозов", "Волкова", "Алексеев", "Зайцева",
];

// ===== Review texts (realistic, in RU) ===================================

const REVIEW_TEXTS_5 = [
  "Невероятная атмосфера, ушла как новенькая. Спасибо мастеру!",
  "Бассейн на террасе — это нечто. Пришла усталой, ушла другим человеком.",
  "Стоун-терапия — глубокий и точный массаж. Все боли в спине ушли.",
  "Хаммам с пилингом — кожа как у младенца. Будем приходить каждый месяц.",
  "Праздновали с мужем годовщину — СПА для двоих, всё на высшем уровне.",
  "Ходим всей семьёй в выходные. Дети просят бассейн, я выбираю массаж.",
  "Anti-age программа — реально видно результат после третьего сеанса.",
  "Очень внимательный персонал. Чай, фрукты, тишина — всё как обещали.",
  "Записывалась без опыта, всё подсказали. Уход за лицом — топ.",
  "Хороший сервис, чистота, мастера профессионалы. Однозначно вернусь.",
  "Делала аромотерапию на свой день рождения. Подарила себе и не пожалела.",
  "Сауна и бассейн вечером — отличная программа, чтобы отойти от недели.",
  "Лучший массаж в городе. Проверено лично — была у разных мастеров.",
  "Рекомендую всем, кому нужен полный релакс на пол-дня. Цены оправданы.",
  "Сделали мне индивидуальную программу под мои зажимы — спасибо за подход.",
  "Парный медовый ритуал — необычно и очень атмосферно. Романтично.",
  "Тёплая, домашняя обстановка. Никакой больничной стерильности.",
  "Глубокая чистка лица — кожа дышит. Косметолог — золотые руки.",
  "Бассейн на закате — отдельный вид удовольствия. Виды с террасы.",
  "Каждый раз открываю что-то новое. На этот раз — медовый ритуал.",
  "Очень люблю их хаммам. Приватный, никто не мешает.",
  "Запись через бот в телеграмме — удобно, всё работает быстро.",
];

const REVIEW_TEXTS_4 = [
  "Понравилось, но в зоне отдыха могла бы быть тише фоновая музыка.",
  "Хороший массаж, но хотелось бы ещё чуть дольше — 60 минут пролетают.",
  "Всё на уровне, мастер опытный. Мелочи: тапочки могли бы быть теплее.",
  "Сервис достойный, но в выходные сложно записаться — забито.",
];

// ===== Helpers ===========================================================

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickWeighted<T>(items: readonly { v: T; w: number }[]): T {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return items[items.length - 1].v;
}
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

function genPhone(): string {
  // KZ mobile: +7 7XX XXX XXXX
  const operators = ["701", "702", "705", "707", "747", "771", "775", "778"];
  return `+7${pick(operators)}${rand(1000000, 9999999)}`;
}
function genName(): string {
  const female = Math.random() < 0.65;
  const first = female ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
  const last = Math.random() < 0.75 ? pick(LAST_NAMES_KZ) : pick(LAST_NAMES_RU);
  return `${first} ${last}`;
}
function genEmail(name: string, idx: number): string {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, ".")
    // strip non-ascii — rough transliteration via initials
    .replace(/[^\w.]/g, "");
  const fallback = slug.length > 2 ? slug : `guest${idx}`;
  return `${fallback}.${idx}${DEMO_EMAIL_DOMAIN}`;
}

const TIME_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

// Map service category → masters who can do it
const MASTER_BY_CATEGORY: Record<string, string[]> = {
  massage: ["m1", "m2", "any"],
  pool: ["m4", "any"],
  bath: ["m2", "m4", "any"],
  face: ["m3", "any"],
  duo: ["m1", "any"],
};

// ===== --clear ===========================================================

async function clearDemo() {
  console.log("🧹 Removing demo rows…");

  const demoCustomers = await prisma.customer.findMany({
    where: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
    select: { id: true },
  });
  const demoIds = demoCustomers.map((c) => c.id);
  console.log(`   ${demoIds.length} demo customers found`);

  if (demoIds.length > 0) {
    // Reviews + bonus tx + bookings + their slots
    const reviews = await prisma.review.deleteMany({ where: { customerId: { in: demoIds } } });
    const bonus = await prisma.bonusTransaction.deleteMany({ where: { customerId: { in: demoIds } } });
    const bookings = await prisma.booking.findMany({
      where: { customerId: { in: demoIds } },
      select: { id: true, slotId: true },
    });
    const bookingIds = bookings.map((b) => b.id);
    const slotIds = bookings.map((b) => b.slotId);
    await prisma.adminEvent.deleteMany({ where: { bookingId: { in: bookingIds } } });
    const bookingsDel = await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    const slotsDel = await prisma.slot.deleteMany({ where: { id: { in: slotIds } } });
    const contactsDel = await prisma.contactRequest.deleteMany({ where: { customerId: { in: demoIds } } });
    const customersDel = await prisma.customer.deleteMany({ where: { id: { in: demoIds } } });

    console.log(
      `   removed: ${reviews.count} reviews, ${bonus.count} bonus tx, ${bookingsDel.count} bookings, ${slotsDel.count} slots, ${contactsDel.count} contacts, ${customersDel.count} customers`,
    );
  }

  // Demo expenses (note pattern)
  const expensesDel = await prisma.expense.deleteMany({
    where: { note: { contains: "[demo]" } },
  });
  console.log(`   removed ${expensesDel.count} demo expenses`);

  // Demo promo codes (specific list)
  const promoDel = await prisma.promoCode.deleteMany({
    where: { code: { in: ["WELCOME10", "SPRING20", "SPA15", "LOVE25"] } },
  });
  console.log(`   removed ${promoDel.count} demo promo codes`);

  // Demo contact requests (where customer was deleted, no relation left)
  const orphanContacts = await prisma.contactRequest.deleteMany({
    where: { customerId: null, message: { contains: "[demo]" } },
  });
  console.log(`   removed ${orphanContacts.count} orphan contact requests`);

  console.log("✅ Demo data cleared.");
}

// ===== Seeding ===========================================================

async function seedCustomers(count: number): Promise<string[]> {
  console.log(`👤 Creating ${count} customers…`);
  const ids: string[] = [];
  let created = 0;
  let attempts = 0;
  while (created < count && attempts < count * 3) {
    attempts++;
    const name = genName();
    const phone = genPhone();
    const email = genEmail(name, attempts);
    try {
      const c = await prisma.customer.create({
        data: { name, phone, email, bonusPoints: 0 },
      });
      ids.push(c.id);
      created++;
    } catch {
      // unique violation — try again
    }
  }
  console.log(`   ${created} customers created`);
  return ids;
}

type ServiceLite = { id: string; price: number; duration: number; category: string };

async function seedBookings(customerIds: string[], target: number) {
  console.log(`📅 Creating ${target} bookings…`);

  const services = (await prisma.service.findMany({
    where: { active: true },
    select: { id: true, price: true, duration: true, category: true },
  })) as ServiceLite[];
  if (services.length === 0) {
    console.warn("   no active services — skipping bookings");
    return;
  }
  const masters = await prisma.master.findMany({
    where: { active: true },
    select: { id: true },
  });
  if (masters.length === 0) {
    console.warn("   no active masters — skipping bookings");
    return;
  }
  const masterIds = new Set(masters.map((m) => m.id));

  const today = startOfDay(new Date());
  const fromDate = addDays(today, -PERIOD_DAYS_BACK);
  const toDate = addDays(today, PERIOD_DAYS_FORWARD);

  // Status weights per "is past or future"
  // total: completed 60, cancelled 10, no_show 10, confirmed 15, pending 5
  const PAST_WEIGHTS: { v: BookingStatus; w: number }[] = [
    { v: "completed", w: 75 },
    { v: "cancelled", w: 12 },
    { v: "no_show", w: 13 },
  ];
  const FUTURE_WEIGHTS: { v: BookingStatus; w: number }[] = [
    { v: "confirmed", w: 70 },
    { v: "pending", w: 25 },
    { v: "cancelled", w: 5 },
  ];
  const SOURCES: { v: BookingSource; w: number }[] = [
    { v: "website", w: 50 },
    { v: "telegram", w: 35 },
    { v: "phone", w: 12 },
    { v: "walkin", w: 3 },
  ];
  const NOTIFY: { v: string; w: number }[] = [
    { v: "telegram", w: 45 },
    { v: "whatsapp", w: 25 },
    { v: "sms", w: 20 },
    { v: "call", w: 10 },
  ];

  let created = 0;
  let skipped = 0;
  while (created < target && skipped < target * 3) {
    const dayOffset = rand(-PERIOD_DAYS_BACK, PERIOD_DAYS_FORWARD);
    const date = addDays(today, dayOffset);
    const time = pick(TIME_SLOTS);
    const service = pick(services);
    const eligible = (MASTER_BY_CATEGORY[service.category] ?? ["any"]).filter((m) =>
      masterIds.has(m),
    );
    if (eligible.length === 0) {
      skipped++;
      continue;
    }
    const masterId = pick(eligible);
    const customerId = pick(customerIds);

    const isPast = dayOffset < 0;
    const status: BookingStatus = isPast
      ? pickWeighted(PAST_WEIGHTS)
      : dayOffset === 0
        ? Math.random() < 0.5
          ? pickWeighted(PAST_WEIGHTS)
          : pickWeighted(FUTURE_WEIGHTS)
        : pickWeighted(FUTURE_WEIGHTS);
    const source = pickWeighted(SOURCES);
    const notify = pickWeighted(NOTIFY);

    // Slot uniqueness: (date, time, masterId)
    let slot;
    try {
      slot = await prisma.slot.create({
        data: { date, time, masterId, blocked: false },
      });
    } catch {
      // already exists for this master/time — try another
      skipped++;
      continue;
    }

    // Maybe a small discount via promo
    const discount = Math.random() < 0.15 ? Math.round(service.price * 0.1) : 0;
    const promoCode = discount > 0 ? pick(["WELCOME10", "SPA15", "SPRING20"]) : null;

    const createdAt =
      isPast || dayOffset === 0
        ? addDays(date, -rand(0, 5)) // booked a few days before service
        : addDays(today, -rand(0, 10));

    await prisma.booking.create({
      data: {
        customerId,
        serviceId: service.id,
        masterId,
        slotId: slot.id,
        status,
        source,
        notify,
        priceSnapshot: service.price,
        promoCode,
        discount,
        createdAt,
        updatedAt: createdAt,
        notes: Math.random() < 0.1 ? pick(["Аллергия на цитрусы", "Просит без сильного давления", "Подарочный сертификат", "Будет с подругой"]) : null,
      },
    });
    created++;
  }

  console.log(`   ${created} bookings created (${skipped} slot conflicts skipped)`);
}

async function seedBonuses() {
  console.log(`💎 Generating bonus ledger for completed bookings…`);
  const settings = (await prisma.loyaltySettings.findFirst()) ?? { earnPercent: 5, perPointKzt: 1 };
  const completed = await prisma.booking.findMany({
    where: { status: "completed" },
    select: { id: true, customerId: true, priceSnapshot: true, discount: true, createdAt: true },
  });

  // Wipe demo bonus tx for these customers first to keep idempotency-ish
  // (only against demo customers, identified by @demo.local email)
  const demo = new Set(
    (
      await prisma.customer.findMany({
        where: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
        select: { id: true },
      })
    ).map((c) => c.id),
  );

  let created = 0;
  const totalsByCustomer = new Map<string, number>();
  for (const b of completed) {
    if (!demo.has(b.customerId)) continue;
    const billed = Math.max(0, b.priceSnapshot - b.discount);
    const points = Math.floor((billed * settings.earnPercent) / 100 / settings.perPointKzt);
    if (points <= 0) continue;
    await prisma.bonusTransaction.create({
      data: {
        customerId: b.customerId,
        bookingId: b.id,
        points,
        reason: "earned",
        note: `${settings.earnPercent}% от ${billed.toLocaleString("ru-RU")} ₸`,
        createdAt: b.createdAt,
      },
    });
    totalsByCustomer.set(b.customerId, (totalsByCustomer.get(b.customerId) ?? 0) + points);
    created++;
  }
  // Sync Customer.bonusPoints
  for (const [cid, pts] of totalsByCustomer.entries()) {
    await prisma.customer.update({ where: { id: cid }, data: { bonusPoints: pts } });
  }
  console.log(`   ${created} bonus tx, ${totalsByCustomer.size} customers updated`);
}

async function seedReviews(target: number) {
  console.log(`⭐ Creating ${target} reviews…`);
  const completed = await prisma.booking.findMany({
    where: {
      status: "completed",
      customer: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
    },
    select: { id: true, customerId: true, serviceId: true, masterId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: target * 3,
  });
  const sample = completed.sort(() => Math.random() - 0.5).slice(0, target);

  let created = 0;
  for (const b of sample) {
    const isFive = Math.random() < 0.78;
    const rating = isFive ? 5 : Math.random() < 0.85 ? 4 : 3;
    const text = rating === 5 ? pick(REVIEW_TEXTS_5) : rating === 4 ? pick(REVIEW_TEXTS_4) : "В целом неплохо, но есть к чему стремиться.";
    const approved = rating >= 4 ? Math.random() < 0.85 : Math.random() < 0.4;
    await prisma.review.create({
      data: {
        customerId: b.customerId,
        bookingId: b.id,
        serviceId: b.serviceId,
        masterId: b.masterId,
        rating,
        text,
        approved,
        hidden: false,
        createdAt: addDays(b.createdAt, rand(1, 5)),
      },
    });
    created++;
  }
  console.log(`   ${created} reviews created`);
}

async function seedExpenses() {
  console.log(`💸 Creating monthly expenses…`);
  const today = startOfDay(new Date());
  const monthStart = addDays(today, -PERIOD_DAYS_BACK);
  const items: { offset: number; amount: number; category: ExpenseCategory; note: string }[] = [
    { offset: 0, amount: 380_000, category: "rent", note: "[demo] Аренда помещения за месяц" },
    { offset: 2, amount: 95_000, category: "utilities", note: "[demo] Коммунальные услуги, вода и свет" },
    { offset: 5, amount: 280_000, category: "salary", note: "[demo] Аванс мастерам" },
    { offset: 8, amount: 65_000, category: "supplies", note: "[demo] Масла и аромасмеси" },
    { offset: 12, amount: 130_000, category: "marketing", note: "[demo] Реклама в Instagram" },
    { offset: 15, amount: 45_000, category: "supplies", note: "[demo] Полотенца и халаты" },
    { offset: 19, amount: 85_000, category: "marketing", note: "[demo] Photoshoot для соцсетей" },
    { offset: 22, amount: 35_000, category: "supplies", note: "[demo] Чай, фрукты, расходники" },
    { offset: 25, amount: 720_000, category: "salary", note: "[demo] Зарплата мастерам (итог месяца)" },
    { offset: 28, amount: 28_000, category: "other", note: "[demo] Цветы и мелочи интерьера" },
  ];
  let created = 0;
  for (const it of items.slice(0, TARGET_EXPENSES)) {
    await prisma.expense.create({
      data: {
        date: addDays(monthStart, it.offset),
        amount: it.amount,
        category: it.category,
        note: it.note,
      },
    });
    created++;
  }
  console.log(`   ${created} expenses created`);
}

async function seedPromos() {
  console.log(`🎟️  Creating promo codes…`);
  const today = new Date();
  const promos: { code: string; type: PromoType; value: number; minTotal: number; usageLimit: number; usageCount: number; expiresOffset: number }[] = [
    { code: "WELCOME10", type: "percent", value: 10, minTotal: 0, usageLimit: 0, usageCount: 18, expiresOffset: 60 },
    { code: "SPRING20", type: "percent", value: 20, minTotal: 30_000, usageLimit: 50, usageCount: 23, expiresOffset: 14 },
    { code: "SPA15", type: "percent", value: 15, minTotal: 0, usageLimit: 100, usageCount: 7, expiresOffset: 90 },
    { code: "LOVE25", type: "amount", value: 25_000, minTotal: 80_000, usageLimit: 30, usageCount: 4, expiresOffset: 30 },
  ];
  let created = 0;
  for (const p of promos.slice(0, TARGET_PROMOS)) {
    try {
      await prisma.promoCode.create({
        data: {
          code: p.code,
          type: p.type,
          value: p.value,
          minTotal: p.minTotal,
          usageLimit: p.usageLimit,
          usageCount: p.usageCount,
          expiresAt: addDays(today, p.expiresOffset),
          active: true,
        },
      });
      created++;
    } catch {
      // already exists
    }
  }
  console.log(`   ${created} promo codes created`);
}

async function seedContactRequests(target: number) {
  console.log(`💬 Creating contact requests…`);
  const messages = [
    "Здравствуйте! Подскажите, есть ли скидки для постоянных клиентов?",
    "Хотим отметить юбилей в субботу, можно ли забронировать всё крыло?",
    "Делаете ли подарочные сертификаты? И как их можно купить?",
    "Можно ли записаться на массаж в выходной утром в 9?",
    "Здравствуйте, после процедуры был лёгкий зуд, это нормально? Что посоветуете?",
    "Хочу подарить маме на день рождения СПА-программу, нужна ваша помощь.",
    "Делаете ли услуги выезд на дом для пожилых клиентов?",
    "Можно ли совместить хаммам и массаж в один визит?",
    "Какие у вас часы работы по праздникам?",
    "Здравствуйте, видела вашу рекламу в Instagram — интересует курс на 5 процедур.",
    "Возможно ли организовать мальчишник для 8 человек у бассейна?",
    "Покупала сертификат на 100 000, могу ли использовать частями?",
  ];
  const today = new Date();
  let created = 0;
  for (let i = 0; i < target; i++) {
    const daysAgo = rand(0, PERIOD_DAYS_BACK);
    const createdAt = addDays(today, -daysAgo);
    const name = genName();
    const phone = genPhone();
    await prisma.contactRequest.create({
      data: {
        name,
        phone,
        message: `[demo] ${pick(messages)}`,
        source: "website",
        resolved: daysAgo > 5 ? Math.random() < 0.7 : Math.random() < 0.3,
        createdAt,
      },
    });
    created++;
  }
  console.log(`   ${created} contact requests created`);
}

// ===== Main ==============================================================

async function main() {
  const clear = process.argv.includes("--clear");

  if (clear) {
    await clearDemo();
    return;
  }

  console.log(`🌱 Seeding demo data — ~${TARGET_BOOKINGS} bookings over the last ${PERIOD_DAYS_BACK} days + ${PERIOD_DAYS_FORWARD} ahead\n`);

  const customerIds = await seedCustomers(TARGET_CUSTOMERS);
  if (customerIds.length === 0) {
    console.error("No customers — aborting");
    process.exit(1);
  }
  await seedBookings(customerIds, TARGET_BOOKINGS);
  await seedBonuses();
  await seedReviews(TARGET_REVIEWS);
  await seedExpenses();
  await seedPromos();
  await seedContactRequests(TARGET_CONTACTS);

  // Quick summary
  const totals = await Promise.all([
    prisma.customer.count(),
    prisma.booking.count(),
    prisma.review.count(),
    prisma.expense.count(),
    prisma.promoCode.count(),
    prisma.contactRequest.count(),
  ]);
  console.log(
    `\n📊 DB totals after seed:\n   customers ${totals[0]} | bookings ${totals[1]} | reviews ${totals[2]} | expenses ${totals[3]} | promos ${totals[4]} | contacts ${totals[5]}`,
  );
  console.log("\n✅ Done. Open /admin to explore.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
