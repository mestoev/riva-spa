// Instagram Direct Messages — Meta Graph API client.
// We use the Instagram Messaging API (subset of Messenger Platform).
//
// Send: POST https://graph.facebook.com/v21.0/me/messages?access_token=...
// Receive: webhook on /api/instagram/webhook
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = "v21.0";

/** Send a text DM to an Instagram user (by IG-scoped user id). */
export async function sendInstagramDM(recipientId: string, text: string): Promise<boolean> {
  const token = process.env.IG_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.warn("[ig] IG_PAGE_ACCESS_TOKEN not set");
    return false;
  }
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text.slice(0, 1000) }, // IG DM limit ~1000 chars
        messaging_type: "RESPONSE",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[ig] sendDM ${res.status}: ${err.slice(0, 400)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[ig] sendDM failed:", err);
    return false;
  }
}

/** Verify x-hub-signature-256 from Meta webhook. */
export function verifyInstagramSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.IG_APP_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
