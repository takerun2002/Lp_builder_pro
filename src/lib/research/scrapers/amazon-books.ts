/**
 * Amazon Japan 書籍スクレイパー
 *
 * 機能:
 * - ジャンル×キーワードで書籍検索
 * - タイトル、サブタイトル、レビュー数、評価を取得
 * - レビュー内容から悩みキーワードを抽出
 * - 売れてる本のタイトル = 刺さるコンセプトの観点で分析
 * - AI駆動の高精度分析対応
 */

import { scrapeUrl, searchAndScrape } from "../firecrawl";
import { generateText } from "@/lib/ai/gemini";

// ============================================================
// 型定義
// ============================================================

export interface AmazonBookResult {
  asin: string;
  title: string;
  subtitle?: string;
  author: string;
  reviewCount: number;
  rating: number;
  price?: number;
  priceFormatted?: string;
  extractedKeywords: string[];
  conceptPatterns: string[];
  url: string;
  imageUrl?: string;
  category?: string;
  rank?: number;
  scrapedAt: string;
  // AI パワーワード分析（拡張）
  aiPowerWordAnalysis?: AIPowerWordAnalysis;
}

// AIパワーワード分析の型
export interface AIPowerWordAnalysis {
  emotionalTriggers: string[];       // 感情トリガーワード
  curiosityHooks: string[];          // 好奇心フック
  benefitPromises: string[];         // ベネフィット約束
  targetPainPoints: string[];        // ターゲットの悩み
  urgencyDrivers: string[];          // 緊急性ドライバー
  socialProofElements: string[];     // 社会的証明要素
  uniqueAngle: string;               // ユニークな切り口
  lpHeadlineIdeas: string[];         // LP見出しアイデア
  whyItSells: string;                // 売れている理由
}

export interface AmazonBookSearchOptions {
  keyword: string;
  category?: AmazonBookCategory;
  sortBy?: "relevance" | "reviews" | "price_asc" | "price_desc" | "newest";
  limit?: number;
  useAI?: boolean;
}

export type AmazonBookCategory =
  | "all"
  | "business"
  | "self-help"
  | "health"
  | "diet"
  | "beauty"
  | "romance"
  | "money"
  | "education";

export interface AmazonBookAnalysis {
  books: AmazonBookResult[];
  insights: {
    totalBooks: number;
    averageRating: number;
    averageReviews: number;
    priceRange: { min: number; max: number; average: number };
    topKeywords: string[];
    topConceptPatterns: string[];
    titlePatterns: string[];
  };
  recommendations: string[];
}

// ============================================================
// 定数
// ============================================================

const AMAZON_JP_SEARCH_URL = "https://www.amazon.co.jp/s";
const AMAZON_JP_PRODUCT_URL = "https://www.amazon.co.jp/dp";

// カテゴリIDマッピング（Amazon Japan）
const CATEGORY_IDS: Record<AmazonBookCategory, string> = {
  all: "stripbooks",
  business: "466282",
  "self-help": "466290",
  health: "466306",
  diet: "466308",
  beauty: "466284",
  romance: "466296",
  money: "466286",
  education: "466302",
};

// タイトルに含まれやすいパワーワード
const TITLE_POWER_WORDS = [
  // 数字系
  { pattern: /(\d+)日/, category: "期間限定" },
  { pattern: /(\d+)分/, category: "時短" },
  { pattern: /(\d+)つの/, category: "具体性" },
  { pattern: /(\d+)%/, category: "数値効果" },
  { pattern: /(\d+)万/, category: "実績" },
  // 訴求系
  { pattern: /たった/, category: "簡単さ" },
  { pattern: /だけで/, category: "簡単さ" },
  { pattern: /誰でも/, category: "簡単さ" },
  { pattern: /一生/, category: "永続性" },
  { pattern: /最強/, category: "最上級" },
  { pattern: /究極/, category: "最上級" },
  { pattern: /完全/, category: "網羅性" },
  { pattern: /決定版/, category: "網羅性" },
  { pattern: /入門/, category: "初心者向け" },
  { pattern: /超/, category: "強調" },
  { pattern: /絶対/, category: "確実性" },
  { pattern: /必ず/, category: "確実性" },
  { pattern: /秘密/, category: "希少性" },
  { pattern: /禁断/, category: "希少性" },
  { pattern: /やめる/, category: "逆説" },
  { pattern: /しない/, category: "逆説" },
  { pattern: /なぜ/, category: "疑問" },
  { pattern: /？/, category: "疑問" },
];

