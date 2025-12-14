/**
 * オファー設計アシスタント
 *
 * マーケティング戦略ナレッジを活用して
 * 商品セット・ファネル・価格設定を自動設計
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "yaml";
import { generateText } from "@/lib/ai/gemini";

// ============================================
// 型定義
// ============================================

export type OfferTier = "front" | "middle" | "back" | "downsell" | "order_bump";

export interface Offer {
  tier: OfferTier;
  title: string;
  price: number;
  concept: string;
  persona_id?: string;
  triggers?: string[];
}

export interface ProductSet {
  set_id: string;
  theme: string;
  offers: Record<OfferTier, Offer>;
}

export interface DrmFunnelStep {
  step: number;
  label: string;
  asset: string;
  trigger_ids: string[];
  goal: string;
}

export interface LtvStrategy {
  type: "upsell" | "cross_sell" | "referral" | "community";
  mechanism: string;
  expected_lift_pct: number;
}

export interface BrandArchetype {
  name: string;
  traits: string;
  suitable_for: string;
}

export interface PersonaTemplate {
  id: string;
  label: string;
  core_pain: string;
  trigger_ids: string[];
  primary_offer_tier: OfferTier;
}

export interface OfferDesignRequest {
  genre: string;
  subGenre?: string;
  targetAudience: string;
  corePain: string;
  desiredOutcome: string;
  priceRange?: {
    min: number;
    max: number;
  };
  brandArchetype?: string;
}

export interface OfferDesignResult {
  productSet: ProductSet;
  funnel: DrmFunnelStep[];
  ltvStrategies: LtvStrategy[];
  pricingRationale: string;
  personas: PersonaTemplate[];
  yaml: string;
}

// ============================================
// キャッシュ
// ============================================

interface MarketingStrategyData {
  brand_and_persona: {
    brand: {
      archetype: {
        options: BrandArchetype[];
      };
    };
    personas: {
      template: PersonaTemplate;
      examples: PersonaTemplate[];
    };
  };
  pricing_and_offers: {
    product_sets: {
      template: {
        offers: Record<OfferTier, Offer>;
      };
      examples: ProductSet[];
    };
    drm_funnel: {
      steps: DrmFunnelStep[];
    };
    ltv_maximization: Record<string, LtvStrategy>;
  };
}

let cachedData: MarketingStrategyData | null = null;

// ============================================
// ローダー
// ============================================

/**
 * marketing_strategy.yaml を読み込む
 */
function loadMarketingStrategy(): MarketingStrategyData {
  if (cachedData) {
    return cachedData;
  }

  const filePath = join(
    process.cwd(),
    "src/lib/knowledge/marketing_strategy.yaml"
  );

  if (!existsSync(filePath)) {
    throw new Error("marketing_strategy.yaml not found");
  }

  const content = readFileSync(filePath, "utf-8");
  cachedData = yaml.parse(content) as MarketingStrategyData;

  return cachedData;
}

/**
 * キャッシュをクリア
 */
export function clearOfferDesignerCache(): void {
  cachedData = null;
}

// ============================================
// テンプレート取得
// ============================================

/**
 * ブランドアーキタイプ一覧を取得
 */
export function getBrandArchetypes(): BrandArchetype[] {
  const data = loadMarketingStrategy();
  return data.brand_and_persona.brand.archetype.options;
}

/**
 * ペルソナテンプレートを取得
 */
export function getPersonaTemplates(): PersonaTemplate[] {
  const data = loadMarketingStrategy();
  return data.brand_and_persona.personas.examples;
}

/**
 * 商品セットの例を取得
 */
export function getProductSetExamples(): ProductSet[] {
  const data = loadMarketingStrategy();
  return data.pricing_and_offers.product_sets.examples;
}

/**
 * DRMファネルテンプレートを取得
 */
