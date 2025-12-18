/**
 * Hybrid Storage
 * ローカルDBとGoogle Workspaceを統合するストレージオーケストレーター
 */

import { LocalStorageAdapter, getLocalStorage } from "./local-adapter";
import { GoogleSheetsAdapter, getGoogleSheets } from "./google-sheets-adapter";
import { GoogleDriveAdapter, getGoogleDrive } from "./google-drive-adapter";
import { getGoogleAuth } from "./google-auth";
import { getDb } from "@/lib/db";
import type {
  StorageAdapter,
  StorageConfig,
  StorageMode,
  DataType,
  SyncResult,
  StorageMetadata,
  DATA_TYPE_STORAGE_MAP,
} from "./types";
import { inferDataType } from "./types";

// データタイプごとの保存先マッピング
const STORAGE_MAP: typeof DATA_TYPE_STORAGE_MAP = {
  user_settings: { primary: "local" },
  research_result: { primary: "google_sheets", secondary: "local" },
  concept_draft: { primary: "google_sheets", secondary: "local" },
  competitor_analysis: { primary: "google_sheets", secondary: "local" },
  generated_image: { primary: "google_drive", secondary: "local" },
  lp_export: { primary: "google_drive" },
  knowledge_yaml: { primary: "local", secondary: "google_drive" },
  project_progress: { primary: "google_sheets" },
};

// デフォルト設定
const DEFAULT_CONFIG: StorageConfig = {
  mode: "local",
  autoSync: false,
  syncIntervalMinutes: 5,
  offlineQueueEnabled: true,
};

export class HybridStorage implements StorageAdapter {
  private localAdapter: LocalStorageAdapter;
  private sheetsAdapter: GoogleSheetsAdapter | null = null;
  private driveAdapter: GoogleDriveAdapter | null = null;
  private config: StorageConfig;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized: boolean = false;

  constructor(config?: Partial<StorageConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.localAdapter = getLocalStorage();
  }

  /**
   * 初期化（Google認証が必要な場合のみ）
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.config.mode !== "local") {
      const authManager = getGoogleAuth();
      const isAuthenticated = await authManager.isAuthenticated();

      if (isAuthenticated) {
        this.sheetsAdapter = getGoogleSheets();
        this.driveAdapter = getGoogleDrive();
      } else if (this.config.mode === "cloud") {
        throw new Error("クラウドモードにはGoogle認証が必要です");
      }
    }

    // 自動同期を開始
    if (this.config.autoSync && this.config.mode !== "local") {
      this.startAutoSync();
    }

    this.isInitialized = true;
  }

  /**
   * データを保存
   */
  async save(key: string, data: unknown, dataType?: DataType): Promise<void> {
    await this.initialize();

    const type = dataType || inferDataType(key);
    const adapter = this.getAdapterForDataType(type);

    try {
      await adapter.save(key, data, type);

      // ハイブリッドモードの場合、セカンダリストレージにも保存
      if (this.config.mode === "hybrid") {
        const mapping = STORAGE_MAP[type];
        if (mapping.secondary) {
          const secondaryAdapter = this.getAdapterBySource(mapping.secondary);
          if (secondaryAdapter && secondaryAdapter !== adapter) {
            try {
              await secondaryAdapter.save(key, data, type);
            } catch (err) {
              console.warn(`[HybridStorage] Secondary save failed for ${key}:`, err);
            }
          }
        }
      }
    } catch (err) {
      // オンラインストレージが失敗した場合、オフラインキューに追加
      if (this.config.offlineQueueEnabled && this.isOnlineDataType(type)) {
        console.warn(`[HybridStorage] Online save failed, queueing: ${key}`);

        await this.localAdapter.queueOperation({
          operation: "save",
          key,
          data,
          dataType: type,
          targetAdapter: STORAGE_MAP[type].primary,
        });

        // ローカルにフォールバック保存
        await this.localAdapter.save(key, data, type);
      } else {
        throw err;
      }
    }
  }

  /**
   * データを読み込み
   */
  async load<T = unknown>(key: string): Promise<T | null> {
    await this.initialize();

    const type = inferDataType(key);
    const adapter = this.getAdapterForDataType(type);

    try {
      const data = await adapter.load<T>(key);
      if (data !== null) {
        return data;
      }

      // プライマリにない場合、セカンダリを確認
      if (this.config.mode === "hybrid") {
        const mapping = STORAGE_MAP[type];
        if (mapping.secondary) {
          const secondaryAdapter = this.getAdapterBySource(mapping.secondary);
          if (secondaryAdapter && secondaryAdapter !== adapter) {
            return await secondaryAdapter.load<T>(key);
          }
        }
      }

      return null;
    } catch (err) {
      // オンラインストレージが失敗した場合、ローカルにフォールバック
      if (this.config.mode !== "local") {
        console.warn(`[HybridStorage] Online load failed, trying local: ${key}`);
        return await this.localAdapter.load<T>(key);
      }
      throw err;
    }
  }