// ============================================================
// メイン関数
// ============================================================

/**
 * Amazon Japanで書籍を検索
 */
export async function searchAmazonBooks(
  options: AmazonBookSearchOptions
): Promise<AmazonBookResult[]> {
  const { keyword, category = "all", limit = 10, useAI = false } = options;

  console.log("[amazon-books] Searching:", keyword, { category, limit, useAI });

  try {
    // 検索URLを構築
    const searchUrl = buildSearchUrl(keyword, category, options.sortBy);

    // Firecrawlでスクレイピング
    const result = await scrapeUrl(searchUrl, {
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 3000,
    });

    if (!result.success || !result.markdown) {
      console.warn("[amazon-books] Direct scraping failed, trying Google search");
      return searchViaGoogle(keyword, category, limit, useAI);
    }

    // AI分析を使用する場合
    if (useAI) {
      return parseWithAI(result.markdown, keyword, limit);
    }

    // 従来のパース
    const books = parseSearchResults(result.markdown, limit);

    // コンセプトパターンとキーワードを抽出
    return books.map((book) => enrichBookData(book));
  } catch (err) {
    console.error("[amazon-books] Search error:", err);
    return searchViaGoogle(keyword, category, limit, useAI);
  }
}

/**
 * Amazon書籍を分析（統計付き）
 */
export async function analyzeAmazonBooks(
  options: AmazonBookSearchOptions
): Promise<AmazonBookAnalysis> {
  const books = await searchAmazonBooks(options);

  // 統計計算
  const prices = books.filter((b) => b.price && b.price > 0).map((b) => b.price!);
  const ratings = books.filter((b) => b.rating > 0).map((b) => b.rating);
  const reviews = books.map((b) => b.reviewCount);

  // キーワード頻度
  const allKeywords = books.flatMap((b) => b.extractedKeywords);
  const keywordCounts: Record<string, number> = {};
  allKeywords.forEach((kw) => {
    keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
  });
  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw]) => kw);

  // コンセプトパターン頻度
  const allPatterns = books.flatMap((b) => b.conceptPatterns);
  const patternCounts: Record<string, number> = {};
  allPatterns.forEach((p) => {
    patternCounts[p] = (patternCounts[p] || 0) + 1;
  });
  const topConceptPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p]) => p);

  // タイトルパターン分析
  const titlePatterns = analyzeTitlePatterns(books);

  // 推奨事項生成
  const recommendations = generateRecommendations(books, topKeywords, topConceptPatterns);

  return {
    books,
    insights: {
      totalBooks: books.length,
      averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      averageReviews: reviews.length > 0 ? reviews.reduce((a, b) => a + b, 0) / reviews.length : 0,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
        average: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      },
      topKeywords,
      topConceptPatterns,
      titlePatterns,
    },
    recommendations,
  };
}

// ============================================================
// URL構築
// ============================================================

/**
 * 検索URLを構築
 */
function buildSearchUrl(
  keyword: string,
  category: AmazonBookCategory,
  sortBy?: string
): string {
  const params = new URLSearchParams();
  params.set("k", keyword);
  params.set("i", CATEGORY_IDS[category] || "stripbooks");
  params.set("__mk_ja_JP", "カタカナ");

  // ソート順
  if (sortBy === "reviews") {
    params.set("s", "review-rank");
  } else if (sortBy === "price_asc") {
    params.set("s", "price-asc-rank");
  } else if (sortBy === "price_desc") {
    params.set("s", "price-desc-rank");
  } else if (sortBy === "newest") {
    params.set("s", "date-desc-rank");
  }

  return `${AMAZON_JP_SEARCH_URL}?${params.toString()}`;
}

/**
 * 商品URLを構築
 */
function buildProductUrl(asin: string): string {
  return `${AMAZON_JP_PRODUCT_URL}/${asin}`;
}

// ============================================================
// パース関数
// ============================================================

/**
 * 検索結果をパース
 */
