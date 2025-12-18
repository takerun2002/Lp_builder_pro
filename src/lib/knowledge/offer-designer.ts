/**
 * Offer Designer - オファー設計アシスタント
 * ナレッジベースを活用した商品セット設計・ファネル構築支援
 */

import { getGeminiClient } from "@/lib/ai/gemini";
import { selectModelForTask } from "@/lib/ai/model-selector";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

// =============================================================================
// Types
// =============================================================================

export interface ProductOffer {
  title: string;
  price: number;
  concept: string;
  personaId?: string;
}

export interface ProductSet {
  setId: string;
  theme: string;
  offers: {
    front: ProductOffer;
    middle: ProductOffer;
    back: ProductOffer;
    downsell?: ProductOffer;
    orderBump?: ProductOffer;
  };
  recommendedTriggers?: string[];
}

export interface DRMFunnelStep {
  step: number;
  label: string;
  asset: string;
  triggerIds: string[];
  goal: string;
  suggestedContent?: string;
}

export interface DRMFunnel {
  steps: DRMFunnelStep[];
  totalSteps: number;
}

export interface LTVStrategy {
  type: "upsell" | "cross_sell" | "referral" | "community";
  mechanism: string;
  expectedLiftPct: number;
  implementation?: string;
}

export interface PricingRationale {
  tier: "front" | "middle" | "back";
  suggestedPrice: number;
  rationale: string;
  anchoring: string;
  comparisonValue: string;
}

export interface OfferDesignInput {
  productType: string;
  targetAudience: string;
  mainBenefit: string;
  priceRange?: {
    min: number;
    max: number;
  };
  existingProducts?: string[];
}

export interface OfferDesignResult {
  productSet: ProductSet;
  drmFunnel: DRMFunnel;
  ltvStrategies: LTVStrategy[];
  pricingRationales: PricingRationale[];
  implementationSteps: string[];
  model: string;
}

// =============================================================================
// Knowledge Loader
// =============================================================================

interface MarketingKnowledge {
  pricing_and_offers: {
    product_sets: {
      template: {
        offers: {
          front: { price: number; concept: string };
          middle: { price: number; concept: string };
          back: { price: number; concept: string };
          downsell: { price: number; concept: string };
          order_bump: { price: number; concept: string };
        };
      };
      examples: Array<{
        set_id: string;
        theme: string;
        offers: Record<string, { title: string; price: number; concept: string }>;
      }>;
    };
    drm_funnel: {
      steps: Array<{
        step: number;
        label: string;
        asset: string;
        trigger_ids: string[];
        goal: string;
      }>;
    };
    ltv_maximization: Record<
      string,
      {
        mechanism: string;
        expected_lift_pct: number;
      }
    >;
  };
  brand_and_persona: {
    personas: {
      examples: Array<{
        id: string;
        label: string;
        core_pain: string;
        trigger_ids: string[];
        primary_offer_tier: string;
      }>;
    };
  };
}

function loadMarketingKnowledge(): MarketingKnowledge | null {
  try {
    const filePath = path.join(process.cwd(), "src/lib/knowledge/marketing_strategy.yaml");
    const content = fs.readFileSync(filePath, "utf-8");
    return yaml.load(content) as MarketingKnowledge;
  } catch {
    console.error("[offer-designer] Failed to load marketing knowledge");
    return null;
  }
}

// =============================================================================
// Offer Designer
// =============================================================================

/**
 * Generate a complete offer design based on input
 */