export function getDrmFunnelTemplate(): DrmFunnelStep[] {
  const data = loadMarketingStrategy();
  return data.pricing_and_offers.drm_funnel.steps;
}

/**
 * LTV最大化戦略を取得
 */
export function getLtvStrategies(): LtvStrategy[] {
  const data = loadMarketingStrategy();
  const strategies = data.pricing_and_offers.ltv_maximization;

  return Object.entries(strategies).map(([type, strategy]) => ({
    type: type as LtvStrategy["type"],
    ...strategy,
  }));
}

// ============================================
// オファー設計
// ============================================

/**
 * オファーを設計
 */
export async function designOffer(
  request: OfferDesignRequest
): Promise<OfferDesignResult> {
  const data = loadMarketingStrategy();

  // AIでオファー設計を生成
  const prompt = buildOfferDesignPrompt(request, data);
  const response = await generateText(prompt, { model: "pro25" });

  // レスポンスをパース
  const result = parseOfferDesignResponse(response, request);

  return result;
}

/**
 * オファー設計プロンプトを構築
 */
function buildOfferDesignPrompt(
  request: OfferDesignRequest,
  data: MarketingStrategyData
): string {
  const archetypes = data.brand_and_persona.brand.archetype.options;
  const examples = data.pricing_and_offers.product_sets.examples;
  const funnelSteps = data.pricing_and_offers.drm_funnel.steps;
  const ltvStrategies = data.pricing_and_offers.ltv_maximization;

  return `あなたはダイレクトレスポンスマーケティングの専門家です。
以下の情報に基づいて、商品セット・ファネル・価格設定を設計してください。

## ビジネス情報
- ジャンル: ${request.genre}${request.subGenre ? ` / ${request.subGenre}` : ""}
- ターゲット: ${request.targetAudience}
- 主な悩み: ${request.corePain}
- 理想の状態: ${request.desiredOutcome}
${request.priceRange ? `- 価格帯: ${request.priceRange.min}円〜${request.priceRange.max}円` : ""}
${request.brandArchetype ? `- ブランドアーキタイプ: ${request.brandArchetype}` : ""}

## 参考: 商品セット例
${JSON.stringify(examples[0], null, 2)}

## 参考: DRMファネル7ステップ
${funnelSteps.map((s) => `${s.step}. ${s.label}: ${s.asset} (目標: ${s.goal})`).join("\n")}

## 参考: LTV最大化戦略
${Object.entries(ltvStrategies)
  .map(([type, s]) => `- ${type}: ${s.mechanism} (期待上昇: ${s.expected_lift_pct}%)`)
  .join("\n")}

## 参考: ブランドアーキタイプ
${archetypes.map((a) => `- ${a.name}: ${a.traits} (${a.suitable_for})`).join("\n")}

## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "productSet": {
    "set_id": "ps_${request.genre.toLowerCase().replace(/\s+/g, "_")}",
    "theme": "テーマ名",
    "offers": {
      "front": {
        "tier": "front",
        "title": "フロント商品名",
        "price": 1000,
        "concept": "コンセプト説明",
        "triggers": ["PRIMING"]
      },
      "middle": {
        "tier": "middle",
        "title": "ミドル商品名",
        "price": 10000,
        "concept": "コンセプト説明",
        "triggers": ["ANCHOR"]
      },
      "back": {
        "tier": "back",
        "title": "バック商品名",
        "price": 80000,
        "concept": "コンセプト説明",
        "triggers": ["SCARCITY", "FOMO"]
      },
      "downsell": {
        "tier": "downsell",
        "title": "ダウンセル商品名",
        "price": 5000,
        "concept": "コンセプト説明",
        "triggers": ["LOSS_AVOID"]
      },
      "order_bump": {
        "tier": "order_bump",
        "title": "オーダーバンプ商品名",
        "price": 1500,
        "concept": "コンセプト説明",
        "triggers": ["INSTANT"]
      }
    }
  },
  "funnel": [
    {
      "step": 1,
      "label": "Lead Magnet",
      "asset": "具体的なアセット名",
      "trigger_ids": ["PRIMING"],
      "goal": "メールアドレス取得"
    }
  ],
  "ltvStrategies": [
    {
      "type": "upsell",
      "mechanism": "具体的な仕組み",
      "expected_lift_pct": 25
    }
  ],
  "pricingRationale": "価格設定の根拠を3-5文で説明",
  "personas": [
    {
      "id": "persona_1",
      "label": "ペルソナ名",
      "core_pain": "主な悩み",
      "trigger_ids": ["SOC_PROOF"],
      "primary_offer_tier": "front"
    }
  ]
}
\`\`\`

## 設計ガイドライン
1. フロント商品は低価格で価値を実感させる
2. ミドル商品は実践的なワークショップ形式
3. バック商品は本格的なプログラム・コーチング
4. ダウンセルはバックを買わなかった人向け
5. オーダーバンプは購入時に追加できる補助商品
6. 各商品に適切な心理トリガーを設定
7. ペルソナは3段階（初心者・中級者・上級者）を想定
`;
}

