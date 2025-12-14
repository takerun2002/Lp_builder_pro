/**
 * AI分析ユーティリティ
 *
 * スクレイピング結果をGemini AIで高精度に分析
 */

import { generateText } from "@/lib/ai/gemini";

// ============================================================
// 型定義
// ============================================================

export interface AdAnalysisResult {
  ads: ParsedAd[];
  insights: AdInsights;
}

export interface ParsedAd {
  id: string;
  pageName: string;
  headline?: string;
  bodyText?: string;
  ctaText?: string;
  mediaType: "image" | "video" | "carousel";
  platforms: string[];
  targetAudience?: string;
  emotionalTriggers: string[];
  copyTechniques: string[];
}

export interface AdInsights {
  commonPatterns: string[];
  topCTAs: string[];
  emotionalTriggers: string[];
  copyTechniques: string[];
  recommendedApproaches: string[];
}

export interface LPAnalysisResult {
  sections: ParsedSection[];
  headlines: string[];
  subheadlines: string[];
  ctaTexts: string[];
  keyPhrases: string[];
  copyTechniques: string[];
  emotionalTriggers: string[];
  targetPains: string[];
  benefits: string[];
  trustElements: string[];
}

export interface ParsedSection {
  type: string;
  name: string;
  content: string;
  purpose: string;
  keyElements: string[];
}

export interface CompetitorAnalysisResult {
  concept: string;
  targetPain: string;
  mainBenefit: string;
  differentiators: string[];
  copyStrengths: string[];
  designNotes: string[];
  similarityFactors: string[];
  recommendedTakeaways: string[];
}

export interface KeywordExtractionResult {
  powerWords: string[];
  benefitWords: string[];
  painWords: string[];
  urgencyWords: string[];
  trustWords: string[];
  emotionalTriggers: string[];
}

// ============================================================
// 広告分析
// ============================================================

/**
 * 広告コンテンツをAIで分析
 */
export async function analyzeAdsWithAI(
  rawContent: string,
  context?: {
    genre?: string;
    targetGender?: string;
  }
): Promise<AdAnalysisResult> {
  const prompt = `あなたはMeta広告ライブラリの分析エキスパートです。
以下のスクレイピング結果から広告情報を抽出・分析してください。

## スクレイピング結果
${rawContent.slice(0, 8000)}

## コンテキスト
${context?.genre ? `ジャンル: ${context.genre}` : ""}
${context?.targetGender ? `ターゲット性別: ${context.targetGender}` : ""}

## 出力形式（JSON）
\`\`\`json
{
  "ads": [
    {
      "id": "一意ID",
      "pageName": "広告主名",
      "headline": "ヘッドライン",
      "bodyText": "本文",
      "ctaText": "CTAボタン文言",
      "mediaType": "image|video|carousel",
      "platforms": ["facebook", "instagram"],
      "targetAudience": "推定ターゲット",
      "emotionalTriggers": ["恐怖", "希望"],
      "copyTechniques": ["数字訴求", "限定性"]
    }
  ],
  "insights": {
    "commonPatterns": ["よく見られるパターン"],
    "topCTAs": ["よく使われるCTA"],
    "emotionalTriggers": ["使われている感情トリガー"],
    "copyTechniques": ["使われているコピーテクニック"],
    "recommendedApproaches": ["推奨アプローチ"]
  }
}
\`\`\`

広告が見つからない場合は空配列を返してください。`;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        ads: (parsed.ads || []).map((ad: ParsedAd, i: number) => ({
          ...ad,
          id: ad.id || `ad-${Date.now()}-${i}`,
          mediaType: ad.mediaType || "image",
          platforms: ad.platforms || ["facebook"],
          emotionalTriggers: ad.emotionalTriggers || [],
          copyTechniques: ad.copyTechniques || [],
        })),
        insights: {
          commonPatterns: parsed.insights?.commonPatterns || [],
          topCTAs: parsed.insights?.topCTAs || [],
          emotionalTriggers: parsed.insights?.emotionalTriggers || [],
          copyTechniques: parsed.insights?.copyTechniques || [],
          recommendedApproaches: parsed.insights?.recommendedApproaches || [],
        },
      };
    }
  } catch (err) {
    console.error("[ai-analyzer] Ad analysis error:", err);
  }

  return {
    ads: [],
    insights: {
      commonPatterns: [],
      topCTAs: [],
      emotionalTriggers: [],
      copyTechniques: [],
      recommendedApproaches: [],
    },
  };
}

