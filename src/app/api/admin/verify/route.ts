import { NextRequest, NextResponse } from "next/server";
import { isAdminPin, rateLimitPin } from "@/lib/server/licenses";

export const runtime = "nodejs";

/**
 * POST /api/admin/verify — valida el NIP del área de administrador.
 * (No confundir con el PIN de cancelación de la víctima.)
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimitPin(ip)) {
    return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
  }
  let body: { pin?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "body" }, { status: 400 });
  }
  if (!body.pin || !/^[\x21-\x7E]{4,12}$/.test(String(body.pin))) { // v11.3: flex
    return NextResponse.json({ ok: false, error: "format" }, { status: 400 });
  }
  if (!isAdminPin(body.pin)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
