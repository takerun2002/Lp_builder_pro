/**
 * ストレージステータスAPI
 *
 * GET /api/storage/status
 * Google連携の状態を取得
 */

import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/hybrid-storage";

export async function GET() {
  try {
    const storage = getStorage();
    const status = await storage.getConnectionStatus();

    return NextResponse.json({
      mode: status.mode,
      googleAuthenticated: status.googleAuthenticated,
      lastSyncAt: status.lastSyncAt,
      queueSize: status.queueSize,
    });
  } catch (error) {
    console.error("[storage/status] Error:", error);

    // デフォルト値を返す（ローカルモード）
    return NextResponse.json({
      mode: "local",
      googleAuthenticated: false,
      lastSyncAt: null,
      queueSize: 0,
    });
  }
}
