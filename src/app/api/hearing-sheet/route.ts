/**
 * Hearing Sheet API
 * ヒアリングシートの生成・管理API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLPHearingTemplate,
  exportToMarkdown,
  exportToHTML,
  exportToGoogleFormJSON,
  extractN1Data,
  generateChecklist,
} from "@/lib/documents/hearing-sheet-generator";
import { calculateCompletion } from "@/lib/documents/templates/lp-hearing";

// =============================================================================
// GET: Get template or export
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const format = searchParams.get("format");

    const template = getLPHearingTemplate();

    // Get template structure
    if (action === "template") {
      return NextResponse.json({ template });
    }

    // Get checklist
    if (action === "checklist") {
      const checklist = generateChecklist(template);
      return NextResponse.json({ checklist });
    }

    // Export blank template
    if (action === "export") {
      switch (format) {
        case "markdown":
          const mdExport = exportToMarkdown(template);
          return new NextResponse(mdExport.content, {
            headers: {
              "Content-Type": "text/markdown; charset=utf-8",
              "Content-Disposition": `attachment; filename="${mdExport.filename}"`,
            },
          });

        case "html":
          const html = exportToHTML(template, undefined, { editable: true });
          return new NextResponse(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Content-Disposition": `attachment; filename="hearing_sheet.html"`,
            },
          });

        case "html_print":
          const htmlPrint = exportToHTML(template, undefined, { editable: false });
          return new NextResponse(htmlPrint, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Content-Disposition": `attachment; filename="hearing_sheet_print.html"`,
            },
          });

        case "google_form":
          const formJson = exportToGoogleFormJSON(template);
          return NextResponse.json({ formJson });

        default:
          return NextResponse.json(
            { error: "Invalid format. Use: markdown, html, html_print, google_form" },
            { status: 400 }
          );
      }
    }

    // Default: return template info
    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
        sectionCount: template.sections.length,
        questionCount: template.sections.reduce(
          (acc, s) => acc + s.questions.length,
          0
        ),
      },
    });
  } catch (error) {
    console.error("[Hearing Sheet API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Generate exports with responses or extract N1
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, responses, format } = body;

    const template = getLPHearingTemplate();

    // Export with responses
    if (action === "export") {
      switch (format) {
        case "markdown":
          const md = exportToMarkdown(template, responses);
          return NextResponse.json({ content: md, format: "markdown" });

        case "html":
          const html = exportToHTML(template, responses, { editable: false });
          return NextResponse.json({ content: html, format: "html" });

        default:
          return NextResponse.json(
            { error: "Invalid format" },
            { status: 400 }
          );
      }
    }

    // Extract N1 data from responses
    if (action === "extract-n1") {
      const n1Data = extractN1Data(responses);
      if (!n1Data) {
        return NextResponse.json({
          success: false,
          message: "N1データが見つかりません。N1顧客情報セクションを入力してください。",
        });
      }
      return NextResponse.json({
        success: true,
        n1Data,
        message: "N1データを抽出しました",
      });
    }

    // Calculate completion
    if (action === "check-completion") {
      const completion = calculateCompletion(responses);
      return NextResponse.json({
        completion,
        message:
          completion.percentage === 100
            ? "すべての必須項目が入力されています"
            : `必須項目の${completion.percentage}%が入力されています`,
      });
    }

    // Validate responses
    if (action === "validate") {
      const completion = calculateCompletion(responses);
      const missingRequired: string[] = [];

      for (const section of template.sections) {
        for (const question of section.questions) {
          if (question.required) {
            const answer = responses[question.id];
            const isEmpty = Array.isArray(answer)
              ? answer.length === 0
              : !answer || answer.trim() === "";
            if (isEmpty) {
              missingRequired.push(question.question);
            }
          }
        }
      }

      return NextResponse.json({
        valid: missingRequired.length === 0,
        completion,
        missingRequired,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Hearing Sheet API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