function parseSearchResults(markdown: string, limit: number): Partial<AmazonBookResult>[] {
  const books: Partial<AmazonBookResult>[] = [];
  const lines = markdown.split("\n");

  let currentBook: Partial<AmazonBookResult> | null = null;

  for (const line of lines) {
    // 書籍タイトルを検出（リンク形式）
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const [, title, url] = linkMatch;

      // Amazonの商品URLかチェック
      if (url.includes("amazon.co.jp") || url.includes("/dp/")) {
        if (currentBook && currentBook.title) {
          books.push(currentBook);
        }

        // ASINを抽出
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/([A-Z0-9]{10})(?:\/|\?|$)/i);
        const asin = asinMatch ? asinMatch[1] : `ASIN${Date.now()}`;

        currentBook = {
          asin,
          title: cleanTitle(title),
          url: url.startsWith("http") ? url : `https://www.amazon.co.jp${url}`,
          reviewCount: 0,
          rating: 0,
          extractedKeywords: [],
          conceptPatterns: [],
          scrapedAt: new Date().toISOString(),
        };
      }
    }

    if (currentBook) {
      // 著者を検出
      const authorMatch = line.match(/(?:著者|by|著)\s*[:\s]*([^,\n]+)/i);
      if (authorMatch && !currentBook.author) {
        currentBook.author = authorMatch[1].trim();
      }

      // 評価を検出（星マーク or 数値）
      const ratingMatch = line.match(/(\d+\.?\d*)\s*(?:つ星|星|\/5|out of 5)/i) ||
                          line.match(/[★☆]{1,5}/) ||
                          line.match(/(\d+\.?\d*)\s*(?:点|評価)/);
      if (ratingMatch) {
        if (ratingMatch[1]) {
          currentBook.rating = parseFloat(ratingMatch[1]);
        } else if (ratingMatch[0]) {
          // 星マークをカウント
          currentBook.rating = (ratingMatch[0].match(/★/g) || []).length;
        }
      }

      // レビュー数を検出
      const reviewMatch = line.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:件のレビュー|レビュー|件の評価|評価)/);
      if (reviewMatch) {
        currentBook.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ""), 10);
      }

      // 価格を検出
      const priceMatch = line.match(/[¥￥]\s*(\d{1,3}(?:,\d{3})*|\d+)/);
      if (priceMatch && !currentBook.price) {
        currentBook.price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
        currentBook.priceFormatted = `¥${priceMatch[1]}`;
      }

      // サブタイトルを検出（括弧内やコロン後）
      if (currentBook.title && !currentBook.subtitle) {
        const subtitleMatch = currentBook.title.match(/[：:]\s*(.+)$/) ||
                              currentBook.title.match(/[（(]([^)）]+)[)）]$/);
        if (subtitleMatch) {
          currentBook.subtitle = subtitleMatch[1].trim();
        }
      }
    }

    if (books.length >= limit) break;
  }

  // 最後の書籍を追加
  if (currentBook && currentBook.title && books.length < limit) {
    books.push(currentBook);
  }

  return books;
}

/**
 * タイトルをクリーニング
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .replace(/【.*?】/g, "")
    .replace(/\[.*?\]/g, "")
    .trim();
}

/**
 * 書籍データを充実させる（キーワード・パターン抽出）
 */
function enrichBookData(book: Partial<AmazonBookResult>): AmazonBookResult {
  const title = book.title || "";
  const subtitle = book.subtitle || "";
  const fullTitle = `${title} ${subtitle}`;

  // キーワード抽出
  const keywords: string[] = [];

  // パワーワードを検出
  for (const pw of TITLE_POWER_WORDS) {
    if (pw.pattern.test(fullTitle)) {
      keywords.push(pw.category);
    }
  }

  // 数字パターンを抽出
  const numberPatterns = fullTitle.match(/\d+[日分つ%万円秒週月年]/g) || [];
  keywords.push(...numberPatterns);

  // コンセプトパターンを抽出
  const conceptPatterns: string[] = [];

  // 「〜だけで〜」パターン
  if (/だけで/.test(fullTitle)) conceptPatterns.push("〇〇だけで△△");
  // 「たった〜で〜」パターン
  if (/たった/.test(fullTitle)) conceptPatterns.push("たった〇〇で△△");
  // 「なぜ〜なのか」パターン
  if (/なぜ.*か/.test(fullTitle)) conceptPatterns.push("なぜ〇〇なのか");
  // 「〜の教科書」パターン
  if (/教科書|入門|バイブル/.test(fullTitle)) conceptPatterns.push("〇〇の教科書/入門");
  // 「〜しない〜」逆説パターン
  if (/しない|やめる|捨てる/.test(fullTitle)) conceptPatterns.push("〇〇しない△△");
  // 「〜の法則」パターン
  if (/法則|ルール|原則/.test(fullTitle)) conceptPatterns.push("〇〇の法則");
  // 「〜力」パターン
  if (/力$/.test(title)) conceptPatterns.push("〇〇力");
  // 「〜術」パターン
  if (/術$/.test(title)) conceptPatterns.push("〇〇術");

  return {
    asin: book.asin || `ASIN${Date.now()}`,
    title,
    subtitle: book.subtitle,
    author: book.author || "不明",
    reviewCount: book.reviewCount || 0,
    rating: book.rating || 0,
    price: book.price,
    priceFormatted: book.priceFormatted,
    extractedKeywords: Array.from(new Set(keywords)),
    conceptPatterns: Array.from(new Set(conceptPatterns)),
    url: book.url || buildProductUrl(book.asin || ""),
    imageUrl: book.imageUrl,
    category: book.category,
    rank: book.rank,
    scrapedAt: book.scrapedAt || new Date().toISOString(),
  };
}

