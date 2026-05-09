// Zod schemas for server-side input validation.
// These run on every server action — never trust the client.
import { z } from "zod";

// Phone: at least 7 digits after stripping common separators.
// We'll accept anything with 7+ digits — full E.164 normalization happens later.
export const phoneSchema = z
  .string()
  .min(7, "Минимум 7 цифр")
  .max(32, "Слишком длинный")
  .refine((s) => /\d/.test(s), "Должны быть цифры")
  .transform((s) => s.replace(/\s+/g, " ").trim());

export const nameSchema = z
  .string()
  .min(2, "Минимум 2 символа")
  .max(80, "Слишком длинное имя")
  .transform((s) => s.trim());

export const bookingSubmitSchema = z.object({
  serviceId: z.string().min(1).max(64),
  masterId: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
  promoCode: z.string().max(40).optional().default(""),
  contact: z.object({
    name: nameSchema,
    phone: phoneSchema,
    notes: z.string().max(1000).optional().default(""),
    notify: z.enum(["sms", "whatsapp", "call", "telegram"]).default("sms"),
  }),
  // honeypot — should always be empty (anti-bot)
  hp: z.string().max(0).optional(),
});

export type BookingSubmitInput = z.infer<typeof bookingSubmitSchema>;

export const contactSubmitSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  message: z.string().min(1, "Опишите вопрос").max(2000),
  hp: z.string().max(0).optional(),
});

export type ContactSubmitInput = z.infer<typeof contactSubmitSchema>;
