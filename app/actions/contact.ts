"use server";

import { prisma } from "@/lib/db";
import { contactSubmitSchema, type ContactSubmitInput } from "@/lib/validators";
import { htmlEscape, notifyAdmins } from "@/lib/telegram";
import { rateLimit } from "@/lib/ratelimit";

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function submitContact(input: ContactSubmitInput): Promise<ContactResult> {
  const parsed = contactSubmitSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Некорректные данные" };
  }
  const data = parsed.data;

  const rl = rateLimit(`contact:${data.phone}`, { limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return { ok: false, error: "Слишком много сообщений. Попробуйте через час." };
  }

  try {
    // Link to existing customer by phone if possible
    const customer = await prisma.customer.upsert({
      where: { phone: data.phone },
      create: { phone: data.phone, name: data.name },
      update: { name: data.name },
    });

    const cr = await prisma.contactRequest.create({
      data: {
        customerId: customer.id,
        name: data.name,
        phone: data.phone,
        message: data.message,
        source: "website",
      },
    });

    void notifyAdmins(
      [
        `📩 <b>Новое сообщение через форму</b>`,
        ``,
        `<b>Имя:</b> ${htmlEscape(data.name)}`,
        `<b>Телефон:</b> ${htmlEscape(data.phone)}`,
        ``,
        `${htmlEscape(data.message)}`,
        ``,
        `ID: <code>${cr.id}</code>`,
      ].join("\n"),
    );

    return { ok: true };
  } catch (err) {
    console.error("[submitContact] unexpected error:", err);
    return { ok: false, error: "Ошибка сервера. Попробуйте ещё раз." };
  }
}
