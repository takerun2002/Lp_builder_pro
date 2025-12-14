/**
 * デザインプロンプト テンプレート取得API
 */

import { NextResponse } from "next/server";
import {
  getCategories,
  getAllTemplates,
  getLpSections,
} from "@/lib/knowledge/design-prompt-generator";

export async function GET() {
  try {
    const categories = getCategories();
    const templates = getAllTemplates();
    const lpSections = getLpSections();

    return NextResponse.json({
      ok: true,
      categories,
      templates,
      lpSections,
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
