// WhatsApp Business / Meta Cloud API client.
//
// Send: POST https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/messages
// Receive: webhook on /api/whatsapp/webhook (Meta sends messages here)
// Media:  GET https://graph.facebook.com/v21.0/<MEDIA_ID> → downloadable URL
//
// All endpoints OpenAI-style require Bearer token (WA_ACCESS_TOKEN).
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = "v21.0";

/** Send a text message to a WhatsApp number (E.164 format, no '+' or '-'). */
export async function sendWhatsAppText(toNumber: string, text: string): Promise<boolean> {
  const token = process.env.WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn("[wa] WA_ACCESS_TOKEN / WA_PHONE_NUMBER_ID not set");
    return false;
  }
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toNumber,
        type: "text",
        text: { preview_url: false, body: text.slice(0, 4000) },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[wa] sendText ${res.status}: ${err.slice(0, 400)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[wa] sendText failed:", err);
    return false;
  }
}

/**
 * Download a WhatsApp media file (voice notes, images) by media id.
 * Returns the binary body or null on failure.
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{
  buffer: ArrayBuffer;
  mimeType: string;
} | null> {
  const token = process.env.WA_ACCESS_TOKEN;
  if (!token) return null;
  try {
    // 1) Resolve media id → temporary download URL
    const meta = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!meta.ok) {
      console.error("[wa] media meta failed", await meta.text());
      return null;
    }
    const m = (await meta.json()) as { url?: string; mime_type?: string };
    if (!m.url) return null;
    // 2) Download bytes
    const bin = await fetch(m.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!bin.ok) {
      console.error("[wa] media download failed", bin.status);
      return null;
    }
    return {
      buffer: await bin.arrayBuffer(),
      mimeType: m.mime_type ?? "application/octet-stream",
    };
  } catch (err) {
    console.error("[wa] downloadMedia failed:", err);
    return null;
  }
}

/** Verify x-hub-signature-256 against WA_APP_SECRET. */
export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WA_APP_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
