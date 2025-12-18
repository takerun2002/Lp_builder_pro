/**
 * LP Section Manager
 * LPセクションの生成・管理システム
 */

import { getDb } from "@/lib/db";
import { getGeminiClient } from "@/lib/ai/gemini";
import { selectModelForTask } from "@/lib/ai/model-selector";

// =============================================================================
// Types
// =============================================================================

export enum LPSection {
  HERO = "hero",
  PROBLEM = "problem",
  AGITATION = "agitation",
  SOLUTION = "solution",
  BENEFITS = "benefits",
  FEATURES = "features",
  TESTIMONIALS = "testimonials",
  PRICING = "pricing",
  FAQ = "faq",
  CTA = "cta",
  GUARANTEE = "guarantee",
  PROFILE = "profile",
  PS = "ps",
}

export enum SectionStatus {
  DRAFT = "draft",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface SectionContent {
  headline: string;
  subheadline?: string;
  body: string;
  image?: string;
  cta?: string;
  bullets?: string[];
}

export interface LPSectionItem {
  id: string;
  projectId: string;
  type: LPSection;
  version: number;
  status: SectionStatus;
  content: SectionContent;
  generatedAt: string;
  approvedAt?: string;
  order?: number;
}

export interface LPProject {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  targetDescription?: string;
  sections: LPSectionItem[];
  approvedSectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Section display names in Japanese
export const SECTION_LABELS: Record<LPSection, string> = {
  [LPSection.HERO]: "ファーストビュー",
  [LPSection.PROBLEM]: "問題提起",
  [LPSection.AGITATION]: "問題の深掘り",
  [LPSection.SOLUTION]: "解決策提示",
  [LPSection.BENEFITS]: "ベネフィット",
  [LPSection.FEATURES]: "特徴・機能",
  [LPSection.TESTIMONIALS]: "お客様の声",
  [LPSection.PRICING]: "価格・オファー",
  [LPSection.FAQ]: "よくある質問",
  [LPSection.CTA]: "行動喚起",
  [LPSection.GUARANTEE]: "保証",
  [LPSection.PROFILE]: "運営者プロフィール",
  [LPSection.PS]: "追伸",
};

// Default order for LP sections
export const DEFAULT_SECTION_ORDER: LPSection[] = [
  LPSection.HERO,
  LPSection.PROBLEM,
  LPSection.AGITATION,
  LPSection.SOLUTION,
  LPSection.BENEFITS,
  LPSection.FEATURES,
  LPSection.TESTIMONIALS,
  LPSection.PRICING,
  LPSection.GUARANTEE,
  LPSection.FAQ,
  LPSection.PROFILE,
  LPSection.CTA,
  LPSection.PS,
];

// =============================================================================
// Database Schema
// =============================================================================

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS lp_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  target_description TEXT,
  approved_section_ids TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lp_sections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  content TEXT NOT NULL,
  generated_at TEXT DEFAULT (datetime('now')),
  approved_at TEXT,
  section_order INTEGER,
  FOREIGN KEY (project_id) REFERENCES lp_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lp_sections_project_id ON lp_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_lp_sections_type ON lp_sections(type);
CREATE INDEX IF NOT EXISTS idx_lp_sections_status ON lp_sections(status);
`;

function ensureSchema(): void {
  const db = getDb();
  db.exec(INIT_SQL);
}

// =============================================================================
// Section Manager Class
// =============================================================================

export class SectionManager {
  constructor() {
    ensureSchema();
  }

  // ---------------------------------------------------------------------------
  // Project Management
  // ---------------------------------------------------------------------------

  createProject(data: {
    name: string;
    description?: string;
    genre?: string;
    targetDescription?: string;
  }): LPProject {
    const db = getDb();
    const id = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO lp_projects (id, name, description, genre, target_description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.name, data.description || null, data.genre || null, data.targetDescription || null, now, now);

    return {
      id,
      name: data.name,
      description: data.description,
      genre: data.genre,
      targetDescription: data.targetDescription,
      sections: [],
      approvedSectionIds: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  getProject(projectId: string): LPProject | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM lp_projects WHERE id = ?`).get(projectId) as {
      id: string;
      name: string;
      description: string | null;
      genre: string | null;
      target_description: string | null;
      approved_section_ids: string;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!row) return null;

