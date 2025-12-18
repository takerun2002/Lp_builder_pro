/**
 * 原稿分割API
 * AIを使って原稿をセクションごとに分割
 */

import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, getDefaultGeminiTextModelId } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SPLIT_PROMPT = `あなたはLP（ランディングページ）の原稿を構造化するエキスパートです。

以下の原稿をLPのセクションごとに分割してください。

【分割の基準】
1. ファーストビュー（ヘッドライン + サブヘッド）
2. 問題提起（悩み・課題の共感）
3. 解決策の提示（商品・サービスの紹介）
4. ベネフィット（得られる利点）
5. 証拠・実績（お客様の声、数字）
6. オファー（価格、特典）
7. CTA（行動喚起）
8. FAQ（よくある質問）
9. 追伸・最後の一押し

【出力形式】
JSON形式で出力してください：
{
  "parts": [
    {
      "sectionType": "firstview",
      "title": "セクション名",
      "content": "このセクションの原稿テキスト"
    },
    ...
  ]
}

【原稿】
`;

export async function POST(request: NextRequest) {
  try {
    const { manuscript, sectionCount } = await request.json();

    if (!manuscript) {
      return NextResponse.json(
        { ok: false, error: "manuscript is required" },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();
    const model = getDefaultGeminiTextModelId();

    const prompt = SPLIT_PROMPT + manuscript + (sectionCount ? `\n\n【目標セクション数】${sectionCount}セクション程度` : "");

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = response.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*"parts"[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: simple split by paragraphs
      const parts = manuscript
        .split(/\n\n+/)
        .filter((p: string) => p.trim())
        .map((content: string, index: number) => ({
          sectionType: index === 0 ? "firstview" : "content",
          title: `セクション ${index + 1}`,
          content: content.trim(),
        }));

      return NextResponse.json({ ok: true, parts });
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ ok: true, parts: result.parts });
  } catch (err) {
    console.error("[split-manuscript] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
