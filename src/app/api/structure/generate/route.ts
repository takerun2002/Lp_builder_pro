/**
 * AI構成自動生成 API
 *
 * Gemini 3 Flashを使用してLP構成を自動生成
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { SectionPlan, GlobalDesignRules, SectionType, ContentElement } from "@/lib/structure/types";
import { DEFAULT_GLOBAL_RULES, SECTION_TYPE_LABELS } from "@/lib/structure/types";

const ai = new GoogleGenAI({});

interface GenerateStructureRequest {
  // 入力情報
  productName: string;
  productDescription: string;
  targetAudience: string;
  industry?: string;
  tone?: string;

  // オプション
  sectionCount?: number;
  includeTestimonials?: boolean;
  includeFaq?: boolean;
  includePrice?: boolean;
}

interface GenerateStructureResponse {
  sections: SectionPlan[];
  globalRules: GlobalDesignRules;
  suggestions: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateStructureRequest = await request.json();

    const {
      productName,
      productDescription,
      targetAudience,
      industry = "一般",
      tone = "プロフェッショナル",
      sectionCount = 6,
      includeTestimonials = true,
      includeFaq = true,
      includePrice = true,
    } = body;

    // プロンプト構築
    const prompt = buildPrompt({
      productName,
      productDescription,
      targetAudience,
      industry,
      tone,
      sectionCount,
      includeTestimonials,
      includeFaq,
      includePrice,
    });

    // Gemini 3 Flash で生成
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";

    // JSONパース
    let parsed: {
      sections: Array<{
        type: string;
        name: string;
        purpose: string;
        elements: Array<{
          type: string;
          content: string;
          style?: string;
        }>;
      }>;
      colorScheme?: string;
      mood?: string;
      suggestions?: string[];
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      // JSONパースに失敗した場合はデフォルト構成を返す
      return NextResponse.json({
        sections: getDefaultSections(),
        globalRules: DEFAULT_GLOBAL_RULES,
        suggestions: ["AIによる生成に失敗しました。デフォルト構成を使用しています。"],
      });
    }

    // セクションを変換
    const sections: SectionPlan[] = parsed.sections.map((s, index) => ({
      id: `section-${Date.now()}-${index}`,
      type: (s.type as SectionType) || "custom",
      name: s.name || SECTION_TYPE_LABELS[s.type as SectionType] || "セクション",
      order: index,
      purpose: s.purpose || "",
      elements: s.elements.map((e, eIndex) => ({
        id: `element-${Date.now()}-${index}-${eIndex}`,
        type: e.type as ContentElement["type"],
        content: e.content,
        style: e.style ? { emphasis: [e.style] } : undefined,
      })),
      estimatedHeight: "medium" as const,
      isRequired: index === 0,
    }));

    // グローバルルール
    const globalRules: GlobalDesignRules = {
      ...DEFAULT_GLOBAL_RULES,
      overallMood: parsed.mood || tone,
      colorScheme: {
        ...DEFAULT_GLOBAL_RULES.colorScheme,
        type: mapColorScheme(parsed.colorScheme),
      },
    };

    const result: GenerateStructureResponse = {
      sections,
      globalRules,
      suggestions: parsed.suggestions || [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[structure/generate] Error:", error);
    return NextResponse.json(
      { error: "構成の生成に失敗しました" },
      { status: 500 }
    );
  }
}

function buildPrompt(params: GenerateStructureRequest): string {
  const sectionTypes = [
    "firstview - ファーストビュー",
    "problem - 悩み・課題",
    "solution - 解決策",
    "benefit - ベネフィット",
    "proof - 実績・信頼",
    "testimonial - お客様の声",
    "faq - よくある質問",
    "price - 価格",
    "cta - CTA",
  ];

  return `
あなたはLP（ランディングページ）の構成設計の専門家です。
以下の情報をもとに、効果的なLP構成をJSON形式で提案してください。

## 商品・サービス情報
- 商品名: ${params.productName}
- 説明: ${params.productDescription}
- ターゲット: ${params.targetAudience}
- 業界: ${params.industry}
- トーン: ${params.tone}

## 要件
- セクション数: 約${params.sectionCount}個
- お客様の声: ${params.includeTestimonials ? "含める" : "含めない"}
- FAQ: ${params.includeFaq ? "含める" : "含めない"}
- 価格: ${params.includePrice ? "含める" : "含めない"}

## 使用可能なセクションタイプ
${sectionTypes.map((t) => `- ${t}`).join("\n")}

## 使用可能な要素タイプ
- headline: 見出し
- subheadline: サブ見出し
- body: 本文
- image: 画像
- cta: CTAボタン
- badge: バッジ
- list: リスト
- testimonial: お客様の声
- number: 数字・実績

## 出力形式（JSON）
{
  "sections": [
    {
      "type": "セクションタイプ",
      "name": "セクション名",
      "purpose": "このセクションの目的",
      "elements": [
        {
          "type": "要素タイプ",
          "content": "コンテンツ内容",
          "style": "スタイル指示（オプション）"
        }
      ]
    }
  ],
  "colorScheme": "luxury|natural|corporate|warm|cool|vibrant|minimal",
  "mood": "全体の雰囲気",
  "suggestions": ["改善提案1", "改善提案2"]
}

効果的なLPになるよう、PASONAの法則やAIDMAなどのフレームワークを意識して構成してください。
`;
}

type ColorScheme = "luxury" | "natural" | "corporate" | "warm" | "cool" | "vibrant" | "minimal";

function mapColorScheme(scheme?: string): ColorScheme {
  const validSchemes: ColorScheme[] = ["luxury", "natural", "corporate", "warm", "cool", "vibrant", "minimal"];
  if (scheme && validSchemes.includes(scheme as ColorScheme)) {
    return scheme as ColorScheme;
  }
  return "minimal";
}

function getDefaultSections(): SectionPlan[] {
  return [
    {
      id: `section-${Date.now()}-0`,
      type: "firstview",
      name: "ファーストビュー",
      order: 0,
      purpose: "訪問者の注目を引き、価値提案を伝える",
      elements: [
        { id: `el-${Date.now()}-0-0`, type: "headline", content: "メインキャッチコピー" },
        { id: `el-${Date.now()}-0-1`, type: "subheadline", content: "サブキャッチコピー" },
        { id: `el-${Date.now()}-0-2`, type: "image", content: "メインビジュアル" },
        { id: `el-${Date.now()}-0-3`, type: "cta", content: "今すぐ申し込む" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: `section-${Date.now()}-1`,
      type: "problem",
      name: "悩み・課題",
      order: 1,
      purpose: "ターゲットの悩みに共感する",
      elements: [
        { id: `el-${Date.now()}-1-0`, type: "headline", content: "こんなお悩みありませんか？" },
        { id: `el-${Date.now()}-1-1`, type: "list", content: "悩みリスト" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: `section-${Date.now()}-2`,
      type: "solution",
      name: "解決策",
      order: 2,
      purpose: "商品・サービスによる解決を提示",
      elements: [
        { id: `el-${Date.now()}-2-0`, type: "headline", content: "そんなあなたに" },
        { id: `el-${Date.now()}-2-1`, type: "body", content: "解決策の説明" },
        { id: `el-${Date.now()}-2-2`, type: "image", content: "商品画像" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: `section-${Date.now()}-3`,
      type: "benefit",
      name: "ベネフィット",
      order: 3,
      purpose: "得られるメリットを明確に",
      elements: [
        { id: `el-${Date.now()}-3-0`, type: "headline", content: "選ばれる3つの理由" },
        { id: `el-${Date.now()}-3-1`, type: "list", content: "ベネフィットリスト" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: `section-${Date.now()}-4`,
      type: "cta",
      name: "CTA",
      order: 4,
      purpose: "行動を促す",
      elements: [
        { id: `el-${Date.now()}-4-0`, type: "headline", content: "今すぐお申し込みください" },
        { id: `el-${Date.now()}-4-1`, type: "cta", content: "無料で始める" },
      ],
      estimatedHeight: "short",
      isRequired: true,
    },
  ];
}
