/**
 * Tiny in-memory rate limiter (token bucket per key).
 *
 * Lives in the Node process — works on a single-instance deploy. For multi-
 * instance scaling we'd swap this for Redis.
 *
 * Usage:
 *   const ok = await rateLimit(`booking:${ip}`, { limit: 5, windowMs: 3600_000 });
 *   if (!ok) return { ok: false, error: "Слишком много попыток. Попробуйте позже." };
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't leak memory
let lastSweep = 0;
function sweepIfNeeded(now: number) {
  if (now - lastSweep < 60_000) return; // every minute
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export type RateLimitOpts = { limit: number; windowMs: number };

export function rateLimit(key: string, opts: RateLimitOpts): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  sweepIfNeeded(now);
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    const next: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, next);
    return { ok: true, remaining: opts.limit - 1, resetAt: next.resetAt };
  }
  if (cur.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: cur.resetAt };
  }
  cur.count += 1;
  return { ok: true, remaining: opts.limit - cur.count, resetAt: cur.resetAt };
}

/** Best-effort client IP. In server actions we don't have a Request object,
 *  so we use a "session-like" key from the booking phone instead. */
export function clientIpFromHeaders(headers: Headers): string {
  const xf = headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
