/**
 * RAG API Endpoint
 * ナレッジベースのRAG機能を提供するAPIエンドポイント
 */

import { NextRequest, NextResponse } from "next/server";
import {
  queryKnowledgeRAG,
  getCopywritingAssistance,
  getMarketingStrategy,
  getDesignPromptSuggestions,
  getPsychologicalTriggers,
  initializeKnowledgeBase,
  getKnowledgeBaseStatus,
} from "@/lib/ai/knowledge-rag";
import { getFileSearchManager } from "@/lib/ai/file-search";

export const runtime = "nodejs";
export const maxDuration = 60;

// =============================================================================
// Types
// =============================================================================

interface QueryRequest {
  query: string;
  model?: string;
  maxCitations?: number;
  includeRawCitations?: boolean;
  task?: string;
}

interface AssistRequest {
  type: "copywriting" | "marketing" | "design" | "psychology";
  topic: string;
  context?: string;
  section?: string;
  style?: string;
  goal?: string;
}

// =============================================================================
// GET: Status and Index Information
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "status": {
        const status = getKnowledgeBaseStatus();
        return NextResponse.json({
          ok: true,
          status,
        });
      }

      case "files": {
        const manager = getFileSearchManager();
        const files = manager.getIndexedFiles();
        return NextResponse.json({
          ok: true,
          files,
        });
      }

      case "initialize": {
        const result = await initializeKnowledgeBase();
        return NextResponse.json({
          ok: result.success,
          ...result,
        });
      }

      default:
        // Return general info
        const generalStatus = getKnowledgeBaseStatus();
        return NextResponse.json({
          ok: true,
          info: {
            description: "RAG API for LP Builder Pro Knowledge Base",
            availableActions: ["status", "files", "initialize"],
            status: generalStatus,
          },
        });
    }
  } catch (err) {
    console.error("[rag] GET error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Query and Assist
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "query";

    switch (action) {
      case "query": {
        const { query, model, maxCitations, includeRawCitations, task } = body as QueryRequest;

        if (!query) {
          return NextResponse.json({ ok: false, error: "Query is required" }, { status: 400 });
        }

        const result = await queryKnowledgeRAG({
          query,
          model,
          maxCitations,
          includeRawCitations,
          task: task as
            | "analysis"
            | "research"
            | "copywriting"
            | "summarization"
            | "draft"
            | undefined,
        });

        return NextResponse.json({
          ok: true,
          ...result,
        });
      }

      case "assist": {
        const { type, topic, context, section, style, goal } = body as AssistRequest;

        if (!type || !topic) {
          return NextResponse.json(
            { ok: false, error: "Type and topic are required" },
            { status: 400 }
          );
        }

        let result;
        switch (type) {
          case "copywriting":
            result = await getCopywritingAssistance(topic, context);
            break;
          case "marketing":
            result = await getMarketingStrategy(topic, context);
            break;
          case "design":
            result = await getDesignPromptSuggestions(section || topic, style);
            break;
          case "psychology":
            result = await getPsychologicalTriggers(section || topic, goal);
            break;
          default:
            return NextResponse.json({ ok: false, error: `Unknown assist type: ${type}` }, { status: 400 });
        }

        return NextResponse.json({
          ok: true,
          ...result,
        });
      }

      case "index": {
        const { filepath } = body as { filepath?: string };

        const manager = getFileSearchManager();

        if (filepath) {
          // Index specific file
          const result = await manager.indexFile(filepath);
          return NextResponse.json({
            ok: result.status === "ready",
            file: result,
          });
        } else {
          // Index all knowledge files
          const result = await initializeKnowledgeBase();
          return NextResponse.json({
            ok: result.success,
            ...result,
          });
        }
      }

      case "reindex": {
        const { id } = body as { id: string };

        if (!id) {
          return NextResponse.json({ ok: false, error: "File ID is required" }, { status: 400 });
        }

        const manager = getFileSearchManager();
        const result = await manager.reindexFile(id);

        if (!result) {
          return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
        }

        return NextResponse.json({
          ok: result.status === "ready",
          file: result,
        });
      }

      case "delete": {
        const { id } = body as { id: string };

        if (!id) {
          return NextResponse.json({ ok: false, error: "File ID is required" }, { status: 400 });
        }

        const manager = getFileSearchManager();
        manager.deleteIndexedFile(id);

        return NextResponse.json({ ok: true });
      }

      case "search": {
        const { query, maxResults } = body as { query: string; maxResults?: number };

        if (!query) {
          return NextResponse.json({ ok: false, error: "Query is required" }, { status: 400 });
        }

        const manager = getFileSearchManager();
        const citations = await manager.search(query, maxResults);

        return NextResponse.json({
          ok: true,
          citations,
        });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[rag] POST error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}
