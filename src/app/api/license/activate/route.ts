import { NextRequest, NextResponse } from "next/server";
import {
  isExpired,
  issueActivationToken,
  parseLicenseCode,
  sanitizeDeviceId,
} from "@/lib/server/licenses";

export const runtime = "nodejs";

/**
 * POST /api/license/activate — la víctima activa su licencia (una sola vez,
 * ligada a su dispositivo). Body: { code, deviceId } → { ok, token, exp }
 */
export async function POST(req: NextRequest) {
  let body: { code?: string; deviceId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "body" }, { status: 400 });
  }
  const deviceId = sanitizeDeviceId(body.deviceId);
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "device" }, { status: 400 });
  }
  const lic = parseLicenseCode(String(body.code ?? ""));
  if (!lic) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 200 });
  }
  if (isExpired(lic.exp)) {
    return NextResponse.json({ ok: false, error: "expired", exp: lic.exp }, { status: 200 });
  }
  const token = issueActivationToken(lic.id, lic.exp, deviceId);
  return NextResponse.json({ ok: true, token, exp: lic.exp });
}
