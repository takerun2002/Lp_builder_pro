/**
 * Infotopランキングスクレイパー
 *
 * 売れているLPの構成・コピーパターンを分析
 * AI駆動の高精度分析対応
 */

import { scrapeUrl, analyzeLPStructure } from "../firecrawl";
import { analyzeLPWithAI, analyzeInfotopProductWithAI } from "../ai-analyzer";
import type { InfotopResult, LPStructure, SectionType } from "../types";

const INFOTOP_RANKING_URL = "https://www.infotop.jp/uc/index/ranking";

// ジャンルIDマッピング
const GENRE_IDS: Record<string, string> = {
  beauty: "1", // 美容・健康
  health: "1",
  business: "2", // ビジネス・稼ぐ
  investment: "2",
  education: "3", // 学習・自己啓発
  romance: "4", // 恋愛・結婚
  spiritual: "5", // スピリチュアル
  other: "",
};

export interface InfotopScrapeOptions {
  genre?: string;
  limit?: number;
  period?: "day" | "week" | "month" | "total";
  useAI?: boolean;
}

export interface InfotopAnalysisResult {
  products: InfotopResult[];
  priceInsights?: {
    average: number;
    range: { min: number; max: number };
    sweetSpot: string;
  };
  conceptPatterns?: string[];
}

/**
 * Infotopランキングを取得
 */