export async function designOffer(input: OfferDesignInput): Promise<OfferDesignResult> {
  const knowledge = loadMarketingKnowledge();
  const modelConfig = await selectModelForTask("analysis");
  const ai = getGeminiClient();

  // Build context from knowledge
  const knowledgeContext = knowledge
    ? `
## 商品セット設計テンプレート
フロント商品: ${knowledge.pricing_and_offers.product_sets.template.offers.front.concept}（例: ¥${knowledge.pricing_and_offers.product_sets.template.offers.front.price}）
ミドル商品: ${knowledge.pricing_and_offers.product_sets.template.offers.middle.concept}（例: ¥${knowledge.pricing_and_offers.product_sets.template.offers.middle.price}）
バック商品: ${knowledge.pricing_and_offers.product_sets.template.offers.back.concept}（例: ¥${knowledge.pricing_and_offers.product_sets.template.offers.back.price}）
ダウンセル: ${knowledge.pricing_and_offers.product_sets.template.offers.downsell.concept}（例: ¥${knowledge.pricing_and_offers.product_sets.template.offers.downsell.price}）
オーダーバンプ: ${knowledge.pricing_and_offers.product_sets.template.offers.order_bump.concept}（例: ¥${knowledge.pricing_and_offers.product_sets.template.offers.order_bump.price}）

## DRMファネル7ステップ
${knowledge.pricing_and_offers.drm_funnel.steps.map((s) => `${s.step}. ${s.label}: ${s.asset} → ${s.goal}`).join("\n")}

## LTV最大化施策
${Object.entries(knowledge.pricing_and_offers.ltv_maximization)
  .map(([key, val]) => `- ${key}: ${val.mechanism}（期待リフト: +${val.expected_lift_pct}%）`)
  .join("\n")}
`
    : "";

  const prompt = `あなたはマーケティング戦略のエキスパートです。以下の情報を元に、最適なオファー設計を提案してください。

## 入力情報
- 商品タイプ: ${input.productType}
- ターゲット: ${input.targetAudience}
- 主なベネフィット: ${input.mainBenefit}
${input.priceRange ? `- 価格帯: ¥${input.priceRange.min} 〜 ¥${input.priceRange.max}` : ""}
${input.existingProducts?.length ? `- 既存商品: ${input.existingProducts.join(", ")}` : ""}

${knowledgeContext}

## 出力形式（JSON）
以下の形式で出力してください。コードブロックは使わず、純粋なJSONのみを出力してください。

{
  "productSet": {
    "setId": "ps_xxxxx",
    "theme": "セットのテーマ",
    "offers": {
      "front": { "title": "商品名", "price": 価格, "concept": "コンセプト" },
      "middle": { "title": "商品名", "price": 価格, "concept": "コンセプト" },
      "back": { "title": "商品名", "price": 価格, "concept": "コンセプト" },
      "downsell": { "title": "商品名", "price": 価格, "concept": "コンセプト" },
      "orderBump": { "title": "商品名", "price": 価格, "concept": "コンセプト" }
    },
    "recommendedTriggers": ["トリガー1", "トリガー2"]
  },
  "drmFunnel": {
    "steps": [
      { "step": 1, "label": "ステップ名", "asset": "アセット", "triggerIds": ["ID"], "goal": "目標", "suggestedContent": "具体的なコンテンツ案" }
    ],
    "totalSteps": 7
  },
  "ltvStrategies": [
    { "type": "upsell", "mechanism": "具体的な施策", "expectedLiftPct": 25, "implementation": "実装方法" }
  ],
  "pricingRationales": [
    { "tier": "front", "suggestedPrice": 価格, "rationale": "根拠", "anchoring": "アンカリング戦略", "comparisonValue": "比較価値" }
  ],
  "implementationSteps": ["ステップ1", "ステップ2"]
}`;

  const response = await ai.models.generateContent({
    model: modelConfig.model,
    contents: prompt,
  });

  const text = response.text || "";

  // Parse JSON from response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]) as Omit<OfferDesignResult, "model">;

    return {
      ...result,
      model: modelConfig.model,
    };
  } catch (err) {
    console.error("[offer-designer] Failed to parse response:", err);

    // Return default structure on error
    return {
      productSet: {
        setId: `ps_${Date.now()}`,
        theme: input.productType,
        offers: {
          front: {
            title: `${input.productType} スターターガイド`,
            price: input.priceRange?.min || 1000,
            concept: "入門向けの導入コンテンツ",
          },
          middle: {
            title: `${input.productType} 実践ワークショップ`,
            price: input.priceRange ? Math.floor((input.priceRange.min + input.priceRange.max) / 2) : 10000,
            concept: "実践的なスキル習得",
          },
          back: {
            title: `${input.productType} マスタープログラム`,
            price: input.priceRange?.max || 80000,
            concept: "本格的な成果達成プログラム",
          },
        },
        recommendedTriggers: ["SCARCITY", "SOC_PROOF", "AUTHORITY"],
      },
      drmFunnel: {
        steps: [
          { step: 1, label: "Lead Magnet", asset: "無料チェックリスト", triggerIds: ["PRIMING"], goal: "リード獲得" },
          { step: 2, label: "Tripwire", asset: "低価格入門商品", triggerIds: ["ANCHOR"], goal: "初回購入" },
          { step: 3, label: "Core Offer", asset: "メイン商品", triggerIds: ["SCARCITY"], goal: "収益化" },
          { step: 4, label: "Profit Maximizer", asset: "アップグレード", triggerIds: ["AUTHORITY"], goal: "AOV向上" },
          { step: 5, label: "Retention", asset: "会員サービス", triggerIds: ["GAMIF"], goal: "継続" },
          { step: 6, label: "Referral", asset: "紹介プログラム", triggerIds: ["RECIPROC"], goal: "紹介獲得" },
          { step: 7, label: "Re-activation", asset: "復活キャンペーン", triggerIds: ["TEMP_DIS"], goal: "休眠復活" },
        ],
        totalSteps: 7,
      },
      ltvStrategies: [
        { type: "upsell", mechanism: "ミドル→バックへの誘導", expectedLiftPct: 25 },
        { type: "cross_sell", mechanism: "関連商品の提案", expectedLiftPct: 15 },
        { type: "referral", mechanism: "紹介プログラム", expectedLiftPct: 10 },
        { type: "community", mechanism: "有料コミュニティ", expectedLiftPct: 20 },
      ],
      pricingRationales: [
        {
          tier: "front",
          suggestedPrice: 1000,
          rationale: "初回購入のハードルを下げる",
          anchoring: "通常価格の80%オフ",
          comparisonValue: "書籍1冊分",
        },
      ],
      implementationSteps: [
        "リードマグネットを作成",
        "フロント商品のLPを作成",
        "メールシーケンスを設定",
        "決済システムを連携",
        "ファネルをテスト",
      ],
      model: modelConfig.model,
    };
  }
}

