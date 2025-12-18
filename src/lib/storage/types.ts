/**
 * Hybrid Storage Types
 * ローカルDB（SQLite）とGoogle Workspace（Sheets/Drive）の統合ストレージ型定義
 */

// =============================================================================
// Core Adapter Interface
// =============================================================================

/**
 * ストレージアダプターの共通インターフェース
 */
export interface StorageAdapter {
  /** データを保存 */
  save(key: string, data: unknown, dataType?: DataType): Promise<void>;
  /** データを読み込み */
  load<T = unknown>(key: string): Promise<T | null>;
  /** データを削除 */
  delete(key: string): Promise<void>;
  /** キーの一覧を取得 */
  list(prefix?: string): Promise<string[]>;
  /** 同期を実行（クラウドアダプターのみ） */
  sync?(): Promise<SyncResult>;
  /** メタデータを取得 */
  getMetadata?(key: string): Promise<StorageMetadata | null>;
}

// =============================================================================
// Data Types
// =============================================================================

/**
 * 保存するデータの種別
 */
export type DataType =
  | "user_settings"        // ユーザー設定（ローカルマスター）
  | "research_result"      // リサーチ結果（Sheetsマスター）
  | "concept_draft"        // コンセプト案（Sheets共有）
  | "competitor_analysis"  // 競合分析（Sheetsマスター）
  | "generated_image"      // 生成画像（Drive）
  | "lp_export"           // LP HTMLエクスポート（Drive）
  | "knowledge_yaml"       // ナレッジYAML（ローカル + Drive共有）
  | "project_progress";    // プロジェクト進捗（Sheets）

/**
 * ストレージソース
 */
export type StorageSource = "local" | "google_sheets" | "google_drive";

/**
 * ストレージモード
 */
export type StorageMode = "local" | "cloud" | "hybrid";

// =============================================================================
// Storage Metadata
// =============================================================================

/**
 * ストレージアイテムのメタデータ
 */
export interface StorageMetadata {
  key: string;
  dataType: DataType;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  checksum?: string;
  size?: number;
  source: StorageSource;
}

// =============================================================================
// Sync Types
// =============================================================================

/**
 * 同期結果
 */
export interface SyncResult {
  success: boolean;
  syncedAt: string;
  itemsSynced: number;
  conflicts: SyncConflict[];
  errors: SyncError[];
}

/**
 * 同期コンフリクト
 */
export interface SyncConflict {
  key: string;
  localVersion: string;
  remoteVersion: string;
  resolution: "local" | "remote" | "manual";
}

/**
 * 同期エラー
 */
export interface SyncError {
  key: string;
  error: string;
}

/**
 * オフラインキュー操作
 */
export interface QueuedOperation {
  id: string;
  operation: "save" | "delete";
  key: string;
  data?: unknown;
  dataType: DataType;
  targetAdapter: StorageSource;
  queuedAt: string;
  retryCount: number;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * ストレージ設定
 */
export interface StorageConfig {
  mode: StorageMode;
  autoSync: boolean;
  syncIntervalMinutes: number;
  offlineQueueEnabled: boolean;
  googleAuth?: GoogleAuthConfig;
}

/**
 * Google OAuth設定
 */
export interface GoogleAuthConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string[];
}

/**
 * Google OAuth クライアント設定（セルフホスト用）
 */
export interface GoogleClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// =============================================================================
// Google Sheets Types
// =============================================================================

/**
 * Google Sheetsのプロジェクト構造
 */
export interface GoogleSheetsProject {
  folderId: string;
  folderName: string;
  sheets: {
    research?: string;      // リサーチ結果シートID
    concepts?: string;      // コンセプト案シートID
    competitors?: string;   // 競合分析シートID
    progress?: string;      // 進捗管理シートID
  };
}

/**
 * Sheetsの行データ
 */
export interface SheetRowData {
  rowIndex: number;
  values: (string | number | boolean | null)[];
  updatedAt: string;
}

// =============================================================================
// Google Drive Types
// =============================================================================

/**
 * Google Driveのファイル情報
 */
export interface DriveFileInfo {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * アップロードオプション
 */
export interface DriveUploadOptions {
  folderId?: string;
  mimeType?: string;
  description?: string;
}

// =============================================================================
// Database Row Types
// =============================================================================

/**
 * storage_items テーブルの行
 */
export interface StorageItemRow {
  key: string;
  data: string;
  data_type: string;
  checksum: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  sync_source: string | null;
}

/**
 * sync_queue テーブルの行
 */
export interface SyncQueueRow {
  id: string;
  operation: string;
  key: string;
  data: string | null;
  data_type: string;
  target_adapter: string;
  queued_at: string;
  retry_count: number;
}

/**
 * google_oauth テーブルの行
 */
export interface GoogleOAuthRow {
  id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
  updated_at: string;
}

// =============================================================================
// Data Type to Storage Mapping
// =============================================================================

/**
 * データ種別ごとの保存先マッピング
 */
export const DATA_TYPE_STORAGE_MAP: Record<
  DataType,
  { primary: StorageSource; secondary?: StorageSource }
> = {
  user_settings: { primary: "local" },
  research_result: { primary: "google_sheets", secondary: "local" },
  concept_draft: { primary: "google_sheets", secondary: "local" },
  competitor_analysis: { primary: "google_sheets", secondary: "local" },
  generated_image: { primary: "google_drive", secondary: "local" },
  lp_export: { primary: "google_drive" },
  knowledge_yaml: { primary: "local", secondary: "google_drive" },
  project_progress: { primary: "google_sheets" },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * キーからデータ種別を推測
 */
export function inferDataType(key: string): DataType {
  if (key.startsWith("settings:") || key.startsWith("config:")) {
    return "user_settings";
  }
  if (key.startsWith("research:")) {
    return "research_result";
  }
  if (key.startsWith("concept:")) {
    return "concept_draft";
  }
  if (key.startsWith("competitor:")) {
    return "competitor_analysis";
  }
  if (key.startsWith("image:") || key.endsWith(".png") || key.endsWith(".jpg")) {
    return "generated_image";
  }
  if (key.startsWith("export:") || key.endsWith(".html")) {
    return "lp_export";
  }
  if (key.endsWith(".yaml") || key.endsWith(".yml")) {
    return "knowledge_yaml";
  }
  if (key.startsWith("progress:")) {
    return "project_progress";
  }
  // デフォルトはユーザー設定（ローカル保存）
  return "user_settings";
}

/**
 * チェックサムを計算（簡易版）
 */
export function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return hash.toString(16);
}
