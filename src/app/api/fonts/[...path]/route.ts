import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/**
 * ローカルフォントファイルを提供するAPIルート
 * /api/fonts/[filename] でフォントにアクセス可能
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  try {
    const { path: pathSegments } = await context.params;
    const fontPath = pathSegments.join("/");
    
    // セキュリティ: パストラバーサル防止
    if (fontPath.includes("..") || fontPath.startsWith("/")) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    // 許可される拡張子
    const allowedExtensions = [".ttf", ".otf", ".woff", ".woff2", ".ttc"];
    const ext = path.extname(fontPath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return new NextResponse("Invalid file type", { status: 400 });
    }

    // フォントファイルのフルパス
    const fontDir = path.join(process.cwd(), "font");
    const fullPath = path.join(fontDir, fontPath);

    // フォントディレクトリ外へのアクセス防止
    if (!fullPath.startsWith(fontDir)) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // ファイル読み込み
    const fileBuffer = await readFile(fullPath);

    // Content-Type の設定
    const contentType = getContentType(ext);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Font loading error:", error);
    return new NextResponse("Font not found", { status: 404 });
  }
}

function getContentType(ext: string): string {
  switch (ext) {
    case ".ttf":
      return "font/ttf";
    case ".otf":
      return "font/otf";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttc":
      return "font/collection";
    default:
      return "application/octet-stream";
  }
}

