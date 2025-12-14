import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";

export const runtime = "nodejs";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// GET /api/projects - 一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const db = getDb();

    let sql = "SELECT * FROM projects ORDER BY updated_at DESC";
    if (limit) {
      const l = parseInt(limit, 10);
      if (!isNaN(l) && l > 0) {
        sql += ` LIMIT ${l}`;
      }
    }

    const projects = db.prepare(sql).all() as Project[];

    return NextResponse.json({ ok: true, projects });
  } catch (err) {
    console.error("[projects] GET error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/projects - 新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { ok: false, error: "name is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();

    db.prepare(
      "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name.trim(), description?.trim() || null, now, now);

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id) as Project;

    console.log("[projects] Created:", project.id, project.name);
    return NextResponse.json({ ok: true, project }, { status: 201 });
  } catch (err) {
    console.error("[projects] POST error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
