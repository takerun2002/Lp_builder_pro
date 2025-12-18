import { NextRequest, NextResponse } from "next/server";
import { runResearch } from "@/lib/research/orchestrator";
import type { ResearchContext } from "@/lib/research/types";

export const maxDuration = 120; // 2分タイムアウト

/**
 * リサーチエージェントメインエンドポイント
 * 
 * POST /api/research
 * Body: { context: ResearchContext }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const context: ResearchContext = body.context;

    if (!context) {
      return NextResponse.json(
        { ok: false, error: "context is required" },
        { status: 400 }
      );
    }

    console.log("[research] Starting research for:", context.genre, context.subGenre);

    // オーケストレーターを使用してリサーチを実行
    const result = await runResearch(context, {
      includeInfotop: context.searchConfig.sources.includes("infotop"),
      includeCompetitor: context.searchConfig.sources.includes("competitor"),
      includeDeepResearch: true,
    });

    console.log(`[research] Completed in ${result.elapsedMs}ms`);

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[research] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


