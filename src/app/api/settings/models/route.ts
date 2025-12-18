/**
 * Model Settings API
 * モデルプリセット設定のCRUD
 */

import { NextRequest, NextResponse } from "next/server";
import { getModelSelector, getAllModels, type UserModelSettings } from "@/lib/ai/model-selector";

export const runtime = "nodejs";

/**
 * GET: 現在のモデル設定を取得
 */
export async function GET(): Promise<NextResponse> {
  try {
    const selector = getModelSelector();
    const settings = await selector.loadUserSettings();
    const models = getAllModels();
    const availableProviders = await selector.getAvailableProviders();

    return NextResponse.json({
      ok: true,
      settings: {
        presets: settings.presets,
        costLimit: settings.costLimit,
        autoDowngrade: settings.autoDowngrade,
      },
      models,
      availableProviders,
    });
  } catch (err) {
    console.error("[settings/models] GET error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "設定の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: モデル設定を更新
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { presets, costLimit, autoDowngrade } = body as Partial<UserModelSettings>;

    const selector = getModelSelector();

    // バリデーション
    if (costLimit && !["low", "medium", "high", "unlimited"].includes(costLimit)) {
      return NextResponse.json(
        { ok: false, error: "Invalid costLimit. Must be 'low', 'medium', 'high', or 'unlimited'" },
        { status: 400 }
      );
    }

    // プリセットのモデルIDを検証
    if (presets) {
      const allModels = getAllModels();
      const modelIds = new Set(allModels.map((m) => m.id));

      for (const [key, modelId] of Object.entries(presets)) {
        if (!modelIds.has(modelId)) {
          return NextResponse.json(
            { ok: false, error: `Invalid model ID for ${key}: ${modelId}` },
            { status: 400 }
          );
        }
      }
    }

    await selector.saveUserSettings({
      presets,
      costLimit,
      autoDowngrade,
    });

    const newSettings = await selector.loadUserSettings();

    return NextResponse.json({
      ok: true,
      settings: {
        presets: newSettings.presets,
        costLimit: newSettings.costLimit,
        autoDowngrade: newSettings.autoDowngrade,
      },
    });
  } catch (err) {
    console.error("[settings/models] POST error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "設定の保存に失敗しました",
      },
      { status: 500 }
    );
  }
}
