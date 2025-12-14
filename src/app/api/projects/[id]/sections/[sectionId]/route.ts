import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
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
  params: Promise<{ id: string; sectionId: string }>;
}

const IMAGES_DIR = path.join(process.cwd(), "data", "images");

// GET /api/projects/[id]/sections/[sectionId] - セクション詳細
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId, sectionId } = await context.params;
    const db = getDb();

    const section = db
      .prepare("SELECT * FROM sections WHERE id = ? AND project_id = ?")
      .get(sectionId, projectId) as Section | undefined;

    if (!section) {
      return NextResponse.json(
        { ok: false, error: "Section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, section });
  } catch (err) {
    console.error("[sections] GET detail error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/sections/[sectionId] - セクション更新
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId, sectionId } = await context.params;
    const body = await request.json();
    const { name, imageDataUrl, width, height, designJson } = body;

    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM sections WHERE id = ? AND project_id = ?")
      .get(sectionId, projectId) as Section | undefined;

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Section not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let imagePath = existing.image_path;
    const imageWidth = width ?? existing.width;
    const imageHeight = height ?? existing.height;

    // 画像更新
    if (imageDataUrl && typeof imageDataUrl === "string") {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        // 古い画像を削除
        if (existing.image_path && fs.existsSync(existing.image_path)) {
          fs.unlinkSync(existing.image_path);
        }

        const mimeType = match[1];
        const base64 = match[2];
        const ext = mimeType.split("/")[1] || "png";
        const filename = `${sectionId}.${ext}`;
        imagePath = path.join(IMAGES_DIR, filename);

        if (!fs.existsSync(IMAGES_DIR)) {
          fs.mkdirSync(IMAGES_DIR, { recursive: true });
        }

        fs.writeFileSync(imagePath, Buffer.from(base64, "base64"));
        console.log("[sections] Image updated:", filename);
      }
    }

    const newName = name?.trim() || existing.name;

    // designJson が渡された場合は更新（サイズが大きいのでログには出さない）
    if (designJson !== undefined) {
      db.prepare(
        `UPDATE sections SET name = ?, image_path = ?, width = ?, height = ?, design_json = ?, updated_at = ? WHERE id = ?`
      ).run(newName, imagePath, imageWidth, imageHeight, designJson, now, sectionId);
    } else {
      db.prepare(
        `UPDATE sections SET name = ?, image_path = ?, width = ?, height = ?, updated_at = ? WHERE id = ?`
      ).run(newName, imagePath, imageWidth, imageHeight, now, sectionId);
    }

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);

    const section = db
      .prepare("SELECT * FROM sections WHERE id = ?")
      .get(sectionId) as Section;

    return NextResponse.json({ ok: true, section });
  } catch (err) {
    console.error("[sections] PATCH error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/sections/[sectionId] - セクション削除
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId, sectionId } = await context.params;
    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM sections WHERE id = ? AND project_id = ?")
      .get(sectionId, projectId) as Section | undefined;

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Section not found" },
        { status: 404 }
      );
    }

    // 画像ファイル削除
    if (existing.image_path && fs.existsSync(existing.image_path)) {
      fs.unlinkSync(existing.image_path);
      console.log("[sections] Image deleted:", existing.image_path);
    }

    db.prepare("DELETE FROM sections WHERE id = ?").run(sectionId);

    const now = new Date().toISOString();
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);

    console.log("[sections] Deleted:", sectionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sections] DELETE error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
