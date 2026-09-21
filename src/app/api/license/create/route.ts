import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_DAYS, createLicense, isAdminPin, rateLimitPin } from "@/lib/server/licenses";

export const runtime = "nodejs";

/**
 * POST /api/license/create — el área de administrador crea licencias.
 * Body: { pin, days, label? } → { ok, code, exp, days }
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimitPin(ip)) {
    return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
  }
  let body: { pin?: string; days?: number; label?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "body" }, { status: 400 });
  }
  if (!isAdminPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "pin" }, { status: 403 });
  }
  const days = Number(body.days);
  if (!(ALLOWED_DAYS as readonly number[]).includes(days)) {
    return NextResponse.json({ ok: false, error: "days" }, { status: 400 });
  }
  const lic = createLicense(days);
  return NextResponse.json({
    ok: true,
    code: lic.code,
    exp: lic.exp,
    days: lic.days,
  });
}
