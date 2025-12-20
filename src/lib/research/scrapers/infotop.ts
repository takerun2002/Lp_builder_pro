/**
 * Infotopランキングスクレイパー
 *
 * 売れているLPの構成・コピーパターンを分析
 * AI駆動の高精度分析対応
 */

import { scrapeUrl, analyzeLPStructure } from "../firecrawl";
import { analyzeLPWithAI, analyzeInfotopProductWithAI, analyzeInfotopProductPage } from "../ai-analyzer";
import { scrapeWithProviderChain } from "../scraping/provider-chain";
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

/**
 * スクレイピング結果の詳細情報
 */
export interface InfotopScrapeResult {
  success: boolean;
  products: InfotopResult[];
  source: "firecrawl" | "crawl4ai" | "direct" | "cache" | "sample" | "error";
  error?: string;
  metadata?: {
    scrapedAt: string;
    processingTimeMs: number;
    markdownLength: number;
    retryCount: number;
  };
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
 * Infotopランキングを取得（詳細結果版）
 */
export async function scrapeInfotopRankingDetailed(
  options?: InfotopScrapeOptions
): Promise<InfotopScrapeResult> {
  const limit = options?.limit || 10;
  const genreId = options?.genre ? GENRE_IDS[options.genre] || "" : "";
  const startTime = Date.now();

  console.log("[infotop] ====== スクレイピング開始 ======");
  console.log("[infotop] ジャンル:", options?.genre, "→ ID:", genreId);
  console.log("[infotop] 取得件数:", limit);

  try {
    const url = genreId
      ? `${INFOTOP_RANKING_URL}?genre=${genreId}`
      : INFOTOP_RANKING_URL;

    console.log("[infotop] ターゲットURL:", url);

    // プロバイダーチェーンでスクレイピング（Crawl4AI優先）
    const scrapeResult = await scrapeWithProviderChain(url, {
      waitForSelector: ".ranking-list, .product-list, table",
      timeoutMs: 30000,
    });

    console.log(`[infotop] Scrape result: source=${scrapeResult.source}, success=${scrapeResult.success}`);

    // スクレイピング結果の評価
    const markdown = scrapeResult.markdown;
    const scrapeSource = scrapeResult.source as InfotopScrapeResult["source"];

    console.log("[infotop] ====== スクレイピング結果 ======");
    console.log("[infotop] ソース:", scrapeSource);
    console.log("[infotop] マークダウン長:", markdown.length);
    if (markdown.length > 0) {
      console.log("[infotop] 含まれるキーワード:", {
        "ランキング": markdown.includes("ランキング"),
        "位": markdown.includes("位"),
        "円": markdown.includes("円"),
        "商品": markdown.includes("商品"),
      });
    }

    if (!scrapeResult.success || markdown.length < 500) {
      console.error(`[infotop] ⚠️ スクレイピング失敗: ${scrapeResult.error}`);
      const elapsed = Date.now() - startTime;
      // サンプルデータは返さない - エラーを返す
      return {
        success: false,
        products: [],
        source: "error",
        error: scrapeResult.error || "スクレイピングに失敗しました。Crawl4AIサーバーとネットワーク接続を確認してください。",
        metadata: {
          scrapedAt: new Date().toISOString(),
          processingTimeMs: elapsed,
          markdownLength: markdown.length,
          retryCount: 0,
        },
      };
    }

    // AI分析でパース
    console.log("[infotop] AI分析を開始...");
    const aiResult = await analyzeInfotopProductWithAI(markdown, options?.genre);
    console.log("[infotop] AI分析結果:", {
      productCount: aiResult.products?.length || 0,
    });

    if (aiResult.products && aiResult.products.length > 0) {
      const elapsed = Date.now() - startTime;
      console.log(`[infotop] ✅ 成功！${aiResult.products.length}件取得 (${elapsed}ms)`);

      const products = aiResult.products.slice(0, limit).map((p, i) => ({
        rank: p.rank || i + 1,
        productName: p.name,
        genre: options?.genre || "",
        price: p.price,
        lpUrl: "", // LP URLは商品詳細ページから取得する
        productPageUrl: p.productPageUrl,
        concept: p.concept,
        targetPain: p.targetPain ? [p.targetPain] : undefined,
        benefits: p.benefit ? [p.benefit] : undefined,
      }));

      return {
        success: true,
        products,
        source: scrapeSource,
        metadata: {
          scrapedAt: new Date().toISOString(),
          processingTimeMs: elapsed,
          markdownLength: markdown.length,
          retryCount: 0,
        },
      };
    }

    // レガシーパース
    console.log("[infotop] AI分析失敗、レガシーパースを試行...");
    const legacyProducts = parseRankingMarkdown(markdown, limit);

    if (legacyProducts.length > 0) {
      console.log(`[infotop] レガシーパース成功: ${legacyProducts.length}件`);
      const elapsed = Date.now() - startTime;
      return {
        success: true,
        products: legacyProducts,
        source: scrapeSource,
        metadata: {
          scrapedAt: new Date().toISOString(),
          processingTimeMs: elapsed,
          markdownLength: markdown.length,
          retryCount: 0,
        },
      };
    }

    console.warn("[infotop] すべてのパース方法が失敗");
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      products: [],
      source: "error",
      error: "パース失敗: ランキングデータを抽出できませんでした",
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTimeMs: elapsed,
        markdownLength: markdown.length,
        retryCount: 0,
      },
    };

  } catch (err) {
    console.error("[infotop] 致命的エラー:", err);
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      products: [],
      source: "error",
      error: err instanceof Error ? err.message : "Unknown error",
      metadata: {
        scrapedAt: new Date().toISOString(),
        processingTimeMs: elapsed,
        markdownLength: 0,
        retryCount: 0,
      },
    };
  }
}

