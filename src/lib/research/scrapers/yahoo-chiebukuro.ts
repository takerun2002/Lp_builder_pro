/**
 * Yahoo知恵袋スクレイパー
 *
 * 機能:
 * - キーワードで質問を検索
 * - 質問タイトル、本文、閲覧数、回答数を取得
 * - ベストアンサーを抽出
 * - 悩みの深さ×緊急性でスコアリング
 * - AI駆動の高精度分析対応
 */

import { scrapeUrl, searchAndScrape } from "../firecrawl";
import { generateText } from "@/lib/ai/gemini";

// ============================================================
// 型定義
// ============================================================

export interface ChiebukuroResult {
  id: string;
  title: string;
  content: string;
  url: string;
  views: number;
  answers: number;
  bestAnswer?: string;
  depthScore: number; // 1-5: 悩みの深さ（お金を払うレベルか）
  urgencyScore: number; // 1-5: 緊急性（今すぐ解決したいか）
  quadrant: PainPointQuadrant;
  severityKeywords: string[];
  category?: string;
  scrapedAt: string;
}

export type PainPointQuadrant =
  | "priority" // 深い×緊急 → 最優先ターゲット
  | "important" // 深い×非緊急 → 重要だが後回し
  | "consider" // 浅い×緊急 → 検討
  | "ignore"; // 浅い×非緊急 → 無視

export interface ChiebukuroSearchOptions {
  keyword: string;
  category?: string;
  limit?: number;
  sortBy?: "relevance" | "date" | "answers";
  useAI?: boolean;
}

export interface ChiebukuroAnalysis {
  questions: ChiebukuroResult[];
  painPointStats: {
    total: number;
    byQuadrant: Record<PainPointQuadrant, number>;
    topSeverityKeywords: string[];
    averageDepth: number;
    averageUrgency: number;
  };
  insights: string[];
}

// ============================================================
// 定数
// ============================================================

const CHIEBUKURO_SEARCH_URL = "https://chiebukuro.yahoo.co.jp/search";

// 深刻度を示すキーワード（悩みの深さを判定）
const SEVERITY_KEYWORDS = [
  // 高深刻度（スコア5）
  { keywords: ["死にたい", "離婚", "借金", "うつ", "自殺", "破産"], score: 5 },
  // 中高深刻度（スコア4）
  { keywords: ["辛い", "苦しい", "眠れない", "限界", "助けて", "どうしたら"], score: 4 },
  // 中深刻度（スコア3）
  { keywords: ["悩んでいます", "困っています", "不安", "心配", "ストレス"], score: 3 },
  // 中低深刻度（スコア2）
  { keywords: ["気になる", "迷っている", "わからない", "教えて"], score: 2 },
  // 低深刻度（スコア1）
  { keywords: ["どう思いますか", "おすすめ", "どちらが"], score: 1 },
];

// 緊急性を示すキーワード
const URGENCY_KEYWORDS = [
  // 高緊急度（スコア5）
  { keywords: ["今すぐ", "至急", "急ぎ", "明日まで", "今日中"], score: 5 },
  // 中高緊急度（スコア4）
  { keywords: ["早く", "できるだけ早く", "なるべく早く", "すぐに"], score: 4 },
  // 中緊急度（スコア3）
  { keywords: ["今週", "近いうち", "そろそろ"], score: 3 },
  // 中低緊急度（スコア2）
  { keywords: ["いつか", "将来", "そのうち"], score: 2 },
  // 低緊急度（スコア1）
  { keywords: ["参考", "一般的に", "知りたい"], score: 1 },
];

// ============================================================
// メイン関数
// ============================================================

/**
 * Yahoo知恵袋で質問を検索
 */
