/**
 * N1 Manager - N1データ管理
 * 実在顧客（N1）のインタビューデータを管理
 *
 * N1とは: たった一人の実在顧客を深く理解することで、普遍的な洞察を得る手法
 * ペルソナ（架空）とは明確に区別する
 */

import { getDb } from "@/lib/db";

// =============================================================================
// Types
// =============================================================================

export interface N1Basic {
  name: string; // 仮名OK
  age: number;
  occupation: string;
  familyStructure: string;
  purchasedProduct: string;
  purchaseDate: string;
  purchaseAmount: number;
  discoveryChannel: string; // どこで知ったか
}

export interface N1BeforePurchase {
  painPoint: string; // 何に困っていたか
  painDuration: string; // いつから悩んでいたか
  triedSolutions: string[]; // 他に試したこと
  whyNotWorked: string; // なぜ解決しなかったか
}

export interface N1DecisionPoint {
  triggerMoment: string; // 「これだ」と思った瞬間
  hesitation: string; // 迷った瞬間
  finalPush: string; // 最後の一押し
  pricePerception: string; // 価格への感覚
}

export interface N1AfterPurchase {
  transformation: string; // どう変わったか
  recommendation: string; // 人に勧めるなら何と言う
  wouldRepurchase: boolean;
}

export interface N1Meta {
  interviewDate: string;
  interviewer: string;
  rawTranscript?: string; // インタビュー全文
}

export interface N1Data {
  id: string;
  projectId: string;
  basic: N1Basic;
  beforePurchase: N1BeforePurchase;
  decisionPoint: N1DecisionPoint;
  afterPurchase: N1AfterPurchase;
  meta: N1Meta;
  createdAt: string;
  updatedAt: string;
}

export type DataLevel = "fact" | "n1_based" | "hypothesis";

export interface LabeledData {
  content: string;
  level: DataLevel;
  source?: string; // N1 ID or "ai_generated"
}

