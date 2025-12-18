/**
 * YouTube動画キーワード収集 API
 */

import { NextRequest, NextResponse } from "next/server";
import { searchYouTube, analyzeYouTube } from "@/lib/research/scrapers/youtube";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, limit, useAI } = body as {
      keyword: string;
      limit?: number;
      useAI?: boolean;
    };

    if (!keyword) {
      return NextResponse.json(
        { error: "キーワードが必要です" },
        { status: 400 }
      );
    }

    // YouTube検索と分析
    const options = {
      keyword,
      limit: limit || 20,
      useAI: useAI ?? true,
    };
    const analysis = await analyzeYouTube(options);

    return NextResponse.json({
      success: true,
      videos: analysis.videos,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
    });
  } catch (error) {
    console.error("[keywords/youtube] API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "YouTube検索に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const limit = searchParams.get("limit");

    if (!keyword) {
      return NextResponse.json(
        { error: "keywordパラメータが必要です" },
        { status: 400 }
      );
    }

    const videos = await searchYouTube({
      keyword,
      limit: limit ? parseInt(limit, 10) : 10,
      useAI: false,
    });

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
    });
  } catch (error) {
    console.error("[keywords/youtube] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "検索に失敗しました",
      },
      { status: 500 }
    );
  }
}
