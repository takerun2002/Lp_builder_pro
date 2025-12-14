import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface Project {
  id: string;
  name: string;
  description: string | null;
  manuscript: string | null;
  canvas_json: string | null;
  lp_html: string | null;
  lp_css: string | null;
  created_at: string;
  updated_at: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - 詳細取得
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id) as Project | undefined;

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, project });
  } catch (err) {
    console.error("[projects] GET detail error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - 更新
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, description, manuscript, canvas_json, lpHtml, lpCss } = body;

    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id) as Project | undefined;

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const newName = name?.trim() || existing.name;
    const newDesc = description !== undefined ? description?.trim() || null : existing.description;
    const newManuscript = manuscript !== undefined ? manuscript : existing.manuscript;
    const newCanvasJson = canvas_json !== undefined ? canvas_json : existing.canvas_json;
    const newLpHtml = lpHtml !== undefined ? lpHtml : existing.lp_html;
    const newLpCss = lpCss !== undefined ? lpCss : existing.lp_css;

    db.prepare(
      "UPDATE projects SET name = ?, description = ?, manuscript = ?, canvas_json = ?, lp_html = ?, lp_css = ?, updated_at = ? WHERE id = ?"
    ).run(newName, newDesc, newManuscript, newCanvasJson, newLpHtml, newLpCss, now, id);

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id) as Project;

    return NextResponse.json({ ok: true, project });
  } catch (err) {
    console.error("[projects] PATCH error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - 削除
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id) as Project | undefined;

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    console.log("[projects] Deleted:", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[projects] DELETE error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
