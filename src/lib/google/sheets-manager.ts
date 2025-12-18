/**
 * Google Sheets Manager
 * リサーチ結果やプロジェクトデータをスプレッドシートに蓄積・管理
 */

import { google, sheets_v4 } from "googleapis";
import { getGoogleAuth } from "@/lib/storage/google-auth";

// =============================================================================
// Types
// =============================================================================

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
}

export interface ResearchRecord {
  id: string;
  projectName: string;
  keyword: string;
  source: string;
  title: string;
  url?: string;
  content: string;
  insights?: string;
  createdAt: string;
}

export interface ConceptRecord {
  id: string;
  projectName: string;
  conceptName: string;
  targetAudience: string;
  mainBenefit: string;
  uniquePoint: string;
  status: "draft" | "review" | "approved" | "rejected";
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HeadlineRecord {
  id: string;
  projectName: string;
  sectionType: string;
  headline: string;
  status: "pending" | "adopted" | "rejected";
  score?: number;
  createdAt: string;
}

export interface ProjectProgressRecord {
  id: string;
  projectName: string;
  phase: string;
  task: string;
  status: "pending" | "in_progress" | "completed";
  assignee?: string;
  dueDate?: string;
  completedAt?: string;
  notes?: string;
}

// シート定義
const SHEET_TEMPLATES = {
  research: {
    name: "リサーチ結果",
    headers: [
      "ID",
      "プロジェクト名",
      "キーワード",
      "ソース",
      "タイトル",
      "URL",
      "内容",
      "インサイト",
      "作成日時",
    ],
  },
  concepts: {
    name: "コンセプト案",
    headers: [
      "ID",
      "プロジェクト名",
      "コンセプト名",
      "ターゲット",
      "メインベネフィット",
      "独自性",
      "ステータス",
      "スコア",
      "作成日時",
      "更新日時",
    ],
  },
  headlines: {
    name: "ヘッドライン",
    headers: [
      "ID",
      "プロジェクト名",
      "セクション",
      "ヘッドライン",
      "ステータス",
      "スコア",
      "作成日時",
    ],
  },
  progress: {
    name: "進捗管理",
    headers: [
      "ID",
      "プロジェクト名",
      "フェーズ",
      "タスク",
      "ステータス",
      "担当者",
      "期限",
      "完了日",
      "メモ",
    ],
  },
} as const;

// =============================================================================
// SheetsManager Class
// =============================================================================

export class SheetsManager {
  private sheets: sheets_v4.Sheets | null = null;
  private spreadsheetId: string | null = null;

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
   * プロジェクト用スプレッドシートを初期化
   */
  async initializeSpreadsheet(projectName: string): Promise<string> {
    const sheets = await this.getClient();

    // 新規スプレッドシートを作成
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `LP Builder Pro - ${projectName}`,
        },
        sheets: Object.values(SHEET_TEMPLATES).map((template) => ({
          properties: { title: template.name },
        })),
      },
    });

    const spreadsheetId = response.data.spreadsheetId;
    if (!spreadsheetId) {
      throw new Error("スプレッドシートの作成に失敗しました");
    }

    this.spreadsheetId = spreadsheetId;

    // 各シートにヘッダーを追加
    for (const template of Object.values(SHEET_TEMPLATES)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${template.name}!A1:${String.fromCharCode(64 + template.headers.length)}1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[...template.headers]],
        },
      });
    }

    // スプレッドシートIDをDBに保存
    await this.saveSpreadsheetId(projectName, spreadsheetId);

    return spreadsheetId;
  }

  /**
   * 既存スプレッドシートを設定
   */
  async setSpreadsheet(spreadsheetId: string): Promise<void> {
    const sheets = await this.getClient();

    // スプレッドシートが存在するか確認
    try {
      await sheets.spreadsheets.get({ spreadsheetId });
      this.spreadsheetId = spreadsheetId;
    } catch {
      throw new Error("指定されたスプレッドシートが見つかりません");
    }
  }

  /**
   * スプレッドシートIDを取得
   */
  async getSpreadsheetId(projectName: string): Promise<string | null> {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const key = `sheets_project_${projectName}`;

    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get(key) as { value: string } | undefined;

    return row?.value || null;
  }

  /**
   * スプレッドシートIDを保存
   */
  private async saveSpreadsheetId(projectName: string, spreadsheetId: string): Promise<void> {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const key = `sheets_project_${projectName}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(key, spreadsheetId, now);
  }

  // ===========================================================================
  // Research Records
  // ===========================================================================

  /**
   * リサーチ結果を追加
   */
  async addResearchRecord(record: ResearchRecord): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.research.name;

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:I`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            record.id,
            record.projectName,
            record.keyword,
            record.source,
            record.title,
            record.url || "",
            record.content,
            record.insights || "",
            record.createdAt,
          ],
        ],
      },
    });
  }

  /**
   * リサーチ結果を一括追加
   */
  async addResearchRecords(records: ResearchRecord[]): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.research.name;

    const values = records.map((r) => [
      r.id,
      r.projectName,
      r.keyword,
      r.source,
      r.title,
      r.url || "",
      r.content,
      r.insights || "",
      r.createdAt,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:I`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  /**
   * リサーチ結果を取得
   */
  async getResearchRecords(projectName?: string): Promise<ResearchRecord[]> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.research.name;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A2:I`,
    });

    const rows = response.data.values || [];
    const records: ResearchRecord[] = rows
      .map((row) => ({
        id: row[0] || "",
        projectName: row[1] || "",
        keyword: row[2] || "",
        source: row[3] || "",
        title: row[4] || "",
        url: row[5] || undefined,
        content: row[6] || "",
        insights: row[7] || undefined,
        createdAt: row[8] || "",
      }))
      .filter((r) => !projectName || r.projectName === projectName);

    return records;
  }

  // ===========================================================================
  // Concept Records
  // ===========================================================================

  /**
   * コンセプト案を追加
   */
  async addConceptRecord(record: ConceptRecord): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.concepts.name;

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:J`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            record.id,
            record.projectName,
            record.conceptName,
            record.targetAudience,
            record.mainBenefit,
            record.uniquePoint,
            record.status,
            record.score?.toString() || "",
            record.createdAt,
            record.updatedAt,
          ],
        ],
      },
    });
  }

  /**
   * コンセプト案のステータスを更新
   */
  async updateConceptStatus(
    conceptId: string,
    status: ConceptRecord["status"],
    score?: number
  ): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.concepts.name;

    // 行を検索
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === conceptId);

    if (rowIndex === -1) {
      throw new Error("コンセプトが見つかりません");
    }

    const now = new Date().toISOString();

    // ステータスとスコアを更新
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!G${rowIndex + 1}:J${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[status, score?.toString() || "", "", now]],
      },
    });
  }

  // ===========================================================================
  // Headline Records
  // ===========================================================================

  /**
   * ヘッドラインを一括追加
   */
  async addHeadlineRecords(records: HeadlineRecord[]): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.headlines.name;

    const values = records.map((r) => [
      r.id,
      r.projectName,
      r.sectionType,
      r.headline,
      r.status,
      r.score?.toString() || "",
      r.createdAt,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:G`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  /**
   * ヘッドラインのステータスを更新
   */
  async updateHeadlineStatus(
    headlineId: string,
    status: HeadlineRecord["status"]
  ): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.headlines.name;

    // 行を検索
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === headlineId);

    if (rowIndex === -1) {
      throw new Error("ヘッドラインが見つかりません");
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!E${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[status]],
      },
    });
  }

  // ===========================================================================
  // Progress Records
  // ===========================================================================

  /**
   * 進捗レコードを追加
   */
  async addProgressRecord(record: ProjectProgressRecord): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.progress.name;

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:I`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            record.id,
            record.projectName,
            record.phase,
            record.task,
            record.status,
            record.assignee || "",
            record.dueDate || "",
            record.completedAt || "",
            record.notes || "",
          ],
        ],
      },
    });
  }

  /**
   * 進捗ステータスを更新
   */
  async updateProgressStatus(
    recordId: string,
    status: ProjectProgressRecord["status"]
  ): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES.progress.name;

    // 行を検索
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === recordId);

    if (rowIndex === -1) {
      throw new Error("レコードが見つかりません");
    }

    const completedAt = status === "completed" ? new Date().toISOString() : "";

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!E${rowIndex + 1}:H${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[status, "", "", completedAt]],
      },
    });
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * スプレッドシートのURLを取得
   */
  getSpreadsheetUrl(): string | null {
    if (!this.spreadsheetId) {
      return null;
    }
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`;
  }

  /**
   * シートをクリア
   */
  async clearSheet(sheetType: keyof typeof SHEET_TEMPLATES): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES[sheetType].name;

    // ヘッダー以外をクリア
    await sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A2:Z`,
    });
  }

  /**
   * シートの行数を取得
   */
  async getRowCount(sheetType: keyof typeof SHEET_TEMPLATES): Promise<number> {
    if (!this.spreadsheetId) {
      throw new Error("スプレッドシートが初期化されていません");
    }

    const sheets = await this.getClient();
    const sheetName = SHEET_TEMPLATES[sheetType].name;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    return (response.data.values?.length || 1) - 1; // ヘッダーを除く
  }
}

// シングルトンインスタンス
let instance: SheetsManager | null = null;

export function getSheetsManager(): SheetsManager {
  if (!instance) {
    instance = new SheetsManager();
  }
  return instance;
}
