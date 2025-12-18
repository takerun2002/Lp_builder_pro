/**
 * Google Sheets Storage Adapter
 * Google Sheetsを使用したクラウドストレージアダプター
 */

import { google, sheets_v4 } from "googleapis";
import { getGoogleAuth } from "./google-auth";
import type {
  StorageAdapter,
  StorageMetadata,
  SyncResult,
  DataType,
  GoogleSheetsProject,
} from "./types";
import { inferDataType, calculateChecksum } from "./types";
import type { EnhancedResearchResult } from "@/lib/research/orchestrator";
import { formatResearchForSheets, generateSheetsApiRequests } from "@/lib/google/sheets-formatter";

// ルートフォルダ名
const ROOT_FOLDER_NAME = "LP_Builder_Pro";

// シート名の定義
const SHEET_NAMES = {
  research_result: "リサーチ結果",
  concept_draft: "コンセプト案",
  competitor_analysis: "競合分析",
  project_progress: "進捗管理",
  _metadata: "_metadata",
} as const;

export class GoogleSheetsAdapter implements StorageAdapter {
  private sheets: sheets_v4.Sheets | null = null;
  private projectCache: Map<string, GoogleSheetsProject> = new Map();

  /**
   * Sheets APIクライアントを取得
   */
  private async getClient(): Promise<sheets_v4.Sheets> {
    if (this.sheets) {
      return this.sheets;
    }

    const authManager = getGoogleAuth();
    const auth = await authManager.getAuthenticatedClient();
    this.sheets = google.sheets({ version: "v4", auth });

    return this.sheets;
  }