/**
 * AIレスポンスをパース
 */
function parseOfferDesignResponse(
  response: string,
  request: OfferDesignRequest
): OfferDesignResult {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);

      // YAMLを生成
      const yamlContent = generateOfferYaml(parsed, request);

      return {
        productSet: parsed.productSet,
        funnel: parsed.funnel || getDrmFunnelTemplate(),
        ltvStrategies: parsed.ltvStrategies || getLtvStrategies(),
        pricingRationale: parsed.pricingRationale || "",
        personas: parsed.personas || [],
        yaml: yamlContent,
      };
    }
  } catch (e) {
    console.error("[offer-designer] Failed to parse response:", e);
  }

  // フォールバック: デフォルト値を返す
  return createDefaultOfferDesign(request);
}

/**
 * デフォルトのオファー設計を作成
 */
function createDefaultOfferDesign(
  request: OfferDesignRequest
): OfferDesignResult {
  const setId = `ps_${request.genre.toLowerCase().replace(/\s+/g, "_")}`;

  const productSet: ProductSet = {
    set_id: setId,
    theme: `${request.genre} Transformation`,
    offers: {
      front: {
        tier: "front",
        title: "Quick-Start Guide",
        price: 1000,
        concept: "10分で始められる入門書",
        triggers: ["PRIMING"],
      },
      middle: {
        tier: "middle",
        title: "Deep-Dive Workshop",
        price: 10000,
        concept: "実践型ワークショップ",
        triggers: ["ANCHOR"],
      },
      back: {
        tier: "back",
        title: "Mastermind Program",
        price: 80000,
        concept: "8週間グループコーチング",
        triggers: ["SCARCITY", "FOMO"],
      },
      downsell: {
        tier: "downsell",
        title: "Workshop Recording",
        price: 5000,
        concept: "動画で学べる録画版",
        triggers: ["LOSS_AVOID"],
      },
      order_bump: {
        tier: "order_bump",
        title: "Toolkit Templates",
        price: 1500,
        concept: "すぐ使えるテンプレート集",
        triggers: ["INSTANT"],
      },
    },
  };

  const yamlContent = generateOfferYaml(
    { productSet, funnel: getDrmFunnelTemplate(), ltvStrategies: getLtvStrategies(), personas: [], pricingRationale: "" },
    request
  );

  return {
    productSet,
    funnel: getDrmFunnelTemplate(),
    ltvStrategies: getLtvStrategies(),
    pricingRationale: "価格は価値に基づいて設定しています。",
    personas: getPersonaTemplates(),
    yaml: yamlContent,
  };
}

/**
 * オファー設計をYAML形式に変換
 */
