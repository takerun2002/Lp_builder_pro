/**
 * ヘッドライン生成API
 * POST /api/headlines - ヘッドライン大量生成
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateHeadlines,
  exportHeadlinesToCsv,
  type HeadlineInput,
} from "@/lib/copywriting/headline-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, painPoints, benefits, keywords, productName, genre, count, exportFormat } = body as HeadlineInput & { exportFormat?: "json" | "csv" };

    // 入力検証
    if (!painPoints?.length || !benefits?.length) {
      return NextResponse.json(
        { success: false, error: "painPoints and benefits are required" },
        { status: 400 }
      );
    }

    // ヘッドライン生成
    const result = await generateHeadlines({
      target: target || {},
      painPoints,
      benefits,
      keywords,
      productName,
      genre,
      count: Math.min(count || 50, 100), // 最大100件
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // CSV形式でエクスポートの場合
    if (exportFormat === "csv" && result.headlines) {
      const csv = exportHeadlinesToCsv(result.headlines);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=headlines.csv",
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] POST /api/headlines error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
