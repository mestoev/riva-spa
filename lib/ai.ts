/**
 * AI assistant wrapper — Groq + dynamic context from DB.
 *
 * Flow:
 *   1. Read settings from `ai_settings` (single row).
 *   2. If disabled or no API key — return null (caller handles graceful degrade).
 *   3. Build system prompt: base instruction + live catalog + masters + contacts + custom facts.
 *   4. POST to Groq (OpenAI-compatible chat completions).
 *   5. Log the request/response into `ai_messages`.
 */
import { prisma } from "./db";
import { CONTACT } from "./data";
import { TOOLS, executeTool } from "./ai-tools";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type AIMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: AIToolCall[];
};

export type AIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type AIResult = {
  text: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
};

/** Returns settings row, creating it with defaults if missing. */
export async function getAISettings() {
  const existing = await prisma.aISettings.findFirst();
  if (existing) return existing;
  return prisma.aISettings.create({ data: {} });
}

/** Build the system prompt with live business context. */
async function buildSystemPrompt(
  settings: Awaited<ReturnType<typeof getAISettings>>,
  telegramId?: string | number,
): Promise<string> {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  const masters = await prisma.master.findMany({
    where: { active: true, id: { not: "any" } },
    orderBy: { sortOrder: "asc" },
  });

  const catLabels: Record<string, string> = {
    massage: "Массажи",
    pool: "Бассейн",
    bath: "Сауна и хаммам",
    face: "Уход за лицом",
    duo: "Программы для двоих",
  };

  const servicesText = services
    .map(
      (s) =>
        `- ${s.name} (${catLabels[s.category] ?? s.category}, ${s.duration} мин, ${s.price.toLocaleString("ru-RU")} ₸): ${s.desc}`,
    )
    .join("\n");

  const mastersText = masters
    .map(
      (m) =>
        `- ${m.name}, ${m.role}, ${m.exp}${m.rating ? `, рейтинг ${m.rating}` : ""}, специализации: ${(m.specs as string[]).map((s) => catLabels[s] ?? s).join(", ")}`,
    )
    .join("\n");

  const parts = [
    settings.systemPrompt,
    ``,
    `## Информация о салоне`,
    `Название: RIVA POOL SPA`,
    `Адрес: ${CONTACT.address}`,
    `Телефон: ${CONTACT.phone}`,
    `Email: ${CONTACT.email}`,
    `Часы работы: Пн–Чт ${CONTACT.hoursMonThu}, Пт–Вс ${CONTACT.hoursFriSun}`,
    ``,
    `## Услуги`,
    servicesText,
    ``,
    `## Мастера`,
    mastersText,
  ];

  if (settings.customFacts && settings.customFacts.trim().length > 0) {
    parts.push(``, `## Дополнительная информация`, settings.customFacts);
  }

  // If we know who's chatting — pre-load their phone/name so AI doesn't re-ask.
  if (telegramId && /^\d+$/.test(String(telegramId))) {
    try {
      const customer = await prisma.customer.findFirst({
        where: { telegramId: String(telegramId) },
        orderBy: { updatedAt: "desc" },
        select: { name: true, phone: true, bonusPoints: true },
      });
      if (customer) {
        parts.push(
          ``,
          `## Известный клиент`,
          `Этот пользователь уже записывался у нас. Используй эти данные если он подтверждает запись:`,
          `- Имя: ${customer.name}`,
          `- Телефон: ${customer.phone}`,
          `- Бонусных баллов: ${customer.bonusPoints}`,
          `Не спрашивай заново имя/телефон, если он не сказал что хочет записать другого человека.`,
        );
      }
    } catch (err) {
      console.warn("[ai] customer lookup failed:", err);
    }
  }

  parts.push(
    ``,
    `## Команды бота, на которые можно направлять клиента`,
    `/book — начать запись на процедуру`,
    `/my — посмотреть свои записи`,
    `/contact — контакты`,
  );

  return parts.join("\n");
}

/**
 * Send a chat completion to Groq.
 * Returns null if AI is disabled or misconfigured (caller should fall back to
 * a static reply like "оператор скоро ответит").
 */