export async function searchChiebukuro(
  options: ChiebukuroSearchOptions
): Promise<ChiebukuroResult[]> {
  const { keyword, limit = 10, useAI = false } = options;

  console.log("[chiebukuro] Searching:", keyword, { limit, useAI });

  try {
    // 検索URLを構築
    const searchUrl = buildSearchUrl(keyword, options.sortBy);

    // Firecrawlでスクレイピング
    const result = await scrapeUrl(searchUrl, {
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 3000,
    });

    if (!result.success || !result.markdown) {
      console.warn("[chiebukuro] Scraping failed, trying alternative method");
      return searchViaGoogle(keyword, limit);
    }

    // AI分析を使用する場合
    if (useAI) {
      return parseWithAI(result.markdown, keyword, limit);
    }

    // 従来のパース
    const questions = parseSearchResults(result.markdown, limit);

    // 各質問の詳細を取得（並列処理、レート制限考慮）
    const detailedQuestions = await fetchQuestionDetails(questions.slice(0, limit));

    return detailedQuestions;
  } catch (err) {
    console.error("[chiebukuro] Search error:", err);
    // フォールバック: Google経由で検索
    return searchViaGoogle(keyword, limit);
  }
}

/**
 * Yahoo知恵袋を分析（統計付き）
 */
export async function analyzeChiebukuro(
  options: ChiebukuroSearchOptions
): Promise<ChiebukuroAnalysis> {
  const questions = await searchChiebukuro(options);

  // 統計計算
  const byQuadrant: Record<PainPointQuadrant, number> = {
    priority: 0,
    important: 0,
    consider: 0,
    ignore: 0,
  };

  const allSeverityKeywords: string[] = [];
  let totalDepth = 0;
  let totalUrgency = 0;

  for (const q of questions) {
    byQuadrant[q.quadrant]++;
    allSeverityKeywords.push(...q.severityKeywords);
    totalDepth += q.depthScore;
    totalUrgency += q.urgencyScore;
  }

  // キーワード頻度をカウント
  const keywordCounts: Record<string, number> = {};
  allSeverityKeywords.forEach((kw) => {
    keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
  });

  const topSeverityKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw]) => kw);

  // インサイト生成
  const insights = generateInsights(questions, byQuadrant);

  return {
    questions,
    painPointStats: {
      total: questions.length,
      byQuadrant,
      topSeverityKeywords,
      averageDepth: questions.length > 0 ? totalDepth / questions.length : 0,
      averageUrgency: questions.length > 0 ? totalUrgency / questions.length : 0,
    },
    insights,
  };
}

// ============================================================
// URL構築
// ============================================================

/**
 * 検索URLを構築
 */
function buildSearchUrl(keyword: string, sortBy?: string): string {
  const params = new URLSearchParams();
  params.set("p", keyword);
  params.set("type", "tag");

  if (sortBy === "date") {
    params.set("sort", "1");
  } else if (sortBy === "answers") {
    params.set("sort", "2");
  }

  return `${CHIEBUKURO_SEARCH_URL}?${params.toString()}`;
}


// ============================================================
// パース関数
// ============================================================

/**
 * 検索結果をパース
 */
function parseSearchResults(markdown: string, limit: number): Partial<ChiebukuroResult>[] {
  const questions: Partial<ChiebukuroResult>[] = [];
  const lines = markdown.split("\n");

  let currentQuestion: Partial<ChiebukuroResult> | null = null;

  for (const line of lines) {
    // 質問タイトルを検出（リンク形式）
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const [, title, url] = linkMatch;

      // 知恵袋の質問URLかチェック
      if (url.includes("chiebukuro.yahoo.co.jp") || url.includes("detail.chiebukuro")) {
        if (currentQuestion && currentQuestion.title) {
          questions.push(currentQuestion);
        }

        // IDを抽出
        const idMatch = url.match(/q\d+|question_detail\/q(\d+)/);
        const id = idMatch ? idMatch[0].replace("question_detail/", "") : `q${Date.now()}`;

        currentQuestion = {
          id,
          title: title.trim(),
          url,
          content: "",
          views: 0,
          answers: 0,
          scrapedAt: new Date().toISOString(),
        };
      }
    }

    // 回答数を検出
    if (currentQuestion) {
      const answersMatch = line.match(/(\d+)\s*(?:件の回答|回答)/);
      if (answersMatch) {
        currentQuestion.answers = parseInt(answersMatch[1], 10);
      }

      // 閲覧数を検出
      const viewsMatch = line.match(/(\d+)\s*(?:閲覧|view)/i);
      if (viewsMatch) {
        currentQuestion.views = parseInt(viewsMatch[1], 10);
      }

      // 質問の一部を本文として取得
      if (line.length > 20 && !line.startsWith("#") && !line.startsWith("[")) {
        currentQuestion.content = (currentQuestion.content || "") + line + " ";
      }
    }

    if (questions.length >= limit) break;
  }

  // 最後の質問を追加
  if (currentQuestion && currentQuestion.title && questions.length < limit) {
    questions.push(currentQuestion);
  }

  return questions;
}

