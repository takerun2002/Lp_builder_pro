/**
 * Persona Generator - N1ベースペルソナ生成
 * N1データから拡張したペルソナを生成
 *
 * データ階層:
 * 🟢 Level 1: N1データ（FACT - 事実）
 * 🟡 Level 2: N1ベースペルソナ（N1-BASED - 高確度仮説）
 * 🔴 Level 3: AIペルソナ（HYPOTHESIS - 仮説）
 */

import { getGeminiClient } from "@/lib/ai/gemini";
import { selectModelForTask } from "@/lib/ai/model-selector";
import {
  getN1Manager,
  type N1Data,
  type DataLevel,
  type LabeledData,
  labelData,
} from "./n1-manager";

// =============================================================================
// Types
// =============================================================================

export interface Demographics {
  ageRange: string;
  gender: string;
  occupation: string;
  income: string;
  location: string;
  familyStatus: string;
}

export interface Psychographics {
  values: string[];
  lifestyle: string[];
  interests: string[];
  personality: string[];
}

export interface BuyingStage {
  stage: string;
  mindset: string;
  questions: string[];
  triggers: string[];
}

export interface GeneratedPersona {
  id: string;
  projectId: string;
  name: string;
  tagline: string;
  demographics: Demographics;
  psychographics: Psychographics;
  buyingJourney: BuyingStage[];
  painPoints: LabeledData[];
  desires: LabeledData[];
  decisionTriggers: LabeledData[];
  objections: LabeledData[];
  idealMessage: string;
  dataLevel: DataLevel;
  sourceN1Ids: string[];
  createdAt: string;
}

export interface PersonaGenerationInput {
  projectId: string;
  genre?: string;
  targetDescription?: string;
  useAI?: boolean;
}

// =============================================================================
// Persona Generator
// =============================================================================

/**
 * Generate persona from N1 data
 */
export async function generatePersonaFromN1(
  input: PersonaGenerationInput
): Promise<GeneratedPersona> {
  const manager = getN1Manager();
  const n1List = manager.getByProject(input.projectId);

  if (n1List.length === 0) {
    // No N1 data - generate AI hypothesis persona
    return generateAIPersona(input);
  }

  // Has N1 data - generate N1-based persona
  return generateN1BasedPersona(n1List, input);
}

/**
 * Generate N1-based persona (high confidence)
 */
