/**
 * Crawl4AI クライアント
 *
 * Python FastAPIサーバーと通信してスクレイピングを実行
 * ボット検出回避 + LLM抽出を活用
 */

import type {
  IScraper,
  LPArchiveScrapeRequest,
  LPInfo,
  ScrapeResult,
  ScraperStatus,
} from "./types";

const CRAWL4AI_SERVER_URL =
  process.env.CRAWL4AI_SERVER_URL || "http://localhost:8765";

/**
 * Crawl4AIサーバーのヘルスチェック
 */
export async function checkCrawl4AIHealth(): Promise<ScraperStatus> {
  try {
    const response = await fetch(`${CRAWL4AI_SERVER_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return {
        available: false,
        service: "crawl4ai",
        error: `Server returned ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      available: data.crawl4ai_available ?? false,
      service: "crawl4ai",
      version: data.version,
    };
  } catch (error) {
    return {
      available: false,
      service: "crawl4ai",
      error:
        error instanceof Error
          ? error.message
          : "Crawl4AIサーバーに接続できません",
    };
  }
}

/**
 * LPアーカイブをスクレイピング
 */
export async function scrapeLPArchive(
  request: LPArchiveScrapeRequest,
  geminiApiKey?: string
): Promise<ScrapeResult<LPInfo>> {
  try {
    const response = await fetch(`${CRAWL4AI_SERVER_URL}/scrape/lp-archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: request.url,
        image_type: request.imageType,
        color: request.color,
        limit: request.limit ?? 10,
        use_llm: request.useLLM ?? true,
        gemini_api_key: geminiApiKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        results: [],
        error: `Server error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();

    // レスポンスを標準形式に変換
    const results: LPInfo[] = (data.results || []).map(
      (item: {
        title?: string;
        thumbnail_url?: string;
        lp_url?: string;
        category?: string;
      }) => ({
        title: item.title || "タイトルなし",
        thumbnailUrl: item.thumbnail_url || "",
        lpUrl: item.lp_url || "",
        category: item.category,
      })
    );

    return {
      success: data.success ?? false,
      results,
      error: data.error,
      metadata: {
        source: "crawl4ai",
        scrapedAt: new Date().toISOString(),
        totalCount: results.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      results: [],
      error:
        error instanceof Error
          ? error.message
          : "スクレイピング中にエラーが発生しました",
    };
  }
}

/**
 * Crawl4AIスクレイパー実装（IScraper インターフェース準拠）
 */
export class Crawl4AIScraper implements IScraper {
  name = "crawl4ai";
  private geminiApiKey?: string;

  constructor(geminiApiKey?: string) {
    this.geminiApiKey = geminiApiKey;
  }

  async checkHealth(): Promise<ScraperStatus> {
    return checkCrawl4AIHealth();
  }

  async scrapeLPArchive(
    request: LPArchiveScrapeRequest
  ): Promise<ScrapeResult<LPInfo>> {
    return scrapeLPArchive(request, this.geminiApiKey);
  }
}

/**
 * Crawl4AIサーバーが利用可能かチェック
 */
export async function isCrawl4AIAvailable(): Promise<boolean> {
  const status = await checkCrawl4AIHealth();
  return status.available;
}

export default Crawl4AIScraper;
