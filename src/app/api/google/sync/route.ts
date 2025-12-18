/**
 * Google Sync API
 * スプレッドシートとの同期、GASテンプレート管理
 */

import { NextRequest, NextResponse } from "next/server";
import { getSheetsManager } from "@/lib/google/sheets-manager";
import { getGoogleAuth } from "@/lib/storage/google-auth";
import {
  GAS_TEMPLATES,
  getGASTemplate,
  generateGASCode,
} from "@/lib/google/gas-templates";

// =============================================================================
// GET: 情報取得
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    // 接続状態を取得
    if (action === "status") {
      const authManager = getGoogleAuth();
      const status = await authManager.getConnectionStatus();

      return NextResponse.json({
        ok: true,
        ...status,
      });
    }

    // GASテンプレート一覧
    if (action === "gas-templates") {
      const templates = GAS_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        setupInstructions: t.setupInstructions,
        triggers: t.triggers,
      }));

      return NextResponse.json({
        ok: true,
        templates,
      });
    }

    // GASテンプレートコード取得
    if (action === "gas-code") {
      const templateId = searchParams.get("templateId");
      if (!templateId) {
        return NextResponse.json(
          { ok: false, error: "templateIdが必要です" },
          { status: 400 }
        );
      }

      const template = getGASTemplate(templateId);
      if (!template) {
        return NextResponse.json(
          { ok: false, error: "テンプレートが見つかりません" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          code: template.code,
          setupInstructions: template.setupInstructions,
        },
      });
    }

    // スプレッドシート一覧
    if (action === "spreadsheets") {
      const { getDb } = await import("@/lib/db");
      const db = getDb();

      const rows = db
        .prepare("SELECT key, value FROM app_settings WHERE key LIKE 'sheets_project_%'")
        .all() as { key: string; value: string }[];

      const spreadsheets = rows.map((row) => ({
        projectName: row.key.replace("sheets_project_", ""),
        spreadsheetId: row.value,
        url: `https://docs.google.com/spreadsheets/d/${row.value}/edit`,
      }));

      return NextResponse.json({
        ok: true,
        spreadsheets,
      });
    }

    // API情報
    return NextResponse.json({
      name: "Google Sync API",
      version: "1.0.0",
      description: "Google Workspace連携（スプシ蓄積・GAS管理）",
      endpoints: {
        "GET /api/google/sync?action=status": "接続状態",
        "GET /api/google/sync?action=gas-templates": "GASテンプレート一覧",
        "GET /api/google/sync?action=gas-code&templateId=xxx": "GASコード取得",
        "GET /api/google/sync?action=spreadsheets": "スプレッドシート一覧",
        "POST /api/google/sync?action=init": "スプレッドシート初期化",
        "POST /api/google/sync?action=add-research": "リサーチ結果追加",
        "POST /api/google/sync?action=add-concepts": "コンセプト追加",
        "POST /api/google/sync?action=add-headlines": "ヘッドライン追加",
        "POST /api/google/sync?action=generate-gas": "GASコード生成",
      },
    });
  } catch (error) {
    console.error("[google/sync API] GET Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "取得に失敗しました",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: データ操作
// =============================================================================

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    const body = await request.json();

    // スプレッドシート初期化
    if (action === "init") {
      const { projectName } = body;
      if (!projectName) {
        return NextResponse.json(
          { ok: false, error: "projectNameが必要です" },
          { status: 400 }
        );
      }

      const manager = getSheetsManager();
      const spreadsheetId = await manager.initializeSpreadsheet(projectName);

      return NextResponse.json({
        ok: true,
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      });
    }

    // 既存スプレッドシートに接続
    if (action === "connect") {
      const { spreadsheetId, projectName } = body;
      if (!spreadsheetId) {
        return NextResponse.json(
          { ok: false, error: "spreadsheetIdが必要です" },
          { status: 400 }
        );
      }

      const manager = getSheetsManager();
      await manager.setSpreadsheet(spreadsheetId);

      // プロジェクト名があれば関連付けを保存
      if (projectName) {
        const { getDb } = await import("@/lib/db");
        const db = getDb();
        const key = `sheets_project_${projectName}`;
        const now = new Date().toISOString();

        db.prepare(
          `INSERT INTO app_settings (key, value, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).run(key, spreadsheetId, now);
      }

      return NextResponse.json({
        ok: true,
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      });
    }

    // リサーチ結果を追加
    if (action === "add-research") {
      const { projectName, records } = body;
      if (!projectName || !records || !Array.isArray(records)) {
        return NextResponse.json(
          { ok: false, error: "projectNameとrecordsが必要です" },
          { status: 400 }
        );
      }

      const manager = getSheetsManager();

      // スプレッドシートIDを取得または初期化
      let spreadsheetId = await manager.getSpreadsheetId(projectName);
      if (!spreadsheetId) {
        spreadsheetId = await manager.initializeSpreadsheet(projectName);
      } else {
        await manager.setSpreadsheet(spreadsheetId);
      }

      // レコードを追加
      const now = new Date().toISOString();
      const formattedRecords = records.map((r: Record<string, unknown>, index: number) => ({
        id: String(r.id || `research_${Date.now()}_${index}`),
        projectName,
        keyword: String(r.keyword || ""),
        source: String(r.source || ""),
        title: String(r.title || ""),
        url: String(r.url || ""),
        content: String(r.content || ""),
        insights: String(r.insights || ""),
        createdAt: String(r.createdAt || now),
      }));

      await manager.addResearchRecords(formattedRecords);

      return NextResponse.json({
        ok: true,
        addedCount: formattedRecords.length,
        spreadsheetUrl: manager.getSpreadsheetUrl(),
      });
    }

    // コンセプト案を追加
    if (action === "add-concepts") {
      const { projectName, concepts } = body;
      if (!projectName || !concepts || !Array.isArray(concepts)) {
        return NextResponse.json(
          { ok: false, error: "projectNameとconceptsが必要です" },
          { status: 400 }
        );
      }

      const manager = getSheetsManager();

      let spreadsheetId = await manager.getSpreadsheetId(projectName);
      if (!spreadsheetId) {
        spreadsheetId = await manager.initializeSpreadsheet(projectName);
      } else {
        await manager.setSpreadsheet(spreadsheetId);
      }

      const now = new Date().toISOString();
      for (let i = 0; i < concepts.length; i++) {
        const c = concepts[i];
        await manager.addConceptRecord({
          id: c.id || `concept_${Date.now()}_${i}`,
          projectName,
          conceptName: c.name || c.conceptName || "",
          targetAudience: c.targetAudience || c.target || "",
          mainBenefit: c.mainBenefit || c.benefit || "",
          uniquePoint: c.uniquePoint || c.usp || "",
          status: c.status || "draft",
          score: c.score,
          createdAt: c.createdAt || now,
          updatedAt: now,
        });
      }

      return NextResponse.json({
        ok: true,
        addedCount: concepts.length,
        spreadsheetUrl: manager.getSpreadsheetUrl(),
      });
    }

    // ヘッドラインを追加
    if (action === "add-headlines") {
      const { projectName, headlines } = body;
      if (!projectName || !headlines || !Array.isArray(headlines)) {
        return NextResponse.json(
          { ok: false, error: "projectNameとheadlinesが必要です" },
          { status: 400 }
        );
      }

      const manager = getSheetsManager();

      let spreadsheetId = await manager.getSpreadsheetId(projectName);
      if (!spreadsheetId) {
        spreadsheetId = await manager.initializeSpreadsheet(projectName);
      } else {
        await manager.setSpreadsheet(spreadsheetId);
      }

      const now = new Date().toISOString();
      const formattedHeadlines = headlines.map((h: Record<string, unknown>, index: number) => ({
        id: h.id as string || `headline_${Date.now()}_${index}`,
        projectName,
        sectionType: h.sectionType as string || h.section as string || "",
        headline: h.headline as string || h.text as string || "",
        status: (h.status as "pending" | "adopted" | "rejected") || "pending",
        score: h.score as number | undefined,
        createdAt: h.createdAt as string || now,
      }));

      await manager.addHeadlineRecords(formattedHeadlines);

      return NextResponse.json({
        ok: true,
        addedCount: formattedHeadlines.length,
        spreadsheetUrl: manager.getSpreadsheetUrl(),
      });
    }

    // GASコード生成
    if (action === "generate-gas") {
      const { templateId, config } = body;
      if (!templateId) {
        return NextResponse.json(
          { ok: false, error: "templateIdが必要です" },
          { status: 400 }
        );
      }

      const code = generateGASCode(templateId, config || {});
      if (!code) {
        return NextResponse.json(
          { ok: false, error: "テンプレートが見つかりません" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        code,
      });
    }

    return NextResponse.json(
      { ok: false, error: "不明なアクションです" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[google/sync API] POST Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "操作に失敗しました",
      },
      { status: 500 }
    );
  }
}
