import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Dev-only log proxy.
 * - Accepts a JSON body from the browser (same-origin).
 * - Forwards it to the NDJSON ingest server so we can collect runtime evidence.
 * - Do NOT send secrets/PII in the payload.
 */
export async function POST(request: NextRequest): Promise<NextResponse<{ ok: true } | { ok: false }>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await fetch("http://127.0.0.1:7245/ingest/74c76745-45fe-4f89-ba61-3be0ce7fcd59", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Ignore forwarding failures (debug-only).
  }

  return NextResponse.json({ ok: true });
}