function generateOfferYaml(
  result: Partial<OfferDesignResult>,
  request: OfferDesignRequest
): string {
  const yamlObj = {
    meta: {
      name: `${request.genre} オファー設計`,
      version: "1.0",
      created_at: new Date().toISOString(),
      target_audience: request.targetAudience,
      core_pain: request.corePain,
      desired_outcome: request.desiredOutcome,
    },
    product_set: result.productSet,
    funnel: result.funnel,
    ltv_strategies: result.ltvStrategies,
    pricing_rationale: result.pricingRationale,
    personas: result.personas,
  };

  return yaml.stringify(yamlObj);
}

// ============================================
// 価格計算ユーティリティ
// ============================================

/**
 * 価格帯から商品価格を提案
 */
export function suggestPrices(
  minPrice: number,
  maxPrice: number
): Record<OfferTier, number> {
  // バック商品を最大価格に設定
  const back = maxPrice;
  // フロント商品を最小価格に設定
  const front = minPrice;
  // ミドル商品はバックの1/8程度
  const middle = Math.round(back / 8);
  // ダウンセルはミドルの半額程度
  const downsell = Math.round(middle / 2);
  // オーダーバンプはフロントの1.5倍程度
  const orderBump = Math.round(front * 1.5);

  return {
    front,
    middle,
    back,
    downsell,
    order_bump: orderBump,
  };
}

/**
 * 期待LTVを計算
 */
export function calculateExpectedLtv(
  productSet: ProductSet,
  conversionRates: {
    frontToMiddle: number;
    middleToBack: number;
    orderBumpRate: number;
  }
): number {
  const { front, middle, back, order_bump } = productSet.offers;
  const { frontToMiddle, middleToBack, orderBumpRate } = conversionRates;

  // フロント購入者のLTV
  const frontLtv = front.price + front.price * orderBumpRate * order_bump.price;

  // ミドルにアップグレードした人のLTV
  const middleLtv =
    frontLtv +
    middle.price +
    middle.price * orderBumpRate * order_bump.price;

  // バックにアップグレードした人のLTV
  const backLtv = middleLtv + back.price;

  // 期待LTV = 各段階の確率加重平均
  const expectedLtv =
    frontLtv * (1 - frontToMiddle) +
    middleLtv * frontToMiddle * (1 - middleToBack) +
    backLtv * frontToMiddle * middleToBack;

  return Math.round(expectedLtv);
}

// ============================================
// オファータイプ別ガイドライン
// ============================================

const OFFER_TIER_GUIDELINES: Record<
  OfferTier,
  { description: string; priceRange: string; triggers: string[] }
> = {
  front: {
    description: "低価格で価値を実感させる入門商品",
    priceRange: "500円〜3,000円",
    triggers: ["PRIMING", "MERE_EXP"],
  },
  middle: {
    description: "実践的なワークショップ・コース",
    priceRange: "5,000円〜30,000円",
    triggers: ["ANCHOR", "SOC_PROOF"],
  },
  back: {
    description: "本格的なプログラム・コーチング",
    priceRange: "50,000円〜300,000円",
    triggers: ["SCARCITY", "FOMO", "AUTHORITY"],
  },
  downsell: {
    description: "バック商品を購入しなかった人向け",
    priceRange: "3,000円〜15,000円",
    triggers: ["LOSS_AVOID", "DOOR_FACE"],
  },
  order_bump: {
    description: "購入時に追加できる補助商品",
    priceRange: "1,000円〜5,000円",
    triggers: ["INSTANT", "FOOT_DOOR"],
  },
};

/**
 * オファータイプ別ガイドラインを取得
 */
export function getOfferTierGuidelines(): typeof OFFER_TIER_GUIDELINES {
  return OFFER_TIER_GUIDELINES;
}

/**
 * 特定のオファータイプのガイドラインを取得
 */
export function getGuideline(
  tier: OfferTier
): (typeof OFFER_TIER_GUIDELINES)[OfferTier] {
  return OFFER_TIER_GUIDELINES[tier];
}
