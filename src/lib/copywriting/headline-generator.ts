/**
 * ヘッドライン大量生成システム
 * N1ターゲット × 心理トリガーで50-100案を一括生成
 *
 * hybridGenerate統合: killer_words.yaml等のナレッジキャッシュを活用
 */

import { hybridGenerate } from "@/lib/ai/hybrid-knowledge";

// ============================================
// 型定義
// ============================================

export interface HeadlineInput {
  /** ターゲット（N1ペルソナ） */
  target: {
    name?: string;
    age?: string;
    occupation?: string;
    situation?: string;
    desires?: string[];
    fears?: string[];
  };
  /** 痛みポイント */
  painPoints: string[];
  /** ベネフィット */
  benefits: string[];
  /** キーワード（必須で含める） */
  keywords?: string[];
  /** 商品・サービス名 */
  productName?: string;
  /** ジャンル */
  genre?: string;
  /** 生成数 */
  count?: number;
}

export interface GeneratedHeadline {
  /** ヘッドラインテキスト */
  text: string;
  /** 文字数 */
  charCount: number;
  /** 使用した心理トリガー */
  triggers: string[];
  /** スタイル */
  style: "curiosity" | "benefit" | "fear" | "social_proof" | "urgency" | "question" | "story" | "direct";
  /** スコア（0-100） */
  score: number;
  /** スコア内訳 */
  scoreBreakdown: {
    clarity: number;
    emotional: number;
    uniqueness: number;
    actionable: number;
  };
}

export interface HeadlineGeneratorResult {
  success: boolean;
  headlines?: GeneratedHeadline[];
  stats?: {
    totalGenerated: number;
    averageScore: number;
    topScore: number;
    processingTime: number;
    byStyle: Record<string, number>;
    byTrigger: Record<string, number>;
  };
  error?: string;
}

// ============================================
// 心理トリガー定義
// ============================================

export const PSYCHOLOGICAL_TRIGGERS = [
  { id: "scarcity", name: "希少性", description: "限定・残りわずか", examples: ["残り3席", "今日まで限定"] },
  { id: "authority", name: "権威性", description: "専門家・実績", examples: ["医師監修", "10万人が選んだ"] },
  { id: "social_proof", name: "社会的証明", description: "みんなが使っている", examples: ["〇〇さんも愛用", "口コミNo.1"] },
  { id: "reciprocity", name: "返報性", description: "無料・プレゼント", examples: ["今なら無料", "特典付き"] },
  { id: "commitment", name: "一貫性", description: "最初の一歩", examples: ["まずは〇〇から", "たった1分で"] },
  { id: "liking", name: "好意", description: "共感・親近感", examples: ["私もそうでした", "あなたと同じ"] },
  { id: "fear", name: "恐怖", description: "損失回避", examples: ["知らないと損", "このままでは"] },
  { id: "curiosity", name: "好奇心", description: "続きが気になる", examples: ["実は〇〇", "なぜ〇〇なのか"] },
  { id: "specificity", name: "具体性", description: "数字・詳細", examples: ["3日で-5kg", "97.3%が満足"] },
  { id: "contrast", name: "対比", description: "ビフォーアフター", examples: ["〇〇だった私が", "たった〇〇で"] },
] as const;

export type PsychologicalTrigger = (typeof PSYCHOLOGICAL_TRIGGERS)[number]["id"];

// ============================================
// ヘッドラインタイプ定義
// ============================================

export type HeadlineType = "curiosity" | "benefit" | "fear" | "social_proof" | "urgency" | "question" | "story" | "direct" | "hero" | "cta";

export const HEADLINE_TYPE_LABELS: Record<HeadlineType, string> = {
  curiosity: "好奇心型",
  benefit: "ベネフィット型",
  fear: "恐怖型",
  social_proof: "社会的証明型",
  urgency: "緊急性型",
  question: "疑問型",
  story: "ストーリー型",
  direct: "直接型",
  hero: "ヒーローセクション",
  cta: "CTA（行動喚起）",
};

export type HeadlineStatus = "pending" | "generating" | "completed" | "error" | "approved" | "rejected";

export interface HeadlineBatchItem extends GeneratedHeadline {
  id: string;
  status: HeadlineStatus;
  /** ヘッドラインタイプ（バッチから継承） */
  type: HeadlineType;
  /** コンテンツ（textのエイリアス） */
  content: string;
}

export interface HeadlineBatch {
  id: string;
  type: HeadlineType;
  headlines: HeadlineBatchItem[];
  createdAt: string;
}

// ============================================
// メイン生成関数
// ============================================

/**
 * ヘッドラインを大量生成
 * hybridGenerateを使用してナレッジキャッシュ（killer_words.yaml等）を活用
 */
