/**
 * コンセプト抽出アナライザー
 *
 * 競合LPのセールスレターを分析し、コンセプト・キーワードを抽出
 * Task 1.2: 競合セールスレター分析
 */

import { generateText } from "@/lib/ai/gemini";

// ============================================================
// 型定義
// ============================================================

export interface CompetitorAnalysis {
  url: string;
  concept: string;
  targetPain: string;
  benefit: string;
  sections: string[];
  powerWords: string[];
  ctaTexts: string[];
  pricePoint?: number;
  testimonialCount?: number;
  guaranteeType?: string;
  urgencyTactics: string[];
  trustElements: string[];
  emotionalTriggers: string[];
  uniqueSellingPoints: string[];
  thumbnailUrl?: string;  // OGP画像URL
}

export interface ConceptExtractionOptions {
  genre?: string;
  targetGender?: string;
  includeDesignAnalysis?: boolean;
  maxContentLength?: number;
}

export interface BulkConceptResult {
  analyses: CompetitorAnalysis[];
  commonPatterns: {
    concepts: string[];
    painPoints: string[];
    benefits: string[];
    powerWords: string[];
    ctaPatterns: string[];
  };
  recommendations: string[];
}

// ============================================================
// メイン関数
// ============================================================

/**
 * 競合LPからコンセプトを抽出
 */
export async function extractConcept(
  url: string,
  markdown: string,
  options?: ConceptExtractionOptions
): Promise<CompetitorAnalysis> {
  const maxLength = options?.maxContentLength || 10000;
  const truncatedContent = markdown.slice(0, maxLength);

  const prompt = buildExtractionPrompt(truncatedContent, options);

  try {
    const response = await generateText(prompt, {
      model: "pro25",
      thinkingLevel: "high",
    });

    const analysis = parseResponse(response, url);
    return analysis;
  } catch (error) {
    console.error("[concept-extractor] Error:", error);
    return getEmptyAnalysis(url);
  }
}

/**
 * 複数の競合LPを一括分析
 */