// =============================================================================
// Database Schema
// =============================================================================

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS n1_data (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  basic TEXT NOT NULL,
  before_purchase TEXT NOT NULL,
  decision_point TEXT NOT NULL,
  after_purchase TEXT NOT NULL,
  meta TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_n1_data_project_id ON n1_data(project_id);
`;

function ensureSchema(): void {
  const db = getDb();
  db.exec(INIT_SQL);
}

// =============================================================================
// N1 Manager Class
// =============================================================================

export class N1Manager {
  constructor() {
    ensureSchema();
  }

  /**
   * Create new N1 data
   */
  create(projectId: string, data: Omit<N1Data, "id" | "projectId" | "createdAt" | "updatedAt">): N1Data {
    const db = getDb();
    const id = `n1_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO n1_data (id, project_id, basic, before_purchase, decision_point, after_purchase, meta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      projectId,
      JSON.stringify(data.basic),
      JSON.stringify(data.beforePurchase),
      JSON.stringify(data.decisionPoint),
      JSON.stringify(data.afterPurchase),
      JSON.stringify(data.meta),
      now,
      now
    );

    return {
      id,
      projectId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get N1 data by ID
   */
  getById(id: string): N1Data | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM n1_data WHERE id = ?`).get(id) as
      | {
          id: string;
          project_id: string;
          basic: string;
          before_purchase: string;
          decision_point: string;
          after_purchase: string;
          meta: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) return null;

    return {
      id: row.id,
      projectId: row.project_id,
      basic: JSON.parse(row.basic),
      beforePurchase: JSON.parse(row.before_purchase),
      decisionPoint: JSON.parse(row.decision_point),
      afterPurchase: JSON.parse(row.after_purchase),
      meta: JSON.parse(row.meta),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get all N1 data for a project
   */
  getByProject(projectId: string): N1Data[] {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM n1_data WHERE project_id = ? ORDER BY created_at DESC`).all(projectId) as {
      id: string;
      project_id: string;
      basic: string;
      before_purchase: string;
      decision_point: string;
      after_purchase: string;
      meta: string;
      created_at: string;
      updated_at: string;
    }[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      basic: JSON.parse(row.basic),
      beforePurchase: JSON.parse(row.before_purchase),
      decisionPoint: JSON.parse(row.decision_point),
      afterPurchase: JSON.parse(row.after_purchase),
      meta: JSON.parse(row.meta),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Update N1 data
   */
  update(id: string, data: Partial<Omit<N1Data, "id" | "projectId" | "createdAt" | "updatedAt">>): N1Data | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const db = getDb();
    const now = new Date().toISOString();

    const updated = {
      basic: data.basic || existing.basic,
      beforePurchase: data.beforePurchase || existing.beforePurchase,
      decisionPoint: data.decisionPoint || existing.decisionPoint,
      afterPurchase: data.afterPurchase || existing.afterPurchase,
      meta: data.meta || existing.meta,
    };

    db.prepare(
      `UPDATE n1_data SET basic = ?, before_purchase = ?, decision_point = ?, after_purchase = ?, meta = ?, updated_at = ? WHERE id = ?`
    ).run(
      JSON.stringify(updated.basic),
      JSON.stringify(updated.beforePurchase),
      JSON.stringify(updated.decisionPoint),
      JSON.stringify(updated.afterPurchase),
      JSON.stringify(updated.meta),
      now,
      id
    );

    return {
      ...existing,
      ...updated,
      updatedAt: now,
    };
  }

  /**
   * Delete N1 data
   */
  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare(`DELETE FROM n1_data WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  /**
   * Check if project has N1 data
   */
  hasN1Data(projectId: string): boolean {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as count FROM n1_data WHERE project_id = ?`).get(projectId) as {
      count: number;
    };
    return row.count > 0;
  }

  /**
   * Get N1 count for project
   */
  getN1Count(projectId: string): number {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as count FROM n1_data WHERE project_id = ?`).get(projectId) as {
      count: number;
    };
    return row.count;
  }

  /**
   * Extract common patterns from multiple N1 data
   */
  extractCommonPatterns(projectId: string): {
    commonPainPoints: string[];
    commonTriggers: string[];
    commonHesitations: string[];
    commonTransformations: string[];
  } {
    const n1List = this.getByProject(projectId);

    if (n1List.length === 0) {
      return {
        commonPainPoints: [],
        commonTriggers: [],
        commonHesitations: [],
        commonTransformations: [],
      };
    }

    return {
      commonPainPoints: n1List.map((n1) => n1.beforePurchase.painPoint).filter(Boolean),
      commonTriggers: n1List.map((n1) => n1.decisionPoint.triggerMoment).filter(Boolean),
      commonHesitations: n1List.map((n1) => n1.decisionPoint.hesitation).filter(Boolean),
      commonTransformations: n1List.map((n1) => n1.afterPurchase.transformation).filter(Boolean),
    };
  }

  /**
   * Generate interview template (for PDF/print)
   */
  getInterviewTemplate(): string {
    return `# N1インタビューテンプレート

## 基本情報
- お名前（仮名可）：
- 年齢：
- ご職業：
- 家族構成：
- 購入した商品/サービス：
- 購入日：
- 購入金額：
- どこで知りましたか：

## 購入前の状態
- 何に困っていましたか？

- いつから悩んでいましたか？

- 他に試したことはありますか？

- なぜそれらでは解決しなかったのですか？

## 購入の決め手
- 「これだ」と思った瞬間は？

- 迷った瞬間はありましたか？何について迷いましたか？

- 最後の一押しになったことは何ですか？

- 価格についてどう感じましたか？

## 購入後の変化
- どのように変わりましたか？

- 人に勧めるとしたら何と言いますか？

- また購入したいですか？

## インタビュー情報
- インタビュー日：
- インタビュアー：
- 備考：
`;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: N1Manager | null = null;

export function getN1Manager(): N1Manager {
  if (!instance) {
    instance = new N1Manager();
  }
  return instance;
}

// =============================================================================
// Label Data Utilities
// =============================================================================

/**
 * Label data with its source level
 */
export function labelData(content: string, level: DataLevel, source?: string): LabeledData {
  return { content, level, source };
}

/**
 * Get level label in Japanese
 */
export function getLevelLabel(level: DataLevel): string {
  switch (level) {
    case "fact":
      return "🟢 事実（N1データ）";
    case "n1_based":
      return "🟡 高確度仮説（N1ベース）";
    case "hypothesis":
      return "🔴 仮説（AI生成）";
  }
}

/**
 * Get level color class
 */
export function getLevelColorClass(level: DataLevel): string {
  switch (level) {
    case "fact":
      return "bg-green-100 text-green-800 border-green-300";
    case "n1_based":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "hypothesis":
      return "bg-red-100 text-red-800 border-red-300";
  }
}
