/**
 * N1 Check API
 * Quick endpoint to check if project has N1 data
 */

import { NextRequest, NextResponse } from "next/server";
import { getN1Manager } from "@/lib/research/n1-manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const manager = getN1Manager();
    const hasN1Data = manager.hasN1Data(projectId);
    const count = manager.getN1Count(projectId);

    return NextResponse.json({
      hasN1Data,
      count,
      recommendation: !hasN1Data
        ? "N1データがありません。実在顧客へのインタビューを実施し、データを入力することで精度が大幅に向上します。"
        : count < 3
          ? `N1データが${count}件です。3件以上あるとより信頼性の高い分析が可能です。`
          : null,
    });
  } catch (error) {
    console.error("[N1 Check API] Error:", error);
    return NextResponse.json(
      { error: "Failed to check N1 data" },
      { status: 500 }
    );
  }
}
