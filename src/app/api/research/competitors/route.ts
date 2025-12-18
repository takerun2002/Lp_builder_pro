/**
 * 競合発見・分析 API
 */

import { NextRequest, NextResponse } from "next/server";
import { searchCompetitorLPs } from "@/lib/research/scrapers/google";
import { extractConcept, extractConceptsBulk } from "@/lib/research/analyzers/concept-extractor";
import { scrapeUrl } from "@/lib/research/firecrawl";
import type { ResearchContext } from "@/lib/research/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, mode = "discover", urls } = body as {
      context: ResearchContext;
      mode: "discover" | "analyze" | "both";
      urls?: string[];
    };

    if (!context) {
      return NextResponse.json(
        { error: "コンテキストが必要です" },
        { status: 400 }
      );
    }

    const results: {
      discovered?: Awaited<ReturnType<typeof searchCompetitorLPs>>;
      analyzed?: Awaited<ReturnType<typeof extractConceptsBulk>>;
    } = {};

    // 競合発見
    if (mode === "discover" || mode === "both") {
      const searchResults = await searchCompetitorLPs(context, {
        region: "japan",
        limit: 10,
        scrapeResults: true,
        filterLP: true,
      });
      results.discovered = searchResults;
    }

    // 競合分析
    if (mode === "analyze" || mode === "both") {
      let competitorsToAnalyze: Array<{ url: string; markdown: string }> = [];

      if (urls && urls.length > 0) {
        // 指定されたURLを分析
        for (const url of urls.slice(0, 5)) {
          try {
            const scraped = await scrapeUrl(url, {
              formats: ["markdown"],
              onlyMainContent: false,
              waitFor: 2000,
            });
            if (scraped.markdown) {
              competitorsToAnalyze.push({
                url,
                markdown: scraped.markdown,
              });
            }
          } catch (error) {
            console.error(`[competitors] Failed to scrape ${url}:`, error);
          }
        }
      } else if (results.discovered?.organic) {
        // 発見した競合を分析
        competitorsToAnalyze = results.discovered.organic
          .filter((r) => r.markdown && r.isLP)
          .slice(0, 5)
          .map((r) => ({
            url: r.url,
            markdown: r.markdown!,
          }));
      }

      if (competitorsToAnalyze.length > 0) {
        const analysisResults = await extractConceptsBulk(
          competitorsToAnalyze,
          {
            genre: context.genre,
            targetGender: context.target.gender,
          }
        );
        results.analyzed = analysisResults;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("[competitors] API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "競合分析に失敗しました",
      },
      { status: 500 }
    );
  }
}

// 単一URLの分析
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const genre = searchParams.get("genre");

    if (!url) {
      return NextResponse.json(
        { error: "URLパラメータが必要です" },
        { status: 400 }
      );
    }

    // スクレイピング
    const scraped = await scrapeUrl(url, {
      formats: ["markdown"],
      onlyMainContent: false,
      waitFor: 2000,
    });

    if (!scraped.markdown) {
      return NextResponse.json(
        { error: "ページのスクレイピングに失敗しました" },
        { status: 500 }
      );
    }

    // 分析
    const analysis = await extractConcept(url, scraped.markdown, {
      genre: genre || undefined,
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("[competitors] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "分析に失敗しました",
      },
      { status: 500 }
    );
  }
}
