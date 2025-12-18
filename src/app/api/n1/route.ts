/**
 * N1 Data API
 * N1（実在顧客）インタビューデータの管理
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getN1Manager,
  type N1Basic,
  type N1BeforePurchase,
  type N1DecisionPoint,
  type N1AfterPurchase,
  type N1Meta,
} from "@/lib/research/n1-manager";
import {
  generatePersonaFromN1,
  assessPersonaReliability,
} from "@/lib/research/persona-generator";

// =============================================================================
// GET: Retrieve N1 data
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    const manager = getN1Manager();

    // Check if project has N1 data
    if (action === "check" && projectId) {
      const hasN1Data = manager.hasN1Data(projectId);
      const count = manager.getN1Count(projectId);
      return NextResponse.json({ hasN1Data, count });
    }

    // Get interview template
    if (action === "template") {
      const template = manager.getInterviewTemplate();
      return NextResponse.json({ template });
    }

    // Extract common patterns
    if (action === "patterns" && projectId) {
      const patterns = manager.extractCommonPatterns(projectId);
      return NextResponse.json({ patterns });
    }

    // Get single N1 data by ID
    if (id) {
      const n1Data = manager.getById(id);
      if (!n1Data) {
        return NextResponse.json({ error: "N1 data not found" }, { status: 404 });
      }
      return NextResponse.json({ data: n1Data });
    }

    // Get all N1 data for project
    if (projectId) {
      const n1List = manager.getByProject(projectId);
      return NextResponse.json({ data: n1List, count: n1List.length });
    }

    return NextResponse.json(
      { error: "projectId or id is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[N1 API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve N1 data" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Create N1 data or generate persona
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, ...data } = body;

    const manager = getN1Manager();

    // Generate persona from N1 data
    if (action === "generate-persona") {
      if (!projectId) {
        return NextResponse.json(
          { error: "projectId is required" },
          { status: 400 }
        );
      }

      const persona = await generatePersonaFromN1({
        projectId,
        genre: data.genre,
        targetDescription: data.targetDescription,
        useAI: data.useAI !== false,
      });

      const reliability = assessPersonaReliability(persona);

      return NextResponse.json({
        persona,
        reliability,
        message: persona.sourceN1Ids.length > 0
          ? `N1データ${persona.sourceN1Ids.length}件を元にペルソナを生成しました`
          : "N1データがないため、AIによる仮説ペルソナを生成しました",
      });
    }

    // Create new N1 data
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const { basic, beforePurchase, decisionPoint, afterPurchase, meta } = data as {
      basic: N1Basic;
      beforePurchase: N1BeforePurchase;
      decisionPoint: N1DecisionPoint;
      afterPurchase: N1AfterPurchase;
      meta: N1Meta;
    };

    // Validate required fields
    if (!basic?.name || !basic?.age || !basic?.occupation) {
      return NextResponse.json(
        { error: "基本情報（名前、年齢、職業）は必須です" },
        { status: 400 }
      );
    }

    if (!beforePurchase?.painPoint) {
      return NextResponse.json(
        { error: "購入前の悩みは必須です" },
        { status: 400 }
      );
    }

    if (!decisionPoint?.triggerMoment) {
      return NextResponse.json(
        { error: "購入の決め手は必須です" },
        { status: 400 }
      );
    }

    if (!afterPurchase?.transformation) {
      return NextResponse.json(
        { error: "購入後の変化は必須です" },
        { status: 400 }
      );
    }

    const n1Data = manager.create(projectId, {
      basic,
      beforePurchase,
      decisionPoint,
      afterPurchase,
      meta: meta || {
        interviewDate: new Date().toISOString().split("T")[0],
        interviewer: "",
      },
    });

    return NextResponse.json({
      data: n1Data,
      message: "N1データを保存しました",
    });
  } catch (error) {
    console.error("[N1 API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create N1 data" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT: Update N1 data
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const manager = getN1Manager();
    const updated = manager.update(id, data);

    if (!updated) {
      return NextResponse.json({ error: "N1 data not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: updated,
      message: "N1データを更新しました",
    });
  } catch (error) {
    console.error("[N1 API] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update N1 data" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Delete N1 data
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const manager = getN1Manager();
    const deleted = manager.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: "N1 data not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "N1データを削除しました" });
  } catch (error) {
    console.error("[N1 API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete N1 data" },
      { status: 500 }
    );
  }
}
