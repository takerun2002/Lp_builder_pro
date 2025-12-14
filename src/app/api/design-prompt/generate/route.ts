/**
 * デザインプロンプト生成API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateDesignPrompt,
  type DesignPromptRequest,
} from "@/lib/knowledge/design-prompt-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
