/**
 * スクレイピングプロバイダーチェーン
 * Crawl4AI → Firecrawl → Direct fetch
 */

import { crawl4aiScrape, checkCrawl4AIHealth } from "./crawl4ai";
import { scrapeUrl as firecrawlScrape } from "../firecrawl";

export interface ScrapeResult {
  success: boolean;
  source: "crawl4ai" | "firecrawl" | "direct" | "failed";
  markdown: string;
  html?: string;
  error?: string;
  processingTimeMs: number;
}

export async function scrapeWithProviderChain(
  url: string,
  options?: { waitForSelector?: string; timeoutMs?: number }
): Promise<ScrapeResult> {
  const start = Date.now();
  console.log(`[provider-chain] Scraping: ${url}`);

  // 1. Crawl4AI（優先）
  const crawl4aiAvailable = await checkCrawl4AIHealth();
  if (crawl4aiAvailable) {
    console.log("[provider-chain] Using Crawl4AI...");
    const result = await crawl4aiScrape(url, {
      waitForSelector: options?.waitForSelector,
      timeoutMs: options?.timeoutMs || 30000,
      scroll: true,
    });

    if (result.success && result.markdown && result.markdown.length > 500) {
      return {
        success: true,
        source: "crawl4ai",
        markdown: result.markdown,
        html: result.html,
        processingTimeMs: Date.now() - start,
      };
    }
    console.log(`[provider-chain] Crawl4AI failed: ${result.error?.message}`);
  } else {
    console.log("[provider-chain] Crawl4AI not available");
  }

  // 2. Firecrawl（フォールバック）
  if (process.env.FIRECRAWL_API_KEY) {
    console.log("[provider-chain] Using Firecrawl...");
    try {
      const result = await firecrawlScrape(url, {
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 5000,
      });

      if (result.success && result.markdown && result.markdown.length > 500) {
        return {
          success: true,
          source: "firecrawl",
          markdown: result.markdown,
          html: result.html,
          processingTimeMs: Date.now() - start,
        };
      }
      console.log("[provider-chain] Firecrawl: insufficient data");
    } catch (err) {
      console.error("[provider-chain] Firecrawl error:", err);
    }
  } else {
    console.log("[provider-chain] Firecrawl API key not set");
  }

  // 3. 直接fetch（最終）
  console.log("[provider-chain] Using direct fetch...");
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(options?.timeoutMs || 30000),
    });

    if (res.ok) {
      const html = await res.text();
      const markdown = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "\n")
        .replace(/\s+/g, " ")
        .trim();

      if (markdown.length > 500) {
        return {
          success: true,
          source: "direct",
          markdown,
          html,
          processingTimeMs: Date.now() - start,
        };
      }
    }
    console.log("[provider-chain] Direct fetch: insufficient data");
  } catch (err) {
    console.error("[provider-chain] Direct fetch error:", err);
  }

  // 全て失敗
  return {
    success: false,
    source: "failed",
    markdown: "",
    error: "All scraping methods failed",
    processingTimeMs: Date.now() - start,
  };
}