export async function extractConceptsBulk(
  competitors: Array<{ url: string; markdown: string }>,
  options?: ConceptExtractionOptions
): Promise<BulkConceptResult> {
  const analyses: CompetitorAnalysis[] = [];

  for (const comp of competitors) {
    const analysis = await extractConcept(comp.url, comp.markdown, options);
    analyses.push(analysis);

    // レート制限対策
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const commonPatterns = extractCommonPatterns(analyses);
  const recommendations = generateRecommendations(analyses, commonPatterns);

  return {
    analyses,
    commonPatterns,
    recommendations,
  };
}

/**
 * セールスレターの強度を評価
 */
export async function evaluateSalesLetterStrength(
  markdown: string,
  options?: { genre?: string }
): Promise<{
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}> {
  const genreContext = options?.genre ? `\n\n## ジャンル\n${options.genre}` : "";

  const prompt = `あなたはセールスレターの専門家です。
以下のセールスレターを評価し、強度スコア（0-100）と改善点を提示してください。

## セールスレター
${markdown.slice(0, 8000)}${genreContext}

## 評価基準
1. ヘッドラインの引き: 読者の注意を引くか（0-20点）
2. 問題共感: ターゲットの痛みを的確に言語化しているか（0-20点）
3. ベネフィット訴求: 得られる結果が明確か（0-20点）
4. 信頼性: 証拠・実績・保証があるか（0-20点）
5. 行動喚起: CTAが明確で緊急性があるか（0-20点）

## 出力形式（JSON）
\`\`\`json
{
  "score": 総合スコア,
  "breakdown": {
    "headline": スコア,
    "problem": スコア,
    "benefit": スコア,
    "trust": スコア,
    "cta": スコア
  },
  "strengths": ["強み1", "強み2"],
  "weaknesses": ["弱み1", "弱み2"],
  "suggestions": ["改善提案1", "改善提案2"]
}
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        score: parsed.score || 50,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        suggestions: parsed.suggestions || [],
      };
    }
  } catch (error) {
    console.error("[concept-extractor] Evaluation error:", error);
  }

  return {
    score: 50,
    strengths: [],
    weaknesses: [],
    suggestions: ["分析に失敗しました。再試行してください。"],
  };
}

// ============================================================
// プロンプト構築
// ============================================================

function buildExtractionPrompt(
  content: string,
  options?: ConceptExtractionOptions
): string {
  const genreContext = options?.genre
    ? `ジャンル: ${options.genre}`
    : "";
  const genderContext = options?.targetGender
    ? `ターゲット性別: ${options.targetGender}`
    : "";

  return `あなたはセールスレター分析の専門家です。
以下のセールスレター（LP）を分析し、コンセプトとキーワードを抽出してください。

## セールスレター内容
${content}

## コンテキスト
${genreContext}
${genderContext}

## 抽出項目
1. **メインコンセプト**: ヘッドコピー（読者の注意を引く主要メッセージ）
2. **ターゲットの痛み**: 誰のどんな悩みに訴えているか
3. **提示ベネフィット**: 得られる結果・変化
4. **セクション構成**: LPの流れ（例: ヒーロー→問題→解決→証拠→CTA）
5. **パワーワード**: 感情を動かす強力な言葉
6. **CTA文言**: 行動喚起ボタンの文言
7. **価格**: 記載があれば金額
8. **お客様の声数**: 掲載されている証言数
9. **保証タイプ**: 返金保証、効果保証など
10. **緊急性戦術**: 限定、期間限定など
11. **信頼要素**: 実績数、メディア掲載、資格など
12. **感情トリガー**: 使われている心理トリガー
13. **USP**: 独自の強み（他社にない特徴）

## 出力形式（JSON）
\`\`\`json
{
  "concept": "メインコンセプト（ヘッドコピー）",
  "targetPain": "ターゲットの痛み",
  "benefit": "提示ベネフィット",
  "sections": ["セクション1", "セクション2"],
  "powerWords": ["パワーワード1", "パワーワード2"],
  "ctaTexts": ["CTA1", "CTA2"],
  "pricePoint": 価格（数値、不明ならnull）,
  "testimonialCount": お客様の声の数（数値、不明ならnull）,
  "guaranteeType": "保証タイプ（不明ならnull）",
  "urgencyTactics": ["緊急性戦術1", "緊急性戦術2"],
  "trustElements": ["信頼要素1", "信頼要素2"],
  "emotionalTriggers": ["感情トリガー1", "感情トリガー2"],
  "uniqueSellingPoints": ["USP1", "USP2"]
}
\`\`\`

内容が不明な場合は空配列または null を返してください。`;
}

// ============================================================
// レスポンス解析
// ============================================================

function parseResponse(response: string, url: string): CompetitorAnalysis {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // JSONブロックがない場合、直接パースを試行
      const directMatch = response.match(/\{[\s\S]*\}/);
      if (directMatch) {
        const parsed = JSON.parse(directMatch[0]);
        return normalizeAnalysis(parsed, url);
      }
      return getEmptyAnalysis(url);
    }

    const parsed = JSON.parse(jsonMatch[1]);
    return normalizeAnalysis(parsed, url);
  } catch (error) {
    console.error("[concept-extractor] Parse error:", error);
    return getEmptyAnalysis(url);
  }
}

function normalizeAnalysis(
  parsed: Partial<CompetitorAnalysis>,
  url: string
): CompetitorAnalysis {
  return {
    url,
    concept: parsed.concept || "",
    targetPain: parsed.targetPain || "",
    benefit: parsed.benefit || "",
    sections: parsed.sections || [],
    powerWords: parsed.powerWords || [],
    ctaTexts: parsed.ctaTexts || [],
    pricePoint: parsed.pricePoint ?? undefined,
    testimonialCount: parsed.testimonialCount ?? undefined,
    guaranteeType: parsed.guaranteeType ?? undefined,
    urgencyTactics: parsed.urgencyTactics || [],
    trustElements: parsed.trustElements || [],
    emotionalTriggers: parsed.emotionalTriggers || [],
    uniqueSellingPoints: parsed.uniqueSellingPoints || [],
  };
}

function getEmptyAnalysis(url: string): CompetitorAnalysis {
  return {
    url,
    concept: "",
    targetPain: "",
    benefit: "",
    sections: [],
    powerWords: [],
    ctaTexts: [],
    urgencyTactics: [],
    trustElements: [],
    emotionalTriggers: [],
    uniqueSellingPoints: [],
  };
}

// ============================================================
// パターン抽出
// ============================================================

