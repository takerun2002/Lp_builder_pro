/**
 * コンセプト生成 API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateConcepts,
  improveConcept,
} from "@/lib/research/concept-generator";
import type {
  ConceptGeneratorInput,
  ConceptCandidate,
} from "@/lib/research/concept-generator";
import type { CompetitorAnalysis } from "@/lib/research/analyzers/concept-extractor";
import type { ClassifiedPainPoint } from "@/lib/research/analyzers/pain-classifier";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, options, mode, concept, feedback } = body as {
      input?: ConceptGeneratorInput;
      options?: {
        count?: number;
        minScore?: number;
        style?: "direct" | "story" | "question" | "provocative";
      };
      mode?: "generate" | "improve";
      concept?: ConceptCandidate;
      feedback?: string;
    };

    // 改善モード
    if (mode === "improve") {
      if (!concept || !feedback || !input) {
        return NextResponse.json(
          { error: "concept, feedback, inputが必要です" },
          { status: 400 }
        );
      }

      const improved = await improveConcept(concept, feedback, input);

      return NextResponse.json({
        success: true,
        concept: improved,
      });
    }

    // 生成モード（デフォルト）
    if (!input) {
      return NextResponse.json(
        { error: "inputが必要です" },
        { status: 400 }
      );
    }

    // 入力の検証
    if (!input.competitors || input.competitors.length === 0) {
      return NextResponse.json(
        { error: "競合分析データが必要です" },
        { status: 400 }
      );
    }

    if (!input.painPoints || input.painPoints.length === 0) {
      return NextResponse.json(
        { error: "ペインポイントデータが必要です" },
        { status: 400 }
      );
    }

    // コンセプト生成
    const result = await generateConcepts(input, {
      count: options?.count || 5,
      style: options?.style,
    });

    return NextResponse.json({
      success: true,
      concepts: result.concepts,
      insights: result.insights,
      keywordSuggestions: result.keywordSuggestions,
      // ストーリー型情報
      recommendedStoryType: result.recommendedStoryType,
      storyTypeLabel: result.storyTypeLabel,
      storyTypeDescription: result.storyTypeDescription,
    });
  } catch (error) {
    console.error("[concept] API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "コンセプト生成に失敗しました",
      },
      { status: 500 }
    );
  }
}

// クイックコンセプト生成（簡易版）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pain = searchParams.get("pain");
    const benefit = searchParams.get("benefit");
    const genre = searchParams.get("genre");

    if (!pain || !benefit) {
      return NextResponse.json(
        { error: "pain, benefitパラメータが必要です" },
        { status: 400 }
      );
    }

    // 最小限の入力データを作成
    const mockInput: ConceptGeneratorInput = {
      competitors: [
        {
          url: "",
          concept: `${benefit}を実現する方法`,
          targetPain: pain,
          benefit: benefit,
          sections: [],
          powerWords: [],
          ctaTexts: [],
          urgencyTactics: [],
          trustElements: [],
          emotionalTriggers: [],
          uniqueSellingPoints: [],
        } as CompetitorAnalysis,
      ],
      painPoints: [
        {
          original: pain,
          summary: pain,
          depth: 4,
          urgency: 4,
          quadrant: "priority",
          keywords: pain.split(/[\s、,。]/).filter((w) => w.length >= 2),
          emotionalIntensity: "high",
          willingness_to_pay: "high",
          frequency: 1,
        } as ClassifiedPainPoint,
      ],
      keywords: {
        amazon: [],
        youtube: [],
        infotop: [],
        general: [],
      },
      target: {
        age: "30-40代",
        gender: "both",
        situation: pain,
      },
      genre: genre || "other",
    };

    const result = await generateConcepts(mockInput, {
      count: 3,
    });

    return NextResponse.json({
      success: true,
      concepts: result.concepts,
    });
  } catch (error) {
    console.error("[concept] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
