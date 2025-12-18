/**
 * Offer Design API Endpoint
 * オファー設計アシスタントのAPIエンドポイント
 */

import { NextRequest, NextResponse } from "next/server";
import {
  designOffer,
  calculateExpectedRevenue,
  generatePricingRationale,
  suggestFunnelImprovements,
  type OfferDesignInput,
  type ProductSet,
  type DRMFunnelStep,
} from "@/lib/knowledge/offer-designer";

export const runtime = "nodejs";
export const maxDuration = 60;

// =============================================================================
// POST: Design Offer / Calculate Revenue
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "design";

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    switch (action) {
      case "design": {
        const input = body as OfferDesignInput;

        if (!input.productType || !input.targetAudience || !input.mainBenefit) {
          return NextResponse.json(
            { ok: false, error: "productType, targetAudience, and mainBenefit are required" },
            { status: 400 }
          );
        }

        const result = await designOffer(input);

        return NextResponse.json({
          ok: true,
          result,
        });
      }

      case "revenue": {
        const { productSet, assumptions } = body as {
          productSet: ProductSet;
          assumptions: {
            monthlyTraffic: number;
            leadConversionRate: number;
            frontConversionRate: number;
            middleConversionRate: number;
            backConversionRate: number;
            downsellConversionRate?: number;
            orderBumpRate?: number;
          };
        };

        if (!productSet || !assumptions) {
          return NextResponse.json(
            { ok: false, error: "productSet and assumptions are required" },
            { status: 400 }
          );
        }

        const estimate = calculateExpectedRevenue(productSet, assumptions);

        return NextResponse.json({
          ok: true,
          estimate,
        });
      }

      case "pricing": {
        const { productName, targetPrice, tier } = body as {
          productName: string;
          targetPrice: number;
          tier: "front" | "middle" | "back";
        };

        if (!productName || !targetPrice || !tier) {
          return NextResponse.json(
            { ok: false, error: "productName, targetPrice, and tier are required" },
            { status: 400 }
          );
        }

        const rationale = await generatePricingRationale(productName, targetPrice, tier);

        return NextResponse.json({
          ok: true,
          rationale,
        });
      }

      case "funnel-improvements": {
        const { currentFunnel } = body as { currentFunnel: DRMFunnelStep[] };

        if (!currentFunnel || !Array.isArray(currentFunnel)) {
          return NextResponse.json(
            { ok: false, error: "currentFunnel array is required" },
            { status: 400 }
          );
        }

        const improvements = await suggestFunnelImprovements(currentFunnel);

        return NextResponse.json({
          ok: true,
          ...improvements,
        });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[offer-design] POST error:", err);
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
// GET: API Info
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    info: {
      description: "Offer Design API for LP Builder Pro",
      availableActions: [
        {
          action: "design",
          method: "POST",
          description: "Generate complete offer design",
          required: ["productType", "targetAudience", "mainBenefit"],
          optional: ["priceRange", "existingProducts"],
        },
        {
          action: "revenue",
          method: "POST",
          description: "Calculate expected revenue",
          required: ["productSet", "assumptions"],
        },
        {
          action: "pricing",
          method: "POST",
          description: "Generate pricing rationale",
          required: ["productName", "targetPrice", "tier"],
        },
        {
          action: "funnel-improvements",
          method: "POST",
          description: "Suggest funnel improvements",
          required: ["currentFunnel"],
        },
      ],
    },
  });
}
