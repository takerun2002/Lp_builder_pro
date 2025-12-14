import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface Section {
  id: string;
  name: string;
  image_path: string | null;
  order_index: number;
}

// POST /api/projects/[id]/swipe-lp/export - PNG一括書き出し
// DBから swipe タイプのセクションを取得して書き出し
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;

    const db = getDb();

    // プロジェクト存在確認
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // swipeタイプのセクションを取得
    const sections = db
      .prepare("SELECT * FROM sections WHERE project_id = ? AND COALESCE(section_type, 'lp') = 'swipe' ORDER BY order_index ASC")
      .all(projectId) as Section[];

    if (sections.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No swipe frames to export" },
        { status: 400 }
      );
    }

    // エクスポートディレクトリ
    const exportDir = path.join(process.cwd(), "data", "exports", projectId, "swipe");

    // ディレクトリをクリーンアップして再作成
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true });
    }
    fs.mkdirSync(exportDir, { recursive: true });

    let exportedCount = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section.image_path || !fs.existsSync(section.image_path)) continue;

      // 元ファイルの拡張子を取得
      const originalExt = path.extname(section.image_path).replace(".", "") || "png";

      // ファイル名: 001_framename.png
      const paddedIndex = String(i + 1).padStart(3, "0");
      const safeName = section.name.replace(/[^a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, "_");
      const filename = `${paddedIndex}_${safeName}.${originalExt}`;
      const filePath = path.join(exportDir, filename);

      // ファイルをコピー
      fs.copyFileSync(section.image_path, filePath);
      exportedCount++;
    }

    console.log(`[swipe-lp/export] Exported ${exportedCount} frames to ${exportDir}`);

    return NextResponse.json({
      ok: true,
      exportedCount,
      exportPath: exportDir,
    });
  } catch (err) {
    console.error("[swipe-lp/export] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
