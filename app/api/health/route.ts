// Health-check endpoint — used by uptime monitors (UptimeRobot etc).
// Pings DB and returns 200 with JSON, or 500 if DB unreachable.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      latencyMs: Date.now() - t0,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        error: err instanceof Error ? err.message : "unknown",
        ts: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
