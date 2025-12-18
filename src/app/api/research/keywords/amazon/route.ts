/**
 * Amazon書籍キーワード収集 API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  searchAmazonBooks,
  analyzeAmazonBooks,
} from "@/lib/research/scrapers/amazon-books";
import type { AmazonBookCategory } from "@/lib/research/scrapers/amazon-books";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, category, limit, useAI } = body as {
      keyword: string;
      category?: AmazonBookCategory;
      limit?: number;
      useAI?: boolean;
    };

    if (!keyword) {
      return NextResponse.json(
        { error: "キーワードが必要です" },
        { status: 400 }
      );
    }

    // 書籍検索
    const options = {
      keyword,
      category: category || "all",
      limit: limit || 20,
      useAI: useAI ?? true,
    };

    // 検索と分析
    const analysis = await analyzeAmazonBooks(options);

    return NextResponse.json({
      success: true,
      books: analysis.books,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
    });
  } catch (error) {
    console.error("[keywords/amazon] API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Amazon書籍検索に失敗しました",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const category = searchParams.get("category") as AmazonBookCategory | null;
    const limit = searchParams.get("limit");

    if (!keyword) {
      return NextResponse.json(
        { error: "keywordパラメータが必要です" },
        { status: 400 }
      );
    }

    const books = await searchAmazonBooks({
      keyword,
      category: category || "all",
      limit: limit ? parseInt(limit, 10) : 10,
      useAI: false,
    });

    return NextResponse.json({
      success: true,
      books,
      count: books.length,
    });
  } catch (error) {
    console.error("[keywords/amazon] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "検索に失敗しました",
      },
      { status: 500 }
    );
  }
}
