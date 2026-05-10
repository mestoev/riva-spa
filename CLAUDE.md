# CLAUDE.md — RIVA POOL SPA

> Контекстный документ для Claude / любого нового разработчика.
> Прочитав это, ты знаешь архитектуру и где что менять без чтения всех файлов.

## 🌐 Что это

Сайт + два Telegram-бота + AI-консьерж + кабинет владельца + кабинет мастера для спа-салона **RIVA POOL SPA** в Актобе. Один Postgres (Neon) обслуживает всё.

Владелец проекта — Заур (`zaur.mestoev@gmail.com`), Telegram ID `1007472585`. Окружение разработки — Windows (PowerShell), сервер прода — Ubuntu VPS.

## 🧱 Стек

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Tailwind CSS** (без UI-китов; иконки и компоненты свои)
- **Prisma 5.22** + **Postgres** на [Neon](https://neon.tech) (eu-central-1)
- **grammY** для Telegram-ботов
- **Groq** (Llama-3.3-70B + Whisper-large-v3) — AI и распознавание речи
- **PM2** — менеджер процессов на сервере
- Нативный **Web Crypto API** для auth (без JWT-библиотек)

## 📂 Структура

```
spa-salon/web/
├── app/
│   ├── layout.tsx              # RootLayout — скрывает Nav/Footer на /admin и /master
│   ├── page.tsx                # Главная: hero, services preview, gallery, reviews, FAQ
│   ├── globals.css             # Дизайн-токены (CSS variables) + утилиты
│   ├── services/               # Каталог услуг (читает БД)
│   ├── booking/                # 4-шаговый флоу записи
│   │   ├── page.tsx            # SSR: services, masters, schedule + передаёт в client
│   │   └── booking-client.tsx  # Stepper, sticky-нижняя панель на мобиле, промокод
│   ├── gallery/                # Публичная галерея + lightbox
│   ├── contact/                # Форма контакта + 2GIS/Yandex карта (iframe из settings)
│   ├── actions/
│   │   ├── booking.ts          # submitBooking — создание заявки + промо + ratelimit
│   │   ├── contact.ts          # submitContact — сообщения в форме контакта
│   │   └── promo.ts            # previewPromo — предпросмотр скидки
│   ├── admin/                  # ВСЯ админ-зона
│   │   ├── layout.tsx          # Sidebar + AdminMobileNav (бургер). Нет публичной Nav.
│   │   ├── login/              # /admin/login — пароль из ENV.ADMIN_PASSWORD
│   │   ├── page.tsx            # Дашборд (KPI + сегодняшние записи)
│   │   ├── bookings/           # Список заявок + фильтры + bulk actions + /new
│   │   ├── calendar/           # Week-view с цветными карточками
│   │   ├── services/           # CRUD услуг + загрузка фото
│   │   ├── masters/            # CRUD мастеров + аватары + сброс пароля
│   │   ├── schedule/           # Часы работы по дням + исключения по датам
│   │   ├── gallery/            # CRUD фото для галереи
│   │   ├── promotions/         # CRUD промокодов
│   │   ├── reviews/            # Модерация отзывов
│   │   └── settings/           # Контакты, часы, SEO, карта (mapEmbedUrl), FAQ
│   ├── master/                 # Кабинет мастера (отдельный логин)
│   │   ├── layout.tsx          # Свой sidebar
│   │   ├── login/
│   │   ├── page.tsx            # Дашборд (записи на сегодня)
│   │   ├── bookings/           # Все записи мастера
│   │   ├── schedule/           # Свои blackouts ("не работаю")
│   │   └── me/                 # Профиль + статистика
│   └── api/
│       ├── health/             # GET /api/health для UptimeRobot
│       ├── bookings/[id]/ics/  # .ics для Google/Apple Calendar
│       ├── admin/upload/       # POST multipart — фото в public/uploads/
│       ├── instagram/webhook/  # Meta Instagram DM (каркас, нужен Meta App Review)
│       └── whatsapp/webhook/   # Meta WhatsApp (каркас, нужен Business Verification)
├── components/
│   ├── nav.tsx                 # Шапка публичная (mobile-first бургер)
│   ├── footer.tsx              # Подвал (читает settings из БД)
│   ├── icons.tsx               # SVG-иконки + Logo
│   ├── service-card.tsx        # Карточка услуги (поддерживает imageUrl)
│   ├── home-sections.tsx       # Hero, ServicesPreview, PoolFeature, GalleryStrip, Reviews
│   ├── faq-section.tsx         # FAQ-аккордеон на главной
│   ├── floating-chat.tsx       # Плавающая кнопка чата (скрыта на /booking, /contact)
│   ├── cart-store.tsx          # Контекст корзины (localStorage)
│   ├── cart-drawer.tsx         # Боковая панель корзины
│   └── image-upload.tsx        # Загрузчик фото для админ-форм
├── lib/                        # Серверная логика, переиспользуемая везде
│   ├── db.ts                   # Singleton Prisma client
│   ├── auth.ts                 # Admin auth (HMAC-SHA256 cookie через Web Crypto)
│   ├── master-auth.ts          # Master auth (PBKDF2 пароли + cookie)
│   ├── settings.ts             # getSiteSettings — синглтон-настройки
│   ├── data.ts                 # Заглушки услуг/мастеров/галереи/отзывов (fallback)
│   ├── schedule.ts             # getSchedule(daysCount, masterId?) — учитывает blackouts
│   ├── bookings.ts             # transitionBooking — смена статуса + начисление баллов
│   ├── loyalty.ts              # awardPointsForBooking, getCustomerStats
│   ├── promo.ts                # validatePromo, consumePromo
│   ├── stats.ts                # getStats(period) для /admin и TG-бота
│   ├── ai.ts                   # askAI с tool-calling (Groq)
│   ├── ai-tools.ts             # Тулзы для AI: list_services, list_masters, find_free_slots, create_booking
│   ├── stt.ts                  # Whisper транскрипция (Groq)
│   ├── telegram.ts             # notifyAdmins, notifyCustomer (Bot API)
│   ├── instagram.ts            # Meta Graph API клиент
│   ├── whatsapp.ts             # Meta Cloud API клиент
│   ├── ratelimit.ts            # In-memory rate-limit (per-key bucket)
│   └── validators.ts           # zod-схемы для server actions
├── bots/                       # Long-running TG-бот процессы (через tsx)
│   ├── client/index.ts         # @rivaspa_bot — для клиентов
│   ├── admin/index.ts          # для владельца
│   ├── shared/                 # форматтеры, общие хелперы
│   └── run-all.ts              # bots:start — оба бота в одном процессе (для PM2)
├── bin/                        # Cron-скрипты
│   ├── reminders.ts            # Каждые 5 минут — напоминания и сбор отзывов
│   └── backup.ts               # Раз в неделю — экспорт БД в JSON
├── prisma/
│   ├── schema.prisma           # ВСЕ модели БД
│   └── seed.ts                 # Сид сервисов и мастеров
├── middleware.ts               # Гейт /admin/* и /master/* (Edge runtime, Web Crypto)
├── public/uploads/             # Фото — НЕ в git, сохраняются файлами на сервере
├── backups/                    # Weekly JSON dumps — НЕ в git
├── .env                        # Все секреты (НЕ в git)
└── package.json
```

## 🔑 Важные команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Локальный dev (Windows) |
| `npm run build` | Prod-сборка |
| `npm run start` | Запуск prod-сборки (используется в PM2 на сервере) |
| `npm run typecheck` | `tsc --noEmit` — проверка типов БЕЗ сборки. **ВСЕГДА запускать перед `git push`** — `next build` строже чем dev и обычно ловит то что dev пропустил |
| `npx prisma generate` | Сгенерировать Prisma client (после изменений в `schema.prisma`) |
| `npx prisma db push` | Применить схему в Neon (БД одна на локаль и прод — пушить достаточно один раз) |
| `npm run db:seed` | Заполнить услуги и мастеров (idempotent) |
| `npm run bot:client` / `bot:admin` | Запустить отдельный TG-бот локально |
| `npm run bots:start` | Оба бота в одном процессе (для PM2) |
| `npm run reminders` | Прогон cron-напоминаний |
| `npm run backup` | Экспорт БД в JSON в `./backups/` |

## 🗄 БД (Prisma модели)

- **Service** — услуги. Связана с Booking, Slot.
- **Master** — мастера. Имеет `username` + `passwordHash` для своего кабинета. Связана с Slot, Booking, MasterBlackout.
- **Customer** — клиенты по `phone` (unique). `telegramId` НЕ unique (один TG-юзер может бронировать на несколько телефонов). Поле `bonusPoints` — кэш суммы из `bonus_transactions`.
- **Slot** — слот (`date + time + masterId`, compound unique). Создаётся только когда бронируют или блокируют.
- **Booking** — заявка. Статус enum: pending/confirmed/cancelled/no_show/completed. `priceSnapshot` фиксирует цену в момент создания. `discount` + `promoCode` — скидка. Поля `remind24SentAt`/`remind2SentAt`/`reviewRequestSentAt` — для cron, чтобы не дублировать.
- **PromoCode** — промокоды. enum PromoType (percent/amount). `usageCount` инкрементится в той же транзакции что и Booking.
- **Review** — отзывы. `approved` + `hidden` модерируются вручную из `/admin/reviews`.
- **WorkingHours** — часы работы по дням недели (0=Mon..6=Sun).
- **ScheduleException** — override на конкретные даты (закрытия, праздники).
- **MasterBlackout** — личные «не работаю» от мастера. Compound unique с nullable `time` — Prisma не любит null в where, поэтому используем `findFirst+create` вместо upsert.
- **GalleryImage** — фото в `/admin/gallery`. Если в БД пусто, сайт фолбэчит на статику из `lib/data.ts`.
- **SiteSettings** — singleton (id=1). Контакты, часы (текст), SEO, `mapEmbedUrl`, `faqJson`.
- **AISettings** — singleton. system prompt, model, temperature, customFacts.
- **AIMessage** — лог диалогов с AI.
- **AdminUser** — авторизованные TG-админы (для admin-бота). bootstrap из `TELEGRAM_ADMIN_USER_IDS`.
- **AdminEvent** — audit log смены статуса заявок.
- **LoyaltySettings** — настройки баллов (% начисления, курс, лимит списания).
- **BonusTransaction** — append-only ledger баллов.
- **ContactRequest** — сообщения с формы контакта.

## 🔐 Auth — две независимые системы

1. **Admin** (`/admin/*`): пароль из `.env ADMIN_PASSWORD`, signed cookie `riva_admin` (HMAC). 7 дней TTL.
2. **Master** (`/master/*`): per-master `username` + PBKDF2 пароль в БД. Пароль генерится при создании мастера, виден один раз через flash cookie. Cookie `riva_master`. 30 дней TTL.

`middleware.ts` гейтит оба пути. Edge runtime → только Web Crypto API (никакого `node:crypto`).

## 🤖 AI-консьерж (один на 3 канала)

`lib/ai.ts → askAI(telegramId, userMessage, history)`:
1. Подгружает `AISettings` (admin может менять промпт через `/ai prompt` в TG-боте).
2. Строит system prompt = базовый промпт + текущие услуги/мастера/контакты + если клиент уже в БД — его имя/телефон.
3. Запрос в Groq с `tools = TOOLS` (см. `lib/ai-tools.ts`).
4. Если в ответе `tool_calls` — выполняет, кладёт результат в messages, повторяет до 5 итераций.
5. Лог в `ai_messages`.

Тулзы:
- `list_services(category?)`
- `list_masters(serviceId?, nameQuery?)` — `nameQuery` делает fuzzy-match по биграммам (Whisper иногда коверкает имена)
- `find_free_slots(masterId, date)`
- `create_booking({serviceId, masterId, date, time, customerName, customerPhone})`

Используется в **трёх каналах одновременно**:
- TG-бот клиента (`bots/client/index.ts → handleAITextResponse`)
- Instagram webhook (`app/api/instagram/webhook/route.ts`)
- WhatsApp webhook (`app/api/whatsapp/webhook/route.ts`)

Голосовые сообщения транскрибируются Whisper'ом (`lib/stt.ts`) и идут в тот же askAI.

## ⚙️ Правильный порядок после изменений в schema.prisma

```powershell
npx prisma db push    # 1. применить схему в Neon + ПЕРЕГЕНЕРИТЬ Prisma client
npm run typecheck     # 2. проверить типы (увидит новые модели/поля)
npm run dev           # 3. запустить
```

**Важно:** не запускай `typecheck` до `prisma generate`/`db push` — TS не увидит новых таблиц/полей и завалится с TS2339 «Property X does not exist».

## 🚨 Известные нюансы (gotchas)

1. **TypeScript 5.7+ + Web Crypto**: `TextEncoder.encode()` возвращает `Uint8Array<ArrayBufferLike>`, а `crypto.subtle` хочет `<ArrayBuffer>`. В `lib/auth.ts` и `lib/master-auth.ts` есть хелпер `utf8(s)` который копирует в фрешный `ArrayBuffer`. Если будешь трогать crypto — используй этот же паттерн.
2. **Prisma composite unique с nullable**: `MasterBlackout` имеет `[masterId, date, time]` где time nullable. Prisma TS-типы не разрешают null в `where` для составного ключа. Используем `findFirst + create` вместо `upsert`.
3. **Server actions с redirect**: вызов `redirect()` в action бросает специальный exception. На клиенте после `await action()` `res` будет `undefined` если был редирект. Всегда обрабатывай через `try { ... if (res && !res.ok) ... } catch (e) { if (e.message.includes("NEXT_REDIRECT")) throw e; }`.
4. **Form action с return type**: Next.js `<form action={fn}>` хочет `() => void | Promise<void>`. Action которая возвращает `{ok, error}` не подходит — оборачивай в `useFormState` или меняй сигнатуру.
5. **next dev vs next build**: dev мягко проверяет типы. **Прод-сборка строже** — всегда запускай `npm run typecheck` перед push.
6. **Prisma client нужно регенерить** после изменений в `schema.prisma` — `npx prisma generate`. На сервере это делает `npm run build` через `prisma generate && next build`.
7. **`public/uploads/`** в `.gitignore` — фото живут на сервере (`/root/riva-spa/spa-salon/web/public/uploads/`). При rebuild файлы не теряются.
8. **Cookie для admin/master**: signed HMAC. Если поменять `ADMIN_AUTH_SECRET` — все сессии разлогинятся.
9. **AsiaTime/UTC**: время в `Slot.time` — это локальное Aqtobe-время (UTC+5). При генерации `.ics` и в `bin/reminders.ts` пересчитываю в UTC через `setUTCHours(hh - 5, mm, 0, 0)`.

## 🚀 Деплой (Ubuntu VPS)

```bash
cd ~/riva-spa/spa-salon/web
git pull
npm install
npx prisma generate
npx prisma db push     # если менялся schema.prisma
npm run build
pm2 restart all
```

PM2 процессы (production):
- `web` — `npm run start` (порт 3000)
- `bot-client` — `npm run bot:client`
- `bot-admin` — `npm run bot:admin`

Cron на сервере:
```cron
*/5 * * * * cd /root/riva-spa/spa-salon/web && /usr/bin/npm run reminders >> /var/log/riva-reminders.log 2>&1
0 3 * * 0  cd /root/riva-spa/spa-salon/web && /usr/bin/npm run backup    >> /var/log/riva-backup.log 2>&1
```

## 🔧 Где что менять для типовых задач

| Хочу… | Файлы |
|---|---|
| Добавить поле в услугу | `prisma/schema.prisma` (Service) → `app/admin/services/actions.ts` (zod + parse) → `app/admin/services/service-form.tsx` (UI) → `app/services/page.tsx`, `app/booking/page.tsx`, `app/page.tsx` (если показывать публично) |
| Поменять тон AI | `/admin` → /admin/settings → или TG-бот команда `/ai prompt ...` |
| Добавить новую страницу в админке | Создать `app/admin/<section>/page.tsx` + actions.ts → добавить ссылку в `app/admin/layout.tsx` NAV и `app/admin/admin-mobile-nav.tsx` NAV |
| Поменять расписание салона | `/admin/schedule` (через UI). Отражается на `/booking` и в боте мгновенно |
| Изменить адрес/телефон | `/admin/settings` (всё через БД, не нужно править код) |
| Загрузить фото | `/admin/services/[id]`, `/admin/masters/[id]`, `/admin/gallery` — есть `<ImageUpload/>` компонент |
| Добавить TG-команду в боте | `bots/client/index.ts` или `bots/admin/index.ts` — `bot.command("name", handler)` |
| Добавить инструмент AI | `lib/ai-tools.ts` — описание в `TOOLS`, реализация в `executeTool` |

## 🛣 Roadmap (запланировано на будущее)

| Этап | Что |
|---|---|
| Дизайн-апгрейд | Стиль "эстетик-резорт": фото-первый hero, тёплая палитра, плавные переходы |
| CMS | Таблица `ContentBlock(key, value)` + `MenuItem`. Компонент `<Content k="..."/>` вместо хардкода. `/admin/content` + `/admin/menu` для редактирования всех текстов и меню. ~2-3 часа работы, затрагивает все публичные страницы |
| Брендинг | `SiteSettings.logoUrl` + Hero image + до/после фото в услугах |
| Multi-service booking | Несколько процедур в одной заявке = "спа-день". Требует отдельную модель `BookingItem` |
| Online-оплата | Kaspi/Halyk эквайринг (CloudPayments или ePay) — отложено |
| i18n (kz/ru) | Колонка `lang` в `ContentBlock` после внедрения CMS |

## 📞 Owner contacts

- Заур (владелец проекта и салона): `zaur.mestoev@gmail.com`, TG `@mest04`, ID `1007472585`
- Адрес салона: ул. Загородная 17, Актобе
- Часы работы: меняются через `/admin/settings`

---

*Если что-то непонятно или мне (Claude) нужен контекст — спроси Заура. Не ломай работающее.*
