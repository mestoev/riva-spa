# RIVA Telegram bots

Two long-running Node processes that share a database with the Next.js site.

| Bot | Run | Покрывает |
|---|---|---|
| Клиентский | `npm run bot:client` | Каталог, запись, мои записи |
| Админский | `npm run bot:admin` | (этап 4) — заявки, /stats, добавление админов |

## Локальный запуск

В одном PowerShell-окне:

```powershell
npm run dev          # Next.js на 3000
```

В другом окне (в той же папке `web`):

```powershell
npm run bot:client   # клиентский бот, long-polling
```

Бот стартует и пишет в консоль `running as @your_bot_username`.

Открой Telegram, найди бота по username (или по ссылке от @BotFather), нажми Start. Должно прийти приветствие.

## Прод

Long-polling работает и в проде, но webhook надёжнее. На webhook переключим, когда будем деплоить (понадобится публичный HTTPS-URL).

В проде боты запускаются как отдельные процессы под PM2/systemd/Railway/Fly. Они шарят `DATABASE_URL` с веб-приложением.

## Архитектура

- `bots/client/index.ts` — клиентский бот.
- `bots/admin/index.ts` — админский (этап 4).
- `bots/shared/` — общий код: форматтеры, генерация расписания.
- Сессии: in-memory `Map<userId, Session>`. На один процесс. При рестарте — теряются (юзер начинает заново). Если будет много пользователей — переедем на Redis или БД.

## Безопасность

- Токены — только в `.env` / `.env.local`, файлы в `.gitignore`.
- Клиентский бот доступен всем (это правильно).
- Админский — пускает только тех, кто в таблице `admin_users` (DB) или в `TELEGRAM_ADMIN_USER_IDS` (ENV-fallback). См. `lib/telegram.ts → isAdmin()`.
- Команда `/admin add <id>` (этап 4) — доступна только тем, у кого `role = "owner"`.
