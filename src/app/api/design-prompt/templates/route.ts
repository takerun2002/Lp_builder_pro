/**
 * デザインプロンプト テンプレート取得API
 * Phase 3.5: YouTubeサムネイル心理学フレームワーク対応
 */

import { NextResponse } from "next/server";
import {
  getCategories,
  getAllTemplates,
  getLpSections,
  getSurvivalTriggers,
  getTargetPersonas,
} from "@/lib/knowledge/design-prompt-generator";

export async function GET() {
  try {
    const categories = getCategories();
    const templates = getAllTemplates();
    const lpSections = getLpSections();

    // YouTube心理学フレームワーク用データ
    const survivalTriggers = getSurvivalTriggers();
    const targetPersonas = getTargetPersonas();

    return NextResponse.json({
      ok: true,
      categories,
      templates,
      lpSections,
      // YouTube心理学
      survivalTriggers,
      targetPersonas,
    });
  } catch (error) {
    console.error("[api/design-prompt/templates] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "テンプレートの取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