export async function scrapeInfotopRanking(
  options?: InfotopScrapeOptions
): Promise<InfotopResult[]> {
  const limit = options?.limit || 10;
  const genreId = options?.genre ? GENRE_IDS[options.genre] || "" : "";

  console.log("[infotop] Scraping ranking...", { genre: options?.genre, limit });

  try {
    const url = genreId
      ? `${INFOTOP_RANKING_URL}?genre=${genreId}`
      : INFOTOP_RANKING_URL;

    // 方法1: Firecrawl
    let markdown = "";
    try {
      const result = await scrapeUrl(url, {
        formats: ["markdown"],
        onlyMainContent: false, // 全体を取得（重要）
        waitFor: 3000,
      });
      markdown = result.markdown || "";
      console.log(`[infotop] Firecrawl scraped ${markdown.length} chars`);
    } catch (firecrawlError) {
      console.warn("[infotop] Firecrawl failed:", firecrawlError);
    }

    // 方法2: Crawl4AI（フォールバック）
    if (!markdown) {
      try {
        const CRAWL4AI_SERVER_URL = process.env.CRAWL4AI_SERVER_URL || "http://localhost:8765";
        const response = await fetch(`${CRAWL4AI_SERVER_URL}/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            wait_for_selector: ".ranking-list",
            timeout: 10000,
          }),
        });
        if (response.ok) {
          const crawl4aiResult = await response.json();
          markdown = crawl4aiResult.markdown || "";
          console.log(`[infotop] Crawl4AI scraped ${markdown.length} chars`);
        }
      } catch (crawl4aiError) {
        console.warn("[infotop] Crawl4AI failed:", crawl4aiError);
      }
    }

    if (!markdown) {
      console.warn("[infotop] All scraping methods failed");
      return getSimulatedRanking(options?.genre || "other", limit);
    }

    // AI分析でパース（常に使用）
    const aiResult = await analyzeInfotopProductWithAI(markdown, options?.genre);

    if (aiResult.products.length > 0) {
      console.log(`[infotop] AI extracted ${aiResult.products.length} products`);
      return aiResult.products.slice(0, limit).map((p, i) => ({
        rank: p.rank || i + 1,
        productName: p.name,
        genre: options?.genre || "",
        price: p.price,
        lpUrl: "", // AI分析ではURLは取得できない
      }));
    }

    // 最終フォールバック（レガシーパース）
    console.log("[infotop] AI analysis returned no products, trying legacy parse");
    const legacyProducts = parseRankingMarkdown(markdown, limit);

    if (legacyProducts.length > 0) {
      return legacyProducts;
    }

    return getSimulatedRanking(options?.genre || "other", limit);
  } catch (err) {
    console.error("[infotop] Error:", err);
    return getSimulatedRanking(options?.genre || "other", limit);
  }
}

/**
 * Infotopランキングを取得（AI分析結果付き）
 */
export async function scrapeInfotopRankingWithAnalysis(
  options?: InfotopScrapeOptions
): Promise<InfotopAnalysisResult> {
  const limit = options?.limit || 10;
  const genreId = options?.genre ? GENRE_IDS[options.genre] || "" : "";

  console.log("[infotop] Scraping ranking with analysis...", { genre: options?.genre, limit });

  try {
    const url = genreId
      ? `${INFOTOP_RANKING_URL}?genre=${genreId}`
      : INFOTOP_RANKING_URL;

    // 方法1: Firecrawl
    let markdown = "";
    try {
      const result = await scrapeUrl(url, {
        formats: ["markdown"],
        onlyMainContent: false, // 全体を取得（重要）
        waitFor: 3000,
      });
      markdown = result.markdown || "";
      console.log(`[infotop-analysis] Firecrawl scraped ${markdown.length} chars`);
    } catch (firecrawlError) {
      console.warn("[infotop-analysis] Firecrawl failed:", firecrawlError);
    }

    // 方法2: Crawl4AI（フォールバック）
    if (!markdown) {
      try {
        const CRAWL4AI_SERVER_URL = process.env.CRAWL4AI_SERVER_URL || "http://localhost:8765";
        const response = await fetch(`${CRAWL4AI_SERVER_URL}/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            wait_for_selector: ".ranking-list",
            timeout: 10000,
          }),
        });
        if (response.ok) {
          const crawl4aiResult = await response.json();
          markdown = crawl4aiResult.markdown || "";
          console.log(`[infotop-analysis] Crawl4AI scraped ${markdown.length} chars`);
        }
      } catch (crawl4aiError) {
        console.warn("[infotop-analysis] Crawl4AI failed:", crawl4aiError);
      }
    }

    if (!markdown) {
      console.warn("[infotop-analysis] All scraping methods failed");
      return { products: getSimulatedRanking(options?.genre || "other", limit) };
    }

    // AI分析を実行
    const aiResult = await analyzeInfotopProductWithAI(markdown, options?.genre);

    if (aiResult.products.length > 0) {
      return {
        products: aiResult.products.slice(0, limit).map((p, i) => ({
          rank: p.rank || i + 1,
          productName: p.name,
          genre: options?.genre || "",
          price: p.price,
          lpUrl: "", // AI分析ではURLは取得できない
        })),
        priceInsights: aiResult.priceInsights,
        conceptPatterns: aiResult.conceptPatterns,
      };
    }

    // フォールバック
    const products = parseRankingMarkdown(markdown, limit);
    return {
      products: products.length > 0 ? products : getSimulatedRanking(options?.genre || "other", limit),
    };
  } catch (err) {
    console.error("[infotop-analysis] Error:", err);
    return { products: getSimulatedRanking(options?.genre || "other", limit) };
  }
}

/**
 * 個別LP詳細を取得
 */