    const sections = this.getSectionsByProject(projectId);

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      genre: row.genre || undefined,
      targetDescription: row.target_description || undefined,
      sections,
      approvedSectionIds: JSON.parse(row.approved_section_ids),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listProjects(): LPProject[] {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM lp_projects ORDER BY updated_at DESC`).all() as {
      id: string;
      name: string;
      description: string | null;
      genre: string | null;
      target_description: string | null;
      approved_section_ids: string;
      created_at: string;
      updated_at: string;
    }[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      genre: row.genre || undefined,
      targetDescription: row.target_description || undefined,
      sections: this.getSectionsByProject(row.id),
      approvedSectionIds: JSON.parse(row.approved_section_ids),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  updateProjectApprovedSections(projectId: string, sectionIds: string[]): void {
    const db = getDb();
    db.prepare(
      `UPDATE lp_projects SET approved_section_ids = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(sectionIds), projectId);
  }

  deleteProject(projectId: string): boolean {
    const db = getDb();
    const result = db.prepare(`DELETE FROM lp_projects WHERE id = ?`).run(projectId);
    return result.changes > 0;
  }

  // ---------------------------------------------------------------------------
  // Section Management
  // ---------------------------------------------------------------------------

  getSectionsByProject(projectId: string): LPSectionItem[] {
    const db = getDb();
    const rows = db.prepare(
      `SELECT * FROM lp_sections WHERE project_id = ? ORDER BY type, version DESC`
    ).all(projectId) as {
      id: string;
      project_id: string;
      type: string;
      version: number;
      status: string;
      content: string;
      generated_at: string;
      approved_at: string | null;
      section_order: number | null;
    }[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      type: row.type as LPSection,
      version: row.version,
      status: row.status as SectionStatus,
      content: JSON.parse(row.content),
      generatedAt: row.generated_at,
      approvedAt: row.approved_at || undefined,
      order: row.section_order || undefined,
    }));
  }

  getSectionById(sectionId: string): LPSectionItem | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM lp_sections WHERE id = ?`).get(sectionId) as {
      id: string;
      project_id: string;
      type: string;
      version: number;
      status: string;
      content: string;
      generated_at: string;
      approved_at: string | null;
      section_order: number | null;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      projectId: row.project_id,
      type: row.type as LPSection,
      version: row.version,
      status: row.status as SectionStatus,
      content: JSON.parse(row.content),
      generatedAt: row.generated_at,
      approvedAt: row.approved_at || undefined,
      order: row.section_order || undefined,
    };
  }

  getSectionsByType(projectId: string, type: LPSection): LPSectionItem[] {
    const db = getDb();
    const rows = db.prepare(
      `SELECT * FROM lp_sections WHERE project_id = ? AND type = ? ORDER BY version DESC`
    ).all(projectId, type) as {
      id: string;
      project_id: string;
      type: string;
      version: number;
      status: string;
      content: string;
      generated_at: string;
      approved_at: string | null;
      section_order: number | null;
    }[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      type: row.type as LPSection,
      version: row.version,
      status: row.status as SectionStatus,
      content: JSON.parse(row.content),
      generatedAt: row.generated_at,
      approvedAt: row.approved_at || undefined,
      order: row.section_order || undefined,
    }));
  }

  createSection(data: {
    projectId: string;
    type: LPSection;
    content: SectionContent;
    status?: SectionStatus;
  }): LPSectionItem {
    const db = getDb();
    const id = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Get current max version for this section type
    const maxVersion = db.prepare(
      `SELECT MAX(version) as max_version FROM lp_sections WHERE project_id = ? AND type = ?`
    ).get(data.projectId, data.type) as { max_version: number | null };

    const version = (maxVersion?.max_version || 0) + 1;

    db.prepare(
      `INSERT INTO lp_sections (id, project_id, type, version, status, content, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.projectId,
      data.type,
      version,
      data.status || SectionStatus.DRAFT,
      JSON.stringify(data.content),
      now
    );

    return {
      id,
      projectId: data.projectId,
      type: data.type,
      version,
      status: data.status || SectionStatus.DRAFT,
      content: data.content,
      generatedAt: now,
    };
  }

  updateSectionStatus(sectionId: string, status: SectionStatus): LPSectionItem | null {
    const db = getDb();
    const approvedAt = status === SectionStatus.APPROVED ? new Date().toISOString() : null;

    db.prepare(
      `UPDATE lp_sections SET status = ?, approved_at = ? WHERE id = ?`
    ).run(status, approvedAt, sectionId);

    return this.getSectionById(sectionId);
  }

  updateSectionContent(sectionId: string, content: Partial<SectionContent>): LPSectionItem | null {
    const section = this.getSectionById(sectionId);
    if (!section) return null;

    const db = getDb();
    const updatedContent = { ...section.content, ...content };

    db.prepare(
      `UPDATE lp_sections SET content = ? WHERE id = ?`
    ).run(JSON.stringify(updatedContent), sectionId);

    return this.getSectionById(sectionId);
  }

  deleteSection(sectionId: string): boolean {
    const db = getDb();
    const result = db.prepare(`DELETE FROM lp_sections WHERE id = ?`).run(sectionId);
    return result.changes > 0;
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  getProjectStats(projectId: string): {
    totalSections: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    draftCount: number;
    missingSections: LPSection[];
  } {
    const sections = this.getSectionsByProject(projectId);

    const stats = {
      totalSections: sections.length,
      approvedCount: sections.filter((s) => s.status === SectionStatus.APPROVED).length,
      pendingCount: sections.filter((s) => s.status === SectionStatus.PENDING).length,
      rejectedCount: sections.filter((s) => s.status === SectionStatus.REJECTED).length,
      draftCount: sections.filter((s) => s.status === SectionStatus.DRAFT).length,
      missingSections: [] as LPSection[],
    };

    // Find missing section types
    const existingTypes = new Set(sections.map((s) => s.type));
    stats.missingSections = DEFAULT_SECTION_ORDER.filter((type) => !existingTypes.has(type));

    return stats;
  }
}

