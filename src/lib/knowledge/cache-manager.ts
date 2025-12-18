/**
 * Knowledge Cache Manager
 * ナレッジキャッシュの有効期限管理・自動更新
 */

import {
  refreshCache,
  deleteCache,
  getCacheStats,
  initializeCache,
} from "@/lib/ai/context-cache";
import { getHybridStats } from "@/lib/ai/hybrid-knowledge";
import { getDb } from "@/lib/db";

// =============================================================================
// Types
// =============================================================================

export interface CacheManagerConfig {
  autoRefresh: boolean;
  refreshIntervalMinutes: number;
  minRemainingTtlMinutes: number; // この時間を切ったら自動更新
}

export interface CacheStatus {
  initialized: boolean;
  cacheId?: string;
  model?: string;
  tokenCount?: number;
  createdAt?: string;
  expiresAt?: string;
  remainingTtlMinutes?: number;
  files?: string[];
  stats: {
    totalQueries: number;
    cacheHitRate: number;
    totalTokensSaved: number;
    estimatedCostSaved: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: CacheManagerConfig = {
  autoRefresh: true,
  refreshIntervalMinutes: 30,
  minRemainingTtlMinutes: 10,
};

// =============================================================================
// Configuration
// =============================================================================

function getConfig(): CacheManagerConfig {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get("cache_manager_config") as { value: string } | undefined;

  if (!row) return DEFAULT_CONFIG;

  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: CacheManagerConfig): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run("cache_manager_config", JSON.stringify(config), now);
}

// =============================================================================
// Cache Manager
// =============================================================================

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;

/**
 * キャッシュマネージャーを初期化
 */
export async function initializeCacheManager(): Promise<CacheStatus> {
  if (isInitialized) {
    return getCacheStatus();
  }

  console.log("[cache-manager] Initializing...");

  // キャッシュを初期化
  await initializeCache();

  // 自動更新を開始
  const config = getConfig();
  if (config.autoRefresh) {
    startAutoRefresh(config.refreshIntervalMinutes);
  }

  isInitialized = true;
  console.log("[cache-manager] Initialized successfully");

  return getCacheStatus();
}

/**
 * キャッシュステータスを取得
 */
export async function getCacheStatus(): Promise<CacheStatus> {
  const cacheStats = await getCacheStats();
  const hybridStats = getHybridStats();

  if (!cacheStats.hasCache) {
    return {
      initialized: isInitialized,
      stats: {
        totalQueries: hybridStats.totalQueries,
        cacheHitRate: hybridStats.cacheHitRate,
        totalTokensSaved: hybridStats.totalTokensSaved,
        estimatedCostSaved: hybridStats.estimatedCostSaved,
      },
    };
  }

  const remainingTtlMinutes = cacheStats.remainingTtlSeconds
    ? Math.floor(cacheStats.remainingTtlSeconds / 60)
    : 0;

  return {
    initialized: isInitialized,
    cacheId: cacheStats.cacheId,
    model: cacheStats.model,
    tokenCount: cacheStats.tokenCount,
    createdAt: cacheStats.createdAt,
    expiresAt: cacheStats.expiresAt,
    remainingTtlMinutes,
    files: cacheStats.files,
    stats: {
      totalQueries: hybridStats.totalQueries,
      cacheHitRate: hybridStats.cacheHitRate,
      totalTokensSaved: hybridStats.totalTokensSaved,
      estimatedCostSaved: hybridStats.estimatedCostSaved,
    },
  };
}

/**
 * キャッシュを手動更新
 */
export async function refreshCacheManually(
  ttlMinutes?: number
): Promise<CacheStatus> {
  console.log("[cache-manager] Manual refresh triggered");

  const ttlSeconds = ttlMinutes ? ttlMinutes * 60 : 3600;
  await refreshCache(ttlSeconds);

  return getCacheStatus();
}

/**
 * キャッシュを削除
 */
export async function clearCache(): Promise<void> {
  console.log("[cache-manager] Clearing cache...");
  await deleteCache();
}

/**
 * 自動更新を開始
 */
export function startAutoRefresh(intervalMinutes: number): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  refreshTimer = setInterval(async () => {
    try {
      const status = await getCacheStatus();
      const config = getConfig();

      // 残りTTLが閾値を下回ったら更新
      if (
        status.remainingTtlMinutes !== undefined &&
        status.remainingTtlMinutes < config.minRemainingTtlMinutes
      ) {
        console.log("[cache-manager] Auto-refreshing cache (TTL low)...");
        await refreshCache();
      }
    } catch (error) {
      console.error("[cache-manager] Auto-refresh failed:", error);
    }
  }, intervalMs);