export async function generateHeadlines(input: HeadlineInput): Promise<HeadlineGeneratorResult> {
  const startTime = Date.now();
  const count = input.count || 50;

  try {
    const targetInfo = buildTargetInfo(input.target);
    const painPointsText = input.painPoints.join("、");
    const benefitsText = input.benefits.join("、");
    const keywordsText = input.keywords?.join("、") || "";

    const prompt = `あなたは一流のコピーライターです。ナレッジキャッシュに含まれる「キラーワード集」「心理トリガー」「セールスライティング技法」を参考に、以下の情報を基に${count}個の多様なヘッドライン（キャッチコピー）を生成してください。

## ターゲット情報
${targetInfo}

## 痛みポイント
${painPointsText}

## ベネフィット
${benefitsText}

${keywordsText ? `## 必須キーワード（必ず含める）\n${keywordsText}` : ""}

${input.productName ? `## 商品・サービス名\n${input.productName}` : ""}

${input.genre ? `## ジャンル\n${input.genre}` : ""}

## 使用する心理トリガー
以下のトリガーを組み合わせて使用：
${PSYCHOLOGICAL_TRIGGERS.map((t) => `- ${t.name}（${t.id}）: ${t.description}`).join("\n")}

## 出力要件
1. 各ヘッドラインは15〜40文字程度
2. 8種類のスタイルをバランスよく含める：
   - curiosity: 好奇心を刺激
   - benefit: ベネフィット訴求
   - fear: 恐怖・損失回避
   - social_proof: 社会的証明
   - urgency: 緊急性
   - question: 問いかけ
   - story: ストーリー調
   - direct: 直接訴求
3. 各ヘッドラインに使用した心理トリガーを明記
4. 4つの観点で0-100点でスコアリング：
   - clarity: 明確さ・わかりやすさ
   - emotional: 感情への訴求力
   - uniqueness: 独自性・差別化
   - actionable: 行動喚起力

## 出力形式（JSON配列）
[
  {
    "text": "ヘッドラインテキスト",
    "triggers": ["scarcity", "curiosity"],
    "style": "curiosity",
    "scoreBreakdown": {
      "clarity": 85,
      "emotional": 90,
      "uniqueness": 75,
      "actionable": 80
    }
  },
  ...
]

${count}個のヘッドラインをJSON配列で出力してください。`;

    // hybridGenerateを使用してナレッジキャッシュを活用
    const response = await hybridGenerate({
      prompt,
      useCache: true, // killer_words.yaml等を活用
    });

    const text = response.text || "";

    // JSONパース
    let rawHeadlines: Array<{
      text: string;
      triggers: string[];
      style: string;
      scoreBreakdown: {
        clarity: number;
        emotional: number;
        uniqueness: number;
        actionable: number;
      };
    }>;

    try {
      rawHeadlines = JSON.parse(text);
    } catch {
      // JSON抽出を試行
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rawHeadlines = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse headlines JSON");
      }
    }

    // ヘッドライン整形
    const headlines: GeneratedHeadline[] = rawHeadlines.map((h) => ({
      text: h.text,
      charCount: h.text.length,
      triggers: h.triggers,
      style: h.style as GeneratedHeadline["style"],
      score: calculateOverallScore(h.scoreBreakdown),
      scoreBreakdown: h.scoreBreakdown,
    }));

    // スコア順にソート
    headlines.sort((a, b) => b.score - a.score);

    // 統計計算
    const stats = {
      totalGenerated: headlines.length,
      averageScore: Math.round(headlines.reduce((sum, h) => sum + h.score, 0) / headlines.length),
      topScore: headlines[0]?.score || 0,
      processingTime: Date.now() - startTime,
      byStyle: {} as Record<string, number>,
      byTrigger: {} as Record<string, number>,
    };

    // スタイル別カウント
    headlines.forEach((h) => {
      stats.byStyle[h.style] = (stats.byStyle[h.style] || 0) + 1;
      h.triggers.forEach((t) => {
        stats.byTrigger[t] = (stats.byTrigger[t] || 0) + 1;
      });
    });

    return {
      success: true,
      headlines,
      stats,
    };
  } catch (error) {
    console.error("[HeadlineGenerator] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * ターゲット情報を文字列化
 */
function buildTargetInfo(target: HeadlineInput["target"]): string {
  const parts: string[] = [];
  if (target.name) parts.push(`名前: ${target.name}`);
  if (target.age) parts.push(`年齢: ${target.age}`);
  if (target.occupation) parts.push(`職業: ${target.occupation}`);
  if (target.situation) parts.push(`状況: ${target.situation}`);
  if (target.desires?.length) parts.push(`望み: ${target.desires.join("、")}`);
  if (target.fears?.length) parts.push(`不安: ${target.fears.join("、")}`);
  return parts.join("\n") || "一般的な消費者";
}

/**
 * 総合スコアを計算
 */
function calculateOverallScore(breakdown: GeneratedHeadline["scoreBreakdown"]): number {
  const weights = {
    clarity: 0.25,
    emotional: 0.35,
    uniqueness: 0.2,
    actionable: 0.2,
  };
  return Math.round(
    breakdown.clarity * weights.clarity +
    breakdown.emotional * weights.emotional +
    breakdown.uniqueness * weights.uniqueness +
    breakdown.actionable * weights.actionable
  );
}

/**
 * CSV形式でエクスポート
 */
export function exportHeadlinesToCsv(headlines: GeneratedHeadline[]): string {
  const header = "テキスト,文字数,スコア,スタイル,心理トリガー,明確さ,感情,独自性,行動喚起";
  const rows = headlines.map((h) =>
    [
      `"${h.text.replace(/"/g, '""')}"`,
      h.charCount,
      h.score,
      h.style,
      h.triggers.join("|"),
      h.scoreBreakdown.clarity,
      h.scoreBreakdown.emotional,
      h.scoreBreakdown.uniqueness,
      h.scoreBreakdown.actionable,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * スタイルでフィルター
 */
export function filterByStyle(
  headlines: GeneratedHeadline[],
  style: GeneratedHeadline["style"]
): GeneratedHeadline[] {
  return headlines.filter((h) => h.style === style);
}

/**
 * スコアでフィルター
 */
export function filterByScore(headlines: GeneratedHeadline[], minScore: number): GeneratedHeadline[] {
  return headlines.filter((h) => h.score >= minScore);
}

/**
 * トリガーでフィルター
 */
export function filterByTrigger(headlines: GeneratedHeadline[], trigger: PsychologicalTrigger): GeneratedHeadline[] {
  return headlines.filter((h) => h.triggers.includes(trigger));
}
