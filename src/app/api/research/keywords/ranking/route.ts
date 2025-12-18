/**
 * キーワードランキング API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  rankKeywords,
  type KeywordSource,
  type KeywordRankingOptions,
} from "@/lib/research/analyzers/keyword-ranker";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sources, options } = body as {
      sources: KeywordSource[];
      options?: KeywordRankingOptions;
    };

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: "キーワードソースが必要です" },
        { status: 400 }
      );
    }

    const result = await rankKeywords(sources, options);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[keywords/ranking] API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "キーワードランキングに失敗しました",
      },
      { status: 500 }
    );
  }
}
