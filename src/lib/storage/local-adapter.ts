/**
 * Local Storage Adapter
 * SQLite (better-sqlite3) を使用したローカルストレージアダプター
 */

import { getDb, generateId } from "@/lib/db";
import type {
  StorageAdapter,
  StorageMetadata,
  DataType,
  QueuedOperation,
  StorageItemRow,
  SyncQueueRow,
} from "./types";
import { inferDataType, calculateChecksum } from "./types";

export class LocalStorageAdapter implements StorageAdapter {
  /**
   * データを保存
   */
  async save(key: string, data: unknown, dataType?: DataType): Promise<void> {
    const db = getDb();
    const type = dataType || inferDataType(key);
    const jsonData = JSON.stringify(data);
    const checksum = calculateChecksum(jsonData);
    const now = new Date().toISOString();

    const existing = db
      .prepare("SELECT key FROM storage_items WHERE key = ?")
      .get(key) as { key: string } | undefined;

    if (existing) {
      // 更新
      db.prepare(
        `UPDATE storage_items
         SET data = ?, data_type = ?, checksum = ?, updated_at = ?
         WHERE key = ?`
      ).run(jsonData, type, checksum, now, key);
    } else {
      // 新規作成
      db.prepare(
        `INSERT INTO storage_items (key, data, data_type, checksum, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(key, jsonData, type, checksum, now, now);
    }
  }

  /**
   * データを読み込み
   */
  async load<T = unknown>(key: string): Promise<T | null> {
    const db = getDb();
    const row = db
      .prepare("SELECT data FROM storage_items WHERE key = ?")
      .get(key) as { data: string } | undefined;

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.data) as T;
    } catch {
      console.error(`[LocalStorageAdapter] Failed to parse data for key: ${key}`);
      return null;
    }
  }

  /**
   * データを削除
   */
  async delete(key: string): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM storage_items WHERE key = ?").run(key);
  }

  /**
   * キーの一覧を取得
   */
  async list(prefix?: string): Promise<string[]> {
    const db = getDb();

    if (prefix) {
      const rows = db
        .prepare("SELECT key FROM storage_items WHERE key LIKE ? ORDER BY key")
        .all(`${prefix}%`) as { key: string }[];
      return rows.map((r) => r.key);
    }

    const rows = db
      .prepare("SELECT key FROM storage_items ORDER BY key")
      .all() as { key: string }[];
    return rows.map((r) => r.key);
  }

  /**
   * メタデータを取得
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT key, data_type, checksum, created_at, updated_at, synced_at, sync_source
         FROM storage_items WHERE key = ?`
      )
      .get(key) as StorageItemRow | undefined;

    if (!row) {
      return null;
    }

    return {
      key: row.key,
      dataType: row.data_type as DataType,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncedAt: row.synced_at || undefined,
      checksum: row.checksum || undefined,
      source: "local",
    };
  }

  /**
   * 同期済みとしてマーク
   */
  async markSynced(key: string, source: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE storage_items
       SET synced_at = ?, sync_source = ?
       WHERE key = ?`
    ).run(now, source, key);
  }

  /**
   * 未同期のアイテムを取得
   */
  async getUnsyncedItems(dataType?: DataType): Promise<StorageItemRow[]> {
    const db = getDb();

    if (dataType) {
      return db
        .prepare(
          `SELECT * FROM storage_items
           WHERE synced_at IS NULL AND data_type = ?
           ORDER BY updated_at ASC`
        )
        .all(dataType) as StorageItemRow[];
    }

    return db
      .prepare(
        `SELECT * FROM storage_items
         WHERE synced_at IS NULL
         ORDER BY updated_at ASC`
      )
      .all() as StorageItemRow[];
  }

  /**
   * 特定のデータタイプのアイテムを取得
   */
  async getByDataType(dataType: DataType): Promise<StorageItemRow[]> {
    const db = getDb();
    return db
      .prepare("SELECT * FROM storage_items WHERE data_type = ? ORDER BY updated_at DESC")
      .all(dataType) as StorageItemRow[];
  }

  // ==========================================================================
  // Sync Queue Operations (オフラインキュー)
  // ==========================================================================

  /**
   * オペレーションをキューに追加
   */
  async queueOperation(op: Omit<QueuedOperation, "id" | "queuedAt" | "retryCount">): Promise<void> {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    const data = op.data ? JSON.stringify(op.data) : null;

    db.prepare(
      `INSERT INTO sync_queue (id, operation, key, data, data_type, target_adapter, queued_at, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(id, op.operation, op.key, data, op.dataType, op.targetAdapter, now);
  }

  /**
   * キューに入っているオペレーションを取得
   */
  async getQueuedOperations(targetAdapter?: string): Promise<QueuedOperation[]> {
    const db = getDb();

    let rows: SyncQueueRow[];
    if (targetAdapter) {
      rows = db
        .prepare(
          `SELECT * FROM sync_queue
           WHERE target_adapter = ?
           ORDER BY queued_at ASC`
        )
        .all(targetAdapter) as SyncQueueRow[];
    } else {
      rows = db
        .prepare("SELECT * FROM sync_queue ORDER BY queued_at ASC")
        .all() as SyncQueueRow[];
    }

    return rows.map((row) => ({
      id: row.id,
      operation: row.operation as "save" | "delete",
      key: row.key,
      data: row.data ? JSON.parse(row.data) : undefined,
      dataType: row.data_type as DataType,
      targetAdapter: row.target_adapter as "local" | "google_sheets" | "google_drive",
      queuedAt: row.queued_at,
      retryCount: row.retry_count,
    }));
  }

  /**
   * キューからオペレーションを削除
   */
  async clearQueuedOperation(id: string): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM sync_queue WHERE id = ?").run(id);
  }

  /**
   * リトライカウントを増加
   */
  async incrementRetryCount(id: string): Promise<void> {
    const db = getDb();
    db.prepare("UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?").run(id);
  }

  /**
   * 失敗したオペレーション（リトライ上限超過）を削除
   */
  async clearFailedOperations(maxRetries: number = 5): Promise<number> {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM sync_queue WHERE retry_count >= ?")
      .run(maxRetries);
    return result.changes;
  }

  /**
   * キューのサイズを取得
   */
  async getQueueSize(): Promise<number> {
    const db = getDb();
    const row = db
      .prepare("SELECT COUNT(*) as count FROM sync_queue")
      .get() as { count: number };
    return row.count;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * すべてのストレージアイテムをクリア（テスト用）
   */
  async clearAll(): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM storage_items").run();
    db.prepare("DELETE FROM sync_queue").run();
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{
    totalItems: number;
    unsyncedItems: number;
    queueSize: number;
    byDataType: Record<string, number>;
  }> {
    const db = getDb();

    const totalRow = db
      .prepare("SELECT COUNT(*) as count FROM storage_items")
      .get() as { count: number };

    const unsyncedRow = db
      .prepare("SELECT COUNT(*) as count FROM storage_items WHERE synced_at IS NULL")
      .get() as { count: number };

    const queueRow = db
      .prepare("SELECT COUNT(*) as count FROM sync_queue")
      .get() as { count: number };

    const typeRows = db
      .prepare(
        `SELECT data_type, COUNT(*) as count
         FROM storage_items
         GROUP BY data_type`
      )
      .all() as { data_type: string; count: number }[];

    const byDataType: Record<string, number> = {};
    for (const row of typeRows) {
      byDataType[row.data_type] = row.count;
    }

    return {
      totalItems: totalRow.count,
      unsyncedItems: unsyncedRow.count,
      queueSize: queueRow.count,
      byDataType,
    };
  }
}

// シングルトンインスタンス
let instance: LocalStorageAdapter | null = null;

export function getLocalStorage(): LocalStorageAdapter {
  if (!instance) {
    instance = new LocalStorageAdapter();
  }
  return instance;
}
