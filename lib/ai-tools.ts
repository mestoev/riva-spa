// Tool implementations exposed to the AI.
// The AI calls them by name with JSON arguments; we execute and return JSON-serializable results.
import { prisma } from "./db";
import { getSchedule } from "./schedule";
import { notifyAdmins, htmlEscape } from "./telegram";

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    };
  };
};

export const TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_services",
      description:
        "Получить список активных услуг с ценами и длительностью. Используй когда клиент спрашивает про услуги или цены.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Опциональная категория для фильтра",
            enum: ["massage", "pool", "bath", "face", "duo"],
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_masters",
      description:
        "Получить активных мастеров. Если клиент назвал имя или часть имени — передай его в `nameQuery`, и вернутся подходящие. Если указать serviceId — отфильтруется по услуге.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string", description: "ID услуги (опционально)" },
          nameQuery: {
            type: "string",
            description:
              "Часть имени или фамилии для поиска (кейс-нечувствительный, любая подстрока). Например 'айгерим' найдёт 'Айгерим Нурланова'.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_free_slots",
      description:
        "Получить свободные слоты у конкретного мастера на конкретную дату. Дата в формате YYYY-MM-DD.",
      parameters: {
        type: "object",
        properties: {
          masterId: { type: "string", description: "ID мастера" },
          date: { type: "string", description: "Дата в формате YYYY-MM-DD" },
        },
        required: ["masterId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description:
        "СОЗДАЁТ запись клиента в БД. Вызывай как только все 6 параметров известны — НЕ переспрашивай 'подтвердить?'. Возвращает ok=true и подтверждение либо ok=false с причиной (slot_taken / master_off).",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string", description: "ID услуги (точно как в list_services)" },
          masterId: { type: "string", description: "ID мастера (точно как в list_masters)" },
          date: { type: "string", description: "Дата YYYY-MM-DD" },
          time: { type: "string", description: "Время HH:MM (24h)" },
          customerName: { type: "string", description: "Имя клиента" },
          customerPhone: { type: "string", description: "Телефон, начинающийся с +7" },
        },
        required: ["serviceId", "masterId", "date", "time", "customerName", "customerPhone"],
      },
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  telegramId: string | number,
): Promise<string> {
  try {
    if (name === "list_services") {
      const where: { active: true; category?: never } = { active: true };
      if (args.category) (where as { category?: string }).category = String(args.category);
      const list = await prisma.service.findMany({
        where: where as never,
        orderBy: { sortOrder: "asc" },
      });
      return JSON.stringify(
        list.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.desc,
          category: s.category,
          durationMin: s.duration,
          priceKzt: s.price,
          tag: s.tag,
        })),
      );
    }

    if (name === "list_masters") {
      const masters = await prisma.master.findMany({
        where: { active: true, id: { not: "any" } },
        orderBy: { sortOrder: "asc" },
      });
      let filtered = masters;
      if (args.serviceId) {
        const svc = await prisma.service.findUnique({
          where: { id: String(args.serviceId) },
        });
        if (svc) {
          filtered = filtered.filter(
            (m) =>
              (m.specs as string[]).includes(svc.category) ||
              (m.specs as string[]).includes("all"),
          );
        }
      }
      if (args.nameQuery) {
        const q = String(args.nameQuery).trim().toLowerCase();
        if (q.length >= 2) {
          // Build lightweight character-bigram set for tolerant matching of mistranscribed names.
          const bigrams = (s: string) => {
            const t = s.toLowerCase();
            const out = new Set<string>();
            for (let i = 0; i < t.length - 1; i += 1) out.add(t.slice(i, i + 2));
            return out;
          };
          const qb = bigrams(q);
          const score = (s: string) => {
            const lower = s.toLowerCase();
            if (lower.includes(q)) return 1; // direct substring
            const sb = bigrams(lower);
            let common = 0;
            for (const g of qb) if (sb.has(g)) common += 1;
            return common / Math.max(1, qb.size);
          };
          const ranked = filtered
            .map((m) => ({ m, s: Math.max(score(m.name), score(m.role)) }))
            .sort((a, b) => b.s - a.s)
            .filter((x) => x.s >= 0.4) // tolerate Whisper typos
            .map((x) => x.m);
          if (ranked.length > 0) filtered = ranked;
        }
      }
      return JSON.stringify(
        filtered.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          experience: m.exp,
          rating: m.rating,
          specializations: m.specs,
        })),
      );
    }

    if (name === "find_free_slots") {
      const masterId = String(args.masterId ?? "");
      const date = String(args.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return JSON.stringify({ error: "date must be YYYY-MM-DD" });
      }
      const days = await getSchedule(15, masterId);
      const day = days.find((d) => d.iso === date);
      if (!day) {
        return JSON.stringify({ error: "date out of range or master not found", date });
      }
      if (day.closed) {
        return JSON.stringify({
          date,
          closed: true,
          reason: day.reason,
          freeSlots: [],
        });
      }
      // Also check master blackouts
      const slotDate = new Date(`${date}T00:00:00.000Z`);
      const blackouts = await prisma.masterBlackout.findMany({
        where: { masterId, date: slotDate },
      });
      const fullDayOff = blackouts.some((b) => b.time === null);
      if (fullDayOff) {
        return JSON.stringify({
          date,
          closed: true,
          reason: "мастер не работает в этот день",
          freeSlots: [],
        });
      }
      const blackedTimes = new Set(blackouts.filter((b) => b.time).map((b) => b.time!));
      const free = day.slots
        .filter((s) => s.free && !blackedTimes.has(s.time))
        .map((s) => s.time);
      return JSON.stringify({ date, freeSlots: free });
    }

    if (name === "create_booking") {
      const { serviceId, masterId, date, time, customerName, customerPhone } = args as Record<
        string,
        string
      >;
      if (!serviceId || !masterId || !date || !time || !customerName || !customerPhone) {
        return JSON.stringify({ ok: false, error: "missing fields" });
      }

      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      const master = await prisma.master.findUnique({ where: { id: masterId } });
      if (!service || !service.active) {
        return JSON.stringify({ ok: false, error: "service not found or inactive" });
      }
      if (!master || !master.active) {
        return JSON.stringify({ ok: false, error: "master not found or inactive" });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const slotDate = new Date(`${date}T00:00:00.000Z`);
          const slot = await tx.slot.upsert({
            where: { date_time_masterId: { date: slotDate, time, masterId } },
            create: { date: slotDate, time, masterId },
            update: {},
          });
          if (slot.blocked) throw new Error("SLOT_BLOCKED");
          const existing = await tx.booking.findUnique({ where: { slotId: slot.id } });
          if (existing) throw new Error("SLOT_TAKEN");
          const dayOff = await tx.masterBlackout.findFirst({
            where: {
              masterId,
              date: slotDate,
              OR: [{ time: null }, { time }],
            },
          });
          if (dayOff) throw new Error("MASTER_OFF");

          // Phone normalisation
          const normalizedPhone = customerPhone.replace(/[\s()-]/g, "");
          const customer = await tx.customer.upsert({
            where: { phone: normalizedPhone },
            create: {
              phone: normalizedPhone,
              name: customerName,
              telegramId: String(telegramId),
            },
            update: {
              name: customerName,
              telegramId: String(telegramId),
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
              actor: `ai:tg:${telegramId}`,
              action: "created",
              payload: { source: "telegram-ai" },
            },
          });

          return { booking, customer, service, master };
        });

        // Async admin notification
        void notifyAdmins(
          [
            `🤖 <b>Новая запись через AI</b>`,
            ``,
            `<b>Услуга:</b> ${htmlEscape(result.service.name)} · ${result.service.price.toLocaleString("ru-RU")} ₸`,
            `<b>Мастер:</b> ${htmlEscape(result.master.name)}`,
            `<b>Когда:</b> ${date} ${time}`,
            ``,
            `<b>Клиент:</b> ${htmlEscape(result.customer.name)}`,
            `<b>Телефон:</b> ${htmlEscape(result.customer.phone)}`,
            ``,
            `ID: <code>${result.booking.id}</code>`,
          ].join("\n"),
          { bookingId: result.booking.id },
        );

        return JSON.stringify({
          ok: true,
          bookingId: result.booking.id,
          confirmation: `Запись создана: ${result.service.name} к ${result.master.name} на ${date} в ${time}. Стоимость ${result.service.price} ₸.`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        if (msg === "SLOT_TAKEN" || msg === "SLOT_BLOCKED") {
          return JSON.stringify({ ok: false, error: "slot_taken" });
        }
        if (msg === "MASTER_OFF") {
          return JSON.stringify({ ok: false, error: "master_off" });
        }
        console.error("[ai-tools] create_booking failed:", err);
        return JSON.stringify({ ok: false, error: "server_error" });
      }
    }

    return JSON.stringify({ error: `unknown tool: ${name}` });
  } catch (err) {
    console.error(`[ai-tools] ${name} failed:`, err);
    return JSON.stringify({ error: "tool execution failed" });
  }
}