// ============================================================
// LP構造分析
// ============================================================

/**
 * LP/セールスページをAIで詳細分析
 */
export async function analyzeLPWithAI(
  content: string,
  context?: {
    genre?: string;
    targetGender?: string;
    url?: string;
  }
): Promise<LPAnalysisResult> {
  const prompt = `あなたはLP（ランディングページ）分析の専門家です。
以下のLPコンテンツを詳細に分析してください。

## LPコンテンツ
${content.slice(0, 10000)}

## コンテキスト
${context?.genre ? `ジャンル: ${context.genre}` : ""}
${context?.targetGender ? `ターゲット性別: ${context.targetGender}` : ""}
${context?.url ? `URL: ${context.url}` : ""}

## 分析観点
1. セクション構成（hero, problem, solution, features, testimonials, pricing, guarantee, faq, cta等）
2. ヘッドライン・サブヘッドライン
3. CTA（行動喚起）
4. キーフレーズ・パワーワード
5. コピーテクニック（数字訴求、限定性、社会的証明など）
6. 感情トリガー
7. ターゲットの悩み
8. 提示しているベネフィット
9. 信頼性要素（実績、保証、専門家監修など）

## 出力形式（JSON）
\`\`\`json
{
  "sections": [
    {
      "type": "hero|problem|solution|features|testimonials|pricing|guarantee|faq|cta|about|other",
      "name": "セクション名",
      "content": "主な内容（100文字程度）",
      "purpose": "このセクションの目的",
      "keyElements": ["含まれる重要要素"]
    }
  ],
  "headlines": ["メインヘッドライン", "サブヘッド1"],
  "subheadlines": ["サブヘッドライン"],
  "ctaTexts": ["今すぐ申し込む", "無料で試す"],
  "keyPhrases": ["キーフレーズ"],
  "copyTechniques": ["数字訴求", "限定性", "社会的証明"],
  "emotionalTriggers": ["恐怖", "希望", "好奇心"],
  "targetPains": ["ターゲットの悩み"],
  "benefits": ["提示しているベネフィット"],
  "trustElements": ["実績", "保証", "専門家監修"]
}
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        sections: (parsed.sections || []).map((s: ParsedSection) => ({
          type: s.type || "other",
          name: s.name || "",
          content: s.content || "",
          purpose: s.purpose || "",
          keyElements: s.keyElements || [],
        })),
        headlines: parsed.headlines || [],
        subheadlines: parsed.subheadlines || [],
        ctaTexts: parsed.ctaTexts || [],
        keyPhrases: parsed.keyPhrases || [],
        copyTechniques: parsed.copyTechniques || [],
        emotionalTriggers: parsed.emotionalTriggers || [],
        targetPains: parsed.targetPains || [],
        benefits: parsed.benefits || [],
        trustElements: parsed.trustElements || [],
      };
    }
  } catch (err) {
    console.error("[ai-analyzer] LP analysis error:", err);
  }

  return {
    sections: [],
    headlines: [],
    subheadlines: [],
    ctaTexts: [],
    keyPhrases: [],
    copyTechniques: [],
    emotionalTriggers: [],
    targetPains: [],
    benefits: [],
    trustElements: [],
  };
}

// ============================================================
// 競合分析
// ============================================================

/**
 * 競合LPを詳細分析
 */
export async function analyzeCompetitorWithAI(
  content: string,
  myContext: {
    genre: string;
    targetProblems?: string;
    targetDesires?: string;
  }
): Promise<CompetitorAnalysisResult> {
  const prompt = `あなたはLP競合分析の専門家です。
以下の競合LPを分析し、参考になるポイントを抽出してください。

## 競合LPコンテンツ
${content.slice(0, 8000)}

## 自社コンテキスト
- ジャンル: ${myContext.genre}
${myContext.targetProblems ? `- ターゲットの悩み: ${myContext.targetProblems}` : ""}
${myContext.targetDesires ? `- ターゲットの理想: ${myContext.targetDesires}` : ""}

## 分析観点
1. コンセプト（メインの訴求ポイント）
2. ターゲットの悩みへのアプローチ
3. 提示しているメインベネフィット
4. 差別化ポイント
5. コピーの強み
6. デザイン・レイアウトの特徴
7. 自社との類似点
8. 参考にすべきポイント

## 出力形式（JSON）
\`\`\`json
{
  "concept": "この競合のメインコンセプト（21文字以内）",
  "targetPain": "ターゲットにしている主な悩み",
  "mainBenefit": "提示しているメインベネフィット",
  "differentiators": ["差別化ポイント1", "差別化ポイント2"],
  "copyStrengths": ["コピーの強み1", "コピーの強み2"],
  "designNotes": ["デザインの特徴"],
  "similarityFactors": ["自社との類似点"],
  "recommendedTakeaways": ["参考にすべきポイント"]
}
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        concept: parsed.concept || "",
        targetPain: parsed.targetPain || "",
        mainBenefit: parsed.mainBenefit || "",
        differentiators: parsed.differentiators || [],
        copyStrengths: parsed.copyStrengths || [],
        designNotes: parsed.designNotes || [],
        similarityFactors: parsed.similarityFactors || [],
        recommendedTakeaways: parsed.recommendedTakeaways || [],
      };
    }
  } catch (err) {
    console.error("[ai-analyzer] Competitor analysis error:", err);
  }

  return {
    concept: "",
    targetPain: "",
    mainBenefit: "",
    differentiators: [],
    copyStrengths: [],
    designNotes: [],
    similarityFactors: [],
    recommendedTakeaways: [],
  };
}

// ============================================================
// キーワード抽出
// ============================================================

/**
 * テキストからパワーワード・キーワードを抽出
 */
export async function extractKeywordsWithAI(
  content: string,
  genre?: string
): Promise<KeywordExtractionResult> {
  const prompt = `あなたはセールスコピーのキーワード分析専門家です。
以下のテキストから、LPで使える効果的なキーワードを抽出してください。

## テキスト
${content.slice(0, 6000)}

${genre ? `## ジャンル: ${genre}` : ""}

## 抽出カテゴリ
1. パワーワード（インパクトのある言葉）
2. ベネフィットワード（メリットを表す言葉）
3. ペインワード（悩み・課題を表す言葉）
4. 緊急性ワード（今すぐ行動を促す言葉）
5. 信頼性ワード（信頼・安心を与える言葉）
6. 感情トリガー（感情を動かす表現）

## 出力形式（JSON）
\`\`\`json
{
  "powerWords": ["衝撃", "革命的", "驚きの"],
  "benefitWords": ["簡単に", "たった〇〇で", "理想の"],
  "painWords": ["悩み", "不安", "失敗"],
  "urgencyWords": ["今だけ", "限定", "残りわずか"],
  "trustWords": ["実績", "保証", "専門家"],
  "emotionalTriggers": ["もう悩まない", "夢が叶う"]
}
\`\`\`

各カテゴリ最大10個まで抽出してください。`;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        powerWords: (parsed.powerWords || []).slice(0, 10),
        benefitWords: (parsed.benefitWords || []).slice(0, 10),
        painWords: (parsed.painWords || []).slice(0, 10),
        urgencyWords: (parsed.urgencyWords || []).slice(0, 10),
        trustWords: (parsed.trustWords || []).slice(0, 10),
        emotionalTriggers: (parsed.emotionalTriggers || []).slice(0, 10),
      };
    }
  } catch (err) {
    console.error("[ai-analyzer] Keyword extraction error:", err);
  }

  return {
    powerWords: [],
    benefitWords: [],
    painWords: [],
    urgencyWords: [],
    trustWords: [],
    emotionalTriggers: [],
  };
}

