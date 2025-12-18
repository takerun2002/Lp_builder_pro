/**
 * Storage Configuration API
 * ストレージ設定の取得・更新
 */

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/hybrid-storage";
import { getGoogleAuth } from "@/lib/storage/google-auth";
import type { StorageMode } from "@/lib/storage/types";

export const runtime = "nodejs";

/**
 * GET: 現在の設定を取得
 */
export async function GET(): Promise<NextResponse> {
  try {
    const storage = getStorage();
    const config = storage.getConfig();
    const status = await storage.getConnectionStatus();
    const authManager = getGoogleAuth();
    const isConfigured = authManager.isConfigured();

    return NextResponse.json({
      ok: true,
      config: {
        mode: config.mode,
        autoSync: config.autoSync,
        syncIntervalMinutes: config.syncIntervalMinutes,
        offlineQueueEnabled: config.offlineQueueEnabled,
      },
      status: {
        googleConfigured: isConfigured,
        googleAuthenticated: status.googleAuthenticated,
        lastSyncAt: status.lastSyncAt,
        queueSize: status.queueSize,
      },
    });
  } catch (err) {
    console.error("[storage/config] GET error:", err);
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
 * POST: 設定を更新
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

    const { mode, autoSync, syncIntervalMinutes } = body as {
      mode?: StorageMode;
      autoSync?: boolean;
      syncIntervalMinutes?: number;
    };

    // バリデーション
    if (mode && !["local", "cloud", "hybrid"].includes(mode)) {
      return NextResponse.json(
        { ok: false, error: "Invalid mode. Must be 'local', 'cloud', or 'hybrid'" },
        { status: 400 }
      );
    }

    if (
      syncIntervalMinutes !== undefined &&
      (syncIntervalMinutes < 1 || syncIntervalMinutes > 60)
    ) {
      return NextResponse.json(
        { ok: false, error: "syncIntervalMinutes must be between 1 and 60" },
        { status: 400 }
      );
    }

    // クラウドモードにはGoogle認証が必要
    if (mode === "cloud" || mode === "hybrid") {
      const authManager = getGoogleAuth();
      const isAuthenticated = await authManager.isAuthenticated();

      if (!isAuthenticated) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "クラウドモードにはGoogle認証が必要です。先にGoogleと連携してください。",
          },
          { status: 400 }
        );
      }
    }

    const storage = getStorage();
    await storage.updateConfig({
      mode,
      autoSync,
      syncIntervalMinutes,
    });

    const newConfig = storage.getConfig();

    return NextResponse.json({
      ok: true,
      config: {
        mode: newConfig.mode,
        autoSync: newConfig.autoSync,
        syncIntervalMinutes: newConfig.syncIntervalMinutes,
        offlineQueueEnabled: newConfig.offlineQueueEnabled,
      },
    });
  } catch (err) {
    console.error("[storage/config] POST error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "設定の更新に失敗しました",
      },
      { status: 500 }
    );
  }
}
