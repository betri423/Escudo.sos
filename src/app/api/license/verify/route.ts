import { NextRequest, NextResponse } from "next/server";
import { isExpired, parseActivationToken } from "@/lib/server/licenses";

export const runtime = "nodejs";

/**
 * POST /api/license/verify — verifica el token de activación (en cada
 * arranque de la app). Body: { token } → { ok, exp }
 */
export async function POST(req: NextRequest) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "body" }, { status: 400 });
  }
  const act = parseActivationToken(String(body.token ?? ""));
  if (!act) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 200 });
  }
  if (isExpired(act.exp)) {
    return NextResponse.json({ ok: false, error: "expired", exp: act.exp }, { status: 200 });
  }
  return NextResponse.json({ ok: true, exp: act.exp });
}