export async function askAI(
  telegramId: string | number,
  userMessage: string,
  history: AIMessage[] = [],
): Promise<AIResult | null> {
  const settings = await getAISettings();
  if (!settings.enabled) return null;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[ai] GROQ_API_KEY not set");
    return null;
  }

  const baseSystemPrompt = await buildSystemPrompt(settings, telegramId);
  // Tool-use guidance — be explicit and pushy, otherwise the model
  // tends to "describe" actions instead of calling them.
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const systemPrompt = [
    baseSystemPrompt,
    ``,
    `## Сегодня и контекст времени`,
    `Сегодня: ${todayIso}. Завтра: ${tomorrowIso}.`,
    `Когда клиент говорит «завтра», «послезавтра», «в субботу» — переведи в YYYY-MM-DD и используй эту дату в инструментах.`,
    ``,
    `## Инструменты для реальных действий`,
    `У тебя есть РАБОЧИЕ инструменты. ВЫЗЫВАЙ ИХ, не описывай.`,
    `- list_services — список услуг/цен (вызывай когда клиент спрашивает про цены)`,
    `- list_masters — мастера (вызывай когда нужно выбрать мастера)`,
    `- find_free_slots — свободные слоты (вызывай чтобы узнать когда мастер свободен)`,
    `- create_booking — СОЗДАЁТ запись в БД (это финальный шаг)`,
    ``,
    `## Алгоритм для записи`,
    `Если клиент хочет записаться:`,
    `1. Если он не назвал услугу — вызови list_services и предложи варианты.`,
    `2. Если назвал имя мастера ("к Айгерим", "к Ержану") — вызови list_masters с nameQuery="айгерим" чтобы найти его ID.`,
    `   Голосовые сообщения часто транскрибируются с искажениями (Айгерим может стать "Айгером") — `,
    `   tool сам делает терпимый поиск, передавай как услышал.`,
    `   Если мастера не назвал — вызови list_masters с serviceId и предложи или выбери "any".`,
    `3. Если не назвал дату/время — вызови find_free_slots на нужную дату.`,
    `4. Когда у тебя ЕСТЬ: услуга, мастер, дата, время, имя, телефон → СРАЗУ вызови create_booking.`,
    `   НЕ переспрашивай "точно записываем?". Создавай и сообщай результат.`,
    `5. Телефон нормализуй в формат +7XXXXXXXXXX (если клиент сказал 8-707-..., замени 8 на +7).`,
    ``,
    `Если в одном сообщении клиент дал ВСЁ нужное (например: "запиши меня на завтра в 14:00 на массаж, я Заур, +77027995522") — `,
    `вызывай инструменты подряд: find_free_slots → create_booking. Не задавай лишних вопросов.`,
    ``,
    `Если каких-то данных не хватает (например, нет телефона) — задай ОДИН короткий вопрос про недостающее и жди.`,
  ].join("\n");

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
    { role: "user", content: userMessage },
  ];

  const started = Date.now();
  let responseText = "";
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;

  // Tool-call loop — run up to 5 iterations.
  const MAX_ITERATIONS = 5;
  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter += 1) {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[ai] Groq ${res.status}: ${errBody.slice(0, 500)}`);
        return null;
      }
      const json = (await res.json()) as {
        choices: {
          message: {
            role: "assistant";
            content: string | null;
            tool_calls?: AIToolCall[];
          };
          finish_reason?: string;
        }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = json.choices[0];
      if (!choice) return null;
      const msg = choice.message;
      promptTokens = json.usage?.prompt_tokens;
      completionTokens = json.usage?.completion_tokens;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Append assistant turn (with tool_calls) to history
        messages.push({
          role: "assistant",
          content: msg.content ?? "",
          tool_calls: msg.tool_calls,
        });
        // Execute each tool call sequentially and append results
        for (const call of msg.tool_calls) {
          let argsObj: Record<string, unknown> = {};
          try {
            argsObj = JSON.parse(call.function.arguments || "{}");
          } catch {
            /* keep empty */
          }
          console.log(
            `[ai] tool=${call.function.name} args=${JSON.stringify(argsObj).slice(0, 200)}`,
          );
          const out = await executeTool(call.function.name, argsObj, telegramId);
          console.log(`[ai] tool=${call.function.name} result=${out.slice(0, 200)}`);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: out,
          });
        }
        // Loop again with tool results so the model can produce final reply
        continue;
      }

      responseText = (msg.content ?? "").trim();
      break;
    }
  } catch (err) {
    console.error("[ai] request failed:", err);
    return null;
  }
  const latencyMs = Date.now() - started;

  if (!responseText) return null;

  // Persist conversation (best-effort, don't block on failure)
  try {
    await prisma.aIMessage.create({
      data: {
        telegramId: String(telegramId),
        role: "user",
        content: userMessage,
      },
    });
    await prisma.aIMessage.create({
      data: {
        telegramId: String(telegramId),
        role: "assistant",
        content: responseText,
        promptTokens: promptTokens ?? null,
        completionTokens: completionTokens ?? null,
        latencyMs,
      },
    });
  } catch (err) {
    console.warn("[ai] failed to log message:", err);
  }

  return { text: responseText, promptTokens, completionTokens, latencyMs };
}

/** Load last N message pairs for a user (for short-term memory). */
export async function loadHistory(telegramId: string | number, limit = 10): Promise<AIMessage[]> {
  const rows = await prisma.aIMessage.findMany({
    where: { telegramId: String(telegramId) },
    orderBy: { createdAt: "desc" },
    take: limit * 2,
    select: { role: true, content: true },
  });
  return rows
    .reverse()
    .map((r) => ({ role: r.role as AIMessage["role"], content: r.content }));
}