  /**
   * データを削除
   */
  async delete(key: string): Promise<void> {
    await this.initialize();

    const type = inferDataType(key);
    const adapter = this.getAdapterForDataType(type);

    try {
      await adapter.delete(key);

      // ハイブリッドモードの場合、セカンダリからも削除
      if (this.config.mode === "hybrid") {
        const mapping = STORAGE_MAP[type];
        if (mapping.secondary) {
          const secondaryAdapter = this.getAdapterBySource(mapping.secondary);
          if (secondaryAdapter && secondaryAdapter !== adapter) {
            try {
              await secondaryAdapter.delete(key);
            } catch (err) {
              console.warn(`[HybridStorage] Secondary delete failed for ${key}:`, err);
            }
          }
        }
      }
    } catch (err) {
      // オンラインストレージが失敗した場合、オフラインキューに追加
      if (this.config.offlineQueueEnabled && this.isOnlineDataType(type)) {
        await this.localAdapter.queueOperation({
          operation: "delete",
          key,
          dataType: type,
          targetAdapter: STORAGE_MAP[type].primary,
        });
      } else {
        throw err;
      }
    }
  }

  /**
   * キーの一覧を取得
   */
  async list(prefix?: string): Promise<string[]> {
    await this.initialize();

    const keys = new Set<string>();

    // ローカルから取得
    const localKeys = await this.localAdapter.list(prefix);
    localKeys.forEach((k) => keys.add(k));

    // クラウドからも取得（ハイブリッド/クラウドモード）
    if (this.config.mode !== "local") {
      if (this.sheetsAdapter) {
        try {
          const sheetsKeys = await this.sheetsAdapter.list(prefix);
          sheetsKeys.forEach((k) => keys.add(k));
        } catch (err) {
          console.warn("[HybridStorage] Sheets list failed:", err);
        }
      }

      if (this.driveAdapter) {
        try {
          const driveKeys = await this.driveAdapter.list(prefix);
          driveKeys.forEach((k) => keys.add(k));
        } catch (err) {
          console.warn("[HybridStorage] Drive list failed:", err);
        }
      }
    }

    return Array.from(keys).sort();
  }

