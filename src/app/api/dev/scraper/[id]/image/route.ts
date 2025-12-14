import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const SCRAPES_DIR = path.join(process.cwd(), "data", "scrapes");

// GET /api/dev/scraper/[id]/image - スクレイプ画像取得
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Security: validate ID format (UUID)
    if (!/^[a-f0-9-]{36}$/.test(id)) {
      return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
    }

    const imagePath = path.join(SCRAPES_DIR, id, "full.png");

    if (!fs.existsSync(imagePath)) {
      return NextResponse.json({ ok: false, error: "Image not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(imagePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[scraper] GET image error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
