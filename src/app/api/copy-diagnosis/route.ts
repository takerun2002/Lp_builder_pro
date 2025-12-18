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
    const { text, type, target, product, mode } = body as CopyDiagnosisInput & {
      mode?: "full" | "quick";
    };

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Text is required" },
        { status: 400 }
      );
    }

    // クイックチェックモード
    if (mode === "quick") {
      const result = quickCheck(text);
      return NextResponse.json({
        success: true,
        mode: "quick",
        ...result,
      });
    }

    // フル診断モード
    const result = await diagnoseCopy({
      text,
      type,
      target,
      product,
    });

    if (!result.success) {
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