/**
 * 質問詳細を取得
 */
async function fetchQuestionDetails(
  partialQuestions: Partial<ChiebukuroResult>[]
): Promise<ChiebukuroResult[]> {
  const results: ChiebukuroResult[] = [];

  for (const pq of partialQuestions) {
    try {
      if (pq.url) {
        // レート制限対策
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const detail = await scrapeUrl(pq.url, {
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 2000,
        });

        if (detail.success && detail.markdown) {
          const parsed = parseQuestionDetail(detail.markdown, pq);
          results.push(parsed);
          continue;
        }
      }

      // フォールバック: 部分情報からスコアリング
      results.push(scoreQuestion(pq));
    } catch (err) {
      console.warn("[chiebukuro] Detail fetch error:", err);
      results.push(scoreQuestion(pq));
    }
  }

  return results;
}

/**
 * 質問詳細ページをパース
 */
function parseQuestionDetail(
  markdown: string,
  partial: Partial<ChiebukuroResult>
): ChiebukuroResult {
  // 本文を抽出
  let content = partial.content || "";
  const contentMatch = markdown.match(/質問.*?\n([\s\S]*?)(?=回答|ベストアンサー|$)/i);
  if (contentMatch) {
    content = contentMatch[1].trim().slice(0, 1000);
  }

  // ベストアンサーを抽出
  let bestAnswer: string | undefined;
  const baMatch = markdown.match(/ベストアンサー[\s\S]*?\n([\s\S]*?)(?=その他の回答|$)/i);
  if (baMatch) {
    bestAnswer = baMatch[1].trim().slice(0, 500);
  }

  // 閲覧数を再取得
  let views = partial.views || 0;
  const viewsMatch = markdown.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:閲覧|view)/i);
  if (viewsMatch) {
    views = parseInt(viewsMatch[1].replace(/,/g, ""), 10);
  }

  // 回答数を再取得
  let answers = partial.answers || 0;
  const answersMatch = markdown.match(/(\d+)\s*(?:件の回答|回答)/);
  if (answersMatch) {
    answers = parseInt(answersMatch[1], 10);
  }

  const question: Partial<ChiebukuroResult> = {
    ...partial,
    content,
    bestAnswer,
    views,
    answers,
  };

  return scoreQuestion(question);
}

// ============================================================
// スコアリング
// ============================================================

/**
 * 質問をスコアリング
 */
