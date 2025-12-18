/**
 * モデル設定API
 * GET /api/models - モデル一覧取得
 * POST /api/models - ユーザー設定更新
 */

import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_MODELS,
  MODEL_CATEGORIES,
  DEFAULT_PREFERENCES,
  getModelsByCapability,
  getDefaultModel,
  type ModelCapability,
  type ModelPreferences,
} from "@/lib/ai/models";
import { getDb } from "@/lib/db";

const PREFERENCES_KEY = "model_preferences";

/**
 * モデル一覧と設定を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const capability = searchParams.get("capability") as ModelCapability | null;

  try {
    // 保存されたユーザー設定を取得
    let preferences: ModelPreferences = DEFAULT_PREFERENCES;
    try {
      const db = getDb();
      const row = db
        .prepare("SELECT value FROM app_settings WHERE key = ?")
        .get(PREFERENCES_KEY) as { value: string } | undefined;

      if (row) {
        preferences = JSON.parse(row.value);
      }
    } catch {
      // DBエラー時はデフォルト設定を使用
    }

    // 機能別フィルター
    if (capability) {
      const models = getModelsByCapability(capability);
      const defaultModel = getDefaultModel(capability);

      return NextResponse.json({
        success: true,
        models: models.map((m) => ({
          ...m,
          isDefault: m.id === defaultModel?.id,
        })),
        preferences,
      });
    }

    // 全モデルとカテゴリを返す
    return NextResponse.json({
      success: true,
      models: DEFAULT_MODELS.filter((m) => m.enabled),
      categories: MODEL_CATEGORIES,
      preferences,
    });
  } catch (error) {
    console.error("[API] GET /api/models error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get models" },
      { status: 500 }
    );
  }
}

/**
 * ユーザーのモデル設定を更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preferences } = body as { preferences: Partial<ModelPreferences> };

    // 既存設定を取得
    let currentPreferences: ModelPreferences = DEFAULT_PREFERENCES;
    const db = getDb();

    try {
      const row = db
        .prepare("SELECT value FROM app_settings WHERE key = ?")
        .get(PREFERENCES_KEY) as { value: string } | undefined;

      if (row) {
        currentPreferences = JSON.parse(row.value);
      }
    } catch {
      // 新規作成
    }

    // マージして保存
    const updatedPreferences: ModelPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    db.prepare(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`
    ).run(PREFERENCES_KEY, JSON.stringify(updatedPreferences));

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error("[API] POST /api/models error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
