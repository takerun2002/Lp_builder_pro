/**
 * Hybrid Knowledge Stats API
 * CAG+RAGのコスト削減効果を取得
 */

import { NextResponse } from "next/server";
import { getHybridStats } from "@/lib/ai/hybrid-knowledge";

export async function GET() {
  try {
    const stats = getHybridStats();

    return NextResponse.json({
      success: true,
      stats: {
        totalQueries: stats.totalQueries,
        cacheHits: stats.cacheHits,
        cacheHitRate: stats.cacheHitRate,
        totalTokensSaved: stats.totalTokensSaved,
        estimatedCostSaved: stats.estimatedCostSaved,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/hybrid-stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get stats",
      },
      { status: 500 }
    );
  }
}