  /**
   * データを保存
   */
  async save(key: string, data: unknown, dataType?: DataType): Promise<void> {
    const sheets = await this.getClient();
    const type = dataType || inferDataType(key);

    // キーをパース: "project:{projectId}:{type}:{itemId}" or "{type}:{itemId}"
    const { spreadsheetId, sheetName, rowKey } = await this.resolveKeyToSheet(key, type);

    const jsonData = JSON.stringify(data);
    const checksum = calculateChecksum(jsonData);
    const now = new Date().toISOString();

    // 既存の行を検索
    const existingRow = await this.findRowByKey(spreadsheetId, sheetName, rowKey);

    if (existingRow !== null) {
      // 更新
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${existingRow}:E${existingRow}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[rowKey, type, jsonData, checksum, now]],
        },
      });
    } else {
      // 新規追加
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:E`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[rowKey, type, jsonData, checksum, now]],
        },
      });
    }
  }

  /**
   * データを読み込み
   */
  async load<T = unknown>(key: string): Promise<T | null> {
    const sheets = await this.getClient();
    const type = inferDataType(key);

    const { spreadsheetId, sheetName, rowKey } = await this.resolveKeyToSheet(key, type);

    // 行を検索
    const rowIndex = await this.findRowByKey(spreadsheetId, sheetName, rowKey);
    if (rowIndex === null) {
      return null;
    }

    // データを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!C${rowIndex}`,
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      return null;
    }

    try {
      return JSON.parse(values[0][0]) as T;
    } catch {
      console.error(`[GoogleSheetsAdapter] Failed to parse data for key: ${key}`);
      return null;
    }
  }

  /**
   * データを削除
   */
  async delete(key: string): Promise<void> {
    const sheets = await this.getClient();
    const type = inferDataType(key);

    const { spreadsheetId, sheetName, rowKey } = await this.resolveKeyToSheet(key, type);

    // 行を検索
    const rowIndex = await this.findRowByKey(spreadsheetId, sheetName, rowKey);
    if (rowIndex === null) {
      return; // 存在しない場合は何もしない
    }

    // 行を削除（空白行に置き換え）
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}:E${rowIndex}`,
    });
  }

  /**
   * キーの一覧を取得
   */
  async list(prefix?: string): Promise<string[]> {
    const sheets = await this.getClient();
    const keys: string[] = [];

    // すべてのプロジェクトスプレッドシートを取得
    const spreadsheetIds = await this.listSpreadsheetIds();

    for (const spreadsheetId of spreadsheetIds) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${SHEET_NAMES._metadata}!A:A`,
        });

        const values = response.data.values;
        if (values) {
          for (const row of values) {
            if (row[0] && (!prefix || row[0].startsWith(prefix))) {
              keys.push(row[0]);
            }
          }
        }
      } catch {
        // シートが存在しない場合はスキップ
      }
    }

    return keys;
  }

  /**
   * 同期を実行
   */
  async sync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedAt: new Date().toISOString(),
      itemsSynced: 0,
      conflicts: [],
      errors: [],
    };

    // 同期ロジック（将来実装）
    // ローカルとリモートのタイムスタンプを比較し、
    // 新しい方を採用するか、コンフリクトとして報告

    return result;
  }

  /**
   * メタデータを取得
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    const sheets = await this.getClient();
    const type = inferDataType(key);

    const { spreadsheetId, sheetName, rowKey } = await this.resolveKeyToSheet(key, type);

    // 行を検索
    const rowIndex = await this.findRowByKey(spreadsheetId, sheetName, rowKey);
    if (rowIndex === null) {
      return null;
    }

    // メタデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}:E${rowIndex}`,
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      return null;
    }

    const [, dataType, , checksum, updatedAt] = values[0];

    return {
      key,
      dataType: dataType as DataType,
      createdAt: updatedAt, // Sheetsでは作成日時を追跡しない
      updatedAt,
      checksum,
      source: "google_sheets",
    };
  }

  // ==========================================================================
  // Formatted Research Export
  // ==========================================================================

  /**
   * リサーチ結果を綺麗にフォーマットして新しいスプレッドシートに保存
   * sheets-formatter.tsを使用して複数シート、ヘッダー色、列幅などを適用
   */
  async saveFormattedResearch(
    result: EnhancedResearchResult,
    options?: { projectName?: string }
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const sheets = await this.getClient();

    // 1. リサーチ結果をフォーマット
    const formattedData = formatResearchForSheets(result, options);
    const apiRequests = generateSheetsApiRequests(formattedData);

    // 2. スプレッドシートを作成
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: apiRequests.spreadsheetProperties,
        sheets: apiRequests.sheets,
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId!;
    const spreadsheetUrl = createResponse.data.spreadsheetUrl!;

    console.log(`[GoogleSheetsAdapter] Created formatted spreadsheet: ${spreadsheetId}`);

    // 3. データを入力
    if (apiRequests.valueRanges.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: apiRequests.valueRanges,
        },
      });
    }

    // 4. フォーマットを適用
    if (apiRequests.formatRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: apiRequests.formatRequests,
        },
      });
    }

    console.log(`[GoogleSheetsAdapter] Applied formatting to ${apiRequests.formatRequests.length} elements`);

    // 5. スプレッドシートIDをDBに保存（後で参照できるように）
    const projectId = result.context?.projectName || result.id;
    await this.storeFormattedSpreadsheetId(projectId, spreadsheetId);

    return { spreadsheetId, spreadsheetUrl };
  }

  /**
   * フォーマット済みスプレッドシートIDを保存
   */
  private async storeFormattedSpreadsheetId(projectId: string, spreadsheetId: string): Promise<void> {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const key = `formatted_sheets_${projectId}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(key, spreadsheetId, now);
  }

  /**
   * フォーマット済みスプレッドシートIDを取得
   */
  async getFormattedSpreadsheetId(projectId: string): Promise<string | null> {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const key = `formatted_sheets_${projectId}`;

    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get(key) as { value: string } | undefined;

    return row?.value || null;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * キーからスプレッドシートとシートを解決
   */
  private async resolveKeyToSheet(
    key: string,
    dataType: DataType
  ): Promise<{ spreadsheetId: string; sheetName: string; rowKey: string }> {
    // キー形式: "project:{projectId}:{type}:{itemId}" or "{type}:{itemId}"
    const parts = key.split(":");
    let projectId = "default";
    let rowKey = key;

    if (parts[0] === "project" && parts.length >= 3) {
      projectId = parts[1];
      rowKey = parts.slice(2).join(":");
    }

    // プロジェクトのスプレッドシートを取得または作成
    const project = await this.ensureProjectSpreadsheet(projectId);

    // データタイプに応じたシート名
    const sheetName =
      SHEET_NAMES[dataType as keyof typeof SHEET_NAMES] || SHEET_NAMES._metadata;

    return {
      spreadsheetId: project.folderId, // folderId = spreadsheetId として使用
      sheetName,
      rowKey,
    };
  }

  /**
   * プロジェクト用スプレッドシートを確保
   */
  private async ensureProjectSpreadsheet(projectId: string): Promise<GoogleSheetsProject> {
    // キャッシュを確認
    const cached = this.projectCache.get(projectId);
    if (cached) {
      return cached;
    }

    const sheets = await this.getClient();

    // 既存のスプレッドシートを検索（app_settingsから）
    const spreadsheetId = await this.getStoredSpreadsheetId(projectId);

    if (spreadsheetId) {
      try {
        // スプレッドシートが存在するか確認
        await sheets.spreadsheets.get({ spreadsheetId });

        const project: GoogleSheetsProject = {
          folderId: spreadsheetId,
          folderName: projectId,
          sheets: {},
        };
        this.projectCache.set(projectId, project);
        return project;
      } catch {
        // スプレッドシートが削除されている場合は新規作成
      }
    }

    // 新規スプレッドシートを作成
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `${ROOT_FOLDER_NAME}_${projectId}`,
        },
        sheets: [
          { properties: { title: SHEET_NAMES.research_result } },
          { properties: { title: SHEET_NAMES.concept_draft } },
          { properties: { title: SHEET_NAMES.competitor_analysis } },
          { properties: { title: SHEET_NAMES.project_progress } },
          { properties: { title: SHEET_NAMES._metadata } },
        ],
      },
    });

    const newSpreadsheetId = response.data.spreadsheetId!;

    // スプレッドシートIDを保存
    await this.storeSpreadsheetId(projectId, newSpreadsheetId);

    // ヘッダー行を追加
    for (const sheetName of Object.values(SHEET_NAMES)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: newSpreadsheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["key", "data_type", "data", "checksum", "updated_at"]],
        },
      });
    }

    const project: GoogleSheetsProject = {
      folderId: newSpreadsheetId,
      folderName: projectId,
      sheets: {},
    };
    this.projectCache.set(projectId, project);

    return project;
  }

  /**
   * 行をキーで検索
   */
  private async findRowByKey(
    spreadsheetId: string,
    sheetName: string,
    rowKey: string
  ): Promise<number | null> {
    const sheets = await this.getClient();

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
      });

      const values = response.data.values;
      if (!values) {
        return null;
      }

      for (let i = 0; i < values.length; i++) {
        if (values[i][0] === rowKey) {
          return i + 1; // 1-indexed
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * スプレッドシートIDを取得（DBから）
   */
  private async getStoredSpreadsheetId(projectId: string): Promise<string | null> {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const key = `sheets_${projectId}`;

    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get(key) as { value: string } | undefined;

    return row?.value || null;
  }

  /**
   * スプレッドシートIDを保存（DBへ）
   */
  private async storeSpreadsheetId(projectId: string, spreadsheetId: string): Promise<void> {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const key = `sheets_${projectId}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(key, spreadsheetId, now);
  }

  /**
   * すべてのスプレッドシートIDを取得
   */
  private async listSpreadsheetIds(): Promise<string[]> {
    const { getDb } = await import("@/lib/db");
    const db = getDb();

    const rows = db
      .prepare("SELECT value FROM app_settings WHERE key LIKE 'sheets_%'")
      .all() as { value: string }[];

    return rows.map((r) => r.value);
  }
}

// シングルトンインスタンス
let instance: GoogleSheetsAdapter | null = null;

export function getGoogleSheets(): GoogleSheetsAdapter {
  if (!instance) {
    instance = new GoogleSheetsAdapter();
  }
  return instance;
}
