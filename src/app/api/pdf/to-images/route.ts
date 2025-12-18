/**
 * PDF to Images API
 * PDFを画像（PNG/JPEG）に変換するAPIエンドポイント
 */

import { NextRequest, NextResponse } from "next/server";
import {
  convertPDFToImages,
  getDPIDescription,
  estimateImageSize,
} from "@/lib/pdf/image-converter";
import { loadPDFFromGoogleDrive } from "@/lib/pdf/google-drive-loader";

// =============================================================================
// GET: API情報
// =============================================================================

export async function GET() {
  return NextResponse.json({
    name: "PDF to Images API",
    version: "1.0.0",
    description: "PDFを画像（PNG/JPEG）に変換",
    endpoints: {
      "POST /api/pdf/to-images": "画像変換",
    },
    options: {
      sourceType: "base64 | google-drive",
      dpi: "150 | 300 | 600（デフォルト: 150）",
      format: "png | jpeg（デフォルト: png）",
      quality: "1-100（デフォルト: 85、JPEG用）",
      pageRange: "{ start: number, end: number }",
    },
    dpiDescriptions: {
      "150": getDPIDescription(150),
      "300": getDPIDescription(300),
      "600": getDPIDescription(600),
    },
  });
}

// =============================================================================
// POST: 画像変換
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      sourceType,
      dpi = 150,
      format = "png",
      quality = 85,
      pageRange,
    } = body;

    if (!source) {
      return NextResponse.json(
        { ok: false, error: "sourceが必要です" },
        { status: 400 }
      );
    }

    // DPIバリデーション
    if (![150, 300, 600].includes(dpi)) {
      return NextResponse.json(
        { ok: false, error: "dpiは150, 300, 600のいずれかを指定してください" },
        { status: 400 }
      );
    }

    // PDFデータを取得
    let pdfBuffer: ArrayBuffer;

    if (sourceType === "base64") {
      const base64Data = source.replace(/^data:application\/pdf;base64,/, "");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfBuffer = bytes.buffer;
    } else if (sourceType === "google-drive") {
      pdfBuffer = await loadPDFFromGoogleDrive(source);
    } else {
      return NextResponse.json(
        { ok: false, error: "sourceTypeが不正です（base64/google-drive）" },
        { status: 400 }
      );
    }

    // 画像変換
    const result = await convertPDFToImages(pdfBuffer, {
      dpi,
      format,
      quality,
      pageRange,
    });

    // 総ファイルサイズを計算
    const totalSize = result.images.reduce((sum, img) => sum + img.fileSize, 0);

    return NextResponse.json({
      ok: true,
      pageCount: result.pageCount,
      imageCount: result.images.length,
      settings: result.settings,
      totalSize,
      totalSizeFormatted:
        totalSize < 1024 * 1024
          ? `${Math.round(totalSize / 1024)} KB`
          : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`,
      images: result.images.map((img) => ({
        pageNumber: img.pageNumber,
        dataUrl: img.dataUrl,
        width: img.width,
        height: img.height,
        fileSize: img.fileSize,
      })),
    });
  } catch (error) {
    console.error("[pdf/to-images API] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "画像変換に失敗しました",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Estimate endpoint (for preview)
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageCount, dpi = 150, format = "png" } = body;

    if (!pageCount || pageCount < 1) {
      return NextResponse.json(
        { ok: false, error: "pageCountが必要です" },
        { status: 400 }
      );
    }

    const estimate = estimateImageSize(pageCount, dpi, format);

    return NextResponse.json({
      ok: true,
      estimate,
      dpiDescription: getDPIDescription(dpi),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "推定に失敗しました" },
      { status: 500 }
    );
  }
}
