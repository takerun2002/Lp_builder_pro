/**
 * 提案書生成API
 * POST /api/proposal - リサーチ結果から提案書を生成
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateProposal,
  type ProposalTemplate,
} from "@/lib/documents/proposal-generator";
import type { ResearchResult, UchidaResearchResult } from "@/lib/research/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      research,
      template = "simple",
      includeScreenshots = false,
      includeCharts = false,
    } = body as {
      research: ResearchResult | UchidaResearchResult;
      template?: ProposalTemplate;
      includeScreenshots?: boolean;
      includeCharts?: boolean;
    };

    if (!research || !research.context) {
      return NextResponse.json(
        { success: false, error: "Research data is required" },
        { status: 400 }
      );
    }

    const proposal = await generateProposal(research, {
      template,
      includeScreenshots,
      includeCharts,
    });

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (error) {
    console.error("[API] POST /api/proposal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Proposal generation failed",
      },
      { status: 500 }
    );
  }
}