// ============================================================
// 類似度計算
// ============================================================

/**
 * AIで類似度スコアを計算
 */
export async function calculateSimilarityWithAI(
  competitorContent: string,
  myContext: {
    genre: string;
    targetProblems: string;
    targetDesires: string;
  }
): Promise<{
  score: number;
  factors: string[];
  rationale: string;
}> {
  const prompt = `あなたはLP分析の専門家です。
以下の競合LPが、自社のターゲットとどれくらい類似しているか評価してください。

## 競合LPコンテンツ
${competitorContent.slice(0, 5000)}

## 自社のターゲット
- ジャンル: ${myContext.genre}
- ターゲットの悩み: ${myContext.targetProblems}
- ターゲットの理想: ${myContext.targetDesires}

## 評価観点
1. ターゲット層の一致度
2. 悩み・課題の一致度
3. 提供価値の類似度
4. 訴求アプローチの類似度

## 出力形式（JSON）
\`\`\`json
{
  "score": 0.85,
  "factors": ["ターゲット層が一致", "悩みの訴求が類似"],
  "rationale": "類似度が高い理由の説明（100文字程度）"
}
\`\`\`

scoreは0.0〜1.0の範囲で返してください。`;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        score: Math.min(1, Math.max(0, parsed.score || 0.5)),
        factors: parsed.factors || [],
        rationale: parsed.rationale || "",
      };
    }
  } catch (err) {
    console.error("[ai-analyzer] Similarity calculation error:", err);
  }

  return {
    score: 0.5,
    factors: [],
    rationale: "",
  };
}