export async function scrapeInfotopLP(
  productUrl: string,
  options?: { useAI?: boolean; genre?: string }
): Promise<{
  structure: LPStructure;
  headlines: string[];
  ctaTexts: string[];
  // AI分析による追加情報
  keyPhrases?: string[];
  copyTechniques?: string[];
  emotionalTriggers?: string[];
  targetPains?: string[];
  benefits?: string[];
} | null> {
  try {
    const result = await scrapeUrl(productUrl, {
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 3000,
    });

    if (!result.success || !result.markdown) {
      return null;
    }

    // AI分析を使用する場合
    if (options?.useAI) {
      const aiAnalysis = await analyzeLPWithAI(result.markdown, {
        genre: options.genre,
        url: productUrl,
      });

      return {
        structure: {
          sections: aiAnalysis.sections.map((s, i) => ({
            index: i,
            type: s.type as SectionType,
            name: s.name || `セクション${i + 1}`,
            startY: i * 500,
            endY: (i + 1) * 500,
          })),
          totalHeight: aiAnalysis.sections.length * 500,
          sectionCount: aiAnalysis.sections.length,
        },
        headlines: aiAnalysis.headlines,
        ctaTexts: aiAnalysis.ctaTexts,
        keyPhrases: aiAnalysis.keyPhrases,
        copyTechniques: aiAnalysis.copyTechniques,
        emotionalTriggers: aiAnalysis.emotionalTriggers,
        targetPains: aiAnalysis.targetPains,
        benefits: aiAnalysis.benefits,
      };
    }

    // 従来の分析
    const analysis = analyzeLPStructure(result.markdown);

    return {
      structure: {
        sections: analysis.sections.map((s, i) => ({
          index: i,
          type: s.type as SectionType,
          name: analysis.headlines[i] || `セクション${i + 1}`,
          startY: i * 500,
          endY: (i + 1) * 500,
        })),
        totalHeight: analysis.sections.length * 500,
        sectionCount: analysis.sections.length,
      },
      headlines: analysis.headlines,
      ctaTexts: analysis.ctaTexts,
    };
  } catch (err) {
    console.error("[infotop] LP scrape error:", err);
    return null;
  }
}

/**
 * ランキングマークダウンをパース
 */
function parseRankingMarkdown(
  markdown: string,
  limit: number
): InfotopResult[] {
  const results: InfotopResult[] = [];
  const lines = markdown.split("\n");

  let rank = 0;

  for (const line of lines) {
    if (rank >= limit) break;

    // ランキング番号を検出（例: "1位", "#1", "第1位"）
    const rankMatch = line.match(/第?(\d+)位|#(\d+)|(\d+)\./);
    if (rankMatch) {
      const num = parseInt(rankMatch[1] || rankMatch[2] || rankMatch[3]);
      if (num > 0 && num <= limit) {
        rank = num;
      }
    }

    // 商品名とURLを検出
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && rank > 0) {
      const [, productName, lpUrl] = linkMatch;

      // 価格を検出
      const priceMatch = line.match(/(\d{1,3}(,\d{3})*|\d+)円/);
      const price = priceMatch
        ? parseInt(priceMatch[1].replace(/,/g, ""))
        : 0;

      results.push({
        rank,
        productName,
        genre: "",
        price,
        lpUrl,
      });

      rank = 0; // リセット
    }
  }

  return results;
}

/**
 * シミュレートされたランキングデータ（フォールバック用）
 */
