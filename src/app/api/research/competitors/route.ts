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
      warnings?: string[];
    } = {
      warnings: [],
    };

    // 競合発見
    if (mode === "discover" || mode === "both") {
      console.log("[competitors] Starting discovery...");

      const searchResults = await searchCompetitorLPs(context, {
        region: "japan",
        limit: 10,
        scrapeResults: true,
        filterLP: true,
      });

      results.discovered = searchResults;
      console.log(`[competitors] Discovered ${searchResults.organic.length} results`);

      // LP候補がない場合の警告
      if (searchResults.organic.length === 0) {
        results.warnings?.push("競合LPが見つかりませんでした。検索キーワードを変更してみてください。");
      }

      const lpCandidates = searchResults.organic.filter((r) => r.isLP);
      console.log(`[competitors] LP candidates: ${lpCandidates.length}`);

      if (lpCandidates.length === 0 && searchResults.organic.length > 0) {
        results.warnings?.push("LP候補のフィルタリングで結果が0件になりました。全結果を分析対象とします。");
        // フィルタリングを緩和
        searchResults.organic.forEach((r) => (r.isLP = true));
      }
    }

    // 競合分析
    if (mode === "analyze" || mode === "both") {
      const competitorsToAnalyze: Array<{ url: string; markdown: string }> = [];

      if (urls && urls.length > 0) {
        // 指定されたURLを分析
        for (const url of urls.slice(0, 5)) {
          try {
            const scraped = await scrapeUrl(url, {
              formats: ["markdown"],
              onlyMainContent: false,
              waitFor: 3000,
            });
            if (scraped.markdown) {
              competitorsToAnalyze.push({
                url,
                markdown: scraped.markdown,
              });
            }
          } catch (error) {
            console.error(`[competitors] Failed to scrape ${url}:`, error);
            results.warnings?.push(`${url} のスクレイピングに失敗しました`);
          }
        }
      } else if (results.discovered?.organic) {
        // 発見した競合を分析（markdownがなくてもisLPならスクレイピング試行）
        const candidates = results.discovered.organic.filter((r) => r.isLP).slice(0, 5);

        for (const candidate of candidates) {
          if (candidate.markdown) {
            competitorsToAnalyze.push({
              url: candidate.url,
              markdown: candidate.markdown,
            });
          } else {
            // markdownがない場合は再スクレイピング
            try {
              const scraped = await scrapeUrl(candidate.url, {
                formats: ["markdown"],
                onlyMainContent: false,
                waitFor: 3000,
              });
              if (scraped.markdown) {
                competitorsToAnalyze.push({
                  url: candidate.url,
                  markdown: scraped.markdown,
                });
              }
            } catch (error) {
              console.error(`[competitors] Re-scrape failed for ${candidate.url}:`, error);
            }
          }
        }
      }

      console.log(`[competitors] Analyzing ${competitorsToAnalyze.length} competitors`);

      if (competitorsToAnalyze.length > 0) {
        const analysisResults = await extractConceptsBulk(
          competitorsToAnalyze,
          {
            genre: context.genre,
            targetGender: context.target.gender,
          }
        );
        results.analyzed = analysisResults;
      } else {
        results.warnings?.push("分析対象の競合LPがありませんでした。");
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
        details: error instanceof Error ? error.stack : undefined,
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
