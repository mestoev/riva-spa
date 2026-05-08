/**
 * Instagram Direct Messages webhook.
 *
 * GET  — verification handshake (Meta sends `hub.verify_token`).
 * POST — receive a message; transcribe (none needed for DM, but voice notes can be added later),
 *        push to AI, reply back.
 *
 * To go live in production:
 *   1. Buy domain, point at server, enable HTTPS (Let's Encrypt).
 *   2. Create Meta app at developers.facebook.com.
 *   3. Add Instagram product, link a Business IG account.
 *   4. Webhook URL: https://your-domain/api/instagram/webhook
 *      Verify Token: same as IG_VERIFY_TOKEN in .env
 *   5. Subscribe to events: messages, messaging_postbacks.
 *   6. Submit app for App Review with permission "instagram_manage_messages".
 *      Until approved, only the developer/test users can DM the bot.
 */
import { NextRequest, NextResponse } from "next/server";
import { askAI, loadHistory } from "@/lib/ai";
import {
  sendInstagramDM,
  verifyInstagramSignature,
} from "@/lib/instagram";

// Required so the route can read raw body (for signature verification)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// === GET — webhook verification ===
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.IG_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

// === POST — incoming DM ===
type IGMessageEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    attachments?: { type: string; payload?: { url?: string } }[];
  };
};

type IGWebhookBody = {
  object: string;
  entry: { id: string; time: number; messaging?: IGMessageEvent[] }[];
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");

  // Verify signature so random POSTs to this URL are rejected
  if (!verifyInstagramSignature(raw, sig)) {
    return new NextResponse("bad signature", { status: 401 });
  }

  let body: IGWebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  // Acknowledge fast (Meta retries on >5s latency); process in background.
  void handleEvents(body);
  return new NextResponse("ok", { status: 200 });
}

async function handleEvents(body: IGWebhookBody) {
  if (body.object !== "instagram") return;

  for (const entry of body.entry) {
    for (const msg of entry.messaging ?? []) {
      // Skip echoes (messages we ourselves sent)
      if (msg.message?.is_echo) continue;

      const userText = msg.message?.text;
      if (!userText) {
        // Could be image/sticker/audio — for now politely ask for text
        await sendInstagramDM(
          msg.sender.id,
          "Здравствуйте! Пока я понимаю только текст. Опишите, пожалуйста, что вас интересует — услуга, дата.",
        );
        continue;
      }

      try {
        // Use the same AI brain as the Telegram bot (with tool-calling for booking)
        const history = await loadHistory(`ig:${msg.sender.id}`, 6);
        const result = await askAI(`ig:${msg.sender.id}`, userText, history);
        const reply =
          result?.text ??
          "Простите, технические шероховатости — попробуйте ещё раз через минуту.";
        await sendInstagramDM(msg.sender.id, reply);
      } catch (err) {
        console.error("[ig] handleEvents error:", err);
        await sendInstagramDM(
          msg.sender.id,
          "Не получилось обработать сообщение. Напишите нам в Telegram или позвоните.",
        );
      }
    }
  }
}
