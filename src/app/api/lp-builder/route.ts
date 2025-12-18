/**
 * LP Builder API
 * LPセクションの生成・管理API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSectionManager,
  generateSection,
  LPSection,
  SectionStatus,
  SECTION_LABELS,
} from "@/lib/lp-builder/section-manager";
import { getLPAssembler } from "@/lib/lp-builder/lp-assembler";

// =============================================================================
// GET: Retrieve projects, sections, or stats
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const projectId = searchParams.get("projectId");
    const sectionId = searchParams.get("sectionId");
    const sectionType = searchParams.get("type") as LPSection | null;

    const manager = getSectionManager();
    const assembler = getLPAssembler();

    // List all projects
    if (action === "list-projects") {
      const projects = manager.listProjects();
      return NextResponse.json({ projects });
    }

    // Get project details
    if (action === "project" && projectId) {
      const project = manager.getProject(projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json({ project });
    }

    // Get project stats
    if (action === "stats" && projectId) {
      const stats = manager.getProjectStats(projectId);
      return NextResponse.json({ stats });
    }

    // Get sections by type
    if (action === "sections-by-type" && projectId && sectionType) {
      const sections = manager.getSectionsByType(projectId, sectionType);
      return NextResponse.json({ sections });
    }

    // Get single section
    if (action === "section" && sectionId) {
      const section = manager.getSectionById(sectionId);
      if (!section) {
        return NextResponse.json({ error: "Section not found" }, { status: 404 });
      }
      return NextResponse.json({ section });
    }

    // Get approved sections for preview
    if (action === "approved" && projectId) {
      const sections = assembler.getApprovedSections(projectId);
      return NextResponse.json({ sections });
    }

    // Get completion status
    if (action === "completion" && projectId) {
      const status = assembler.getCompletionStatus(projectId);
      return NextResponse.json({ status });
    }

    // Assemble LP HTML
    if (action === "assemble" && projectId) {
      const viewMode = (searchParams.get("viewMode") || "desktop") as "desktop" | "mobile";
      const assembled = assembler.assemble(projectId, { viewMode });
      return NextResponse.json({ assembled });
    }

    // Export to Figma JSON
    if (action === "export-figma" && projectId) {
      const figmaJSON = assembler.exportToFigmaJSON(projectId);
      return NextResponse.json({ figmaJSON });
    }

    // Get section types (for dropdown)
    if (action === "section-types") {
      const types = Object.values(LPSection).map((type) => ({
        value: type,
        label: SECTION_LABELS[type],
      }));
      return NextResponse.json({ types });
    }

    // Default: get all sections for project
    if (projectId) {
      const sections = manager.getSectionsByProject(projectId);
      return NextResponse.json({ sections });
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[LP Builder API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve data" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Create project, section, or generate content
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const manager = getSectionManager();

    // Create new project
    if (action === "create-project") {
      const project = manager.createProject({
        name: data.name,
        description: data.description,
        genre: data.genre,
        targetDescription: data.targetDescription,
      });
      return NextResponse.json({
        project,
        message: "プロジェクトを作成しました",
      });
    }

    // Generate section with AI
    if (action === "generate-section") {
      const { projectId, type, context } = data;

      if (!projectId || !type) {
        return NextResponse.json(
          { error: "projectId and type are required" },
          { status: 400 }
        );
      }

      // Generate content with AI
      const content = await generateSection(type as LPSection, {
        projectName: context?.projectName || "商品",
        genre: context?.genre,
        targetDescription: context?.targetDescription,
        productDescription: context?.productDescription,
        n1Data: context?.n1Data,
      });

      // Save to database
      const section = manager.createSection({
        projectId,
        type: type as LPSection,
        content,
        status: SectionStatus.DRAFT,
      });

      return NextResponse.json({
        section,
        message: `${SECTION_LABELS[type as LPSection]}を生成しました`,
      });
    }

    // Create section manually (without AI)
    if (action === "create-section") {
      const { projectId, type, content, status } = data;

      if (!projectId || !type || !content) {
        return NextResponse.json(
          { error: "projectId, type, and content are required" },
          { status: 400 }
        );
      }

      const section = manager.createSection({
        projectId,
        type: type as LPSection,
        content,
        status: status || SectionStatus.DRAFT,
      });

      return NextResponse.json({
        section,
        message: "セクションを作成しました",
      });
    }

    // Generate multiple versions
    if (action === "generate-versions") {
      const { projectId, type, context, count = 3 } = data;

      if (!projectId || !type) {
        return NextResponse.json(
          { error: "projectId and type are required" },
          { status: 400 }
        );
      }

      const sections = [];
      for (let i = 0; i < count; i++) {
        const content = await generateSection(type as LPSection, {
          projectName: context?.projectName || "商品",
          genre: context?.genre,
          targetDescription: context?.targetDescription,
          productDescription: context?.productDescription,
          n1Data: context?.n1Data,
        });

        const section = manager.createSection({
          projectId,
          type: type as LPSection,
          content,
          status: SectionStatus.DRAFT,
        });

        sections.push(section);
      }

      return NextResponse.json({
        sections,
        message: `${SECTION_LABELS[type as LPSection]}を${count}バージョン生成しました`,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[LP Builder API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT: Update section status or content
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const manager = getSectionManager();

    // Update section status
    if (action === "update-status") {
      const { sectionId, status } = data;

      if (!sectionId || !status) {
        return NextResponse.json(
          { error: "sectionId and status are required" },
          { status: 400 }
        );
      }

      const section = manager.updateSectionStatus(sectionId, status as SectionStatus);
      if (!section) {
        return NextResponse.json({ error: "Section not found" }, { status: 404 });
      }

      return NextResponse.json({
        section,
        message: `ステータスを${status === "approved" ? "採用" : status === "pending" ? "保留" : status === "rejected" ? "没" : "下書き"}に変更しました`,
      });
    }

    // Update section content
    if (action === "update-content") {
      const { sectionId, content } = data;

      if (!sectionId || !content) {
        return NextResponse.json(
          { error: "sectionId and content are required" },
          { status: 400 }
        );
      }

      const section = manager.updateSectionContent(sectionId, content);
      if (!section) {
        return NextResponse.json({ error: "Section not found" }, { status: 404 });
      }

      return NextResponse.json({
        section,
        message: "セクションを更新しました",
      });
    }

    // Update approved sections order
    if (action === "update-order") {
      const { projectId, sectionIds } = data;

      if (!projectId || !sectionIds) {
        return NextResponse.json(
          { error: "projectId and sectionIds are required" },
          { status: 400 }
        );
      }

      manager.updateProjectApprovedSections(projectId, sectionIds);

      return NextResponse.json({
        message: "順番を更新しました",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[LP Builder API] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Delete project or section
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const sectionId = searchParams.get("sectionId");

    const manager = getSectionManager();

    if (sectionId) {
      const deleted = manager.deleteSection(sectionId);
      if (!deleted) {
        return NextResponse.json({ error: "Section not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "セクションを削除しました" });
    }

    if (projectId) {
      const deleted = manager.deleteProject(projectId);
      if (!deleted) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "プロジェクトを削除しました" });
    }

    return NextResponse.json(
      { error: "projectId or sectionId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[LP Builder API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
