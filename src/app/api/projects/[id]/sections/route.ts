import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

interface Section {
  id: string;
  project_id: string;
  name: string;
  section_type: string;
  order_index: number;
  image_path: string | null;
  width: number | null;
  height: number | null;
  design_json: string | null;
  created_at: string;
  updated_at: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// 画像保存ディレクトリ
const IMAGES_DIR = path.join(process.cwd(), "data", "images");

// GET /api/projects/[id]/sections - セクション一覧
// Query: ?type=lp|swipe|all (省略時はlp)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const { searchParams } = new URL(request.url);
    const sectionType = searchParams.get("type") || "lp"; // lp, swipe, all

    const db = getDb();

    // プロジェクト存在確認
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    let sections: Section[];
    if (sectionType === "all") {
      sections = db
        .prepare("SELECT * FROM sections WHERE project_id = ? ORDER BY COALESCE(section_type, 'lp'), order_index ASC")
        .all(projectId) as Section[];
    } else {
      sections = db
        .prepare("SELECT * FROM sections WHERE project_id = ? AND COALESCE(section_type, 'lp') = ? ORDER BY order_index ASC")
        .all(projectId, sectionType) as Section[];
    }

    return NextResponse.json({ ok: true, sections });
  } catch (err) {
    console.error("[sections] GET error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/sections - セクション追加
// Body: { name?, imageDataUrl?, width?, height?, orderIndex?, sectionType?: 'lp'|'swipe' }
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const body = await request.json();
    const { name, imageDataUrl, width, height, orderIndex, sectionType } = body;
    const type = sectionType || "lp";

    const db = getDb();

    // プロジェクト存在確認
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();

    // order_index を決定（指定がなければそのタイプの末尾）
    let order = orderIndex;
    if (order === undefined) {
      const maxOrder = db
        .prepare("SELECT MAX(order_index) as max FROM sections WHERE project_id = ? AND COALESCE(section_type, 'lp') = ?")
        .get(projectId, type) as { max: number | null };
      order = (maxOrder.max ?? -1) + 1;
    }

    // 画像保存
    let imagePath: string | null = null;
    const imageWidth: number | null = width ?? null;
    const imageHeight: number | null = height ?? null;

    if (imageDataUrl && typeof imageDataUrl === "string") {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64 = match[2];
        const ext = mimeType.split("/")[1] || "png";
        const filename = `${id}.${ext}`;
        imagePath = path.join(IMAGES_DIR, filename);

        // ディレクトリ確認
        if (!fs.existsSync(IMAGES_DIR)) {
          fs.mkdirSync(IMAGES_DIR, { recursive: true });
        }

        fs.writeFileSync(imagePath, Buffer.from(base64, "base64"));
        console.log("[sections] Image saved:", filename);
      }
    }

    db.prepare(
      `INSERT INTO sections (id, project_id, name, section_type, order_index, image_path, width, height, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, projectId, name || "Untitled Section", type, order, imagePath, imageWidth, imageHeight, now, now);

    // プロジェクトの updated_at も更新
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);

    const section = db
      .prepare("SELECT * FROM sections WHERE id = ?")
      .get(id) as Section;

    console.log("[sections] Created:", section.id, section.name, "type:", type);
    return NextResponse.json({ ok: true, section }, { status: 201 });
  } catch (err) {
    console.error("[sections] POST error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/sections - セクション並び替え（一括）
// Body: { order: ["id1", "id2", ...], type?: 'lp'|'swipe' }
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const body = await request.json();
    const { order, type } = body; // type省略時はlp
    const sectionType = type || "lp";

    if (!Array.isArray(order)) {
      return NextResponse.json(
        { ok: false, error: "order must be an array of section IDs" },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();

    const updateStmt = db.prepare(
      "UPDATE sections SET order_index = ?, updated_at = ? WHERE id = ? AND project_id = ?"
    );

    for (let i = 0; i < order.length; i++) {
      updateStmt.run(i, now, order[i], projectId);
    }

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);

    const sections = db
      .prepare("SELECT * FROM sections WHERE project_id = ? AND COALESCE(section_type, 'lp') = ? ORDER BY order_index ASC")
      .all(projectId, sectionType) as Section[];

    return NextResponse.json({ ok: true, sections });
  } catch (err) {
    console.error("[sections] PATCH error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
