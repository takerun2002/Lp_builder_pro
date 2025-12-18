/**
 * スワイプファイル収集API
 *
 * POST: LPデザインを検索・収集
 * GET: 収集済みのスワイプファイルを取得
 */

import { NextRequest, NextResponse } from "next/server";
import {
  collectSwipeFiles,
  analyzeSwipeFile,
  type SwipeFileSearchParams,
  type SwipeCategory,
  type SwipeColor,
  CATEGORY_LABELS,
  COLOR_LABELS,
} from "@/lib/agents/swipe-file-agent";

export const dynamic = "force-dynamic";

// ============================================================
// POST: スワイプファイル検索・収集
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const params: SwipeFileSearchParams = {
      category: body.category as SwipeCategory | undefined,
      colorScheme: body.colors as SwipeColor[] | undefined,
      keywords: body.keywords,
      limit: body.limit || 20,
      analyzeStyle: body.analyzeStyle ?? false,
      outputFormat: body.outputFormat || "gallery",
    };

    console.log("[swipe-collector] Starting search with params:", params);

    const result = await collectSwipeFiles(params, (message, progress) => {
      console.log(`[swipe-collector] Progress: ${progress}% - ${message}`);
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[swipe-collector] Error:", error);
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
// GET: カテゴリ・色オプションを取得
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // オプション一覧を取得
  if (action === "options") {
    return NextResponse.json({
      success: true,
      data: {
        categories: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        colors: Object.entries(COLOR_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
    });
  }

  // 単一アイテムの詳細分析
  if (action === "analyze") {
    const itemJson = searchParams.get("item");
    if (!itemJson) {
      return NextResponse.json(
        { success: false, error: "item parameter required" },
        { status: 400 }
      );
    }

    try {
      const item = JSON.parse(itemJson);
      const analyzed = await analyzeSwipeFile(item);
      return NextResponse.json({
        success: true,
        data: analyzed,
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid item JSON" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: "Swipe File Collector API",
    endpoints: {
      "POST /": "Search and collect swipe files",
      "GET /?action=options": "Get category and color options",
      "GET /?action=analyze&item={}": "Analyze a single swipe file",
    },
  });
}
