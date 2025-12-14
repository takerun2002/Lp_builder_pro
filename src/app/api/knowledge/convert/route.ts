/**
 * ナレッジ変換API
 * テキスト/URLからナレッジを構造化しYAML形式に変換
 */

import { NextRequest, NextResponse } from "next/server";
import {
  convertToKnowledge,
  type KnowledgeInput,
  type ConversionOptions,
} from "@/lib/knowledge/converter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, options } = body as {
      input: KnowledgeInput;
      options?: ConversionOptions;
    };

    if (!input || !input.content) {
      return NextResponse.json(
        { error: "入力コンテンツが必要です" },
        { status: 400 }
      );
    }

    console.log("[api/knowledge/convert] Starting conversion:", {
      type: input.type,
      contentLength: input.content.length,
      options,
    });

    const result = await convertToKnowledge(input, options);

    console.log("[api/knowledge/convert] Conversion complete:", {
      sections: result.sections.length,
      powerWords: result.powerWords.length,
      keyPhrases: result.keyPhrases.length,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[api/knowledge/convert] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "変換に失敗しました",
      },
      { status: 500 }
    );
  }
}
