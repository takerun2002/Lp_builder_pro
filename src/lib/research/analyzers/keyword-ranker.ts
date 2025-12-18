/**
 * キーワードランカー
 *
 * 収集したキーワードをスコアリング・ランキング
 * Task 2: 市場インサイト抽出
 */

import { generateText } from "@/lib/ai/gemini";
import type { ClassifiedPainPoint } from "./pain-classifier";

// ============================================================
// 型定義
// ============================================================

export interface KeywordSource {
  source: "amazon" | "yahoo_chiebukuro" | "competitor" | "manual" | "ai_generated";
  keywords: string[];
  context?: string;
}

export interface RankedKeyword {
  keyword: string;
  sources: KeywordSource["source"][];
  frequency: number;
  scores: {
    relevance: number; // ジャンル適合度 (0-100)
    emotionalIntensity: number; // 感情強度 (0-100)
    commercialIntent: number; // 購買意欲 (0-100)
    searchVolume: number; // 推定検索ボリューム (0-100)
    competition: number; // 競合度（低いほど良い） (0-100)
    overall: number; // 総合スコア
  };
  category: KeywordCategory;
  relatedPainPoints: string[];
  suggestedUsage: "headline" | "subhead" | "body" | "cta" | "meta";
}

export type KeywordCategory =
  | "pain" // 悩み系
  | "desire" // 願望系
  | "benefit" // ベネフィット系
  | "action" // 行動喚起系
  | "trust" // 信頼系
  | "urgency" // 緊急性系
  | "feature" // 機能系
  | "comparison" // 比較系
  | "other";

export interface KeywordRankingOptions {
  genre?: string;
  targetGender?: string;
  topN?: number;
  minScore?: number;
  includeCategories?: KeywordCategory[];
  excludeCategories?: KeywordCategory[];
}

export interface KeywordRankingResult {
  rankedKeywords: RankedKeyword[];
  byCategory: Record<KeywordCategory, RankedKeyword[]>;
  topKeywords: {
    forHeadline: string[];
    forSubhead: string[];
    forCTA: string[];
    powerWords: string[];
  };
  insights: string[];
  suggestedCombinations: string[];
}

// ============================================================
// メイン関数
// ============================================================

/**
 * キーワードをランキング
 */
export async function rankKeywords(
  sources: KeywordSource[],
  options?: KeywordRankingOptions
): Promise<KeywordRankingResult> {
  // 全キーワードを統合
  const allKeywords = aggregateKeywords(sources);

  // 重複をカウントし、出現ソースを記録
  const keywordStats = countKeywords(allKeywords, sources);

  // AIでスコアリング
  const scoredKeywords = await scoreKeywords(keywordStats, options);

  // ランキング
  const rankedKeywords = sortByScore(scoredKeywords);

  // フィルタリング
  const filtered = filterKeywords(rankedKeywords, options);

  // カテゴリ別に分類
  const byCategory = groupByCategory(filtered);

  // トップキーワード抽出
  const topKeywords = extractTopKeywords(filtered);

  // インサイト生成
  const insights = generateInsights(filtered, byCategory);

  // 組み合わせ提案
  const suggestedCombinations = suggestCombinations(filtered, options);

  return {
    rankedKeywords: filtered.slice(0, options?.topN || 50),
    byCategory,
    topKeywords,
    insights,
    suggestedCombinations,
  };
}

/**
 * ペインポイントからキーワードを抽出
 */
export function extractKeywordsFromPainPoints(
  painPoints: ClassifiedPainPoint[]
): KeywordSource {
  const keywords: string[] = [];

  for (const pp of painPoints) {
    keywords.push(...pp.keywords);
    // サマリーから重要語を抽出
    const summaryWords = pp.summary
      .split(/[、。,.\s]/)
      .filter((w) => w.length >= 2 && w.length <= 10);
    keywords.push(...summaryWords);
  }

  return {
    source: "ai_generated",
    keywords: Array.from(new Set(keywords)),
    context: "ペインポイント分析から抽出",
  };
}

/**
 * キーワードをカテゴリに分類
 */
