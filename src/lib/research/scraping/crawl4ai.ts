/**
 * Crawl4AI クライアント
 * ローカルサーバーとの通信
 */

export interface Crawl4AIScrapeOptions {
  waitForSelector?: string;
  timeoutMs?: number;
  render?: boolean;
  scroll?: boolean;
}

export interface Crawl4AIResult {
  success: boolean;
  markdown?: string;
  html?: string;
  metadata?: { title?: string; language?: string };
  error?: {
    type: "network" | "timeout" | "blocked" | "parse";
    message: string;
  };
}

const DEFAULT_URL = "http://127.0.0.1:8765";

export async function crawl4aiScrape(
  url: string,
  options?: Crawl4AIScrapeOptions
): Promise<Crawl4AIResult> {
  const serverUrl = process.env.CRAWL4AI_SERVER_URL || DEFAULT_URL;
  const timeoutMs = options?.timeoutMs || 30000;

  console.log(`[crawl4ai] Scraping ${url}...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${serverUrl}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        wait_for_selector: options?.waitForSelector,
        timeout: timeoutMs,
        render: options?.render ?? true,
        scroll: options?.scroll ?? true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: { type: "network", message: `HTTP ${response.status}` },
      };
    }

    const data = await response.json();
    const markdown = data.markdown || "";

    if (!markdown || markdown.length < 100) {
      return {
        success: false,
        error: { type: "blocked", message: "Empty or insufficient content" },
      };
    }

    console.log(`[crawl4ai] Success! ${markdown.length} chars`);
    return {
      success: true,
      markdown,
      html: data.html,
      metadata: data.metadata,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: { type: "timeout", message: "Timeout" } };
    }
    return {
      success: false,
      error: {
        type: "network",
        message: err instanceof Error ? err.message : "Unknown",
      },
    };
  }
}

export async function checkCrawl4AIHealth(): Promise<boolean> {
  const serverUrl = process.env.CRAWL4AI_SERVER_URL || DEFAULT_URL;
  try {
    const res = await fetch(`${serverUrl}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
