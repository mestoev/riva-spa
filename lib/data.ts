// RIVA POOL SPA — placeholder data (AUDIT §3.6: replaced hardcoded date with new Date())
// In production this comes from the database (see prisma/schema.prisma).
// Categories, services and masters are stand-ins per Заур's note "пока заглушки".

export type ServiceCat = "massage" | "pool" | "bath" | "face" | "duo";

export type Service = {
  id: string;
  cat: ServiceCat;
  name: string;
  desc: string;
  duration: number; // minutes
  price: number; // KZT
  tag: string | null;
  imageUrl?: string | null;
};

export type Master = {
  id: string;
  name: string;
  role: string;
  exp: string;
  specs: (ServiceCat | "all")[];
  rating: number | null;
  avatarUrl?: string | null;
};

export type Category = { id: ServiceCat | "all"; label: string };

export type GalleryItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: "pool" | "wood" | "cream";
};

export type Review = {
  id: string;
  name: string;
  when: string;
  text: string;
  rating: number;
};

export const SERVICES: Service[] = [
  { id: "classic-massage", cat: "massage", name: "Классический массаж", desc: "Глубокая работа с мышцами, восстановление после нагрузок", duration: 60, price: 25000, tag: "Популярное" },
  { id: "spa-massage", cat: "massage", name: "СПА-массаж с маслами", desc: "Расслабляющий массаж с авторской смесью эфирных масел", duration: 90, price: 38000, tag: null },
  { id: "aroma-massage", cat: "massage", name: "Аромотерапия", desc: "Массаж с подбором аромасмеси под ваше состояние", duration: 75, price: 30000, tag: null },
  { id: "stone-massage", cat: "massage", name: "Стоун-терапия", desc: "Массаж горячими базальтовыми камнями", duration: 90, price: 42000, tag: "Авторское" },
  { id: "pool-day", cat: "pool", name: "Дневной пропуск в бассейн", desc: "Бассейн на террасе, лежаки, чай и фрукты", duration: 240, price: 18000, tag: null },
  { id: "pool-evening", cat: "pool", name: "Вечерний релакс у бассейна", desc: "Бассейн при свечах, банный комплекс, лёгкий ужин", duration: 180, price: 32000, tag: "Новое" },
  { id: "sauna", cat: "bath", name: "Финская сауна", desc: "Сухая сауна с веничным парением по запросу", duration: 120, price: 22000, tag: null },
  { id: "hammam", cat: "bath", name: "Хаммам с пилингом", desc: "Турецкий хаммам, скраб кесэ, мыльная пена", duration: 90, price: 28000, tag: null },
  { id: "facial-deep", cat: "face", name: "Глубокая чистка лица", desc: "Профессиональный уход с ультразвуком и масками", duration: 90, price: 35000, tag: null },
  { id: "facial-anti-age", cat: "face", name: "Anti-age программа", desc: "Лифтинг-уход с пептидами и ручным моделированием", duration: 105, price: 48000, tag: "Авторское" },
  { id: "duo-spa", cat: "duo", name: "СПА для двоих", desc: "Парный массаж, бассейн и хаммам в приватном крыле", duration: 180, price: 95000, tag: "Для двоих" },
  { id: "duo-honey", cat: "duo", name: "Медовый ритуал", desc: "Парная процедура с мёдом, маслами и чаепитием", duration: 150, price: 78000, tag: "Для двоих" },
];

export const CATEGORIES: Category[] = [
  { id: "all", label: "Все" },
  { id: "massage", label: "Массажи" },
  { id: "pool", label: "Бассейн" },
  { id: "bath", label: "Сауна и хаммам" },
  { id: "face", label: "Уход за лицом" },
  { id: "duo", label: "Программы для двоих" },
];

export const MASTERS: Master[] = [
  { id: "m1", name: "Айгерим Нурланова", role: "Старший мастер СПА", exp: "12 лет опыта", specs: ["massage", "duo"], rating: 4.97 },
  { id: "m2", name: "Ержан Сатпаев", role: "Мастер стоун-терапии", exp: "9 лет опыта", specs: ["massage", "bath"], rating: 4.92 },
  { id: "m3", name: "Динара Кенжебекова", role: "Косметолог-эстетист", exp: "8 лет опыта", specs: ["face"], rating: 4.95 },
  { id: "m4", name: "Бауыржан Алимов", role: "Мастер банных ритуалов", exp: "11 лет опыта", specs: ["bath", "pool"], rating: 4.96 },
  { id: "any", name: "Любой свободный", role: "Мы подберём мастера", exp: "Подходит для всех услуг", specs: ["all"], rating: null },
];

export const GALLERY: GalleryItem[] = [
  { id: "g1", title: "Бассейн на террасе", subtitle: "Главный зал с панорамным остеклением", tone: "pool" },
  { id: "g2", title: "Зона ресепшн", subtitle: "Тёплое дерево и мягкий свет", tone: "wood" },
  { id: "g3", title: "Кабинет массажа", subtitle: "Парный кабинет, приватное крыло", tone: "cream" },
  { id: "g4", title: "Хаммам", subtitle: "Мраморный лежак, мягкая пена", tone: "cream" },
  { id: "g5", title: "Лежаки у бассейна", subtitle: "Вид на закат с террасы", tone: "pool" },
  { id: "g6", title: "Лаунж после процедур", subtitle: "Чайная церемония и фрукты", tone: "wood" },
];

export const REVIEWS: Review[] = [
  { id: "r1", name: "Мадина А.", when: "3 дня назад", text: "Бассейн на террасе — это что-то невероятное. После рабочей недели ощущение, как будто уехала на курорт.", rating: 5 },
  { id: "r2", name: "Тимур Б.", when: "неделю назад", text: "Брал стоун-терапию у Ержана — глубокий, точный массаж. Через час чувствовал себя другим человеком.", rating: 5 },
  { id: "r3", name: "Асель и Данияр", when: "2 недели назад", text: "СПА для двоих к годовщине. Отдельное крыло, чай, бассейн в свете свечей. Лучший вечер за год.", rating: 5 },
];

// AUDIT §3.6 — was hardcoded `new Date('2026-05-08…')`. Now relative to current time.
export const SLOT_TIMES = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30"];

export type ScheduleDay = {
  iso: string;
  date: Date;
  day: number;
  month: string;
  weekday: string;
  slots: { time: string; free: boolean }[];
};

export function buildSchedule(): ScheduleDay[] {
  const days: ScheduleDay[] = [];
  const now = new Date();
  now.setHours(9, 0, 0, 0);
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const slots = SLOT_TIMES.map((t, idx) => ({
      time: t,
      free: ((i * 7 + idx * 3) % 11) > 3,
    }));
    days.push({
      iso: d.toISOString().slice(0, 10),
      date: d,
      day: d.getDate(),
      month: d.toLocaleDateString("ru-RU", { month: "short" }),
      weekday: d.toLocaleDateString("ru-RU", { weekday: "short" }),
      slots,
    });
  }
  return days;
}

export const CONTACT = {
  phone: "+7 (727) 311-45-67",
  phoneRaw: "+77273114567",
  email: "hello@riva.spa",
  instagram: "@riva.pool.spa",
  // Адрес и часы — заменим на DB-driven Settings в этапе 5.4 (тогда менять можно будет из админки).
  city: "Актобе",
  addressLine: "ул. Загородная 17",
  address: "ул. Загородная 17, Актобе",
  hoursMonThu: "09:00 — 23:00",
  hoursFriSun: "09:00 — 00:00",
};
