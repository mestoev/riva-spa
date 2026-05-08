/**
 * Tiny session-cookie auth for /admin/*, runtime-agnostic.
 *
 * Built on Web Crypto API (`crypto.subtle`) so the same code runs in:
 *   - Node.js (server actions, server components)
 *   - Edge runtime (Next.js middleware)
 *
 * Cookie format: `<base64url(payload)>.<base64url(hmac)>`
 */
const COOKIE_NAME = "riva_admin";
const TTL_SEC = 60 * 60 * 24 * 7; // 7 days

// ===== base64url helpers (Edge-safe — no Buffer) =====

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

// ===== HMAC-SHA256 via Web Crypto =====

async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, utf8(data));
  return new Uint8Array(sig);
}

async function hmacVerify(secret: string, data: string, sig: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, sig, utf8(data));
}

function getSecret(): string {
  const s = process.env.ADMIN_AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_AUTH_SECRET must be set (16+ chars) in .env");
  }
  return s;
}

// ===== Public API =====

export type AdminSession = { iat: number; exp: number };

export async function signSession(): Promise<string> {
  const payload: AdminSession = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  };
  const payloadB64 = b64urlEncode(utf8(JSON.stringify(payload)));
  const sig = await hmacSign(getSecret(), payloadB64);
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<AdminSession | null> {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let sigBytes: Uint8Array;
  try {
    sigBytes = b64urlDecode(sigB64);
  } catch {
    return null;
  }

  let valid = false;
  try {
    valid = await hmacVerify(getSecret(), payloadB64, sigBytes);
  } catch {
    return null;
  }
  if (!valid) return null;

  let payload: AdminSession;
  try {
    payload = JSON.parse(utf8Decode(b64urlDecode(payloadB64))) as AdminSession;
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/** Constant-time string comparison (same length only). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i += 1) {
    res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return res === 0;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || expected.length < 4) return false;
  return safeEqual(input, expected);
}

export const ADMIN_COOKIE = COOKIE_NAME;
export const ADMIN_TTL_SEC = TTL_SEC;
