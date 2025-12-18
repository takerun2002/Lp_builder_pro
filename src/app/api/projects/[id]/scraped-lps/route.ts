/**
 * 取込LP管理API
 * プロジェクトに紐づく取込LPの取得・作成
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ScrapedSection {
  id: string;
  image_path: string;
  order_index: number;
  extracted_text?: string;
}

interface ScrapedLP {
  id: string;
  project_id: string;
  source_url: string;
  title: string;
  sections: ScrapedSection[];
  scraped_at: string;
}

// GET: 取込LP一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS scraped_lps (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        title TEXT,
        sections TEXT,
        scraped_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    const rows = db
      .prepare(
        `SELECT id, project_id, source_url, title, sections, scraped_at
         FROM scraped_lps
         WHERE project_id = ?
         ORDER BY scraped_at DESC`
      )
      .all(projectId) as Array<{
      id: string;
      project_id: string;
      source_url: string;
      title: string;
      sections: string;
      scraped_at: string;
    }>;

    const scrapedLPs: ScrapedLP[] = rows.map((row) => ({
      ...row,
      sections: JSON.parse(row.sections || "[]"),
    }));

    return NextResponse.json({ ok: true, scrapedLPs });
  } catch (err) {
    console.error("[scraped-lps] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch scraped LPs" },
      { status: 500 }
    );
  }
}

// POST: 新しい取込LPを作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { sourceUrl, title, sections } = body;

    if (!sourceUrl) {
      return NextResponse.json(
        { ok: false, error: "sourceUrl is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS scraped_lps (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        title TEXT,
        sections TEXT,
        scraped_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    const id = `scraped-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO scraped_lps (id, project_id, source_url, title, sections, scraped_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, projectId, sourceUrl, title || "無題", JSON.stringify(sections || []), now);

    const scrapedLP: ScrapedLP = {
      id,
      project_id: projectId,
      source_url: sourceUrl,
      title: title || "無題",
      sections: sections || [],
      scraped_at: now,
    };

    return NextResponse.json({ ok: true, scrapedLP });
  } catch (err) {
    console.error("[scraped-lps] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create scraped LP" },
      { status: 500 }
    );
  }
}
