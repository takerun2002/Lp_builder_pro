import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";

export const runtime = "nodejs";

interface SwipeFile {
  id: string;
  project_id: string | null;
  name: string;
  mime_type: string;
  file_path: string;
  width: number | null;
  height: number | null;
  source_url: string | null;
  tags: string | null;
  created_at: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/swipe-files/[id] - 詳細取得
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();

    const swipeFile = db
      .prepare("SELECT * FROM swipe_files WHERE id = ?")
      .get(id) as SwipeFile | undefined;

    if (!swipeFile) {
      return NextResponse.json(
        { ok: false, error: "Swipe file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, swipeFile });
  } catch (err) {
    console.error("[swipe-files] GET detail error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/swipe-files/[id] - 更新（name, tags, projectId）
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, tags, projectId } = body;

    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM swipe_files WHERE id = ?")
      .get(id) as SwipeFile | undefined;

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Swipe file not found" },
        { status: 404 }
      );
    }

    const newName = name?.trim() || existing.name;
    const newTags = tags !== undefined ? (tags || null) : existing.tags;
    const newProjectId = projectId !== undefined ? (projectId || null) : existing.project_id;

    db.prepare(
      "UPDATE swipe_files SET name = ?, tags = ?, project_id = ? WHERE id = ?"
    ).run(newName, newTags, newProjectId, id);

    const swipeFile = db
      .prepare("SELECT * FROM swipe_files WHERE id = ?")
      .get(id) as SwipeFile;

    return NextResponse.json({ ok: true, swipeFile });
  } catch (err) {
    console.error("[swipe-files] PATCH error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/swipe-files/[id] - 削除
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM swipe_files WHERE id = ?")
      .get(id) as SwipeFile | undefined;

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Swipe file not found" },
        { status: 404 }
      );
    }

    // ファイル削除
    if (existing.file_path && fs.existsSync(existing.file_path)) {
      fs.unlinkSync(existing.file_path);
      console.log("[swipe-files] File deleted:", existing.file_path);
    }

    db.prepare("DELETE FROM swipe_files WHERE id = ?").run(id);
    console.log("[swipe-files] Deleted:", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[swipe-files] DELETE error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
