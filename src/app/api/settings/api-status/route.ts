/**
 * APIキー設定状況取得API
 *
 * GET /api/settings/api-status
 * 各APIキーの設定状態と無料枠情報を返す
 */

import { NextResponse } from "next/server";
import { API_FREE_QUOTAS, type ApiProvider } from "@/lib/research/types";

interface ApiStatusInfo {
  configured: boolean;
  name: string;
  freeQuota: number;
  quotaPeriod: string;
  costPerRequest: number;
  remainingQuota: number | null;
}

/**
 * 環境変数からAPIキーを取得
 */
function getApiKey(envKey: string): string | undefined {
  return process.env[envKey];
}

export async function GET() {
  try {
    const status: Record<ApiProvider, ApiStatusInfo> = {} as Record<ApiProvider, ApiStatusInfo>;

    for (const quota of API_FREE_QUOTAS) {
      const apiKey = getApiKey(quota.envKey);

      status[quota.provider] = {
        configured: !!apiKey,
        name: quota.name,
        freeQuota: quota.freeQuota,
        quotaPeriod: quota.quotaPeriod,
        costPerRequest: quota.costPerRequest || 0,
        remainingQuota: null, // 実際のAPIから取得できれば設定
      };
    }

    // Firecrawlの残り枠を取得（可能であれば）
    if (status.firecrawl.configured) {
      try {
        const firecrawlKey = getApiKey("FIRECRAWL_API_KEY");
        if (firecrawlKey) {
          const res = await fetch("https://api.firecrawl.dev/v1/credits", {
            headers: { Authorization: `Bearer ${firecrawlKey}` },
          });
          if (res.ok) {
            const data = await res.json();
            status.firecrawl.remainingQuota = data.remaining ?? null;
          }
        }
      } catch {
        // 取得失敗しても無視
      }
    }

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api-status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get API status" },
      { status: 500 }
    );
  }
}
