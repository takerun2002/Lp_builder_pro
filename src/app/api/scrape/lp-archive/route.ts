/**
 * LPアーカイブスクレイピング API Route
 *
 * Crawl4AIサーバーを経由してLPアーカイブサイトをスクレイピング
 */

import { NextRequest, NextResponse } from "next/server";
import {
  scrapeLPArchive,
  checkCrawl4AIHealth,
  type LPArchiveScrapeRequest,
} from "@/lib/scrapers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // リクエストバリデーション
    if (!body.url) {
      return NextResponse.json(
        { success: false, error: "URLは必須です", results: [] },
        { status: 400 }
      );
    }

    const scrapeRequest: LPArchiveScrapeRequest = {
      url: body.url,
      imageType: body.imageType,
      color: body.color,
      limit: body.limit ?? 10,
      useLLM: body.useLLM ?? true,
    };

    // Gemini APIキーを環境変数から取得
    const geminiApiKey = process.env.GOOGLE_API_KEY;

    const result = await scrapeLPArchive(scrapeRequest, geminiApiKey);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] LP Archive scrape error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "スクレイピングに失敗しました",
        results: [],
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await checkCrawl4AIHealth();

    return NextResponse.json({
      service: "lp-archive-scraper",
      crawl4ai: status,
      available: status.available,
    });
  } catch (error) {
    return NextResponse.json(
      {
        service: "lp-archive-scraper",
        available: false,
        error:
          error instanceof Error
            ? error.message
            : "ヘルスチェックに失敗しました",
      },
      { status: 500 }
    );
  }
}