/**
 * Generate pricing rationale for a specific product
 */
export async function generatePricingRationale(
  productName: string,
  targetPrice: number,
  tier: "front" | "middle" | "back"
): Promise<PricingRationale> {
  const modelConfig = await selectModelForTask("copywriting");
  const ai = getGeminiClient();

  const prompt = `あなたは価格戦略のエキスパートです。以下の商品の価格設定根拠を生成してください。

商品名: ${productName}
目標価格: ¥${targetPrice.toLocaleString()}
ティア: ${tier === "front" ? "フロント（入門）" : tier === "middle" ? "ミドル（実践）" : "バック（本格）"}

以下の形式でJSONを出力してください：
{
  "tier": "${tier}",
  "suggestedPrice": ${targetPrice},
  "rationale": "価格設定の根拠（2-3文）",
  "anchoring": "アンカリング戦略（高い比較対象を提示）",
  "comparisonValue": "この価格で得られる価値の比較（例：コーヒー3杯分）"
}`;

  const response = await ai.models.generateContent({
    model: modelConfig.model,
    contents: prompt,
  });

  const text = response.text || "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as PricingRationale;
    }
  } catch {
    // Fall through to default
  }

  return {
    tier,
    suggestedPrice: targetPrice,
    rationale: `${tier === "front" ? "低リスクで始められる" : tier === "middle" ? "本格的な成果を得られる" : "圧倒的な成果を実現する"}価格設定`,
    anchoring: `通常${Math.floor(targetPrice * 2).toLocaleString()}円相当の価値`,
    comparisonValue: `${Math.floor(targetPrice / 500)}回分のランチ代`,
  };
}

