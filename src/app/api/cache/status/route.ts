/**
 * CAGキャッシュステータスAPI
 *
 * GET /api/cache/status - ステータス取得
 * POST /api/cache/status - キャッシュ初期化/ウォームアップ
 */

import { NextResponse } from "next/server";
import {
  initializeCacheManager,
  getCacheStatus,
  refreshCacheManually,
  checkCacheHealth,
} from "@/lib/knowledge/cache-manager";

/**
 * キャッシュステータスを取得
 */
export async function GET() {
  try {
    const status = await getCacheStatus();
    const health = await checkCacheHealth();

    return NextResponse.json({
      status,
      health,
    });
  } catch (error) {
    console.error("[cache/status] Error:", error);
    return NextResponse.json(
      { error: "Failed to get cache status" },
      { status: 500 }
    );
  }
}

/**
 * キャッシュを初期化/ウォームアップ
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: "initialize" | "refresh" };

    if (action === "refresh") {
      // キャッシュを更新
      const status = await refreshCacheManually();
      return NextResponse.json({
        message: "Cache refreshed",
        status,
      });
    }

    // デフォルト: キャッシュを初期化（または既存を使用）
    const status = await initializeCacheManager();
    const health = await checkCacheHealth();

    return NextResponse.json({
      message: status.cacheId ? "Cache ready" : "Cache initialized",
      status,
      health,
    });
  } catch (error) {
    console.error("[cache/status] Error:", error);
    return NextResponse.json(
      { error: "Failed to initialize cache" },
      { status: 500 }
    );
  }
}
