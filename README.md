# RIVA POOL SPA — web (Next.js + TypeScript)

Production-перенос прототипа из `../project` (handoff bundle Claude Design).
Этот проект — этап 1 в плане работ. Дальше — backend, Telegram-боты, админ-дашборд.

## Стек

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** для стилей (дизайн-токены из прототипа в CSS-переменных)
- **next/font** — Cormorant Garamond, Inter Tight, JetBrains Mono с `display: swap`
- **Prisma + PostgreSQL** — придёт в этапе 2
- Без внешних UI-библиотек: иконки и компоненты — свои

## Запуск (Windows / PowerShell)

Откройте PowerShell **в этой папке** (или `cd` к ней):

```powershell
cd "C:\Users\ZM\Documents\Claude\Projects\Spa Project\spa-salon\web"
npm install
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000).

Скопировать `.env.example` → `.env.local` (понадобится с этапа 2):

```powershell
Copy-Item .env.example .env.local
```

### Если `npm install` падает

- Длинные пути: запустить **PowerShell от администратора** один раз и выполнить
  `git config --system core.longpaths true`.
- Если Node не установлен — поставить **Node.js LTS** с [nodejs.org](https://nodejs.org/) (версия 20+ подойдёт).
- Проверить что Node ставит в `PATH`: `node -v` должно вернуть `v20.x.x` или новее.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Запустить dev-сервер с hot-reload |
| `npm run build` | Production-сборка |
| `npm run start` | Запустить production-сборку |
| `npm run lint` | ESLint |
| `npm run typecheck` | TS без эмита |

## Структура

```
web/
├── app/                       # App Router pages
│   ├── layout.tsx             # Корень: <Nav>, <Footer>, <CartProvider>, шрифты
│   ├── globals.css            # Дизайн-токены + утилиты
│   ├── page.tsx               # Главная (Hero, Services preview, Pool, Gallery, Reviews)
│   ├── services/              # Каталог
│   ├── booking/               # 4-шаговый флоу записи
│   ├── gallery/               # Галерея + lightbox
│   └── contact/               # Форма / звонок / Telegram
├── components/
│   ├── nav.tsx                # Шапка с реальным мобильным меню (бургер)
│   ├── footer.tsx
│   ├── icons.tsx              # SVG-иконки + Logo
│   ├── service-card.tsx       # Карточка услуги + фильтр категорий
│   ├── home-sections.tsx      # Все секции главной
│   ├── floating-chat.tsx      # Плавающая кнопка чата
│   ├── cart-store.tsx         # React-context + localStorage корзина
│   └── cart-drawer.tsx        # Боковая панель корзины
├── lib/
│   └── data.ts                # Заглушки услуг/мастеров/расписания
├── public/                    # Статика (favicon и т.д.)
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── package.json
```

## Что починено относительно прототипа

См. полный список в `../AUDIT.md`. Самое главное:

**Mobile-first**
- Реальное мобильное меню с бургером (раньше nav просто переполнял шапку).
- Hero стекируется в одну колонку, паддинги адаптивные.
- Booking summary — sticky bottom-bar на мобиле (вместо боковой колонки).
- Booking calendar — горизонтальный скролл с edge-fade.
- Floating chat скрывается на /booking и /contact чтобы не перекрывать CTA.
- Gallery cell — убран хардкод `width: 300px` (был CSS-bug).

**Функционал**
- Lightbox closure-bug — клавиатурные стрелки больше не работают от стартового индекса.
- Корзина не дублируется при подтверждении booking (раньше была двойная запись).
- Корзина персистится в `localStorage` (раньше пропадала на refresh).
- `prefilledService` теперь реально работает — переход из корзины в booking подтягивает услугу.
- Реальная contact form со state и валидацией.
- Расписание генерится от `new Date()`, а не от хардкода `2026-05-08`.

**Accessibility**
- Все ссылки — `<Link href>` (раньше `<a>` без href).
- `aria-current="page"` на активных пунктах меню.
- `role="dialog"` + `aria-modal` + focus-management для lightbox / cart drawer / mobile-menu.
- Body scroll-lock при открытии оверлеев.
- `prefers-reduced-motion` отключает анимации.
- Контрастный fix `--ink-mute` (#8a7a6c → #6f5e4f, контраст 5.1:1 вместо 3.5:1).

**SEO + Perf**
- `metadata` API на каждой странице.
- `next/font` грузит только используемые семейства шрифтов (раньше 6 семейств грузились разом).
- Production-сборка React (раньше development + Babel-standalone в рантайме).
- `viewport`, `themeColor`, OG-метаданные.

## TODO по этапам

- [x] Этап 1.1: Аудит-отчёт (`../AUDIT.md`)
- [x] Этап 1.2: Скаффолд Next.js
- [x] Этап 1.3: Главная страница (mobile-first)
- [x] Этап 1.4: Services / Booking / Gallery / Contact
- [ ] Этап 1.5: Визуальная верификация на 375/414/768/1280
- [ ] Этап 2: Prisma-схема, server actions для booking/contact, отправка уведомлений
- [ ] Этап 3: Telegram-бот для клиентов (grammY)
- [ ] Этап 4: Telegram-бот для владельца (заявки + /stats)
- [ ] Этап 5: Раздел /admin с дашбордом

## Известные ограничения

1. Картинки сейчас — CSS-градиенты с SVG-паттернами. Когда будет CDN с фото, заменим на `next/image`.
2. Booking submit пока имитируется `setTimeout(600)` — реальный submit появится в этапе 2.
3. Telegram-бот ссылка `https://t.me/riva_spa_bot` — placeholder, заменить на актуальный.
4. Темы (warm/dark/resort) из прототипа отключены до решения, нужны ли они в проде.
