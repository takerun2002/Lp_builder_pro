import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// データベースファイルのパス（プロジェクトルートの data/ ディレクトリ）
const DB_PATH = path.join(process.cwd(), "data", "lp-builder.db");

// シングルトンインスタンス
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // data ディレクトリがなければ作成
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // テーブル作成
  initSchema(db);

  return db;
}

function initSchema(database: Database.Database): void {
  // プロジェクトテーブル
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      manuscript TEXT,
      canvas_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // アプリ設定（APIキーなど）
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 既存DBへの列追加（マイグレーション）
  try {
    const cols = database.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
    const hasManuscript = cols.some((c) => c.name === "manuscript");
    if (!hasManuscript) {
      database.exec("ALTER TABLE projects ADD COLUMN manuscript TEXT");
      console.log("[db] Added manuscript column to projects table");
    }
    const hasCanvasJson = cols.some((c) => c.name === "canvas_json");
    if (!hasCanvasJson) {
      database.exec("ALTER TABLE projects ADD COLUMN canvas_json TEXT");
      console.log("[db] Added canvas_json column to projects table");
    }
    const hasLpHtml = cols.some((c) => c.name === "lp_html");
    if (!hasLpHtml) {
      database.exec("ALTER TABLE projects ADD COLUMN lp_html TEXT");
      console.log("[db] Added lp_html column to projects table");
    }
    const hasLpCss = cols.some((c) => c.name === "lp_css");
    if (!hasLpCss) {
      database.exec("ALTER TABLE projects ADD COLUMN lp_css TEXT");
      console.log("[db] Added lp_css column to projects table");
    }
  } catch (e) {
    console.error("[db] Migration error:", e);
  }

  // セクションテーブル
  database.exec(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Untitled Section',
      section_type TEXT NOT NULL DEFAULT 'lp',
      order_index INTEGER NOT NULL DEFAULT 0,
      image_path TEXT,
      width INTEGER,
      height INTEGER,
      design_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // sectionsテーブルへのマイグレーション
  try {
    const sectionCols = database.prepare("PRAGMA table_info(sections)").all() as { name: string }[];
    const hasSectionType = sectionCols.some((c) => c.name === "section_type");
    if (!hasSectionType) {
      database.exec("ALTER TABLE sections ADD COLUMN section_type TEXT DEFAULT 'lp'");
      console.log("[db] Added section_type column to sections table");
    }
    const hasDesignJson = sectionCols.some((c) => c.name === "design_json");
    if (!hasDesignJson) {
      database.exec("ALTER TABLE sections ADD COLUMN design_json TEXT");
      console.log("[db] Added design_json column to sections table");
    }
  } catch (e) {
    console.error("[db] sections migration error:", e);
  }

  // スワイプファイルテーブル
  database.exec(`
    CREATE TABLE IF NOT EXISTS swipe_files (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      source_url TEXT,
      tags TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
  `);

  // インデックス
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sections_project ON sections(project_id);
    CREATE INDEX IF NOT EXISTS idx_swipe_files_project ON swipe_files(project_id);
  `);
}

// ユーティリティ: UUID生成
export function generateId(): string {
  return crypto.randomUUID();
}
