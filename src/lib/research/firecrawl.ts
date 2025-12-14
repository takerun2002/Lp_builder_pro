/**
 * Firecrawl統合ユーティリティ
 *
 * 高速スクレイピング & LLM対応マークダウン変換
 * AI駆動の高精度分析対応
 */

import { analyzeLPWithAI, type LPAnalysisResult } from "./ai-analyzer";

export interface FirecrawlScrapeResult {
  success: boolean;
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    ogImage?: string;
  };
  screenshot?: string;
  error?: string;
}

export interface FirecrawlCrawlResult {
  success: boolean;
  pages: FirecrawlScrapeResult[];
  totalPages: number;
}

/**
 * 単一ページをスクレイプ
 */
export async function scrapeUrl(
  url: string,
  options?: {
    formats?: ("markdown" | "html" | "screenshot")[];
    onlyMainContent?: boolean;
    waitFor?: number;
  }
): Promise<FirecrawlScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  // APIキーがない場合はフォールバック
  if (!apiKey) {
    console.warn("[firecrawl] No API key, using fallback scraper");
    return fallbackScrape(url);
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: options?.formats || ["markdown"],
        onlyMainContent: options?.onlyMainContent ?? true,
        waitFor: options?.waitFor || 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[firecrawl] API error:", response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    return {
      success: data.success ?? true,
      markdown: data.data?.markdown,
      html: data.data?.html,
      metadata: data.data?.metadata,
      screenshot: data.data?.screenshot,
    };
  } catch (err) {
    console.error("[firecrawl] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * 複数ページをクロール
 */
export async function crawlUrl(
  url: string,
  options?: {
    limit?: number;
    maxDepth?: number;
    includePaths?: string[];
    excludePaths?: string[];
  }
): Promise<FirecrawlCrawlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    console.warn("[firecrawl] No API key, using fallback");
    const single = await fallbackScrape(url);
    return { success: single.success, pages: [single], totalPages: 1 };
  }

  try {
    // クロールジョブを開始
    const startResponse = await fetch("https://api.firecrawl.dev/v1/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        limit: options?.limit || 10,
        maxDepth: options?.maxDepth || 2,
        includePaths: options?.includePaths,
        excludePaths: options?.excludePaths,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });

    if (!startResponse.ok) {
      return { success: false, pages: [], totalPages: 0 };
    }

    const { id } = await startResponse.json();

    // ポーリングで結果を取得
    let attempts = 0;
    const maxAttempts = 30; // 最大30回（約60秒）

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusResponse = await fetch(
        `https://api.firecrawl.dev/v1/crawl/${id}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      if (!statusResponse.ok) {
        attempts++;
        continue;
      }

      const status = await statusResponse.json();

      if (status.status === "completed") {
        return {
          success: true,
          pages: status.data?.map((page: Record<string, unknown>) => ({
            success: true,
            markdown: page.markdown,
            metadata: page.metadata,
          })) || [],
          totalPages: status.total || 0,
        };
      }

      if (status.status === "failed") {
        return { success: false, pages: [], totalPages: 0 };
      }

      attempts++;
    }

    return { success: false, pages: [], totalPages: 0 };
  } catch (err) {
    console.error("[firecrawl] Crawl error:", err);
    return { success: false, pages: [], totalPages: 0 };
  }
}

/**
 * Google検索結果をスクレイプ
 */
export async function searchAndScrape(
  query: string,
  options?: {
    limit?: number;
    region?: string;
  }
): Promise<FirecrawlScrapeResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    console.warn("[firecrawl] No API key for search");
    return [];
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit: options?.limit || 5,
        lang: options?.region === "japan" ? "ja" : "en",
        country: options?.region === "japan" ? "jp" : "us",
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return (data.data || []).map((item: Record<string, unknown>) => ({
      success: true,
      markdown: item.markdown,
      metadata: item.metadata,
    }));
  } catch (err) {
    console.error("[firecrawl] Search error:", err);
    return [];
  }
}

/**
 * フォールバックスクレイパー（Firecrawl APIキーがない場合）
 */
async function fallbackScrape(url: string): Promise<FirecrawlScrapeResult> {
  try {
    // 簡易的なfetchでHTMLを取得
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // 簡易的なテキスト抽出
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    let text = bodyMatch ? bodyMatch[1] : html;
    // HTMLタグを除去
    text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<[^>]+>/g, " ");
    text = text.replace(/\s+/g, " ").trim();

    return {
      success: true,
      markdown: text.slice(0, 5000), // 5000文字制限
      metadata: {
        title: titleMatch ? titleMatch[1] : undefined,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Fallback scrape failed",
    };
  }
}

/**
 * LP構造を分析（従来版）
 */
export function analyzeLPStructure(markdown: string): {
  sections: { type: string; content: string }[];
  headlines: string[];
  ctaTexts: string[];
} {
  const lines = markdown.split("\n");
  const sections: { type: string; content: string }[] = [];
  const headlines: string[] = [];
  const ctaTexts: string[] = [];

  let currentSection = "";

  for (const line of lines) {
    // 見出しを検出
    if (line.startsWith("# ") || line.startsWith("## ")) {
      const text = line.replace(/^#+\s*/, "");
      headlines.push(text);

      // セクションタイプを推測
      const lowerText = text.toLowerCase();
      let sectionType = "other";

      if (
        lowerText.includes("悩み") ||
        lowerText.includes("こんな") ||
        lowerText.includes("problem")
      ) {
        sectionType = "problem";
      } else if (
        lowerText.includes("特徴") ||
        lowerText.includes("feature") ||
        lowerText.includes("メリット")
      ) {
        sectionType = "features";
      } else if (
        lowerText.includes("声") ||
        lowerText.includes("体験") ||
        lowerText.includes("testimonial")
      ) {
        sectionType = "testimonials";
      } else if (
        lowerText.includes("価格") ||
        lowerText.includes("料金") ||
        lowerText.includes("price")
      ) {
        sectionType = "pricing";
      } else if (
        lowerText.includes("保証") ||
        lowerText.includes("guarantee") ||
        lowerText.includes("返金")
      ) {
        sectionType = "guarantee";
      } else if (
        lowerText.includes("faq") ||
        lowerText.includes("質問") ||
        lowerText.includes("q&a")
      ) {
        sectionType = "faq";
      }

      if (currentSection) {
        sections.push({ type: sectionType, content: currentSection });
      }
      currentSection = line;
    } else {
      currentSection += "\n" + line;
    }

    // CTAテキストを検出
    if (
      line.includes("申し込") ||
      line.includes("購入") ||
      line.includes("今すぐ") ||
      line.includes("無料") ||
      line.includes("ダウンロード")
    ) {
      const ctaMatch = line.match(
        /[「【]([^」】]+)[」】]|"([^"]+)"|'([^']+)'/
      );
      if (ctaMatch) {
        ctaTexts.push(ctaMatch[1] || ctaMatch[2] || ctaMatch[3]);
      }
    }
  }

  if (currentSection) {
    sections.push({ type: "other", content: currentSection });
  }

  return { sections, headlines, ctaTexts };
}

/**
 * LP構造をAIで詳細分析
 */
export async function analyzeLPStructureWithAI(
  markdown: string,
  options?: {
    genre?: string;
    url?: string;
  }
): Promise<LPAnalysisResult> {
  return analyzeLPWithAI(markdown, options);
}

/**
 * URLをスクレイプしてAI分析
 */
export async function scrapeAndAnalyzeLP(
  url: string,
  options?: {
    genre?: string;
    useAI?: boolean;
  }
): Promise<{
  success: boolean;
  markdown?: string;
  analysis?: LPAnalysisResult;
  metadata?: FirecrawlScrapeResult["metadata"];
  error?: string;
}> {
  const result = await scrapeUrl(url, {
    formats: ["markdown"],
    onlyMainContent: true,
    waitFor: 3000,
  });

  if (!result.success || !result.markdown) {
    return {
      success: false,
      error: result.error || "Failed to scrape URL",
    };
  }

  // AI分析
  if (options?.useAI) {
    const analysis = await analyzeLPWithAI(result.markdown, {
      genre: options.genre,
      url,
    });

    return {
      success: true,
      markdown: result.markdown,
      analysis,
      metadata: result.metadata,
    };
  }

  // 従来の分析
  const basicAnalysis = analyzeLPStructure(result.markdown);

  return {
    success: true,
    markdown: result.markdown,
    analysis: {
      sections: basicAnalysis.sections.map((s) => ({
        type: s.type,
        name: "",
        content: s.content,
        purpose: "",
        keyElements: [],
      })),
      headlines: basicAnalysis.headlines,
      subheadlines: [],
      ctaTexts: basicAnalysis.ctaTexts,
      keyPhrases: [],
      copyTechniques: [],
      emotionalTriggers: [],
      targetPains: [],
      benefits: [],
      trustElements: [],
    },
    metadata: result.metadata,
  };
}
