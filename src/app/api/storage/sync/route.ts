/**
 * Storage Sync API
 * 手動同期の実行
 */

import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/hybrid-storage";

export const runtime = "nodejs";
export const maxDuration = 60; // 同期には時間がかかる場合がある

/**
 * POST: 同期を実行
 */
export async function POST(): Promise<NextResponse> {
  try {
    const storage = getStorage();
    const config = storage.getConfig();

    // ローカルモードでは同期不要
    if (config.mode === "local") {
      return NextResponse.json({
        ok: true,
        result: {
          success: true,
          syncedAt: new Date().toISOString(),
          itemsSynced: 0,
          conflicts: [],
          errors: [],
          message: "ローカルモードでは同期は不要です",
        },
      });
    }

    // 同期を実行
    const result = await storage.sync();

    console.log("[storage/sync] Sync completed:", {
      success: result.success,
      itemsSynced: result.itemsSynced,
      conflictsCount: result.conflicts.length,
      errorsCount: result.errors.length,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err) {
    console.error("[storage/sync] POST error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "同期に失敗しました",
      },
      { status: 500 }
    );
  }
}

/**
 * GET: 同期状態を取得
 */
export async function GET(): Promise<NextResponse> {
  try {
    const storage = getStorage();
    const status = await storage.getConnectionStatus();
    const stats = await storage.getStats();

    return NextResponse.json({
      ok: true,
      status: {
        mode: status.mode,
        googleAuthenticated: status.googleAuthenticated,
        lastSyncAt: status.lastSyncAt,
        queueSize: status.queueSize,
      },
      stats: {
        totalItems: stats.local.totalItems,
        unsyncedItems: stats.local.unsyncedItems,
        queueSize: stats.local.queueSize,
        autoSync: stats.autoSync,
        syncInterval: stats.syncInterval,
      },
    });
  } catch (err) {
    console.error("[storage/sync] GET error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "状態の取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
