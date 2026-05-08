# Деплой RIVA POOL SPA на Vercel + Railway

Архитектура продакшна:

```
┌────────────────────┐         ┌────────────────┐
│   Vercel (Next.js) │ ──┐ ┌── │  Neon Postgres │
│   web сайт + admin │   │ │   │  (уже есть)    │
└────────────────────┘   ▼ ▼   └────────────────┘
                       (одна БД)
                          ▲ ▲
┌────────────────────┐   │ │
│  Railway (Node)    │ ──┘ │
│  оба TG-бота       │ ────┘
└────────────────────┘
```

Все три части шарят одну БД на Neon. Изменения видны мгновенно.

---

## 0. Подготовка — git репо

Если ты ещё не закоммитил код, в PowerShell в папке `web` (или в родительской `Spa Project`):

```powershell
git init
git add .
git commit -m "RIVA POOL SPA — initial deploy-ready"
```

Создай **private** репозиторий на GitHub (например, `riva-spa`). На странице создания GitHub покажет команды:

```powershell
git remote add origin https://github.com/<твой-логин>/riva-spa.git
git branch -M main
git push -u origin main
```

Готово — код на GitHub.

> ⚠️ **Проверь что `.env` НЕ попал в коммит**: `git ls-files | findstr .env`. Должно быть только `.env.example`. Если `.env` в репо — удали через `git rm --cached .env`, закоммить, и поменяй все секреты (токены ботов, GROQ_API_KEY, ADMIN_PASSWORD).

---

## 1. Vercel — деплой сайта

1. Открой [vercel.com](https://vercel.com), залогинься через GitHub.
2. **Add New → Project** → выбери репо `riva-spa`.
3. В **Root Directory** укажи: `spa-salon/web` (если репо корнем — оставь пустым).
4. **Build Command:** `prisma generate && prisma migrate deploy && next build` (Vercel прочтёт из `vercel.json` автоматически).
5. **Environment Variables** — добавь все из твоего `.env`:

| Имя | Где взять |
|---|---|
| `DATABASE_URL` | Neon Console → Connection string |
| `TELEGRAM_CLIENT_BOT_TOKEN` | твой `.env` |
| `TELEGRAM_ADMIN_BOT_TOKEN` | твой `.env` |
| `TELEGRAM_ADMIN_USER_IDS` | `1007472585` |
| `GROQ_API_KEY` | твой `.env` |
| `ADMIN_PASSWORD` | поменяй на длинный (12+ симв) |
| `ADMIN_AUTH_SECRET` | оставь как есть или сгенерь новый |
| `NEXT_PUBLIC_SITE_URL` | `https://<имя-проекта>.vercel.app` |

6. **Deploy**. Через ~2 мин получишь URL вида `riva-spa.vercel.app` — открывай.

> Любой `git push` в `main` теперь автоматически передеплоит сайт.

---

## 2. Railway — деплой ботов

1. Открой [railway.app](https://railway.app), залогинься через GitHub.
2. **New Project → Deploy from GitHub repo** → выбери `riva-spa`.
3. Railway увидит `package.json` и `Procfile`, развернёт Node-сервис.
4. Заходи в **Settings**:
   - **Root Directory:** `spa-salon/web`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm run bots:start` (запускает оба бота в одном процессе)
5. **Variables** — добавь те же переменные что в Vercel **кроме** `NEXT_PUBLIC_SITE_URL` и `ADMIN_PASSWORD`/`ADMIN_AUTH_SECRET` (ботам они не нужны):
   - `DATABASE_URL`
   - `TELEGRAM_CLIENT_BOT_TOKEN`
   - `TELEGRAM_ADMIN_BOT_TOKEN`
   - `TELEGRAM_ADMIN_USER_IDS`
   - `GROQ_API_KEY`
6. **Deploy**. В логах через ~30 сек должно появиться:
   ```
   [bot:client] running as @rivaspa_bot
   [bot:admin] running as @riva_admin_bot
   ```

> Railway free credit — $5/месяц, ~700 часов работы. Хватит для 2 ботов с long-polling.

---

## 3. Привязать домен (когда купишь)

### На Vercel
- Project Settings → **Domains** → введи свой домен.
- Vercel покажет DNS-записи (CNAME / A) — пропиши их у регистратора.
- SSL-сертификат выпустится автоматически.

### На Railway (если бот должен иметь публичный URL для webhook'а)
- На long-polling домен боту не нужен. Если позже переведёшь на webhook — Railway даст `*.up.railway.app` URL.

---

## 4. Что делать после первого деплоя

1. **Открой `https://<твой-сайт>.vercel.app`** — главная должна работать.
2. **Проверь /admin** — пароль из переменных Vercel.
3. **Проверь Telegram-боты** — напиши `/start` каждому. Если не отвечают — смотри логи на Railway.
4. **Поменяй адрес в `/admin/settings`** — больше не надо править `lib/data.ts`.

---

## 5. Обновления

Любое изменение в коде:

```powershell
git add .
git commit -m "Что изменил"
git push
```

И:
- Vercel автоматически передеплоит сайт (~1–2 мин).
- Railway автоматически передеплоит ботов (~1 мин).
- Если меняешь схему БД — Vercel при сборке сам прогонит `prisma migrate deploy`.

---

## Альтернатива — один VPS (если позже захочешь)

Если решишь съехать с Vercel/Railway на VPS (Hetzner/Beget/DO), скажи — дам гайд. Базовая последовательность:
- Ubuntu 22.04 LTS
- Node 20 + PM2 + Nginx + certbot
- `pm2 start npm --name web -- run start`
- `pm2 start npm --name bots -- run bots:start`
- Nginx reverse-proxy на 3000 + Let's Encrypt
- `pm2 save && pm2 startup`

Затратнее по времени, но дешевле и полный контроль.