// ============================================================
// Infotop商品分析
// ============================================================

/**
 * Infotop商品情報をAIで分析
 */
export async function analyzeInfotopProductWithAI(
  content: string,
  genre?: string
): Promise<{
  products: {
    rank: number;
    name: string;
    price: number;
    concept: string;
    targetPain: string;
    benefit: string;
  }[];
  priceInsights: {
    average: number;
    range: { min: number; max: number };
    sweetSpot: string;
  };
  conceptPatterns: string[];
}> {
  const prompt = `あなたはInfotop（情報商材プラットフォーム）の分析専門家です。
以下のランキングページ情報を分析してください。

## ランキングページ内容
${content.slice(0, 8000)}

${genre ? `## ジャンル: ${genre}` : ""}

## 分析観点
1. 商品名からコンセプトを読み取る
2. 価格帯の傾向
3. ターゲットの悩み
4. 提供ベネフィット

## 出力形式（JSON）
\`\`\`json
{
  "products": [
    {
      "rank": 1,
      "name": "商品名",
      "price": 29800,
      "concept": "コンセプト（21文字以内）",
      "targetPain": "ターゲットの悩み",
      "benefit": "提供ベネフィット"
    }
  ],
  "priceInsights": {
    "average": 29800,
    "range": { "min": 9800, "max": 98000 },
    "sweetSpot": "19,800円〜39,800円が売れ筋"
  },
  "conceptPatterns": ["〇〇だけで〜", "たった〇〇日で〜"]
}
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        products: parsed.products || [],
        priceInsights: parsed.priceInsights || {
          average: 0,
          range: { min: 0, max: 0 },
          sweetSpot: "",
        },
        conceptPatterns: parsed.conceptPatterns || [],
      };
    }
  } catch (err) {
    console.error("[ai-analyzer] Infotop analysis error:", err);
  }

  return {
    products: [],
    priceInsights: { average: 0, range: { min: 0, max: 0 }, sweetSpot: "" },
    conceptPatterns: [],
  };
}

// ============================================================
// エクスポート
// ============================================================

export const AIAnalyzer = {
  analyzeAds: analyzeAdsWithAI,
  analyzeLP: analyzeLPWithAI,
  analyzeCompetitor: analyzeCompetitorWithAI,
  extractKeywords: extractKeywordsWithAI,
  calculateSimilarity: calculateSimilarityWithAI,
  analyzeInfotopProduct: analyzeInfotopProductWithAI,
};

export default AIAnalyzer;
