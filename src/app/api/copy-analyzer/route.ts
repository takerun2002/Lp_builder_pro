/**
 * Copy Analyzer API
 * コピー診断APIエンドポイント
 */

import { NextRequest, NextResponse } from "next/server";
import {
  analyzeCopy,
  quickAnalyze,
  analyzeHeadline,
  analyzeCTA,
} from "@/lib/copywriting/copy-analyzer";
import { DIAGNOSIS_CATEGORIES, GRADE_DESCRIPTIONS } from "@/lib/copywriting/frameworks";

// =============================================================================
// GET: API情報・フレームワーク取得
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // フレームワーク情報を取得
  if (action === "frameworks") {
    return NextResponse.json({
      ok: true,
      categories: DIAGNOSIS_CATEGORIES.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        lessons: cat.lessons,
        checkpoints: cat.checkpoints.length,
        maxScore: cat.maxScore,
      })),
      gradeDescriptions: GRADE_DESCRIPTIONS,
    });
  }

  // API情報
  return NextResponse.json({
    name: "Copy Analyzer API",
    version: "1.0.0",
    description: "ファン化哲学（21レッスン）に基づくコピー診断API",
    endpoints: {
      "GET /api/copy-analyzer": "API情報",
      "GET /api/copy-analyzer?action=frameworks": "診断フレームワーク取得",
      "POST /api/copy-analyzer": "コピー診断（メイン）",
      "POST /api/copy-analyzer?action=quick": "簡易診断（AIなし）",
      "POST /api/copy-analyzer?action=headline": "ヘッドライン診断",
      "POST /api/copy-analyzer?action=cta": "CTA診断",
    },
    categories: DIAGNOSIS_CATEGORIES.map((cat) => cat.name),
  });
}

// =============================================================================
// POST: 診断実行
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const body = await request.json();

    // 簡易診断（AIなし）
    if (action === "quick") {
      const { text } = body;
      if (!text || typeof text !== "string") {
        return NextResponse.json(
          { ok: false, error: "textが必要です" },
          { status: 400 }
        );
      }

      const result = quickAnalyze(text);
      return NextResponse.json({ ok: true, result });
    }

    // ヘッドライン診断
    if (action === "headline") {
      const { headline } = body;
      if (!headline || typeof headline !== "string") {
        return NextResponse.json(
          { ok: false, error: "headlineが必要です" },
          { status: 400 }
        );
      }

      const result = await analyzeHeadline(headline);
      return NextResponse.json({ ok: true, result });
    }

    // CTA診断
    if (action === "cta") {
      const { ctaText } = body;
      if (!ctaText || typeof ctaText !== "string") {
        return NextResponse.json(
          { ok: false, error: "ctaTextが必要です" },
          { status: 400 }
        );
      }

      const result = await analyzeCTA(ctaText);
      return NextResponse.json({ ok: true, result });
    }

    // メイン診断
    const { text, useAI = true, type, productName } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { ok: false, error: "textが必要です" },
        { status: 400 }
      );
    }

    if (text.length < 50) {
      return NextResponse.json(
        { ok: false, error: "テキストが短すぎます（最低50文字）" },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { ok: false, error: "テキストが長すぎます（最大50,000文字）" },
        { status: 400 }
      );
    }

    const result = await analyzeCopy(
      { text, type, productName },
      { useAI }
    );

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[copy-analyzer API] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "診断に失敗しました",
      },
      { status: 500 }
    );
  }
}
