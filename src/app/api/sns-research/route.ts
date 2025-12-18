/**
 * SNSリサーチAPI
 *
 * POST: SNSトレンドリサーチを実行
 * GET: リサーチ状況・オプションを取得
 */

import { NextRequest, NextResponse } from "next/server";
import {
  executeSnsResearch,
  toSNSTrendResult,
  type SnsResearchParams,
} from "@/lib/research/scrapers/sns-scraper";

export const dynamic = "force-dynamic";

// ============================================================
// POST: SNSリサーチ実行
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const params: SnsResearchParams = {
      keyword: body.keyword,
      category: body.category,
      platforms: body.platforms || ["x", "instagram", "tiktok"],
      limit: body.limit || 50,
      analyzeWithAI: body.analyzeWithAI ?? true,
    };

    if (!params.keyword) {
      return NextResponse.json(
        { success: false, error: "keyword is required" },
        { status: 400 }
      );
    }

    console.log("[sns-research] Starting research with params:", params);

    const result = await executeSnsResearch(params);

    // 既存の型との互換性のためSNSTrendResultも返す
    const trendResult = toSNSTrendResult(result);

    return NextResponse.json({
      success: true,
      data: {
        full: result,
        summary: trendResult,
      },
    });
  } catch (error) {
    console.error("[sns-research] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// GET: オプション取得
// ============================================================

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      platforms: [
        { id: "x", label: "X (Twitter)", icon: "twitter" },
        { id: "instagram", label: "Instagram", icon: "instagram" },
        { id: "tiktok", label: "TikTok", icon: "tiktok" },
      ],
      defaultParams: {
        platforms: ["x", "instagram", "tiktok"],
        limit: 50,
        analyzeWithAI: true,
      },
    },
    endpoints: {
      "POST /": "Execute SNS research",
      "GET /": "Get options and default params",
    },
  });
}