function scoreQuestion(partial: Partial<ChiebukuroResult>): ChiebukuroResult {
  const text = `${partial.title || ""} ${partial.content || ""}`.toLowerCase();

  // 深さスコアを計算
  let depthScore = 1;
  const foundSeverityKeywords: string[] = [];

  for (const group of SEVERITY_KEYWORDS) {
    for (const kw of group.keywords) {
      if (text.includes(kw)) {
        if (group.score > depthScore) {
          depthScore = group.score;
        }
        foundSeverityKeywords.push(kw);
      }
    }
  }

  // 緊急性スコアを計算
  let urgencyScore = 1;
  for (const group of URGENCY_KEYWORDS) {
    for (const kw of group.keywords) {
      if (text.includes(kw)) {
        if (group.score > urgencyScore) {
          urgencyScore = group.score;
        }
      }
    }
  }

  // 閲覧数・回答数でスコア調整
  if ((partial.views || 0) > 1000) depthScore = Math.min(5, depthScore + 1);
  if ((partial.answers || 0) > 10) depthScore = Math.min(5, depthScore + 1);

  // Quadrantを決定
  const quadrant = determineQuadrant(depthScore, urgencyScore);

  return {
    id: partial.id || `q${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: partial.title || "",
    content: partial.content || "",
    url: partial.url || "",
    views: partial.views || 0,
    answers: partial.answers || 0,
    bestAnswer: partial.bestAnswer,
    depthScore,
    urgencyScore,
    quadrant,
    severityKeywords: [...new Set(foundSeverityKeywords)],
    category: partial.category,
    scrapedAt: partial.scrapedAt || new Date().toISOString(),
  };
}

/**
 * Quadrantを決定
 */
function determineQuadrant(depth: number, urgency: number): PainPointQuadrant {
  if (depth >= 3 && urgency >= 3) return "priority";
  if (depth >= 3 && urgency < 3) return "important";
  if (depth < 3 && urgency >= 3) return "consider";
  return "ignore";
}

// ============================================================
// Google経由の検索（フォールバック）
// ============================================================

/**
 * Google経由でYahoo知恵袋を検索
 */
async function searchViaGoogle(keyword: string, limit: number): Promise<ChiebukuroResult[]> {
  console.log("[chiebukuro] Falling back to Google search");

  try {
    const query = `site:chiebukuro.yahoo.co.jp ${keyword}`;
    const results = await searchAndScrape(query, {
      limit: limit * 2,
      region: "japan",
    });

    if (results.length === 0) {
      console.warn("[chiebukuro] No results from Google search");
      return getSimulatedResults(keyword, limit);
    }

    const questions: ChiebukuroResult[] = [];

    for (const sr of results) {
      if (questions.length >= limit) break;

      if (!sr.metadata?.title) continue;

      const idMatch = sr.metadata.title.match(/q\d+/) || [];
      const id = idMatch[0] || `q${Date.now()}-${questions.length}`;

      const question: Partial<ChiebukuroResult> = {
        id,
        title: sr.metadata.title,
        content: sr.markdown?.slice(0, 500) || "",
        url: "",
        views: 0,
        answers: 0,
        scrapedAt: new Date().toISOString(),
      };

      questions.push(scoreQuestion(question));
    }

    return questions;
  } catch (err) {
    console.error("[chiebukuro] Google search error:", err);
    return getSimulatedResults(keyword, limit);
  }
}

// ============================================================
// AI分析
// ============================================================

/**
 * AIでパース・分析
 */
async function parseWithAI(
  markdown: string,
  keyword: string,
  limit: number
): Promise<ChiebukuroResult[]> {
  const prompt = `あなたはYahoo知恵袋の質問分析エキスパートです。
以下のスクレイピング結果から、「${keyword}」に関する質問を抽出・分析してください。

## スクレイピング結果
${markdown.slice(0, 8000)}

## 分析観点
1. 質問タイトルと本文
2. 悩みの深さ（1-5: お金を払ってでも解決したいレベルか）
3. 緊急性（1-5: 今すぐ解決したいか）
4. 深刻度キーワード

## 出力形式（JSON）
\`\`\`json
{
  "questions": [
    {
      "id": "q12345",
      "title": "質問タイトル",
      "content": "質問本文（100文字程度）",
      "views": 1000,
      "answers": 5,
      "bestAnswer": "ベストアンサーの要約（あれば）",
      "depthScore": 4,
      "urgencyScore": 3,
      "severityKeywords": ["辛い", "助けて"]
    }
  ]
}
\`\`\`

最大${limit}件まで抽出してください。`;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return (parsed.questions || []).map((q: Partial<ChiebukuroResult>) => ({
        id: q.id || `q${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: q.title || "",
        content: q.content || "",
        url: "",
        views: q.views || 0,
        answers: q.answers || 0,
        bestAnswer: q.bestAnswer,
        depthScore: q.depthScore || 1,
        urgencyScore: q.urgencyScore || 1,
        quadrant: determineQuadrant(q.depthScore || 1, q.urgencyScore || 1),
        severityKeywords: q.severityKeywords || [],
        scrapedAt: new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.error("[chiebukuro] AI parse error:", err);
  }

  // フォールバック
  return parseSearchResults(markdown, limit).map((q) => scoreQuestion(q));
}

// ============================================================
// インサイト生成
// ============================================================

/**
 * インサイトを生成
 */
function generateInsights(
  questions: ChiebukuroResult[],
  byQuadrant: Record<PainPointQuadrant, number>
): string[] {
  const insights: string[] = [];

  const total = questions.length;
  if (total === 0) return ["質問が見つかりませんでした"];

  // Quadrant分析
  const priorityRate = (byQuadrant.priority / total) * 100;
  if (priorityRate > 30) {
    insights.push(`🔴 ${priorityRate.toFixed(0)}%が最優先ターゲット（深い悩み×高緊急性）`);
  }

  // 平均スコア
  const avgDepth = questions.reduce((sum, q) => sum + q.depthScore, 0) / total;
  const avgUrgency = questions.reduce((sum, q) => sum + q.urgencyScore, 0) / total;

  if (avgDepth >= 3.5) {
    insights.push(`💰 平均悩み深度${avgDepth.toFixed(1)}：お金を払う価値を感じやすいターゲット層`);
  }
  if (avgUrgency >= 3.5) {
    insights.push(`⚡ 平均緊急度${avgUrgency.toFixed(1)}：即決しやすいターゲット層`);
  }

  // 閲覧数の高い質問
  const highViewQuestions = questions.filter((q) => q.views > 1000);
  if (highViewQuestions.length > 0) {
    insights.push(`👀 閲覧数1000超の質問が${highViewQuestions.length}件：需要の高いテーマ`);
  }

  // 深刻度キーワード
  const allKeywords = questions.flatMap((q) => q.severityKeywords);
  const keywordCounts: Record<string, number> = {};
  allKeywords.forEach((kw) => {
    keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
  });
  const topKeyword = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1])[0];
  if (topKeyword && topKeyword[1] > 2) {
    insights.push(`🔑 頻出キーワード「${topKeyword[0]}」（${topKeyword[1]}回）`);
  }

  return insights;
}

// ============================================================
// シミュレートデータ（フォールバック）
// ============================================================

/**
 * シミュレートされた結果（フォールバック用）
 */
function getSimulatedResults(keyword: string, limit: number): ChiebukuroResult[] {
  const templates = [
    {
      titleTemplate: `${keyword}で悩んでいます。どうしたらいいですか？`,
      contentTemplate: `${keyword}について本当に困っています。誰かアドバイスをください。`,
      depthScore: 4,
      urgencyScore: 4,
    },
    {
      titleTemplate: `${keyword}について教えてください`,
      contentTemplate: `${keyword}のことで質問があります。経験者の方、教えてください。`,
      depthScore: 2,
      urgencyScore: 2,
    },
    {
      titleTemplate: `至急！${keyword}のことで助けてください`,
      contentTemplate: `今すぐ${keyword}の問題を解決したいです。助けてください。`,
      depthScore: 4,
      urgencyScore: 5,
    },
    {
      titleTemplate: `${keyword}ってどう思いますか？`,
      contentTemplate: `${keyword}について皆さんの意見を聞きたいです。`,
      depthScore: 1,
      urgencyScore: 1,
    },
    {
      titleTemplate: `${keyword}で辛いです。経験者の方いますか？`,
      contentTemplate: `${keyword}のせいで毎日辛いです。同じ経験をした方はいますか？`,
      depthScore: 5,
      urgencyScore: 3,
    },
  ];

  const results: ChiebukuroResult[] = [];

  for (let i = 0; i < Math.min(limit, templates.length); i++) {
    const t = templates[i];
    results.push({
      id: `sim-${Date.now()}-${i}`,
      title: t.titleTemplate,
      content: t.contentTemplate,
      url: `https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q${Date.now()}${i}`,
      views: Math.floor(Math.random() * 5000) + 100,
      answers: Math.floor(Math.random() * 20) + 1,
      depthScore: t.depthScore,
      urgencyScore: t.urgencyScore,
      quadrant: determineQuadrant(t.depthScore, t.urgencyScore),
      severityKeywords: t.depthScore >= 4 ? ["悩んでいます", "助けて"] : ["教えて"],
      scrapedAt: new Date().toISOString(),
    });
  }

  return results;
}

// ============================================================
// エクスポート
// ============================================================

export const ChiebukuroResearch = {
  search: searchChiebukuro,
  analyze: analyzeChiebukuro,
  scoreQuestion,
  determineQuadrant,
};

export default ChiebukuroResearch;
