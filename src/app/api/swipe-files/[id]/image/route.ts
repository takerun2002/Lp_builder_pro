import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";

export const runtime = "nodejs";

interface SwipeFile {
  id: string;
  file_path: string;
  mime_type: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/swipe-files/[id]/image - 画像取得
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();

    const swipeFile = db
      .prepare("SELECT id, file_path, mime_type FROM swipe_files WHERE id = ?")
      .get(id) as SwipeFile | undefined;

    if (!swipeFile) {
      return NextResponse.json(
        { ok: false, error: "Swipe file not found" },
        { status: 404 }
      );
    }

    if (!swipeFile.file_path || !fs.existsSync(swipeFile.file_path)) {
      return NextResponse.json(
        { ok: false, error: "Image file not found" },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(swipeFile.file_path);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": swipeFile.mime_type || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[swipe-files] GET image error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
