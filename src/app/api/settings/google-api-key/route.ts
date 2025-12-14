import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const googleApiKey = (body as { googleApiKey?: unknown })?.googleApiKey;
  if (typeof googleApiKey !== "string" || googleApiKey.trim() === "") {
    return NextResponse.json({ ok: false, error: "googleApiKey is required" }, { status: 400 });
  }

  const key = googleApiKey.trim();

  try {
    const db = getDb();
    db.prepare(
      `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
      `,
    ).run("google_api_key", key);
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const db = getDb();
    db.prepare("DELETE FROM app_settings WHERE key = ?").run("google_api_key");
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to delete settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}