  /**
   * メタデータを取得
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    await this.initialize();

    const type = inferDataType(key);
    const adapter = this.getAdapterForDataType(type);

    if (adapter.getMetadata) {
      return await adapter.getMetadata(key);
    }

    return null;
  }

  /**
   * 同期を実行
   */
  async sync(): Promise<SyncResult> {
    await this.initialize();

    const result: SyncResult = {
      success: true,
      syncedAt: new Date().toISOString(),
      itemsSynced: 0,
      conflicts: [],
      errors: [],
    };

    if (this.config.mode === "local") {
      return result;
    }

    // オフラインキューを処理
    const queue = await this.localAdapter.getQueuedOperations();
    for (const op of queue) {
      try {
        const adapter = this.getAdapterBySource(op.targetAdapter);
        if (adapter) {
          if (op.operation === "save" && op.data !== undefined) {
            await adapter.save(op.key, op.data, op.dataType);
          } else if (op.operation === "delete") {
            await adapter.delete(op.key);
          }
          await this.localAdapter.clearQueuedOperation(op.id);
          result.itemsSynced++;
        }
      } catch (err) {
        await this.localAdapter.incrementRetryCount(op.id);
        result.errors.push({
          key: op.key,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // 失敗したオペレーションをクリーンアップ
    await this.localAdapter.clearFailedOperations(5);

    // 各アダプターの同期
    if (this.sheetsAdapter?.sync) {
      try {
        const sheetsResult = await this.sheetsAdapter.sync();
        result.itemsSynced += sheetsResult.itemsSynced;
        result.conflicts.push(...sheetsResult.conflicts);
        result.errors.push(...sheetsResult.errors);
      } catch (err) {
        result.errors.push({
          key: "sheets",
          error: err instanceof Error ? err.message : "Sheets sync failed",
        });
      }
    }

    if (this.driveAdapter?.sync) {
      try {
        const driveResult = await this.driveAdapter.sync();
        result.itemsSynced += driveResult.itemsSynced;
        result.conflicts.push(...driveResult.conflicts);
        result.errors.push(...driveResult.errors);
      } catch (err) {
        result.errors.push({
          key: "drive",
          error: err instanceof Error ? err.message : "Drive sync failed",
        });
      }
    }

    result.success = result.errors.length === 0;

    // 最終同期日時を保存
    await this.saveLastSyncTime(result.syncedAt);

    return result;
  }

  // ==========================================================================
  // Configuration Methods
  // ==========================================================================

  /**
   * 設定を更新
   */
  async updateConfig(config: Partial<StorageConfig>): Promise<void> {
    const oldMode = this.config.mode;
    const oldAutoSync = this.config.autoSync;

    this.config = { ...this.config, ...config };

    // モードが変更された場合、アダプターを再初期化
    if (config.mode && config.mode !== oldMode) {
      this.isInitialized = false;
      this.sheetsAdapter = null;
      this.driveAdapter = null;
      await this.initialize();
    }

    // 自動同期の設定が変更された場合
    if (config.autoSync !== undefined && config.autoSync !== oldAutoSync) {
      if (config.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }

    // 設定を保存
    await this.saveConfig();
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * 自動同期を開始
   */
  startAutoSync(): void {
    if (this.syncTimer) {
      return;
    }

    this.syncTimer = setInterval(
      () => this.sync().catch(console.error),
      this.config.syncIntervalMinutes * 60 * 1000
    );
  }

  /**
   * 自動同期を停止
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * 接続状態を取得
   */
  async getConnectionStatus(): Promise<{
    mode: StorageMode;
    googleAuthenticated: boolean;
    lastSyncAt?: string;
    queueSize: number;
  }> {
    const authManager = getGoogleAuth();
    const isAuthenticated = await authManager.isAuthenticated();
    const queueSize = await this.localAdapter.getQueueSize();
    const lastSyncAt = await this.getLastSyncTime();

    return {
      mode: this.config.mode,
      googleAuthenticated: isAuthenticated,
      lastSyncAt,
      queueSize,
    };
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{
    local: Awaited<ReturnType<LocalStorageAdapter["getStats"]>>;
    mode: StorageMode;
    autoSync: boolean;
    syncInterval: number;
  }> {
    const localStats = await this.localAdapter.getStats();

    return {
      local: localStats,
      mode: this.config.mode,
      autoSync: this.config.autoSync,
      syncInterval: this.config.syncIntervalMinutes,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * データタイプに応じたアダプターを取得
   */
  private getAdapterForDataType(dataType: DataType): StorageAdapter {
    if (this.config.mode === "local") {
      return this.localAdapter;
    }

    const mapping = STORAGE_MAP[dataType];

    switch (mapping.primary) {
      case "google_sheets":
        return this.sheetsAdapter || this.localAdapter;
      case "google_drive":
        return this.driveAdapter || this.localAdapter;
      default:
        return this.localAdapter;
    }
  }

  /**
   * ストレージソースに応じたアダプターを取得
   */
  private getAdapterBySource(source: string): StorageAdapter | null {
    switch (source) {
      case "local":
        return this.localAdapter;
      case "google_sheets":
        return this.sheetsAdapter;
      case "google_drive":
        return this.driveAdapter;
      default:
        return null;
    }
  }

  /**
   * オンラインストレージが必要なデータタイプか判定
   */
  private isOnlineDataType(dataType: DataType): boolean {
    const mapping = STORAGE_MAP[dataType];
    return mapping.primary !== "local";
  }

  /**
   * 設定を保存
   */
  private async saveConfig(): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    const configJson = JSON.stringify(this.config);

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run("storage_config", configJson, now);
  }

  /**
   * 設定を読み込み
   */
  static loadConfig(): StorageConfig {
    const db = getDb();
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get("storage_config") as { value: string } | undefined;

    if (row) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
      } catch {
        return DEFAULT_CONFIG;
      }
    }

    return DEFAULT_CONFIG;
  }

  /**
   * 最終同期日時を保存
   */
  private async saveLastSyncTime(time: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run("last_sync_at", time, now);
  }

  /**
   * 最終同期日時を取得
   */
  private async getLastSyncTime(): Promise<string | undefined> {
    const db = getDb();
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get("last_sync_at") as { value: string } | undefined;

    return row?.value;
  }
}

// ==========================================================================
// Singleton & Factory
// ==========================================================================

let instance: HybridStorage | null = null;

/**
 * ストレージインスタンスを取得
 */
export function getStorage(): HybridStorage {
  if (!instance) {
    const config = HybridStorage.loadConfig();
    instance = new HybridStorage(config);
  }
  return instance;
}

/**
 * ストレージを初期化（設定を指定）
 */
export function initStorage(config: Partial<StorageConfig>): HybridStorage {
  instance = new HybridStorage(config);
  return instance;
}

/**
 * ストレージインスタンスをリセット（テスト用）
 */
export function resetStorage(): void {
  if (instance) {
    instance.stopAutoSync();
  }
  instance = null;
}
