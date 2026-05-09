/**
 * Image upload endpoint for the admin UI.
 *
 * Accepts multipart/form-data with a single file under field name "file".
 * Validates MIME (images only), size (≤ 5 MB), saves to public/uploads/<random>.<ext>,
 * returns { url } pointing at the served path.
 *
 * Auth: admin session cookie required (the middleware redirects unauthenticated
 * requests to /admin/login, so by the time we run here we know we're an admin).
 */
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export async function POST(req: NextRequest) {
  // Defense-in-depth: middleware should already gate this, but check again.
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large (max 5 MB)" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  }

  // Pick extension from MIME (don't trust the original filename)
  const extByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  const ext = extByMime[file.type];
  // Subfolder by month so /uploads doesn't blow up to thousands of files
  const ym = new Date().toISOString().slice(0, 7); // 2026-05
  const folder = `uploads/${ym}`;
  const fileName = `${randomBytes(12).toString("hex")}.${ext}`;
  const relPath = `${folder}/${fileName}`;
  const absDir = join(process.cwd(), "public", folder);
  const absPath = join(absDir, fileName);

  try {
    await fs.mkdir(absDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absPath, buf);
  } catch (err) {
    console.error("[upload] failed to write file:", err);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }

  const publicUrl = `/${relPath}`;
  return NextResponse.json({ url: publicUrl, size: file.size, mime: file.type });
}
