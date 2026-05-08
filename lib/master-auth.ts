/**
 * Auth for /master/* — separate from admin auth.
 * Each master has username + PBKDF2 password hash in the DB.
 * Session cookie: `<masterId>.<exp>.<hmac>` (HMAC-SHA256, same secret as admin).
 *
 * Runtime-agnostic — uses Web Crypto only, so it works in middleware too.
 */
import { prisma } from "./db";

const COOKIE_NAME = "riva_master";
const TTL_SEC = 60 * 60 * 24 * 30; // 30 days
const PBKDF2_ITERATIONS = 100_000;

// ===== Encoding helpers =====

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

const utf8 = (s: string) => new TextEncoder().encode(s);

// ===== Password hashing (PBKDF2-SHA256) =====

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 4) throw new Error("Password too short");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey(
    "raw",
    utf8(plain),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    km,
    256,
  );
  return `pbkdf2:${PBKDF2_ITERATIONS}:${b64urlEncode(salt)}:${b64urlEncode(new Uint8Array(bits))}`;
}

export async function verifyPassword(plain: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [algo, itStr, saltB64, hashB64] = stored.split(":");
  if (algo !== "pbkdf2") return false;
  const iterations = Number(itStr);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const salt = b64urlDecode(saltB64);
  const km = await crypto.subtle.importKey(
    "raw",
    utf8(plain),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    km,
    256,
  );
  return b64urlEncode(new Uint8Array(bits)) === hashB64;
}

/** Generate a friendly random password (8 chars, no ambiguous letters). */
export function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// ===== Session signing (HMAC-SHA256) =====

function getSecret(): string {
  const s = process.env.ADMIN_AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_AUTH_SECRET must be set (16+ chars)");
  }
  return s;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    utf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, utf8(data)));
}

export async function signMasterSession(masterId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `${encodeURIComponent(masterId)}.${exp}`;
  const sig = await hmac(getSecret(), payload);
  return `${payload}.${b64urlEncode(sig)}`;
}

export type MasterSession = { masterId: string; exp: number };

export async function verifyMasterSession(token: string | undefined | null): Promise<MasterSession | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encId, expStr, sigB64] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const data = `${encId}.${expStr}`;
  let expected: Uint8Array;
  try {
    expected = await hmac(getSecret(), data);
  } catch {
    return null;
  }
  if (b64urlEncode(expected) !== sigB64) return null;
  return { masterId: decodeURIComponent(encId), exp };
}

// ===== Public helper used by routes / layouts =====

export const MASTER_COOKIE = COOKIE_NAME;
export const MASTER_TTL_SEC = TTL_SEC;

/** Look up the currently logged-in master from a cookie value. */
export async function getMasterFromCookie(token: string | undefined | null) {
  const session = await verifyMasterSession(token);
  if (!session) return null;
  const master = await prisma.master.findUnique({ where: { id: session.masterId } });
  if (!master || !master.active) return null;
  return master;
}

/** Generate a username slug from a master's name. Falls back to id. */
export function suggestUsername(name: string, fallbackId: string): string {
  const translit: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const base = name
    .toLowerCase()
    .split("")
    .map((c) => translit[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || fallbackId;
}