async function generateN1BasedPersona(
  n1List: N1Data[],
  input: PersonaGenerationInput
): Promise<GeneratedPersona> {
  const primaryN1 = n1List[0];

  // Extract facts from N1 data
  const painPoints: LabeledData[] = n1List.map((n1) =>
    labelData(n1.beforePurchase.painPoint, "fact", n1.id)
  );

  const decisionTriggers: LabeledData[] = n1List.map((n1) =>
    labelData(n1.decisionPoint.triggerMoment, "fact", n1.id)
  );

  const objections: LabeledData[] = n1List.map((n1) =>
    labelData(n1.decisionPoint.hesitation, "fact", n1.id)
  );

  const desires: LabeledData[] = n1List.map((n1) =>
    labelData(n1.afterPurchase.transformation, "fact", n1.id)
  );

  // Calculate age range from N1 data
  const ages = n1List.map((n1) => n1.basic.age);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const ageRange = minAge === maxAge ? `${minAge}歳` : `${minAge}-${maxAge}歳`;

  // Get occupations
  const occupations = Array.from(new Set(n1List.map((n1) => n1.basic.occupation)));

  // Generate enhanced insights with AI if enabled
  let aiEnhancedData: {
    psychographics?: Psychographics;
    buyingJourney?: BuyingStage[];
    idealMessage?: string;
  } = {};

  if (input.useAI !== false) {
    aiEnhancedData = await enhanceWithAI(n1List, input);
  }

  return {
    id: `persona_${Date.now()}`,
    projectId: input.projectId,
    name: `${primaryN1.basic.name}タイプ`,
    tagline: extractTagline(n1List),
    demographics: {
      ageRange,
      gender: inferGender(n1List),
      occupation: occupations.join("、"),
      income: "データなし",
      location: "データなし",
      familyStatus: primaryN1.basic.familyStructure,
    },
    psychographics: aiEnhancedData.psychographics || {
      values: [],
      lifestyle: [],
      interests: [],
      personality: [],
    },
    buyingJourney: aiEnhancedData.buyingJourney || generateBasicBuyingJourney(n1List),
    painPoints,
    desires,
    decisionTriggers,
    objections,
    idealMessage:
      aiEnhancedData.idealMessage ||
      n1List[0].afterPurchase.recommendation,
    dataLevel: "n1_based",
    sourceN1Ids: n1List.map((n1) => n1.id),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate AI-only persona (hypothesis)
 */
async function generateAIPersona(
  input: PersonaGenerationInput
): Promise<GeneratedPersona> {
  const modelConfig = await selectModelForTask("analysis");
  const ai = getGeminiClient();

  const prompt = `あなたはマーケティングの専門家です。以下の情報を元に、ターゲットペルソナを生成してください。

ジャンル: ${input.genre || "不明"}
ターゲット説明: ${input.targetDescription || "不明"}

以下のJSON形式で出力してください：
{
  "name": "ペルソナ名（〇〇さん）",
  "tagline": "一言で表すキャッチフレーズ",
  "demographics": {
    "ageRange": "年齢層",
    "gender": "性別",
    "occupation": "職業",
    "income": "収入帯",
    "location": "居住地域",
    "familyStatus": "家族構成"
  },
  "psychographics": {
    "values": ["価値観1", "価値観2"],
    "lifestyle": ["ライフスタイル1", "ライフスタイル2"],
    "interests": ["興味関心1", "興味関心2"],
    "personality": ["性格特性1", "性格特性2"]
  },
  "painPoints": ["悩み1", "悩み2", "悩み3"],
  "desires": ["願望1", "願望2", "願望3"],
  "decisionTriggers": ["決め手1", "決め手2"],
  "objections": ["反論・躊躇1", "反論・躊躇2"],
  "idealMessage": "この人に響く理想的なメッセージ"
}`;

  const response = await ai.models.generateContent({
    model: modelConfig.model,
    contents: prompt,
  });

  const text = response.text || "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      id: `persona_${Date.now()}`,
      projectId: input.projectId,
      name: parsed.name || "AIペルソナ",
      tagline: parsed.tagline || "",
      demographics: parsed.demographics || {
        ageRange: "不明",
        gender: "不明",
        occupation: "不明",
        income: "不明",
        location: "不明",
        familyStatus: "不明",
      },
      psychographics: parsed.psychographics || {
        values: [],
        lifestyle: [],
        interests: [],
        personality: [],
      },
      buyingJourney: [],
      painPoints: (parsed.painPoints || []).map((p: string) =>
        labelData(p, "hypothesis", "ai_generated")
      ),
      desires: (parsed.desires || []).map((d: string) =>
        labelData(d, "hypothesis", "ai_generated")
      ),
      decisionTriggers: (parsed.decisionTriggers || []).map((t: string) =>
        labelData(t, "hypothesis", "ai_generated")
      ),
      objections: (parsed.objections || []).map((o: string) =>
        labelData(o, "hypothesis", "ai_generated")
      ),
      idealMessage: parsed.idealMessage || "",
      dataLevel: "hypothesis",
      sourceN1Ids: [],
      createdAt: new Date().toISOString(),
    };
  } catch {
    // Return default persona on error
    return {
      id: `persona_${Date.now()}`,
      projectId: input.projectId,
      name: "AIペルソナ",
      tagline: "AI生成のペルソナ",
      demographics: {
        ageRange: "30-40代",
        gender: "不明",
        occupation: "会社員",
        income: "不明",
        location: "都市部",
        familyStatus: "不明",
      },
      psychographics: {
        values: [],
        lifestyle: [],
        interests: [],
        personality: [],
      },
      buyingJourney: [],
      painPoints: [labelData("悩みデータなし", "hypothesis", "ai_generated")],
      desires: [labelData("願望データなし", "hypothesis", "ai_generated")],
      decisionTriggers: [],
      objections: [],
      idealMessage: "",
      dataLevel: "hypothesis",
      sourceN1Ids: [],
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Enhance N1 data with AI insights
 */
async function enhanceWithAI(
  n1List: N1Data[],
  input: PersonaGenerationInput
): Promise<{
  psychographics?: Psychographics;
  buyingJourney?: BuyingStage[];
  idealMessage?: string;
}> {
  const modelConfig = await selectModelForTask("analysis");
  const ai = getGeminiClient();

  const n1Summary = n1List
    .map(
      (n1) => `
- 名前: ${n1.basic.name}（${n1.basic.age}歳、${n1.basic.occupation}）
- 悩み: ${n1.beforePurchase.painPoint}
- 決め手: ${n1.decisionPoint.triggerMoment}
- 変化: ${n1.afterPurchase.transformation}
`
    )
    .join("\n");

  const prompt = `以下のN1データ（実在顧客のインタビュー）を分析し、追加の洞察を生成してください。

## N1データ
${n1Summary}

## ジャンル
${input.genre || "不明"}

以下のJSON形式で出力してください：
{
  "psychographics": {
    "values": ["価値観1", "価値観2", "価値観3"],
    "lifestyle": ["ライフスタイル1", "ライフスタイル2"],
    "interests": ["興味関心1", "興味関心2"],
    "personality": ["性格特性1", "性格特性2"]
  },
  "buyingJourney": [
    {
      "stage": "認知",
      "mindset": "この段階での心理状態",
      "questions": ["この段階での疑問1", "疑問2"],
      "triggers": ["行動を促すトリガー1"]
    }
  ],
  "idealMessage": "このターゲットに最も響く一言メッセージ"
}`;

  try {
    const response = await ai.models.generateContent({
      model: modelConfig.model,
      contents: prompt,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function extractTagline(n1List: N1Data[]): string {
  if (n1List.length === 0) return "";

  // Use the most common transformation as tagline base
  const transformations = n1List.map((n1) => n1.afterPurchase.transformation);
  if (transformations.length > 0) {
    return transformations[0].slice(0, 50) + (transformations[0].length > 50 ? "..." : "");
  }

  return "";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function inferGender(n1List: N1Data[]): string {
  // Simple heuristic based on name patterns (Japanese names)
  // This is a simplified version - in production, you'd want more sophisticated logic or explicit data
  return "不明";
}

function generateBasicBuyingJourney(n1List: N1Data[]): BuyingStage[] {
  return [
    {
      stage: "認知",
      mindset: "問題を認識し始めている",
      questions: n1List.map((n1) => `${n1.beforePurchase.painPoint}をどう解決すればいい？`).slice(0, 2),
      triggers: [],
    },
    {
      stage: "検討",
      mindset: "解決策を比較検討している",
      questions: n1List.map((n1) => n1.decisionPoint.hesitation).filter(Boolean).slice(0, 2),
      triggers: [],
    },
    {
      stage: "決定",
      mindset: "購入を決意する",
      questions: ["本当に効果があるのか？", "今買うべきか？"],
      triggers: n1List.map((n1) => n1.decisionPoint.finalPush).filter(Boolean).slice(0, 2),
    },
  ];
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Check if persona data is reliable
 */
export function assessPersonaReliability(persona: GeneratedPersona): {
  score: number;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let score = 0;

  // Check data level
  if (persona.dataLevel === "fact") {
    score += 40;
  } else if (persona.dataLevel === "n1_based") {
    score += 30;
  } else {
    score += 10;
    warnings.push("このペルソナはAI生成の仮説です。N1データで検証することを推奨します。");
    recommendations.push("既存顧客1-3名にインタビューを実施してください。");
  }

  // Check number of N1 sources
  const n1Count = persona.sourceN1Ids.length;
  if (n1Count >= 3) {
    score += 30;
  } else if (n1Count >= 1) {
    score += 20;
    recommendations.push(`N1データが${n1Count}件です。3件以上あるとより信頼性が高まります。`);
  } else {
    warnings.push("N1データがありません。ペルソナの精度が低い可能性があります。");
    recommendations.push("顧客インタビューを実施し、N1データを入力してください。");
  }

  // Check data completeness
  const factCount = [
    ...persona.painPoints.filter((p) => p.level === "fact"),
    ...persona.decisionTriggers.filter((t) => t.level === "fact"),
    ...persona.objections.filter((o) => o.level === "fact"),
  ].length;

  if (factCount >= 5) {
    score += 30;
  } else if (factCount >= 2) {
    score += 15;
  }

  return {
    score: Math.min(100, score),
    warnings,
    recommendations,
  };
}