export async function categorizeKeywords(
  keywords: string[],
  options?: { genre?: string }
): Promise<Record<KeywordCategory, string[]>> {
  const genreContext = options?.genre ? `ジャンル: ${options.genre}` : "";

  const prompt = `以下のキーワードをカテゴリに分類してください。

## キーワード
${keywords.join(", ")}

## コンテキスト
${genreContext}

## カテゴリ定義
- pain: 悩み・問題系（「〜が辛い」「〜で困っている」など）
- desire: 願望系（「〜したい」「〜になりたい」など）
- benefit: ベネフィット系（具体的な効果・結果）
- action: 行動喚起系（「今すぐ」「申し込む」など）
- trust: 信頼系（「実績」「保証」「専門家」など）
- urgency: 緊急性系（「限定」「期間」「今だけ」など）
- feature: 機能・特徴系（製品の特徴）
- comparison: 比較系（「より」「〜と比べて」など）
- other: その他

## 出力形式（JSON）
\`\`\`json
{
  "pain": ["キーワード1", "キーワード2"],
  "desire": ["キーワード3"],
  "benefit": ["キーワード4"],
  "action": [],
  "trust": [],
  "urgency": [],
  "feature": [],
  "comparison": [],
  "other": []
}
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
  } catch (error) {
    console.error("[keyword-ranker] Categorization error:", error);
  }

  // フォールバック: 全てotherに
  return {
    pain: [],
    desire: [],
    benefit: [],
    action: [],
    trust: [],
    urgency: [],
    feature: [],
    comparison: [],
    other: keywords,
  };
}

// ============================================================
// 内部関数
// ============================================================

interface KeywordStat {
  keyword: string;
  sources: KeywordSource["source"][];
  frequency: number;
}

function aggregateKeywords(sources: KeywordSource[]): string[] {
  const all: string[] = [];
  for (const source of sources) {
    all.push(...source.keywords);
  }
  return all;
}

function countKeywords(
  keywords: string[],
  sources: KeywordSource[]
): KeywordStat[] {
  const stats = new Map<string, KeywordStat>();

  for (const kw of keywords) {
    const normalized = normalizeKeyword(kw);
    if (!normalized) continue;

    const existing = stats.get(normalized);
    if (existing) {
      existing.frequency++;
    } else {
      stats.set(normalized, {
        keyword: normalized,
        sources: [],
        frequency: 1,
      });
    }
  }

  // ソースを記録
  for (const source of sources) {
    for (const kw of source.keywords) {
      const normalized = normalizeKeyword(kw);
      const stat = stats.get(normalized);
      if (stat && !stat.sources.includes(source.source)) {
        stat.sources.push(source.source);
      }
    }
  }

  return Array.from(stats.values());
}

function normalizeKeyword(kw: string): string {
  // 正規化: 小文字化、前後空白除去、長すぎるものは除外
  const normalized = kw.toLowerCase().trim();
  if (normalized.length < 2 || normalized.length > 30) {
    return "";
  }
  return normalized;
}

async function scoreKeywords(
  stats: KeywordStat[],
  options?: KeywordRankingOptions
): Promise<RankedKeyword[]> {
  if (stats.length === 0) return [];

  // バッチでスコアリング（API呼び出し削減）
  const batchSize = 30;
  const results: RankedKeyword[] = [];

  for (let i = 0; i < stats.length; i += batchSize) {
    const batch = stats.slice(i, i + batchSize);
    const scored = await scoreBatch(batch, options);
    results.push(...scored);

    // レート制限対策
    if (i + batchSize < stats.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}

async function scoreBatch(
  stats: KeywordStat[],
  options?: KeywordRankingOptions
): Promise<RankedKeyword[]> {
  const genreContext = options?.genre ? `ジャンル: ${options.genre}` : "";
  const genderContext = options?.targetGender
    ? `ターゲット性別: ${options.targetGender}`
    : "";

  const keywordList = stats.map((s) => `${s.keyword}(出現${s.frequency}回)`);

  const prompt = `以下のキーワードをセールスレター・LP制作の観点からスコアリングしてください。

## キーワード
${keywordList.join("\n")}

## コンテキスト
${genreContext}
${genderContext}

## スコアリング基準（各0-100）
- relevance: ジャンル適合度
- emotionalIntensity: 感情を動かす強度
- commercialIntent: 購買意欲を示す度合い
- searchVolume: 推定検索ボリューム（日本市場）
- competition: 競合度（高いほど競争が激しい）

## カテゴリ
pain / desire / benefit / action / trust / urgency / feature / comparison / other

## 推奨用途
headline / subhead / body / cta / meta

## 出力形式（JSON配列）
\`\`\`json
[
  {
    "keyword": "キーワード",
    "relevance": 80,
    "emotionalIntensity": 70,
    "commercialIntent": 60,
    "searchVolume": 50,
    "competition": 40,
    "category": "pain",
    "suggestedUsage": "headline"
  }
]
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return stats.map((stat) => {
        const scored = parsed.find(
          (p: { keyword: string }) =>
            p.keyword.toLowerCase() === stat.keyword.toLowerCase()
        );
        return buildRankedKeyword(stat, scored);
      });
    }
  } catch (error) {
    console.error("[keyword-ranker] Scoring error:", error);
  }

  // フォールバック
  return stats.map((stat) => buildRankedKeyword(stat, null));
}

function buildRankedKeyword(
  stat: KeywordStat,
  scored: {
    relevance?: number;
    emotionalIntensity?: number;
    commercialIntent?: number;
    searchVolume?: number;
    competition?: number;
    category?: KeywordCategory;
    suggestedUsage?: RankedKeyword["suggestedUsage"];
  } | null
): RankedKeyword {
  const relevance = scored?.relevance ?? 50;
  const emotionalIntensity = scored?.emotionalIntensity ?? 50;
  const commercialIntent = scored?.commercialIntent ?? 50;
  const searchVolume = scored?.searchVolume ?? 50;
  const competition = scored?.competition ?? 50;

  // 総合スコア計算（competition は逆数）
  const overall = Math.round(
    relevance * 0.25 +
      emotionalIntensity * 0.25 +
      commercialIntent * 0.2 +
      searchVolume * 0.15 +
      (100 - competition) * 0.15 +
      // ボーナス: 複数ソースに出現
      Math.min(stat.sources.length * 5, 15) +
      // ボーナス: 高頻度
      Math.min(stat.frequency * 2, 10)
  );

  return {
    keyword: stat.keyword,
    sources: stat.sources,
    frequency: stat.frequency,
    scores: {
      relevance,
      emotionalIntensity,
      commercialIntent,
      searchVolume,
      competition,
      overall: Math.min(overall, 100),
    },
    category: scored?.category || "other",
    relatedPainPoints: [],
    suggestedUsage: scored?.suggestedUsage || "body",
  };
}

function sortByScore(keywords: RankedKeyword[]): RankedKeyword[] {
  return [...keywords].sort((a, b) => b.scores.overall - a.scores.overall);
}

function filterKeywords(
  keywords: RankedKeyword[],
  options?: KeywordRankingOptions
): RankedKeyword[] {
  let filtered = keywords;

  // 最低スコアフィルタ
  if (options?.minScore) {
    filtered = filtered.filter((k) => k.scores.overall >= options.minScore!);
  }

  // カテゴリ包含フィルタ
  if (options?.includeCategories?.length) {
    filtered = filtered.filter((k) =>
      options.includeCategories!.includes(k.category)
    );
  }

  // カテゴリ除外フィルタ
  if (options?.excludeCategories?.length) {
    filtered = filtered.filter(
      (k) => !options.excludeCategories!.includes(k.category)
    );
  }

  return filtered;
}

function groupByCategory(
  keywords: RankedKeyword[]
): Record<KeywordCategory, RankedKeyword[]> {
  const groups: Record<KeywordCategory, RankedKeyword[]> = {
    pain: [],
    desire: [],
    benefit: [],
    action: [],
    trust: [],
    urgency: [],
    feature: [],
    comparison: [],
    other: [],
  };

  for (const kw of keywords) {
    groups[kw.category].push(kw);
  }

  return groups;
}

function extractTopKeywords(keywords: RankedKeyword[]): {
  forHeadline: string[];
  forSubhead: string[];
  forCTA: string[];
  powerWords: string[];
} {
  const forHeadline = keywords
    .filter((k) => k.suggestedUsage === "headline")
    .slice(0, 10)
    .map((k) => k.keyword);

  const forSubhead = keywords
    .filter((k) => k.suggestedUsage === "subhead")
    .slice(0, 10)
    .map((k) => k.keyword);

  const forCTA = keywords
    .filter((k) => k.suggestedUsage === "cta" || k.category === "action")
    .slice(0, 10)
    .map((k) => k.keyword);

  const powerWords = keywords
    .filter((k) => k.scores.emotionalIntensity >= 70)
    .slice(0, 15)
    .map((k) => k.keyword);

  return { forHeadline, forSubhead, forCTA, powerWords };
}

function generateInsights(
  keywords: RankedKeyword[],
  byCategory: Record<KeywordCategory, RankedKeyword[]>
): string[] {
  const insights: string[] = [];

  // カテゴリ分布
  const categories = Object.entries(byCategory)
    .filter((entry) => entry[1].length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  if (categories.length > 0) {
    const topCategory = categories[0];
    insights.push(
      `最も多いカテゴリは「${getCategoryName(topCategory[0] as KeywordCategory)}」（${topCategory[1].length}件）。このカテゴリを中心にコピーを構成すると効果的。`
    );
  }

  // 高スコアキーワード
  const highScoreKws = keywords.filter((k) => k.scores.overall >= 80);
  if (highScoreKws.length > 0) {
    insights.push(
      `高スコアキーワード（80点以上）が${highScoreKws.length}件。特に「${highScoreKws[0].keyword}」はヘッドラインに最適。`
    );
  }

  // 複数ソース出現
  const multiSource = keywords.filter((k) => k.sources.length >= 2);
  if (multiSource.length > 0) {
    insights.push(
      `複数ソースで出現するキーワードが${multiSource.length}件。市場で実際に使われている証拠。`
    );
  }

  // 感情強度
  const emotional = keywords.filter((k) => k.scores.emotionalIntensity >= 70);
  if (emotional.length > 0) {
    insights.push(
      `感情を強く動かすキーワード: ${emotional
        .slice(0, 5)
        .map((k) => k.keyword)
        .join("、")}`
    );
  }

  return insights;
}

function getCategoryName(category: KeywordCategory): string {
  const names: Record<KeywordCategory, string> = {
    pain: "悩み系",
    desire: "願望系",
    benefit: "ベネフィット系",
    action: "行動喚起系",
    trust: "信頼系",
    urgency: "緊急性系",
    feature: "機能系",
    comparison: "比較系",
    other: "その他",
  };
  return names[category];
}

function suggestCombinations(
  keywords: RankedKeyword[],
  options?: KeywordRankingOptions
): string[] {
  const suggestions: string[] = [];

  // ペイン + ベネフィット組み合わせ
  const pains = keywords.filter((k) => k.category === "pain").slice(0, 3);
  const benefits = keywords.filter((k) => k.category === "benefit").slice(0, 3);

  for (const pain of pains) {
    for (const benefit of benefits) {
      suggestions.push(`「${pain.keyword}」→「${benefit.keyword}」`);
    }
  }

  // 緊急性 + アクション
  const urgency = keywords.filter((k) => k.category === "urgency").slice(0, 2);
  const actions = keywords.filter((k) => k.category === "action").slice(0, 2);

  for (const u of urgency) {
    for (const a of actions) {
      suggestions.push(`【${u.keyword}】${a.keyword}`);
    }
  }

  // ジャンル特化の組み合わせ
  if (options?.genre) {
    const top3 = keywords.slice(0, 3).map((k) => k.keyword);
    suggestions.push(`${options.genre}×${top3.join("×")}`);
  }

  return suggestions.slice(0, 10);
}

// ============================================================
// エクスポート用ヘルパー
// ============================================================

/**
 * ランキング結果をCSV形式でエクスポート
 */
export function exportToCSV(result: KeywordRankingResult): string {
  const headers = [
    "キーワード",
    "総合スコア",
    "カテゴリ",
    "推奨用途",
    "出現回数",
    "ソース",
    "関連度",
    "感情強度",
    "購買意欲",
    "検索ボリューム",
    "競合度",
  ];

  const rows = result.rankedKeywords.map((k) => [
    `"${k.keyword}"`,
    k.scores.overall.toString(),
    getCategoryName(k.category),
    k.suggestedUsage,
    k.frequency.toString(),
    k.sources.join(";"),
    k.scores.relevance.toString(),
    k.scores.emotionalIntensity.toString(),
    k.scores.commercialIntent.toString(),
    k.scores.searchVolume.toString(),
    k.scores.competition.toString(),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * スプレッドシート形式でエクスポート
 */
export function exportToSpreadsheetData(
  result: KeywordRankingResult
): (string | number)[][] {
  const headers = [
    "キーワード",
    "総合スコア",
    "カテゴリ",
    "推奨用途",
    "出現回数",
    "関連度",
    "感情強度",
    "購買意欲",
  ];

  const rows = result.rankedKeywords.map((k) => [
    k.keyword,
    k.scores.overall,
    getCategoryName(k.category),
    k.suggestedUsage,
    k.frequency,
    k.scores.relevance,
    k.scores.emotionalIntensity,
    k.scores.commercialIntent,
  ]);

  return [headers, ...rows];
}

/**
 * キーワードバンクサマリーを生成
 */
export function generateKeywordBankSummary(
  result: KeywordRankingResult
): string {
  const lines: string[] = [];

  lines.push("# キーワードバンク サマリー\n");

  lines.push("## ヘッドライン候補");
  lines.push(result.topKeywords.forHeadline.join("、") || "なし");
  lines.push("");

  lines.push("## CTA候補");
  lines.push(result.topKeywords.forCTA.join("、") || "なし");
  lines.push("");

  lines.push("## パワーワード");
  lines.push(result.topKeywords.powerWords.join("、") || "なし");
  lines.push("");

  lines.push("## インサイト");
  for (const insight of result.insights) {
    lines.push(`- ${insight}`);
  }
  lines.push("");

  lines.push("## 組み合わせ提案");
  for (const combo of result.suggestedCombinations) {
    lines.push(`- ${combo}`);
  }

  return lines.join("\n");
}
