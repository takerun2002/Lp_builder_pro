/**
 * PDF Text Extract API
 * PDFからテキストを抽出するAPIエンドポイント
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractTextFromPDF,
  formatAsPlainText,
  formatAsMarkdown,
  formatAsJSON,
} from "@/lib/pdf/text-extractor";
import { loadPDFFromGoogleDrive } from "@/lib/pdf/google-drive-loader";

// =============================================================================
// GET: API情報
// =============================================================================

export async function GET() {
  return NextResponse.json({
    name: "PDF Text Extract API",
    version: "1.0.0",
    description: "PDFからテキストを抽出（OCR対応）",
    endpoints: {
      "POST /api/pdf/extract-text": "テキスト抽出",
    },
    options: {
      sourceType: "base64 | google-drive",
      ocrEnabled: "boolean（画像PDFの場合にOCRを使用）",
      pageRange: "{ start: number, end: number }",
      outputFormat: "text | markdown | json",
    },
  });
}

// =============================================================================
// POST: テキスト抽出
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      sourceType,
      ocrEnabled = false,
      pageRange,
      outputFormat = "text",
    } = body;

    if (!source) {
      return NextResponse.json(
        { ok: false, error: "sourceが必要です" },
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

    // テキスト抽出
    const result = await extractTextFromPDF(pdfBuffer, {
      ocrEnabled,
      pageRange,
    });

    // 出力形式に応じてフォーマット
    let formattedText: string;
    switch (outputFormat) {
      case "markdown":
        formattedText = formatAsMarkdown(result);
        break;
      case "json":
        formattedText = formatAsJSON(result);
        break;
      default:
        formattedText = formatAsPlainText(result);
    }

    return NextResponse.json({
      ok: true,
      text: formattedText,
      pageCount: result.pageCount,
      usedOCR: result.usedOCR,
      hasText: result.hasText,
      pages: result.pages.map((p) => ({
        pageNumber: p.pageNumber,
        textLength: p.text.length,
        ocrUsed: p.ocrUsed,
      })),
    });
  } catch (error) {
    console.error("[pdf/extract-text API] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "テキスト抽出に失敗しました",
      },
      { status: 500 }
    );
  }
}