/**
 * Suggest funnel improvements based on current setup
 */
export async function suggestFunnelImprovements(
  currentFunnel: DRMFunnelStep[]
): Promise<{ improvements: string[]; priorityActions: string[] }> {
  const knowledge = loadMarketingKnowledge();
  const idealFunnel = knowledge?.pricing_and_offers.drm_funnel.steps || [];

  const modelConfig = await selectModelForTask("analysis");
  const ai = getGeminiClient();

  const prompt = `以下の現在のファネルと理想のファネルを比較し、改善点を提案してください。

## 現在のファネル
${currentFunnel.map((s) => `${s.step}. ${s.label}: ${s.asset}`).join("\n")}

## 理想のファネル（7ステップ）
${idealFunnel.map((s) => `${s.step}. ${s.label}: ${s.asset} → ${s.goal}`).join("\n")}

以下の形式でJSONを出力してください：
{
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "priorityActions": ["最優先アクション1", "最優先アクション2"]
}`;

  const response = await ai.models.generateContent({
    model: modelConfig.model,
    contents: prompt,
  });

  const text = response.text || "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as { improvements: string[]; priorityActions: string[] };
    }
  } catch {
    // Fall through to default
  }

  return {
    improvements: [
      "リードマグネットの価値を高める",
      "トリップワイヤーを追加してファネルを強化",
      "リテンション施策を追加",
    ],
    priorityActions: ["まずリードマグネットを作成", "次にメールシーケンスを設定"],
  };
}

/**
 * Calculate expected revenue from a product set
 */
export function calculateExpectedRevenue(
  productSet: ProductSet,
  assumptions: {
    monthlyTraffic: number;
    leadConversionRate: number;
    frontConversionRate: number;
    middleConversionRate: number;
    backConversionRate: number;
    downsellConversionRate?: number;
    orderBumpRate?: number;
  }
): {
  monthlyLeads: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  breakdown: Record<string, number>;
} {
  const { monthlyTraffic, leadConversionRate, frontConversionRate, middleConversionRate, backConversionRate } =
    assumptions;

  const leads = Math.floor(monthlyTraffic * leadConversionRate);
  const frontSales = Math.floor(leads * frontConversionRate);
  const middleSales = Math.floor(frontSales * middleConversionRate);
  const backSales = Math.floor(middleSales * backConversionRate);

  const downsellSales = productSet.offers.downsell
    ? Math.floor((middleSales - backSales) * (assumptions.downsellConversionRate || 0.3))
    : 0;

  const orderBumpSales = productSet.offers.orderBump
    ? Math.floor(frontSales * (assumptions.orderBumpRate || 0.2))
    : 0;

  const breakdown: Record<string, number> = {
    front: frontSales * productSet.offers.front.price,
    middle: middleSales * productSet.offers.middle.price,
    back: backSales * productSet.offers.back.price,
  };

  if (productSet.offers.downsell) {
    breakdown.downsell = downsellSales * productSet.offers.downsell.price;
  }
  if (productSet.offers.orderBump) {
    breakdown.orderBump = orderBumpSales * productSet.offers.orderBump.price;
  }

  const monthlyRevenue = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  const totalSales = frontSales + orderBumpSales;
  const averageOrderValue = totalSales > 0 ? Math.floor(monthlyRevenue / totalSales) : 0;

  return {
    monthlyLeads: leads,
    monthlyRevenue,
    averageOrderValue,
    breakdown,
  };
}
