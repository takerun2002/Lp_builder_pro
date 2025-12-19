/**
 * コピー診断API
 * POST /api/copy-diagnosis - コピーを診断
 */

import { NextRequest, NextResponse } from "next/server";
import {
  diagnoseCopy,
  quickCheck,
  type CopyDiagnosisInput,
} from "@/lib/copywriting/copy-diagnosis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, type, target, product, mode, projectId } = body as CopyDiagnosisInput & {
      mode?: "full" | "quick";
      projectId?: string;
    };

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Text is required" },
        { status: 400 }
      );
    }

    // クイックチェックモード（別途処理を残す - quickCheckの詳細結果を返す）
    if (mode === "quick") {
      const result = quickCheck(text);
      return NextResponse.json({
        success: true,
        mode: "quick",
        ...result,
      });
    }

    // フル診断モード（projectIdがある場合はRAGも有効化）
    const result = await diagnoseCopy({
      text,
      type,
      target,
      product,
      mode,
      projectId,  // RAG用のプロジェクトID
    });

    // fallbackUsedの場合も成功として返す（500エラーにしない）
    if (!result.success && !result.fallbackUsed) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] POST /api/copy-diagnosis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Diagnosis failed",
      },
      { status: 500 }
    );
  }
}
