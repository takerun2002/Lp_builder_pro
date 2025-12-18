/**
 * 悩み収集・分類 API
 */

import { NextRequest, NextResponse } from "next/server";
import { classifyPainPoints } from "@/lib/research/analyzers/pain-classifier";
import type { ResearchContext } from "@/lib/research/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { painPoints, context, options } = body as {
      painPoints: string[];
      context?: ResearchContext;
      options?: {
        genre?: string;
        targetGender?: string;
      };
    };

    if (!painPoints || painPoints.length === 0) {
      return NextResponse.json(
        { error: "悩みテキストが必要です" },
        { status: 400 }
      );
    }

    // 重複を除去
    const uniquePainPoints = Array.from(new Set(painPoints));

    // 分類オプション
    const classifyOptions = {
      genre: options?.genre || context?.genre,
      targetGender: options?.targetGender || context?.target?.gender,
    };

    // 悩み分類
    const result = await classifyPainPoints(uniquePainPoints, classifyOptions);

    return NextResponse.json({
      success: true,
      classified: result.painPoints,
      quadrantSummary: result.quadrantSummary,
      insights: result.insights,
    });
  } catch (error) {
    console.error("[pain-points] API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "悩み分類に失敗しました",
      },
      { status: 500 }
    );
  }
}

// 単一の悩みを分類
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text");
    const genre = searchParams.get("genre");

    if (!text) {
      return NextResponse.json(
        { error: "textパラメータが必要です" },
        { status: 400 }
      );
    }

    const result = await classifyPainPoints([text], {
      genre: genre || undefined,
    });

    if (result.painPoints.length === 0) {
      return NextResponse.json(
        { error: "分類結果がありません" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      classified: result.painPoints[0],
    });
  } catch (error) {
    console.error("[pain-points] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "分類に失敗しました",
      },
      { status: 500 }
    );
  }
}
