import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type ApiKeySource = "env" | "stored" | "none";

function getStoredGoogleApiKey(): string | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get("google_api_key") as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const envKey = process.env.GOOGLE_API_KEY;
  const storedKey = getStoredGoogleApiKey();

  const source: ApiKeySource = envKey ? "env" : storedKey ? "stored" : "none";

  return NextResponse.json({
    ok: true,
    googleApiKeyConfigured: source !== "none",
    source,
  });
}



