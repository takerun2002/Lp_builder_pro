/**
 * Background Removal API
 * 画像から背景を除去するAPIエンドポイント
 */

import { NextRequest, NextResponse } from "next/server";

// Note: @imgly/background-removal はブラウザ用のため、
// サーバーサイドでは使用できません。
// このAPIはクライアントサイドで処理するための情報を返すか、
// 代替のサーバーサイド処理を提供します。

// =============================================================================
// Types
// =============================================================================

interface RemoveBgRequest {
  imageBase64?: string;
  imageUrl?: string;
  quality?: "low" | "medium" | "high";
  outputFormat?: "png" | "webp";
}

// =============================================================================
// GET: API情報
// =============================================================================

export async function GET() {
  return NextResponse.json({
    name: "Background Removal API",
    version: "1.0.0",
    description: "画像から背景を除去するAPI",
    note: "このAPIはクライアントサイド処理を推奨します。@imgly/background-removal はWebAssemblyベースでブラウザ上で動作します。",
    usage: {
      client: {
        description: "クライアントサイドで直接処理する場合",
        code: `
import { removeBackground } from '@imgly/background-removal';

const result = await removeBackground(imageBlob);
// result は Blob 形式で返されます
        `.trim(),
      },
      server: {
        description: "サーバーサイドで処理する場合（限定的）",
        endpoint: "POST /api/dev/image/remove-bg",
        body: {
          imageBase64: "Base64エンコードされた画像（data:image/...形式）",
          imageUrl: "または画像URL",
          quality: "low | medium | high（デフォルト: medium）",
          outputFormat: "png | webp（デフォルト: png）",
        },
      },
    },
    limits: {
      maxImageSize: "10MB",
      maxDimensions: "4096x4096",
      supportedFormats: ["image/png", "image/jpeg", "image/webp"],
    },
    estimatedTime: {
      "1MP (1000x1000)": "2-4秒",
      "4MP (2000x2000)": "5-10秒",
      "16MP (4000x4000)": "15-30秒",
    },
  });
}

// =============================================================================
// POST: 背景除去リクエスト
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RemoveBgRequest;

    // サーバーサイドでは @imgly/background-removal が動作しないため、
    // クライアントサイド処理へのリダイレクト情報を返す

    if (!body.imageBase64 && !body.imageUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "imageBase64 または imageUrl が必要です",
        },
        { status: 400 }
      );
    }

    // 画像サイズの検証（Base64の場合）
    if (body.imageBase64) {
      const base64Size = (body.imageBase64.length * 3) / 4;
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (base64Size > maxSize) {
        return NextResponse.json(
          {
            ok: false,
            error: "画像サイズが大きすぎます（最大10MB）",
          },
          { status: 400 }
        );
      }
    }

    // サーバーサイドでは処理できないため、クライアント処理を促す
    return NextResponse.json({
      ok: true,
      processOnClient: true,
      message: "背景除去はクライアントサイドで処理してください",
      instructions: {
        step1: "@imgly/background-removal パッケージをインポート",
        step2: "removeBackground() 関数を呼び出し",
        step3: "結果のBlobを使用",
      },
      config: {
        quality: body.quality || "medium",
        outputFormat: body.outputFormat || "png",
      },
      estimatedTimeMs: estimateTime(body.quality || "medium"),
    });
  } catch (error) {
    console.error("[remove-bg API] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "リクエストの処理に失敗しました",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function estimateTime(quality: "low" | "medium" | "high"): number {
  // 平均的な画像サイズ（1MP）での推定時間
  const times = {
    low: 1500,
    medium: 3000,
    high: 6000,
  };
  return times[quality];
}
