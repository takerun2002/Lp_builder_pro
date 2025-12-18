/**
 * デザインプロンプト生成API
 * Phase 3.5: YouTubeサムネイル心理学フレームワーク対応
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateDesignPrompt,
  generateYouTubeThumbnailPrompt,
  type DesignPromptRequest,
  type YouTubeThumbnailRequest,
} from "@/lib/knowledge/design-prompt-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // YouTubeサムネイル心理最適化モード
    if (body.mode === "youtube_psychology") {
      const {
        videoTitle,
        targetPersona,
        survivalTrigger,
        catchCopy,
        predictionErrorElement,
        survivalElement,
        personalizationElement,
        scores,
      } = body as YouTubeThumbnailRequest & { mode: string };

      if (!videoTitle) {
        return NextResponse.json(
          { error: "動画タイトルが必要です" },
          { status: 400 }
        );
      }

      console.log("[api/design-prompt/generate] YouTube psychology mode:", {
        videoTitle: videoTitle.slice(0, 30),
        targetPersona,
        survivalTrigger,
        scores,
      });

      const result = generateYouTubeThumbnailPrompt({
        videoTitle,
        targetPersona: targetPersona || "general",
        survivalTrigger: survivalTrigger || "reward",
        catchCopy,
        predictionErrorElement,
        survivalElement,
        personalizationElement,
        scores: scores || {
          prediction_error: 2,
          survival_circuit: 2,
          self_relevance: 2,
        },
      });

      console.log("[api/design-prompt/generate] YouTube thumbnail generated:", {
        totalScore: result.scores.total,
        rating: result.scores.rating,
        promptLength: result.prompt.length,
      });

      return NextResponse.json({
        ok: true,
        mode: "youtube_psychology",
        result: {
          prompt: result.prompt,
          scores: result.scores,
          suggestions: result.suggestions,
          colorPalette: result.colorPalette,
          aspectRatio: "16:9",
          resolution: "1280x720",
          suggestedTool: "gemini",
        },
      });
    }

    // 通常モード
    const { category, templateId, variables, lpSection } =
      body as DesignPromptRequest;

    if (!category || !templateId) {
      return NextResponse.json(
        { error: "カテゴリとテンプレートIDが必要です" },
        { status: 400 }
      );
    }

    console.log("[api/design-prompt/generate] Generating prompt:", {
      category,
      templateId,
      variableCount: Object.keys(variables || {}).length,
      lpSection,
    });

    const result = generateDesignPrompt({
      category,
      templateId,
      variables: variables || {},
      lpSection,
    });

    console.log("[api/design-prompt/generate] Generated successfully:", {
      templateName: result.templateName,
      promptLength: result.prompt.length,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[api/design-prompt/generate] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "プロンプトの生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