function extractCommonPatterns(analyses: CompetitorAnalysis[]): {
  concepts: string[];
  painPoints: string[];
  benefits: string[];
  powerWords: string[];
  ctaPatterns: string[];
} {
  const allConcepts = analyses.map((a) => a.concept).filter(Boolean);
  const allPains = analyses.map((a) => a.targetPain).filter(Boolean);
  const allBenefits = analyses.map((a) => a.benefit).filter(Boolean);
  const allPowerWords = analyses.flatMap((a) => a.powerWords);
  const allCTAs = analyses.flatMap((a) => a.ctaTexts);

  return {
    concepts: Array.from(new Set(allConcepts)),
    painPoints: Array.from(new Set(allPains)),
    benefits: Array.from(new Set(allBenefits)),
    powerWords: getTopOccurrences(allPowerWords, 10),
    ctaPatterns: getTopOccurrences(allCTAs, 5),
  };
}

function getTopOccurrences(items: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const normalized = item.toLowerCase().trim();
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item);
}

// ============================================================
// レコメンデーション生成
// ============================================================

function generateRecommendations(
  analyses: CompetitorAnalysis[],
  patterns: ReturnType<typeof extractCommonPatterns>
): string[] {
  const recommendations: string[] = [];

  // コンセプトパターン分析
  if (patterns.concepts.length > 0) {
    recommendations.push(
      `競合の多くが「${patterns.concepts[0]}」のようなコンセプトを使用。差別化のためには異なる切り口を検討。`
    );
  }

  // パワーワード分析
  if (patterns.powerWords.length > 0) {
    recommendations.push(
      `よく使われるパワーワード: ${patterns.powerWords.slice(0, 5).join("、")}。これらを参考にしつつオリジナル表現も検討。`
    );
  }

  // CTA分析
  if (patterns.ctaPatterns.length > 0) {
    recommendations.push(
      `効果的なCTAパターン: ${patterns.ctaPatterns.slice(0, 3).join("、")}。緊急性や限定感を加えると効果UP。`
    );
  }

  // 保証分析
  const withGuarantee = analyses.filter((a) => a.guaranteeType);
  if (withGuarantee.length > analyses.length / 2) {
    recommendations.push(
      `競合の多くが保証を提供。リスクリバーサル（返金保証など）の導入を推奨。`
    );
  }

  // 証言分析
  const testimonialCounts = analyses
    .map((a) => a.testimonialCount)
    .filter((c) => c !== undefined) as number[];
  if (testimonialCounts.length > 0) {
    const avgTestimonials = Math.round(
      testimonialCounts.reduce((a, b) => a + b, 0) / testimonialCounts.length
    );
    recommendations.push(
      `競合平均${avgTestimonials}件のお客様の声を掲載。社会的証明として同等以上の掲載を推奨。`
    );
  }

  return recommendations;
}

// ============================================================
// エクスポート用ヘルパー
// ============================================================

/**
 * 分析結果をCSV形式でエクスポート
 */
export function exportToCSV(analyses: CompetitorAnalysis[]): string {
  const headers = [
    "URL",
    "コンセプト",
    "ターゲットの痛み",
    "ベネフィット",
    "パワーワード",
    "CTA",
    "価格",
    "お客様の声数",
    "保証",
  ];

  const rows = analyses.map((a) => [
    a.url,
    `"${a.concept.replace(/"/g, '""')}"`,
    `"${a.targetPain.replace(/"/g, '""')}"`,
    `"${a.benefit.replace(/"/g, '""')}"`,
    `"${a.powerWords.join("; ")}"`,
    `"${a.ctaTexts.join("; ")}"`,
    a.pricePoint?.toString() || "",
    a.testimonialCount?.toString() || "",
    a.guaranteeType || "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * 分析結果をスプレッドシート形式でエクスポート
 */
export function exportToSpreadsheetData(
  analyses: CompetitorAnalysis[]
): (string | number | null)[][] {
  const headers = [
    "URL",
    "コンセプト",
    "ターゲットの痛み",
    "ベネフィット",
    "パワーワード",
    "CTA",
    "価格",
    "お客様の声数",
    "保証",
    "緊急性戦術",
    "信頼要素",
    "感情トリガー",
    "USP",
  ];

  const rows = analyses.map((a) => [
    a.url,
    a.concept,
    a.targetPain,
    a.benefit,
    a.powerWords.join("; "),
    a.ctaTexts.join("; "),
    a.pricePoint ?? null,
    a.testimonialCount ?? null,
    a.guaranteeType ?? null,
    a.urgencyTactics.join("; "),
    a.trustElements.join("; "),
    a.emotionalTriggers.join("; "),
    a.uniqueSellingPoints.join("; "),
  ]);

  return [headers, ...rows];
}