/**
 * Infotopランキングを取得（後方互換性のためのラッパー）
 */
export async function scrapeInfotopRanking(
  options?: InfotopScrapeOptions
): Promise<InfotopResult[]> {
  const result = await scrapeInfotopRankingDetailed(options);
  return result.products;
}

/**
 * Infotopランキングを取得（AI分析結果付き）
 */
export async function scrapeInfotopRankingWithAnalysis(
  options?: InfotopScrapeOptions
): Promise<InfotopAnalysisResult> {
  const limit = options?.limit || 10;
  const genreId = options?.genre ? GENRE_IDS[options.genre] || "" : "";

  console.log("[infotop-analysis] Scraping ranking with analysis...", { genre: options?.genre, limit });

  try {
    const url = genreId
      ? `${INFOTOP_RANKING_URL}?genre=${genreId}`
      : INFOTOP_RANKING_URL;

    // プロバイダーチェーンでスクレイピング（Crawl4AI優先）
    const scrapeResult = await scrapeWithProviderChain(url, {
      waitForSelector: ".ranking-list, .product-list, table",
      timeoutMs: 30000,
    });

    console.log(`[infotop-analysis] Scrape result: source=${scrapeResult.source}, success=${scrapeResult.success}`);

    if (!scrapeResult.success || scrapeResult.markdown.length < 500) {
      console.warn("[infotop-analysis] Scraping failed:", scrapeResult.error);
      return { products: [] };
    }

    // AI分析を実行
    const aiResult = await analyzeInfotopProductWithAI(scrapeResult.markdown, options?.genre);

    if (aiResult.products.length > 0) {
      return {
        products: aiResult.products.slice(0, limit).map((p, i) => ({
          rank: p.rank || i + 1,
          productName: p.name,
          genre: options?.genre || "",
          price: p.price,
          lpUrl: "", // LP URLは商品詳細ページから取得する
          productPageUrl: p.productPageUrl,
          concept: p.concept,
          targetPain: p.targetPain ? [p.targetPain] : undefined,
          benefits: p.benefit ? [p.benefit] : undefined,
        })),
        priceInsights: aiResult.priceInsights,
        conceptPatterns: aiResult.conceptPatterns,
      };
    }

    // フォールバック（レガシーパース）
    const products = parseRankingMarkdown(scrapeResult.markdown, limit);
    return { products };
  } catch (err) {
    console.error("[infotop-analysis] Error:", err);
    return { products: [] };
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
 * 商品詳細ページからLP URLとマーケティング情報を抽出
 */
export async function extractLPUrlFromProduct(
  productPageUrl: string
): Promise<{
  lpUrl: string | null;
  salesCopy: string | null;
  targetPain: string[] | null;
  benefits: string[] | null;
  priceStrategy: string | null;
  concept: string | null;
}> {
  console.log(`[infotop] Extracting LP URL from: ${productPageUrl}`);

  try {
    // 商品詳細ページをスクレイプ
    const result = await scrapeUrl(productPageUrl, {
      formats: ["markdown"],
      onlyMainContent: false,
      waitFor: 3000,
    });

    if (!result.markdown) {
      console.warn("[infotop] No markdown from product page");
      return {
        lpUrl: null,
        salesCopy: null,
        targetPain: null,
        benefits: null,
        priceStrategy: null,
        concept: null,
      };
    }

    // AIで分析
    const analysis = await analyzeInfotopProductPage(result.markdown);

    return {
      lpUrl: analysis.lpUrl,
      salesCopy: analysis.salesCopy || null,
      targetPain: analysis.targetPain.length > 0 ? analysis.targetPain : null,
      benefits: analysis.benefits.length > 0 ? analysis.benefits : null,
      priceStrategy: analysis.priceStrategy || null,
      concept: analysis.concept || null,
    };
  } catch (err) {
    console.error("[infotop] Extract LP URL error:", err);
    return {
      lpUrl: null,
      salesCopy: null,
      targetPain: null,
      benefits: null,
      priceStrategy: null,
      concept: null,
    };
  }
}

/**
 * ランキング取得後に各商品のLP URLを取得（並列処理）
 */
export async function scrapeInfotopRankingWithLPUrls(
  options?: InfotopScrapeOptions
): Promise<InfotopResult[]> {
  console.log("[infotop] Scraping ranking with LP URLs...");

  // まずランキングを取得
  const ranking = await scrapeInfotopRanking(options);

  if (ranking.length === 0) {
    console.warn("[infotop] No ranking results");
    return [];
  }

  // productPageUrl が無い商品は直接返す
  const productsWithPageUrl = ranking.filter((p) => p.productPageUrl);
  const productsWithoutPageUrl = ranking.filter((p) => !p.productPageUrl);

  if (productsWithPageUrl.length === 0) {
    console.log("[infotop] No products with page URLs, returning basic ranking");
    return ranking;
  }

  // 各商品の詳細ページからLP URLを取得（最大5件並列）
  const batchSize = 5;
  const enhanced: InfotopResult[] = [...productsWithoutPageUrl];

  for (let i = 0; i < productsWithPageUrl.length; i += batchSize) {
    const batch = productsWithPageUrl.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (product) => {
        if (!product.productPageUrl) return product;

        try {
          const details = await extractLPUrlFromProduct(product.productPageUrl);
          return {
            ...product,
            lpUrl: details.lpUrl || product.lpUrl,
            salesCopy: details.salesCopy || undefined,
            targetPain: details.targetPain || undefined,
            benefits: details.benefits || undefined,
            priceStrategy: details.priceStrategy || undefined,
            concept: details.concept || undefined,
          };
        } catch {
          return product;
        }
      })
    );

    enhanced.push(...results);

    // レート制限対策
    if (i + batchSize < productsWithPageUrl.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // ランク順にソート
  enhanced.sort((a, b) => a.rank - b.rank);

  console.log(`[infotop] Enhanced ${enhanced.filter((p) => p.lpUrl).length}/${enhanced.length} products with LP URLs`);

  return enhanced;
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


