/**
 * PDF Process API
 * PDF処理の統合エンドポイント
 */

import { NextRequest, NextResponse } from "next/server";
import { processPDF, getPDFMetadata } from "@/lib/pdf/pdf-processor";
import {
  listPDFsFromGoogleDrive,
  listFoldersFromGoogleDrive,
  checkGoogleAuthStatus,
  extractFileIdFromShareLink,
  getFileInfo,
} from "@/lib/pdf/google-drive-loader";

// =============================================================================
// GET: 情報取得
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Google Driveからファイル一覧取得
  if (action === "drive-files") {
    try {
      const folderId = searchParams.get("folderId") || undefined;
      const files = await listPDFsFromGoogleDrive(folderId);
      return NextResponse.json({ ok: true, files });
    } catch {
      return NextResponse.json(
        { ok: false, error: "ファイル一覧の取得に失敗しました" },
        { status: 500 }
      );
    }
  }

  // Google Driveからフォルダ一覧取得
  if (action === "drive-folders") {
    try {
      const folders = await listFoldersFromGoogleDrive();
      return NextResponse.json({ ok: true, folders });
    } catch {
      return NextResponse.json(
        { ok: false, error: "フォルダ一覧の取得に失敗しました" },
        { status: 500 }
      );
    }
  }

  // Google認証状態確認
  if (action === "auth-status") {
    const status = await checkGoogleAuthStatus();
    return NextResponse.json({ ok: true, ...status });
  }

  // ファイル情報取得
  if (action === "file-info") {
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json(
        { ok: false, error: "fileIdが必要です" },
        { status: 400 }
      );
    }
    const fileInfo = await getFileInfo(fileId);
    if (!fileInfo) {
      return NextResponse.json(
        { ok: false, error: "ファイルが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, file: fileInfo });
  }

  // API情報
  return NextResponse.json({
    name: "PDF Process API",
    version: "1.0.0",
    description: "PDF処理（テキスト抽出・画像変換）",
    endpoints: {
      "GET /api/pdf/process": "API情報",
      "GET /api/pdf/process?action=drive-files": "Google Drive PDFファイル一覧",
      "GET /api/pdf/process?action=drive-folders": "Google Driveフォルダ一覧",
      "GET /api/pdf/process?action=auth-status": "Google認証状態",
      "GET /api/pdf/process?action=file-info&fileId=xxx": "ファイル情報",
      "POST /api/pdf/process": "PDF処理実行",
      "POST /api/pdf/process?action=metadata": "メタデータ取得",
      "POST /api/pdf/process?action=parse-share-link": "共有リンク解析",
    },
  });
}

// =============================================================================
// POST: PDF処理実行
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const body = await request.json();

    // 共有リンク解析
    if (action === "parse-share-link") {
      const { shareLink } = body;
      if (!shareLink) {
        return NextResponse.json(
          { ok: false, error: "shareLinkが必要です" },
          { status: 400 }
        );
      }

      const fileId = extractFileIdFromShareLink(shareLink);
      if (!fileId) {
        return NextResponse.json(
          { ok: false, error: "有効なGoogle Driveリンクではありません" },
          { status: 400 }
        );
      }

      const fileInfo = await getFileInfo(fileId);
      return NextResponse.json({
        ok: true,
        fileId,
        fileInfo,
      });
    }

    // メタデータ取得
    if (action === "metadata") {
      const { pdfBase64 } = body;
      if (!pdfBase64) {
        return NextResponse.json(
          { ok: false, error: "pdfBase64が必要です" },
          { status: 400 }
        );
      }

      // Base64をArrayBufferに変換
      const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const metadata = await getPDFMetadata(bytes.buffer);
      return NextResponse.json({ ok: true, metadata });
    }

    // PDF処理
    const { source, sourceType, operations, options } = body;

    if (!source) {
      return NextResponse.json(
        { ok: false, error: "sourceが必要です" },
        { status: 400 }
      );
    }

    if (!sourceType || !["base64", "url", "google-drive"].includes(sourceType)) {
      return NextResponse.json(
        { ok: false, error: "sourceTypeが不正です（base64/url/google-drive）" },
        { status: 400 }
      );
    }

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { ok: false, error: "operationsが必要です" },
        { status: 400 }
      );
    }

    const result = await processPDF({
      source,
      sourceType,
      operations,
      options,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("[pdf/process API] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "処理に失敗しました",
      },
      { status: 500 }
    );
  }
}