  console.log(`[cache-manager] Auto-refresh started (every ${intervalMinutes} minutes)`);
}

/**
 * 自動更新を停止
 */
export function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
    console.log("[cache-manager] Auto-refresh stopped");
  }
}

/**
 * 設定を更新
 */
export async function updateConfig(
  updates: Partial<CacheManagerConfig>
): Promise<CacheManagerConfig> {
  const currentConfig = getConfig();
  const newConfig = { ...currentConfig, ...updates };

  saveConfig(newConfig);

  // 自動更新設定が変更された場合
  if (updates.autoRefresh !== undefined || updates.refreshIntervalMinutes !== undefined) {
    if (newConfig.autoRefresh) {
      startAutoRefresh(newConfig.refreshIntervalMinutes);
    } else {
      stopAutoRefresh();
    }
  }

  return newConfig;
}

/**
 * 現在の設定を取得
 */
export function getCurrentConfig(): CacheManagerConfig {
  return getConfig();
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * キャッシュの健全性チェック
 */
export async function checkCacheHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  const status = await getCacheStatus();

  // キャッシュが存在しない
  if (!status.cacheId) {
    issues.push("キャッシュが作成されていません");
    recommendations.push("initializeCacheManager()を呼び出してキャッシュを作成してください");
  }

  // TTLが短い
  if (status.remainingTtlMinutes !== undefined && status.remainingTtlMinutes < 5) {
    issues.push(`キャッシュの有効期限が残り${status.remainingTtlMinutes}分です`);
    recommendations.push("refreshCacheManually()でキャッシュを更新してください");
  }

  // キャッシュヒット率が低い
  if (status.stats.totalQueries > 10 && status.stats.cacheHitRate < 50) {
    issues.push(`キャッシュヒット率が${status.stats.cacheHitRate}%と低いです`);
    recommendations.push("useCache: trueを指定してハイブリッド生成を使用してください");
  }

  return {
    healthy: issues.length === 0,
    issues,
    recommendations,
  };
}

// =============================================================================
// Cost Report
// =============================================================================

/**
 * コスト削減レポートを生成
 */
export async function generateCostReport(): Promise<{
  period: string;
  totalQueries: number;
  cacheHitRate: number;
  tokensSaved: number;
  estimatedCostSavedUSD: number;
  effectiveDiscount: number;
  recommendations: string[];
}> {
  const status = await getCacheStatus();
  const recommendations: string[] = [];

  // ヒット率が低い場合
  if (status.stats.cacheHitRate < 70) {
    recommendations.push("静的ナレッジを多用する機能でキャッシュ使用を増やすとコスト削減できます");
  }

  // クエリ数が少ない場合
  if (status.stats.totalQueries < 100) {
    recommendations.push("キャッシュの効果を最大化するには、より多くのクエリを実行してください");
  }

  // コスト削減率を計算
  const effectiveDiscount = status.stats.totalQueries > 0
    ? Math.round((status.stats.totalTokensSaved / (status.stats.totalQueries * 1000)) * 75)
    : 0;

  return {
    period: "累計",
    totalQueries: status.stats.totalQueries,
    cacheHitRate: status.stats.cacheHitRate,
    tokensSaved: status.stats.totalTokensSaved,
    estimatedCostSavedUSD: status.stats.estimatedCostSaved,
    effectiveDiscount,
    recommendations,
  };
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * キャッシュマネージャーをシャットダウン
 */
export function shutdownCacheManager(): void {
  stopAutoRefresh();
  isInitialized = false;
  console.log("[cache-manager] Shutdown complete");
}
