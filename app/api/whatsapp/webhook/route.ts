/**
 * WhatsApp Business webhook (Meta Cloud API).
 *
 * GET  — verification handshake.
 * POST — incoming message: text → AI; voice → Whisper → AI.
 *
 * Setup steps in WHATSAPP_SETUP.md.
 */
import { NextRequest, NextResponse } from "next/server";
import { askAI, loadHistory } from "@/lib/ai";
import {
  sendWhatsAppText,
  downloadWhatsAppMedia,
  verifyWhatsAppSignature,
} from "@/lib/whatsapp";
import { transcribeAudio } from "@/lib/stt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// === GET — webhook verification ===
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WA_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

// === POST — incoming messages ===
type WAMessage = {
  from: string; // sender phone number (E.164, no +)
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "voice" | "video" | "document" | string;
  text?: { body: string };
  audio?: { id: string; mime_type?: string; voice?: boolean };
  voice?: { id: string; mime_type?: string };
  // ...other types omitted; we politely defer them
};

type WAWebhookBody = {
  object: string;
  entry: {
    id: string;
    changes: {
      field: string;
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        contacts?: { profile?: { name?: string }; wa_id?: string }[];
        messages?: WAMessage[];
        statuses?: unknown[]; // delivery / read receipts — ignore
      };
    }[];
  }[];
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifyWhatsAppSignature(raw, sig)) {
    return new NextResponse("bad signature", { status: 401 });
  }

  let body: WAWebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  // Acknowledge fast — process in the background
  void handleEvents(body);
  return new NextResponse("ok", { status: 200 });
}

async function handleEvents(body: WAWebhookBody) {
  if (body.object !== "whatsapp_business_account") return;

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages ?? [];
      for (const m of messages) {
        try {
          await routeMessage(m);
        } catch (err) {
          console.error("[wa] route failed:", err);
          await sendWhatsAppText(
            m.from,
            "Прости, что-то пошло не так. Напишите ещё раз, пожалуйста.",
          );
        }
      }
    }
  }
}

async function routeMessage(m: WAMessage) {
  const sender = m.from;

  // 1) Plain text
  if (m.type === "text" && m.text?.body) {
    await chatWithAI(sender, m.text.body);
    return;
  }

  // 2) Voice / audio note → Whisper
  if (m.type === "voice" || m.type === "audio") {
    const mediaId = m.voice?.id ?? m.audio?.id;
    if (!mediaId) {
      await sendWhatsAppText(sender, "Не нашёл файл голосового. Попробуйте ещё раз.");
      return;
    }
    const dl = await downloadWhatsAppMedia(mediaId);
    if (!dl) {
      await sendWhatsAppText(sender, "Не смог скачать голосовое. Напишите текстом.");
      return;
    }
    const stt = await transcribeAudio(dl.buffer, {
      language: "ru",
      mime: dl.mimeType,
      filename: "voice.ogg",
    });
    if (!stt) {
      await sendWhatsAppText(
        sender,
        "Не смог распознать голосовое. Напишите текстом, пожалуйста.",
      );
      return;
    }
    await sendWhatsAppText(sender, `🎙 Понял: «${stt.text}»`);
    await chatWithAI(sender, stt.text);
    return;
  }

  // 3) Other types — politely deflect
  await sendWhatsAppText(
    sender,
    "Пока я понимаю только текст и голосовые. Опишите, пожалуйста, что вас интересует.",
  );
}

async function chatWithAI(sender: string, userText: string) {
  // Use the same askAI brain as Telegram & Instagram, with tool-calling enabled.
  const conversationKey = `wa:${sender}`;
  const history = await loadHistory(conversationKey, 6);
  const result = await askAI(conversationKey, userText, history);
  const reply =
    result?.text ??
    "Простите, технические шероховатости. Попробуйте ещё раз через минуту или позвоните нам.";
  await sendWhatsAppText(sender, reply);
}
