/**
 * オファー設計生成API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  designOffer,
  type OfferDesignRequest,
} from "@/lib/knowledge/offer-designer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      genre,
      subGenre,
      targetAudience,
      corePain,
      desiredOutcome,
      priceRange,
      brandArchetype,
    } = body as OfferDesignRequest;

    if (!genre || !targetAudience || !corePain || !desiredOutcome) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    console.log("[api/offer-design/generate] Designing offer:", {
      genre,
      subGenre,
      targetAudience,
      priceRange,
    });

    const result = await designOffer({
      genre,
      subGenre,
      targetAudience,
      corePain,
      desiredOutcome,
      priceRange,
      brandArchetype,
    });

    console.log("[api/offer-design/generate] Design complete:", {
      theme: result.productSet.theme,
      offerCount: Object.keys(result.productSet.offers).length,
      funnelSteps: result.funnel.length,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[api/offer-design/generate] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "オファー設計の生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
