import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import fs from "fs";
import path from "path";

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

const SWIPES_DIR = path.join(process.cwd(), "data", "swipes");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

// GET /api/swipe-files - 一覧取得（プロジェクト指定可能）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const db = getDb();
    let swipeFiles: SwipeFile[];

    if (projectId) {
      swipeFiles = db
        .prepare("SELECT * FROM swipe_files WHERE project_id = ? ORDER BY created_at DESC")
        .all(projectId) as SwipeFile[];
    } else {
      // グローバルスワイプ（project_id = NULL）
      swipeFiles = db
        .prepare("SELECT * FROM swipe_files WHERE project_id IS NULL ORDER BY created_at DESC")
        .all() as SwipeFile[];
    }

    return NextResponse.json({ ok: true, swipeFiles });
  } catch (err) {
    console.error("[swipe-files] GET error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/swipe-files - 新規追加（複数可）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files, projectId } = body;
    // files: [{ name, mimeType, base64, width, height, sourceUrl? }]

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "files array is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();
    const addedFiles: SwipeFile[] = [];

    // ディレクトリ確認
    if (!fs.existsSync(SWIPES_DIR)) {
      fs.mkdirSync(SWIPES_DIR, { recursive: true });
    }

    for (const file of files) {
      const { name, mimeType, base64, width, height, sourceUrl } = file;

      if (!base64 || !mimeType) continue;

      // サイズチェック
      const sizeEstimate = Math.floor(base64.length * 0.75);
      if (sizeEstimate > MAX_IMAGE_BYTES) {
        console.warn("[swipe-files] File too large, skipping:", name);
        continue;
      }

      // 重複チェック（base64のハッシュで簡易チェック）
      const hash = simpleHash(base64);
      const existing = db
        .prepare("SELECT id FROM swipe_files WHERE file_path LIKE ?")
        .get(`%${hash}%`) as { id: string } | undefined;
      if (existing) {
        console.log("[swipe-files] Duplicate detected, skipping:", name);
        continue;
      }

      const id = generateId();
      const ext = mimeType.split("/")[1] || "png";
      const filename = `${hash}_${id}.${ext}`;
      const filePath = path.join(SWIPES_DIR, filename);

      // ファイル保存
      fs.writeFileSync(filePath, Buffer.from(base64, "base64"));

      // DB保存
      db.prepare(
        `INSERT INTO swipe_files (id, project_id, name, mime_type, file_path, width, height, source_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, projectId || null, name || "Untitled", mimeType, filePath, width || null, height || null, sourceUrl || null, now);

      const swipeFile = db
        .prepare("SELECT * FROM swipe_files WHERE id = ?")
        .get(id) as SwipeFile;

      addedFiles.push(swipeFile);
      console.log("[swipe-files] Added:", filename);
    }

    return NextResponse.json({ ok: true, swipeFiles: addedFiles }, { status: 201 });
  } catch (err) {
    console.error("[swipe-files] POST error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// 簡易ハッシュ（重複検出用）
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 1000); i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
