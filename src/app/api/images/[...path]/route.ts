import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

// GET /api/images/[...path] - 画像取得
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { path: pathSegments } = await context.params;
    const filePath = path.join(process.cwd(), "data", "images", ...pathSegments);

    // セキュリティ: パストラバーサル防止
    const resolvedPath = path.resolve(filePath);
    const imagesDir = path.resolve(process.cwd(), "data", "images");
    if (!resolvedPath.startsWith(imagesDir)) {
      return NextResponse.json(
        { ok: false, error: "Invalid path" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { ok: false, error: "Image not found" },
        { status: 404 }
      );
    }

    const ext = path.extname(resolvedPath).slice(1).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const buffer = fs.readFileSync(resolvedPath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[images] GET error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