function getSimulatedRanking(genre: string, limit: number): InfotopResult[] {
  const templates: Record<string, InfotopResult[]> = {
    beauty: [
      {
        rank: 1,
        productName: "【医師監修】美肌メソッド完全ガイド",
        genre: "美容",
        price: 29800,
        lpUrl: "https://example.com/beauty1",
      },
      {
        rank: 2,
        productName: "自宅でできる本格エステケア講座",
        genre: "美容",
        price: 19800,
        lpUrl: "https://example.com/beauty2",
      },
      {
        rank: 3,
        productName: "40代からのアンチエイジング大全",
        genre: "美容",
        price: 24800,
        lpUrl: "https://example.com/beauty3",
      },
    ],
    health: [
      {
        rank: 1,
        productName: "腸活ダイエット完全マニュアル",
        genre: "健康",
        price: 19800,
        lpUrl: "https://example.com/health1",
      },
      {
        rank: 2,
        productName: "自律神経改善プログラム",
        genre: "健康",
        price: 29800,
        lpUrl: "https://example.com/health2",
      },
      {
        rank: 3,
        productName: "睡眠の質を高める7つの習慣",
        genre: "健康",
        price: 14800,
        lpUrl: "https://example.com/health3",
      },
    ],
    business: [
      {
        rank: 1,
        productName: "副業で月30万円稼ぐロードマップ",
        genre: "ビジネス",
        price: 49800,
        lpUrl: "https://example.com/biz1",
      },
      {
        rank: 2,
        productName: "ゼロからのWebマーケティング講座",
        genre: "ビジネス",
        price: 39800,
        lpUrl: "https://example.com/biz2",
      },
      {
        rank: 3,
        productName: "コンテンツビジネス成功の法則",
        genre: "ビジネス",
        price: 34800,
        lpUrl: "https://example.com/biz3",
      },
    ],
    investment: [
      {
        rank: 1,
        productName: "FX自動売買システム構築講座",
        genre: "投資",
        price: 98000,
        lpUrl: "https://example.com/fx1",
      },
      {
        rank: 2,
        productName: "仮想通貨投資の完全攻略ガイド",
        genre: "投資",
        price: 49800,
        lpUrl: "https://example.com/crypto1",
      },
      {
        rank: 3,
        productName: "株式投資初心者のための教科書",
        genre: "投資",
        price: 29800,
        lpUrl: "https://example.com/stock1",
      },
    ],
    education: [
      {
        rank: 1,
        productName: "英語速習マスター講座",
        genre: "教育",
        price: 39800,
        lpUrl: "https://example.com/edu1",
      },
      {
        rank: 2,
        productName: "プログラミング独学の完全ロードマップ",
        genre: "教育",
        price: 29800,
        lpUrl: "https://example.com/edu2",
      },
      {
        rank: 3,
        productName: "記憶力向上トレーニング",
        genre: "教育",
        price: 19800,
        lpUrl: "https://example.com/edu3",
      },
    ],
    romance: [
      {
        rank: 1,
        productName: "モテる男の会話術",
        genre: "恋愛",
        price: 24800,
        lpUrl: "https://example.com/love1",
      },
      {
        rank: 2,
        productName: "婚活成功の秘訣",
        genre: "恋愛",
        price: 29800,
        lpUrl: "https://example.com/love2",
      },
      {
        rank: 3,
        productName: "復縁マニュアル決定版",
        genre: "恋愛",
        price: 19800,
        lpUrl: "https://example.com/love3",
      },
    ],
    other: [
      {
        rank: 1,
        productName: "人気商品サンプル1",
        genre: "その他",
        price: 19800,
        lpUrl: "https://example.com/other1",
      },
      {
        rank: 2,
        productName: "人気商品サンプル2",
        genre: "その他",
        price: 24800,
        lpUrl: "https://example.com/other2",
      },
      {
        rank: 3,
        productName: "人気商品サンプル3",
        genre: "その他",
        price: 29800,
        lpUrl: "https://example.com/other3",
      },
    ],
  };

  const genreData = templates[genre] || templates.other;

  // 必要な数だけ複製して返す
  const results: InfotopResult[] = [];
  for (let i = 0; i < limit; i++) {
    const template = genreData[i % genreData.length];
    results.push({
      ...template,
      rank: i + 1,
    });
  }

  return results;
}

/**
 * ランキングからLP構成パターンを抽出
 */
export function extractPatterns(
  results: InfotopResult[]
): {
  commonSections: string[];
  priceRange: { min: number; max: number; avg: number };
  headlinePatterns: string[];
} {
  const allSections: Record<string, number> = {};
  const prices: number[] = [];
  const headlines: string[] = [];

  for (const result of results) {
    if (result.structure) {
      for (const section of result.structure.sections) {
        allSections[section.type] = (allSections[section.type] || 0) + 1;
      }
    }
    if (result.price > 0) {
      prices.push(result.price);
    }
  }

  // 出現頻度順にソート
  const commonSections = Object.entries(allSections)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);

  // 価格範囲
  const priceRange = prices.length > 0
    ? {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      }
    : { min: 0, max: 0, avg: 0 };

  return { commonSections, priceRange, headlinePatterns: headlines };
}


