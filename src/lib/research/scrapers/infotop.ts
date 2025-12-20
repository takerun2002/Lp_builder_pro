/**
 * Infotopランキングスクレイパー
 *
 * 売れているLPの構成・コピーパターンを分析
 * AI駆動の高精度分析対応
 */

import { scrapeUrl, analyzeLPStructure } from "../firecrawl";
import { analyzeLPWithAI, analyzeInfotopProductWithAI, analyzeInfotopProductPage } from "../ai-analyzer";
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

    // Firecrawlでスクレイピング
    let markdown = "";
    let scrapeSource: InfotopScrapeResult["source"] = "error";

    // 方法1: Firecrawl (actions付き)
    console.log("[infotop] Firecrawl APIを試行中...");
    try {
      const result = await scrapeUrl(url, {
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 5000,
        actions: [
          { type: "wait", milliseconds: 3000 },
          { type: "scroll", direction: "down" },
          { type: "wait", milliseconds: 2000 },
          { type: "scroll", direction: "down" },
          { type: "wait", milliseconds: 2000 },
        ],
        location: { country: "jp", languages: ["ja"] },
      });

      console.log("[infotop] Firecrawl結果:", {
        success: result.success,
        markdownLength: result.markdown?.length || 0,
        error: result.error,
      });

      if (result.success && result.markdown && result.markdown.length > 500) {
        markdown = result.markdown;
        scrapeSource = "firecrawl";
        console.log("[infotop] Firecrawl成功！");
      } else {
        console.log("[infotop] Firecrawl: データ不十分");
      }
    } catch (firecrawlError) {
      console.error("[infotop] Firecrawl例外:", firecrawlError);
    }

    // 方法2: Crawl4AI（フォールバック）
    if (!markdown) {
      console.log("[infotop] Crawl4AIを試行中...");
      try {
        const CRAWL4AI_SERVER_URL = process.env.CRAWL4AI_SERVER_URL || "http://localhost:8765";
        console.log("[infotop] Crawl4AI URL:", CRAWL4AI_SERVER_URL);

        const response = await fetch(`${CRAWL4AI_SERVER_URL}/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            wait_for_selector: ".ranking-list, .product-list, table",
            timeout: 15000,
            js_render: true,
          }),
        });

        console.log("[infotop] Crawl4AIレスポンス:", response.status);

        if (response.ok) {
          const crawl4aiResult = await response.json();
          if (crawl4aiResult.markdown && crawl4aiResult.markdown.length > 500) {
            markdown = crawl4aiResult.markdown;
            scrapeSource = "crawl4ai";
            console.log("[infotop] Crawl4AI成功！長さ:", markdown.length);
          }
        }
      } catch (crawl4aiError) {
        console.error("[infotop] Crawl4AI例外:", crawl4aiError);
      }
    }

    // 方法3: フォールバックスクレイパー（直接fetch）
    if (!markdown) {
      console.log("[infotop] 直接fetchを試行中...");
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
          },
        });

        console.log("[infotop] 直接fetchレスポンス:", response.status);

        if (response.ok) {
          const html = await response.text();
          console.log("[infotop] HTML取得成功、長さ:", html.length);

          // HTMLから簡易的にテキスト抽出
          markdown = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, "\n")
            .replace(/\s+/g, " ")
            .trim();

          if (markdown.length > 500) {
            scrapeSource = "direct";
            console.log("[infotop] 直接fetch成功！");
          }
        }
      } catch (directError) {
        console.error("[infotop] 直接fetch例外:", directError);
      }
    }

    // スクレイピング結果の評価
    console.log("[infotop] ====== スクレイピング結果 ======");
    console.log("[infotop] ソース:", scrapeSource);
    console.log("[infotop] マークダウン長:", markdown.length);
    console.log("[infotop] 含まれるキーワード:", {
      "ランキング": markdown.includes("ランキング"),
      "位": markdown.includes("位"),
      "円": markdown.includes("円"),
      "商品": markdown.includes("商品"),
    });

    if (!markdown || markdown.length < 500) {
      console.warn("[infotop] ⚠️ すべてのスクレイピング方法が失敗");
      console.warn("[infotop] サンプルデータにフォールバック");
      const elapsed = Date.now() - startTime;
      return {
        success: false,
        products: getSimulatedRanking(options?.genre || "other", limit),
        source: "sample",
        error: "すべてのスクレイピング方法が失敗しました。APIキーとネットワーク接続を確認してください。",
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

    console.warn("[infotop] すべてのパース方法が失敗、サンプルデータを返却");
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      products: getSimulatedRanking(options?.genre || "other", limit),
      source: "sample",
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
      products: getSimulatedRanking(options?.genre || "other", limit),
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
 * シミュレートされたランキングデータ（フォールバック用）
 */
function getSimulatedRanking(genre: string, limit: number): InfotopResult[] {
  // 注意: これはスクレイピング失敗時のサンプルデータです
  // 実際のInfotopデータではありません
  console.warn("[infotop] Using simulated data - scraping failed");
  
  const templates: Record<string, InfotopResult[]> = {
    beauty: [
      {
        rank: 1,
        productName: "【サンプル】美肌メソッド完全ガイド",
        genre: "美容",
        price: 29800,
        lpUrl: "", // スクレイピング失敗時はURLなし
        concept: "※サンプルデータ - 実際のInfotopスクレイピングに失敗しました",
      },
      {
        rank: 2,
        productName: "【サンプル】エステケア講座",
        genre: "美容",
        price: 19800,
        lpUrl: "",
      },
      {
        rank: 3,
        productName: "【サンプル】アンチエイジング大全",
        genre: "美容",
        price: 24800,
        lpUrl: "",
      },
    ],
    health: [
      {
        rank: 1,
        productName: "【サンプル】腸活ダイエットマニュアル",
        genre: "健康",
        price: 19800,
        lpUrl: "",
      },
      {
        rank: 2,
        productName: "【サンプル】自律神経改善プログラム",
        genre: "健康",
        price: 29800,
        lpUrl: "",
      },
      {
        rank: 3,
        productName: "【サンプル】睡眠の質を高める習慣",
        genre: "健康",
        price: 14800,
        lpUrl: "",
      },
    ],
    business: [
      {
        rank: 1,
        productName: "【サンプル】副業ロードマップ",
        genre: "ビジネス",
        price: 49800,
        lpUrl: "",
      },
      {
        rank: 2,
        productName: "【サンプル】Webマーケティング講座",
        genre: "ビジネス",
        price: 39800,
        lpUrl: "",
      },
      {
        rank: 3,
        productName: "【サンプル】コンテンツビジネス成功法則",
        genre: "ビジネス",
        price: 34800,
        lpUrl: "",
      },
    ],
    investment: [
      {
        rank: 1,
        productName: "【サンプル】FX自動売買講座",
        genre: "投資",
        price: 98000,
        lpUrl: "",
      },
      {
        rank: 2,
        productName: "【サンプル】仮想通貨投資ガイド",
        genre: "投資",
        price: 49800,
        lpUrl: "",
      },
      {
        rank: 3,
        productName: "【サンプル】株式投資教科書",
        genre: "投資",
        price: 29800,
        lpUrl: "",
      },
    ],
    education: [
      {
        rank: 1,
        productName: "【サンプル】英語速習マスター",
        genre: "教育",
        price: 39800,
        lpUrl: "",
      },
      {
        rank: 2,
        productName: "【サンプル】プログラミング独学",
        genre: "教育",
        price: 29800,
        lpUrl: "",
      },
      {
        rank: 3,
        productName: "【サンプル】記憶力向上トレーニング",
        genre: "教育",
        price: 19800,
        lpUrl: "",
      },
    ],
    romance: [
      {
        rank: 1,
        productName: "【サンプル】会話術",
        genre: "恋愛",
        price: 24800,
        lpUrl: "",
      },
      {
        rank: 2,
        productName: "【サンプル】婚活成功の秘訣",
        genre: "恋愛",
        price: 29800,
        lpUrl: "",
      },
      {
        rank: 3,
        productName: "【サンプル】復縁マニュアル",
        genre: "恋愛",
        price: 19800,
        lpUrl: "",
      },
    ],
    spiritual: [
      {
        rank: 1,
        productName: "【サンプル】スピリチュアル講座",
        genre: "スピリチュアル",
        price: 29800,
        lpUrl: "",
        concept: "※サンプルデータ - 実際のInfotopスクレイピングに失敗しました",
      },
      {
        rank: 2,
        productName: "【サンプル】占い入門",
        genre: "スピリチュアル",
        price: 19800,
        lpUrl: "",
      },
      {
        rank: 3,
        productName: "【サンプル】手相占いマスター",
        genre: "スピリチュアル",
        price: 24800,
        lpUrl: "",
      },
    ],
    other: [
      {
        rank: 1,
        productName: "【サンプル】人気商品1",
        genre: "その他",
        price: 19800,
        lpUrl: "",
        concept: "※サンプルデータ - 実際のInfotopスクレイピングに失敗しました",
      },
      {
        rank: 2,
        productName: "【サンプル】人気商品2",
        genre: "その他",
        price: 24800,
        lpUrl: "",
      },
      {
        rank: 3,
        productName: "【サンプル】人気商品3",
        genre: "その他",
        price: 29800,
        lpUrl: "",
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