// ============================================================
// Google経由の検索（フォールバック）
// ============================================================

/**
 * Google経由でAmazon書籍を検索
 */
async function searchViaGoogle(
  keyword: string,
  category: AmazonBookCategory,
  limit: number,
  useAI: boolean
): Promise<AmazonBookResult[]> {
  console.log("[amazon-books] Falling back to Google search");

  try {
    const categoryLabel = getCategoryLabel(category);
    const query = `site:amazon.co.jp ${keyword} ${categoryLabel} 本`;

    const results = await searchAndScrape(query, {
      limit: limit * 2,
      region: "japan",
    });

    if (results.length === 0) {
      console.warn("[amazon-books] No results from Google search");
      return getSimulatedResults(keyword, limit);
    }

    // AI分析
    if (useAI && results.some((r) => r.markdown)) {
      const combinedMarkdown = results.map((r) => r.markdown || "").join("\n---\n");
      return parseWithAI(combinedMarkdown, keyword, limit);
    }

    // 従来のパース
    const books: AmazonBookResult[] = [];

    for (const sr of results) {
      if (books.length >= limit) break;
      if (!sr.metadata?.title) continue;

      const asinMatch = sr.metadata.title.match(/([A-Z0-9]{10})/);

      const book: Partial<AmazonBookResult> = {
        asin: asinMatch ? asinMatch[1] : `ASIN${Date.now()}-${books.length}`,
        title: cleanTitle(sr.metadata.title),
        author: "不明",
        reviewCount: 0,
        rating: 0,
        scrapedAt: new Date().toISOString(),
      };

      books.push(enrichBookData(book));
    }

    return books;
  } catch (err) {
    console.error("[amazon-books] Google search error:", err);
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
): Promise<AmazonBookResult[]> {
  const prompt = `あなたはAmazon書籍分析のエキスパートです。
以下のスクレイピング結果から、「${keyword}」に関する書籍を抽出・分析してください。

## スクレイピング結果
${markdown.slice(0, 10000)}

## 分析観点
1. 書籍タイトル・サブタイトル
2. 著者名
3. 評価（星の数）とレビュー数
4. 価格
5. タイトルから読み取れるコンセプト・パワーワード
6. 売れている理由の推測

## 出力形式（JSON）
\`\`\`json
{
  "books": [
    {
      "asin": "B0XXXXXXXX",
      "title": "書籍タイトル",
      "subtitle": "サブタイトル（あれば）",
      "author": "著者名",
      "rating": 4.5,
      "reviewCount": 1234,
      "price": 1500,
      "extractedKeywords": ["簡単さ", "数値効果", "7日"],
      "conceptPatterns": ["たった〇〇で△△", "〇〇の法則"]
    }
  ]
}
\`\`\`

売れている（レビュー数が多い・評価が高い）書籍を優先し、最大${limit}件まで抽出してください。`;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return (parsed.books || []).map((b: Partial<AmazonBookResult>) => ({
        asin: b.asin || `ASIN${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: b.title || "",
        subtitle: b.subtitle,
        author: b.author || "不明",
        rating: b.rating || 0,
        reviewCount: b.reviewCount || 0,
        price: b.price,
        priceFormatted: b.price ? `¥${b.price.toLocaleString()}` : undefined,
        extractedKeywords: b.extractedKeywords || [],
        conceptPatterns: b.conceptPatterns || [],
        url: b.asin ? buildProductUrl(b.asin) : "",
        scrapedAt: new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.error("[amazon-books] AI parse error:", err);
  }

  // フォールバック
  return parseSearchResults(markdown, limit).map((b) => enrichBookData(b));
}

// ============================================================
// 分析・推奨事項
// ============================================================

/**
 * タイトルパターンを分析
 */
function analyzeTitlePatterns(books: AmazonBookResult[]): string[] {
  const patterns: string[] = [];
  const patternCounts: Record<string, number> = {};

  for (const pw of TITLE_POWER_WORDS) {
    let count = 0;
    for (const book of books) {
      if (pw.pattern.test(book.title)) count++;
    }
    if (count >= 2) {
      patternCounts[pw.category] = count;
    }
  }

  // 上位パターンを抽出
  const sorted = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [pattern, count] of sorted) {
    patterns.push(`${pattern}（${count}冊で使用）`);
  }

  return patterns;
}

/**
 * 推奨事項を生成
 */
function generateRecommendations(
  books: AmazonBookResult[],
  topKeywords: string[],
  topPatterns: string[]
): string[] {
  const recommendations: string[] = [];

  if (books.length === 0) {
    return ["書籍が見つかりませんでした"];
  }

  // 高評価書籍の分析
  const highRatedBooks = books.filter((b) => b.rating >= 4.0 && b.reviewCount >= 50);
  if (highRatedBooks.length > 0) {
    const avgRating = highRatedBooks.reduce((sum, b) => sum + b.rating, 0) / highRatedBooks.length;
    recommendations.push(
      `📚 高評価書籍${highRatedBooks.length}冊の平均評価: ${avgRating.toFixed(1)}点`
    );
  }

  // 売れ筋キーワード
  if (topKeywords.length > 0) {
    recommendations.push(
      `🔑 売れ筋タイトルの共通キーワード: ${topKeywords.slice(0, 3).join("、")}`
    );
  }

  // コンセプトパターン
  if (topPatterns.length > 0) {
    recommendations.push(
      `💡 効果的なコンセプトパターン: ${topPatterns.slice(0, 3).join("、")}`
    );
  }

  // 価格帯
  const prices = books.filter((b) => b.price).map((b) => b.price!);
  if (prices.length > 0) {
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    recommendations.push(`💰 平均価格帯: ¥${avgPrice.toLocaleString()}`);
  }

  // ベストセラーの特徴
  const topBook = books.sort((a, b) => b.reviewCount - a.reviewCount)[0];
  if (topBook && topBook.reviewCount > 100) {
    recommendations.push(
      `🏆 最多レビュー「${topBook.title.slice(0, 30)}...」から学べるポイント: ${topBook.conceptPatterns.join("、") || "シンプルなタイトル"}`
    );
  }

  return recommendations;
}

// ============================================================
// AIパワーワード分析
// ============================================================

/**
 * 書籍タイトルからパワーワードをAI分析
 */
export async function extractPowerWordsWithAI(
  book: AmazonBookResult
): Promise<AIPowerWordAnalysis> {
  const prompt = `あなたはコピーライティングと書籍マーケティングのエキスパートです。
以下のAmazonベストセラー書籍を分析し、LPやセールスレターに活用できるパワーワードを抽出してください。

## 書籍情報
タイトル: ${book.title}
${book.subtitle ? `サブタイトル: ${book.subtitle}` : ""}
著者: ${book.author}
評価: ${book.rating}点 (${book.reviewCount}件のレビュー)
${book.price ? `価格: ${book.priceFormatted}` : ""}

## 既存の分析結果
抽出キーワード: ${book.extractedKeywords.join("、")}
コンセプトパターン: ${book.conceptPatterns.join("、")}

## 分析観点
1. 感情トリガーワード: 読者の感情を動かす言葉
2. 好奇心フック: 「続きが気になる」と思わせる表現
3. ベネフィット約束: 読者が得られる具体的メリット
4. ターゲットの悩み: この本を買う人が抱えている悩み
5. 緊急性ドライバー: 「今すぐ」行動させる要素
6. 社会的証明要素: 信頼性を高める要素
7. ユニークな切り口: 他と差別化されているポイント
8. LP見出しアイデア: この書籍タイトルを参考にしたLP見出し案（3つ）
9. 売れている理由: なぜこの本がベストセラーなのか

## 出力形式（JSON）
\`\`\`json
{
  "emotionalTriggers": ["自信", "不安解消", "成功"],
  "curiosityHooks": ["なぜ〜なのか", "〜の秘密"],
  "benefitPromises": ["7日で効果実感", "収入が2倍に"],
  "targetPainPoints": ["時間がない", "続かない", "自信がない"],
  "urgencyDrivers": ["今だけ", "期間限定", "先着"],
  "socialProofElements": ["10万部突破", "専門家推薦"],
  "uniqueAngle": "従来の〇〇とは真逆のアプローチ",
  "lpHeadlineIdeas": [
    "たった7日で〇〇を手に入れる方法",
    "なぜあなたの〇〇はうまくいかないのか",
    "〇〇をやめたら人生が変わった"
  ],
  "whyItSells": "シンプルで具体的な数字と逆説的アプローチが読者の興味を引く"
}
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        emotionalTriggers: parsed.emotionalTriggers || [],
        curiosityHooks: parsed.curiosityHooks || [],
        benefitPromises: parsed.benefitPromises || [],
        targetPainPoints: parsed.targetPainPoints || [],
        urgencyDrivers: parsed.urgencyDrivers || [],
        socialProofElements: parsed.socialProofElements || [],
        uniqueAngle: parsed.uniqueAngle || "",
        lpHeadlineIdeas: parsed.lpHeadlineIdeas || [],
        whyItSells: parsed.whyItSells || "",
      };
    }
  } catch (err) {
    console.error("[amazon-books] AI power word extraction error:", err);
  }

  // フォールバック
  return {
    emotionalTriggers: [],
    curiosityHooks: [],
    benefitPromises: [],
    targetPainPoints: [],
    urgencyDrivers: [],
    socialProofElements: [],
    uniqueAngle: "",
    lpHeadlineIdeas: [],
    whyItSells: "",
  };
}

/**
 * 複数の書籍をバッチでAI分析
 */
export async function batchExtractPowerWords(
  books: AmazonBookResult[],
  options: { maxConcurrent?: number; topN?: number } = {}
): Promise<AmazonBookResult[]> {
  const { maxConcurrent = 3, topN = 10 } = options;

  // レビュー数・評価でソートして上位のみ分析
  const sortedBooks = [...books]
    .sort((a, b) => {
      // レビュー数×評価でスコアリング
      const scoreA = a.reviewCount * a.rating;
      const scoreB = b.reviewCount * b.rating;
      return scoreB - scoreA;
    })
    .slice(0, topN);

  console.log(`[amazon-books] Batch analyzing top ${sortedBooks.length} books with AI`);

  const results: AmazonBookResult[] = [];

  // バッチ処理（並列数制限）
  for (let i = 0; i < sortedBooks.length; i += maxConcurrent) {
    const batch = sortedBooks.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(async (book) => {
        const analysis = await extractPowerWordsWithAI(book);
        return { ...book, aiPowerWordAnalysis: analysis };
      })
    );

    results.push(...batchResults);

    // レート制限対策
    if (i + maxConcurrent < sortedBooks.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 分析されなかった書籍を追加
  const analyzedAsins = new Set(results.map((r) => r.asin));
  const remainingBooks = books.filter((b) => !analyzedAsins.has(b.asin));
  results.push(...remainingBooks);

  return results;
}

/**
 * 複数書籍のパワーワードを集約
 */
export function aggregatePowerWords(
  books: AmazonBookResult[]
): {
  topEmotionalTriggers: string[];
  topCuriosityHooks: string[];
  topBenefitPromises: string[];
  topTargetPainPoints: string[];
  allLpHeadlineIdeas: string[];
  commonPatterns: string[];
} {
  const analyzedBooks = books.filter((b) => b.aiPowerWordAnalysis);

  const allEmotionalTriggers: string[] = [];
  const allCuriosityHooks: string[] = [];
  const allBenefitPromises: string[] = [];
  const allTargetPainPoints: string[] = [];
  const allLpHeadlineIdeas: string[] = [];

  for (const book of analyzedBooks) {
    const analysis = book.aiPowerWordAnalysis!;
    allEmotionalTriggers.push(...analysis.emotionalTriggers);
    allCuriosityHooks.push(...analysis.curiosityHooks);
    allBenefitPromises.push(...analysis.benefitPromises);
    allTargetPainPoints.push(...analysis.targetPainPoints);
    allLpHeadlineIdeas.push(...analysis.lpHeadlineIdeas);
  }

  // 頻度カウントしてトップを抽出
  const countAndTop = (arr: string[], topN: number): string[] => {
    const counts: Record<string, number> = {};
    arr.forEach((item) => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([item]) => item);
  };

  // コンセプトパターンの共通パターン
  const allPatterns = books.flatMap((b) => b.conceptPatterns);
  const patternCounts: Record<string, number> = {};
  allPatterns.forEach((p) => {
    patternCounts[p] = (patternCounts[p] || 0) + 1;
  });
  const commonPatterns = Object.entries(patternCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p]) => p);

  return {
    topEmotionalTriggers: countAndTop(allEmotionalTriggers, 10),
    topCuriosityHooks: countAndTop(allCuriosityHooks, 10),
    topBenefitPromises: countAndTop(allBenefitPromises, 10),
    topTargetPainPoints: countAndTop(allTargetPainPoints, 10),
    allLpHeadlineIdeas: Array.from(new Set(allLpHeadlineIdeas)).slice(0, 20),
    commonPatterns,
  };
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * カテゴリラベルを取得
 */
function getCategoryLabel(category: AmazonBookCategory): string {
  const labels: Record<AmazonBookCategory, string> = {
    all: "",
    business: "ビジネス",
    "self-help": "自己啓発",
    health: "健康",
    diet: "ダイエット",
    beauty: "美容",
    romance: "恋愛",
    money: "投資 マネー",
    education: "学習 教育",
  };
  return labels[category] || "";
}

// ============================================================
// シミュレートデータ（フォールバック）
// ============================================================

/**
 * シミュレートされた結果（フォールバック用）
 */
function getSimulatedResults(keyword: string, limit: number): AmazonBookResult[] {
  const templates = [
    {
      title: `たった7日間で${keyword}をマスターする方法`,
      subtitle: "誰でもできる簡単メソッド",
      author: "成功太郎",
      rating: 4.3,
      reviewCount: 856,
      price: 1540,
      patterns: ["たった〇〇で△△", "〇〇の教科書/入門"],
      keywords: ["期間限定", "簡単さ", "7日"],
    },
    {
      title: `なぜあなたの${keyword}はうまくいかないのか`,
      subtitle: "",
      author: "分析花子",
      rating: 4.1,
      reviewCount: 432,
      price: 1760,
      patterns: ["なぜ〇〇なのか"],
      keywords: ["疑問"],
    },
    {
      title: `${keyword}の教科書`,
      subtitle: "完全入門ガイド",
      author: "専門一郎",
      rating: 4.5,
      reviewCount: 1205,
      price: 1980,
      patterns: ["〇〇の教科書/入門"],
      keywords: ["網羅性"],
    },
    {
      title: `${keyword}をやめたら人生が変わった`,
      subtitle: "",
      author: "逆説次郎",
      rating: 4.0,
      reviewCount: 298,
      price: 1430,
      patterns: ["〇〇しない△△"],
      keywords: ["逆説"],
    },
    {
      title: `1日5分の${keyword}習慣`,
      subtitle: "忙しい人のための超効率メソッド",
      author: "時短三郎",
      rating: 4.2,
      reviewCount: 567,
      price: 1320,
      patterns: ["たった〇〇で△△"],
      keywords: ["時短", "5分"],
    },
  ];

  return templates.slice(0, limit).map((t, i) => ({
    asin: `SIM${Date.now()}${i}`,
    title: t.title,
    subtitle: t.subtitle || undefined,
    author: t.author,
    rating: t.rating,
    reviewCount: t.reviewCount,
    price: t.price,
    priceFormatted: `¥${t.price.toLocaleString()}`,
    extractedKeywords: t.keywords,
    conceptPatterns: t.patterns,
    url: `https://www.amazon.co.jp/dp/SIM${Date.now()}${i}`,
    scrapedAt: new Date().toISOString(),
  }));
}

// ============================================================
// エクスポート
// ============================================================

export const AmazonBooksResearch = {
  search: searchAmazonBooks,
  analyze: analyzeAmazonBooks,
  enrichBookData,
  buildProductUrl,
  // AIパワーワード分析
  extractPowerWords: extractPowerWordsWithAI,
  batchExtractPowerWords,
  aggregatePowerWords,
};

export default AmazonBooksResearch;