// =============================================================================
// AI Section Generator
// =============================================================================

export async function generateSection(
  type: LPSection,
  context: {
    projectName: string;
    genre?: string;
    targetDescription?: string;
    productDescription?: string;
    n1Data?: {
      painPoints: string[];
      triggers: string[];
      transformations: string[];
    };
  }
): Promise<SectionContent> {
  const modelConfig = await selectModelForTask("copywriting");
  const ai = getGeminiClient();

  const sectionPrompts: Record<LPSection, string> = {
    [LPSection.HERO]: `ランディングページのファーストビュー（ヘッダー）を作成してください。
- インパクトのあるキャッチコピー（ヘッドライン）
- 補足説明（サブヘッドライン）
- CTAボタンのテキスト
ターゲットの心をつかむ、具体的で感情に訴える表現を使ってください。`,

    [LPSection.PROBLEM]: `ターゲットが抱える問題を提起するセクションを作成してください。
- 共感を呼ぶヘッドライン
- 問題の具体的な描写
- 「そう、それ！」と思わせる詳細
ターゲットの痛みに深く共感する文章を書いてください。`,

    [LPSection.AGITATION]: `問題を深掘りし、解決の必要性を高めるセクションを作成してください。
- このまま放置するとどうなるか
- 問題の本質的な原因
- なぜ今まで解決できなかったのか
読者に「何とかしなければ」と思わせてください。`,

    [LPSection.SOLUTION]: `解決策を提示するセクションを作成してください。
- 解決策のヘッドライン
- なぜこの方法が効果的なのか
- 3つの解決ポイント
希望を与えつつ、具体的な解決方法を示してください。`,

    [LPSection.BENEFITS]: `商品・サービスのベネフィットを伝えるセクションを作成してください。
- ベネフィットのヘッドライン
- 5つの主要ベネフィット（箇条書き）
- それぞれの具体的な説明
機能ではなく、顧客が得られる価値を強調してください。`,

    [LPSection.FEATURES]: `商品・サービスの特徴を説明するセクションを作成してください。
- 特徴のヘッドライン
- 主要な機能・特徴（3-5個）
- 他との違いを強調
信頼性を高める具体的な情報を含めてください。`,

    [LPSection.TESTIMONIALS]: `お客様の声セクションを作成してください。
- セクションのヘッドライン
- 3人の顧客の声（仮想）
- ビフォーアフターが分かる具体的な体験談
リアルで信頼性のある表現を使ってください。`,

    [LPSection.PRICING]: `価格・オファーセクションを作成してください。
- 価格のヘッドライン
- 価格の提示方法（価値を先に、価格を後に）
- 特典・ボーナスの説明
- 限定感を出す表現
価格以上の価値があることを伝えてください。`,

    [LPSection.FAQ]: `よくある質問セクションを作成してください。
- FAQのヘッドライン
- 5つの質問と回答
- 購入前の不安を解消する内容
購入への障壁を取り除く内容にしてください。`,

    [LPSection.CTA]: `行動喚起（CTA）セクションを作成してください。
- 強力なヘッドライン
- 今すぐ行動する理由
- CTAボタンのテキスト
緊急性と希少性を適度に活用してください。`,

    [LPSection.GUARANTEE]: `保証セクションを作成してください。
- 保証のヘッドライン
- 具体的な保証内容
- リスクがないことの説明
購入への不安を完全に取り除く内容にしてください。`,

    [LPSection.PROFILE]: `運営者・販売者のプロフィールセクションを作成してください。
- 自己紹介のヘッドライン
- ストーリー（なぜこの商品を作ったか）
- 実績・信頼性
親近感と専門性を両立させてください。`,

    [LPSection.PS]: `追伸（P.S.）セクションを作成してください。
- 最後に伝えたい重要なメッセージ
- 限定オファーのリマインド
- 行動を促す最後の一押し
読者の心に残る印象的な締めくくりにしてください。`,
  };

  const n1Context = context.n1Data
    ? `
## N1データ（実在顧客の声）
- 悩み: ${context.n1Data.painPoints.join("; ")}
- 決め手: ${context.n1Data.triggers.join("; ")}
- 変化: ${context.n1Data.transformations.join("; ")}`
    : "";

  const prompt = `あなたは一流のコピーライターです。
以下のランディングページのセクションを作成してください。

## プロジェクト情報
- 商品/サービス名: ${context.projectName}
- ジャンル: ${context.genre || "不明"}
- ターゲット: ${context.targetDescription || "不明"}
- 商品説明: ${context.productDescription || "不明"}
${n1Context}

## 作成するセクション: ${SECTION_LABELS[type]}

${sectionPrompts[type]}

以下のJSON形式で出力してください：
{
  "headline": "ヘッドライン",
  "subheadline": "サブヘッドライン（任意）",
  "body": "本文（複数段落OK）",
  "cta": "CTAボタンテキスト（必要な場合）",
  "bullets": ["箇条書き1", "箇条書き2"]（必要な場合）
}`;

  try {
    const response = await ai.models.generateContent({
      model: modelConfig.model,
      contents: prompt,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      headline: parsed.headline || SECTION_LABELS[type],
      subheadline: parsed.subheadline,
      body: parsed.body || "",
      cta: parsed.cta,
      bullets: parsed.bullets,
    };
  } catch (error) {
    console.error("Section generation failed:", error);
    return {
      headline: SECTION_LABELS[type],
      body: "生成に失敗しました。再試行してください。",
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: SectionManager | null = null;

export function getSectionManager(): SectionManager {
  if (!instance) {
    instance = new SectionManager();
  }
  return instance;
}
