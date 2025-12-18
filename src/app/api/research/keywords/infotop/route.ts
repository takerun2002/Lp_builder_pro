/**
 * Infotopキーワード収集 API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  scrapeInfotopRanking,
  scrapeInfotopRankingWithAnalysis,
} from "@/lib/research/scrapers/infotop";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { genre, limit, withAnalysis } = body as {
      genre?: string;
      limit?: number;
      withAnalysis?: boolean;
    };

    if (withAnalysis) {
      // AI分析付き
      const result = await scrapeInfotopRankingWithAnalysis({
        genre,
        limit: limit || 30,
        useAI: true,
      });

      return NextResponse.json({
        success: true,
        products: result.products,
        priceInsights: result.priceInsights,
        conceptPatterns: result.conceptPatterns,
      });
    } else {
      // ランキングのみ
      const products = await scrapeInfotopRanking({
        genre,
        limit: limit || 30,
      });

      return NextResponse.json({
        success: true,
        products,
        count: products.length,
      });
    }
  } catch (error) {
    console.error("[keywords/infotop] API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Infotop検索に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre");
    const limit = searchParams.get("limit");

    const products = await scrapeInfotopRanking({
      genre: genre || undefined,
      limit: limit ? parseInt(limit, 10) : 10,
    });

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("[keywords/infotop] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
