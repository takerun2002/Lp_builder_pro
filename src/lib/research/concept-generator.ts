/**
 * たけるん式コンセプトジェネレーター
 *
 * Task 4.1: 収集データを統合してコンセプトを生成
 * たけるん式6ステップに基づき、競合コンセプト + 収集キーワード → 新コンセプト
 */

import { generateText } from "@/lib/ai/gemini";
import type { CompetitorAnalysis } from "./analyzers/concept-extractor";
import type { ClassifiedPainPoint } from "./analyzers/pain-classifier";

// ============================================================
// 型定義
// ============================================================

export interface ConceptGeneratorInput {
  competitors: CompetitorAnalysis[];
  painPoints: ClassifiedPainPoint[];
  keywords: {
    amazon: string[];
    youtube: string[];
    infotop: string[];
    general?: string[];
  };
  target: {
    age: string;
    gender: "male" | "female" | "both";
    situation: string;
    occupation?: string;
  };
  genre?: string;
  productType?: string;
  existingStrengths?: string[];
}

export interface ConceptCandidate {
  id: string;
  headline: string;
  headlineLong?: string;
  targetPain: string;
  benefit: string;
  benefitConcrete: string;
  usedKeywords: string[];
  referenceCompetitor?: string;
  scores: {
    benefitClarity: number;
    specificity: number;
    impact: number;
    uniqueness: number;
    overall: number;
  };
  rationale: string;
  psychologyTriggers: string[];
  suggestedSections: string[];
}

export interface ConceptGenerationResult {
  concepts: ConceptCandidate[];
  bestConcept: ConceptCandidate | null;
  insights: {
    targetProfile: string;
    painPriorityAnalysis: string;
    competitorGap: string;
    recommendedAngle: string;
  };
  keywordSuggestions: {
    primary: string[];
    secondary: string[];
    avoid: string[];
  };
  generatedAt: string;
}

export interface ConceptGenerationOptions {
  count?: number;
  maxHeadlineLength?: number;
  includeEmoji?: boolean;
  style?: "direct" | "story" | "question" | "provocative";
}

// ============================================================
// たけるん式6ステップ定義
// ============================================================

const UCHIDA_6_STEPS = {
  step1_target: "ターゲットを1人に絞る（N1アプローチ）",
  step2_pain: "深い悩み・痛みを特定する",
  step3_benefit: "具体的なベネフィットを定義する",
  step4_proof: "信頼性・証拠を用意する",
  step5_uniqueness: "競合との差別化ポイントを明確にする",
  step6_expression: "21文字以内で表現する",
};

// ============================================================
// メイン関数
// ============================================================

/**
 * コンセプトを生成
 */
export async function generateConcepts(
  input: ConceptGeneratorInput,
  options?: ConceptGenerationOptions
): Promise<ConceptGenerationResult> {
  const count = options?.count || 5;
  const maxHeadlineLength = options?.maxHeadlineLength || 21;

  // 1. 入力データを整理
  const preparedData = prepareInputData(input);

  // 2. AI でコンセプト生成
  const concepts = await generateConceptsWithAI(preparedData, {
    count,
    maxHeadlineLength,
    style: options?.style,
    includeEmoji: options?.includeEmoji,
  });

  // 3. スコアリング
  const scoredConcepts = scoreConcepts(concepts, preparedData);

  // 4. インサイト生成
  const insights = generateInsights(preparedData, scoredConcepts);

  // 5. キーワード提案
  const keywordSuggestions = generateKeywordSuggestions(preparedData, scoredConcepts);

  // ベストコンセプトを選出
  const bestConcept = scoredConcepts.length > 0
    ? scoredConcepts.reduce((best, current) =>
        current.scores.overall > best.scores.overall ? current : best
      )
    : null;

  return {
    concepts: scoredConcepts,
    bestConcept,
    insights,
    keywordSuggestions,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 単一コンセプトを改善
 */
export async function improveConcept(
  concept: ConceptCandidate,
  feedback: string,
  context: ConceptGeneratorInput
): Promise<ConceptCandidate> {
  const prompt = `以下のコンセプトを改善してください。

## 現在のコンセプト
ヘッドライン: ${concept.headline}
ターゲットの悩み: ${concept.targetPain}
ベネフィット: ${concept.benefit}

## フィードバック
${feedback}

## ターゲット情報
年齢: ${context.target.age}
性別: ${context.target.gender}
状況: ${context.target.situation}

## 改善指示
1. フィードバックを反映
2. ヘッドラインは21文字以内
3. より具体的なベネフィットを提示
4. ターゲットの感情に訴える表現

## 出力形式（JSON）
\`\`\`json
{
  "headline": "改善されたヘッドライン",
  "headlineLong": "長いバージョン",
  "targetPain": "ターゲットの悩み",
  "benefit": "ベネフィット",
  "benefitConcrete": "具体的なベネフィット表現",
  "rationale": "改善の理由"
}
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        ...concept,
        id: `concept_${Date.now()}`,
        headline: parsed.headline || concept.headline,
        headlineLong: parsed.headlineLong,
        targetPain: parsed.targetPain || concept.targetPain,
        benefit: parsed.benefit || concept.benefit,
        benefitConcrete: parsed.benefitConcrete || concept.benefitConcrete,
        rationale: parsed.rationale || concept.rationale,
      };
    }
  } catch (error) {
    console.error("[concept-generator] Improve error:", error);
  }

  return concept;
}

// ============================================================
// データ準備
// ============================================================

interface PreparedData {
  priorityPains: ClassifiedPainPoint[];
  topKeywords: string[];
  competitorConcepts: string[];
  competitorStrengths: string[];
  targetSummary: string;
  genre: string;
}

function prepareInputData(input: ConceptGeneratorInput): PreparedData {
  // 優先度の高い悩みを抽出
  const priorityPains = input.painPoints
    .filter((p) => p.quadrant === "priority" || p.quadrant === "important")
    .slice(0, 10);

  // 全キーワードを統合してランク付け
  const allKeywords = [
    ...input.keywords.amazon,
    ...input.keywords.youtube,
    ...input.keywords.infotop,
    ...(input.keywords.general || []),
  ];
  const topKeywords = getTopKeywords(allKeywords, 20);

  // 競合コンセプトを抽出
  const competitorConcepts = input.competitors
    .map((c) => c.concept)
    .filter(Boolean)
    .slice(0, 5);

  // 競合の強みを抽出
  const competitorStrengths = input.competitors
    .flatMap((c) => c.uniqueSellingPoints || [])
    .slice(0, 10);

  // ターゲットサマリー
  const targetSummary = buildTargetSummary(input.target);

  return {
    priorityPains,
    topKeywords,
    competitorConcepts,
    competitorStrengths,
    targetSummary,
    genre: input.genre || "other",
  };
}

function buildTargetSummary(target: ConceptGeneratorInput["target"]): string {
  const parts = [];
  if (target.age) parts.push(`${target.age}`);
  if (target.gender && target.gender !== "both") {
    parts.push(target.gender === "male" ? "男性" : "女性");
  }
  if (target.occupation) parts.push(target.occupation);
  if (target.situation) parts.push(target.situation);
  return parts.join("、");
}

function getTopKeywords(keywords: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const kw of keywords) {
    const normalized = kw.toLowerCase().trim();
    if (normalized.length > 1) {
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([kw]) => kw);
}

// ============================================================
// AI コンセプト生成
// ============================================================

async function generateConceptsWithAI(
  data: PreparedData,
  options: {
    count: number;
    maxHeadlineLength: number;
    style?: string;
    includeEmoji?: boolean;
  }
): Promise<ConceptCandidate[]> {
  const styleGuide = getStyleGuide(options.style);

  const prompt = `あなたはたけるん式コンセプト作成メソッドの専門家です。
以下のリサーチデータを元に、売れるコンセプトを${options.count}個生成してください。

## たけるん式6ステップ
${Object.values(UCHIDA_6_STEPS).map((s, i) => `${i + 1}. ${s}`).join("\n")}

## ターゲット
${data.targetSummary}

## 優先度の高い悩み（深刻度×緊急性が高い）
${data.priorityPains.map((p) => `- ${p.summary} (深刻度:${p.depth}, 緊急性:${p.urgency})`).join("\n")}

## 収集キーワード（競合・書籍・動画から）
${data.topKeywords.join("、")}

## 競合コンセプト（参考）
${data.competitorConcepts.map((c) => `- ${c}`).join("\n")}

## 競合の強み（差別化ポイントとして避ける or 上回る）
${data.competitorStrengths.join("、")}

## 生成ルール
1. ヘッドラインは${options.maxHeadlineLength}文字以内（短く印象的に）
2. ターゲットの悩みに直接刺さる表現
3. 具体的な数字や期間を含める（例: 3日で、90%が）
4. 競合と差別化されたユニークな切り口
5. 感情に訴える心理トリガーを使用
${options.includeEmoji ? "6. 絵文字を適度に使用OK" : "6. 絵文字は使用しない"}

## スタイル指示
${styleGuide}

## 出力形式（JSON）
\`\`\`json
{
  "concepts": [
    {
      "headline": "キャッチコピー（${options.maxHeadlineLength}文字以内）",
      "headlineLong": "長いバージョン（40文字程度）",
      "targetPain": "訴求する悩み",
      "benefit": "得られるベネフィット",
      "benefitConcrete": "具体的な変化（数字含む）",
      "usedKeywords": ["使用したキーワード"],
      "referenceCompetitor": "参考にした競合（あれば）",
      "psychologyTriggers": ["使用した心理トリガー"],
      "suggestedSections": ["推奨するLPセクション構成"],
      "rationale": "このコンセプトを提案した理由"
    }
  ]
}
\`\`\``;

  try {
    const response = await generateText(prompt, {
      model: "pro25",
      thinkingLevel: "high",
    });

    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[1]);
    return (parsed.concepts || []).map(
      (c: Partial<ConceptCandidate>, i: number) => ({
        id: `concept_${Date.now()}_${i}`,
        headline: c.headline || "",
        headlineLong: c.headlineLong,
        targetPain: c.targetPain || "",
        benefit: c.benefit || "",
        benefitConcrete: c.benefitConcrete || "",
        usedKeywords: c.usedKeywords || [],
        referenceCompetitor: c.referenceCompetitor,
        psychologyTriggers: c.psychologyTriggers || [],
        suggestedSections: c.suggestedSections || [],
        rationale: c.rationale || "",
        scores: {
          benefitClarity: 0,
          specificity: 0,
          impact: 0,
          uniqueness: 0,
          overall: 0,
        },
      })
    );
  } catch (error) {
    console.error("[concept-generator] AI error:", error);
    return [];
  }
}

function getStyleGuide(style?: string): string {
  const guides: Record<string, string> = {
    direct: "直接的でストレートな訴求。「〇〇できます」「〇〇を手に入れる」",
    story: "ストーリー形式。「私も〇〇で悩んでいました」「〇〇が変わった瞬間」",
    question: "疑問形で興味を引く。「なぜ〇〇なのか？」「〇〇していませんか？」",
    provocative: "挑発的・常識を覆す。「〇〇は間違いだった」「〇〇するな」",
  };
  return guides[style || "direct"] || guides.direct;
}

// ============================================================
// スコアリング
// ============================================================

function scoreConcepts(
  concepts: ConceptCandidate[],
  data: PreparedData
): ConceptCandidate[] {
  return concepts.map((concept) => {
    const scores = calculateScores(concept, data);
    return { ...concept, scores };
  }).sort((a, b) => b.scores.overall - a.scores.overall);
}

function calculateScores(
  concept: ConceptCandidate,
  data: PreparedData
): ConceptCandidate["scores"] {
  let benefitClarity = 50;
  let specificity = 50;
  let impact = 50;
  let uniqueness = 50;

  // ベネフィット明確度
  if (concept.benefit && concept.benefit.length > 10) {
    benefitClarity += 20;
  }
  if (concept.benefitConcrete && /\d/.test(concept.benefitConcrete)) {
    benefitClarity += 15;
  }

  // 具体性
  if (/\d+/.test(concept.headline)) {
    specificity += 20;
  }
  if (concept.usedKeywords.length >= 2) {
    specificity += 15;
  }
  if (concept.benefitConcrete && concept.benefitConcrete.length > 20) {
    specificity += 10;
  }

  // インパクト
  const impactWords = ["たった", "だけ", "秘密", "真実", "驚き", "革命", "最強", "究極"];
  if (impactWords.some((w) => concept.headline.includes(w))) {
    impact += 20;
  }
  if (concept.headline.length <= 21) {
    impact += 15; // 短い = インパクト
  }
  if (concept.psychologyTriggers.length >= 2) {
    impact += 10;
  }

  // ユニークネス（競合との差別化）
  const isUnique = !data.competitorConcepts.some(
    (cc) => concept.headline.includes(cc.slice(0, 5))
  );
  if (isUnique) {
    uniqueness += 25;
  }
  if (concept.rationale && concept.rationale.length > 30) {
    uniqueness += 10;
  }

  // 上限を100に
  benefitClarity = Math.min(100, benefitClarity);
  specificity = Math.min(100, specificity);
  impact = Math.min(100, impact);
  uniqueness = Math.min(100, uniqueness);

  const overall = Math.round(
    (benefitClarity + specificity + impact + uniqueness) / 4
  );

  return { benefitClarity, specificity, impact, uniqueness, overall };
}

// ============================================================
// インサイト生成
// ============================================================

function generateInsights(
  data: PreparedData,
  concepts: ConceptCandidate[]
): ConceptGenerationResult["insights"] {
  // ターゲットプロファイル
  const targetProfile = `${data.targetSummary}。優先度の高い悩みは「${data.priorityPains[0]?.summary || "不明"}」。`;

  // 悩み優先度分析
  const priorityCount = data.priorityPains.filter(
    (p) => p.quadrant === "priority"
  ).length;
  const painPriorityAnalysis = priorityCount > 0
    ? `最優先層（高深刻度×高緊急性）の悩みが${priorityCount}件検出。即効性訴求が有効。`
    : "緊急性の高い悩みが少ない。教育コンテンツで温度感を上げる戦略を推奨。";

  // 競合ギャップ分析
  const competitorGap = data.competitorConcepts.length > 0
    ? `競合は「${data.competitorConcepts[0]}」系の訴求が多い。差別化には異なる切り口が必要。`
    : "競合コンセプトが取得できなかったため、独自路線での訴求を推奨。";

  // 推奨アングル
  const bestConcept = concepts[0];
  const recommendedAngle = bestConcept
    ? `「${bestConcept.headline}」をベースに、${bestConcept.psychologyTriggers.join("と")}を活用した訴求が有効。`
    : "収集データに基づいたコンセプト生成を再試行してください。";

  return {
    targetProfile,
    painPriorityAnalysis,
    competitorGap,
    recommendedAngle,
  };
}

// ============================================================
// キーワード提案
// ============================================================

function generateKeywordSuggestions(
  data: PreparedData,
  concepts: ConceptCandidate[]
): ConceptGenerationResult["keywordSuggestions"] {
  // 使用されたキーワードを集計
  const usedKeywords = concepts.flatMap((c) => c.usedKeywords);
  const usedCounts = new Map<string, number>();
  for (const kw of usedKeywords) {
    usedCounts.set(kw, (usedCounts.get(kw) || 0) + 1);
  }

  // プライマリ = 複数コンセプトで使用されたキーワード
  const primary = Array.from(usedCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([kw]) => kw);

  // セカンダリ = トップキーワードで未使用のもの
  const secondary = data.topKeywords
    .filter((kw) => !usedKeywords.includes(kw))
    .slice(0, 10);

  // 避けるべきキーワード = 競合が多用しているもの
  const avoid = data.competitorStrengths.slice(0, 5);

  return { primary, secondary, avoid };
}

// ============================================================
// エクスポート用ヘルパー
// ============================================================

/**
 * コンセプト結果をCSV形式でエクスポート
 */
export function exportToCSV(result: ConceptGenerationResult): string {
  const headers = [
    "ヘッドライン",
    "ヘッドライン（長）",
    "ターゲットの悩み",
    "ベネフィット",
    "具体的ベネフィット",
    "総合スコア",
    "使用キーワード",
    "心理トリガー",
    "理由",
  ];

  const rows = result.concepts.map((c) => [
    `"${c.headline.replace(/"/g, '""')}"`,
    `"${(c.headlineLong || "").replace(/"/g, '""')}"`,
    `"${c.targetPain.replace(/"/g, '""')}"`,
    `"${c.benefit.replace(/"/g, '""')}"`,
    `"${c.benefitConcrete.replace(/"/g, '""')}"`,
    c.scores.overall.toString(),
    `"${c.usedKeywords.join("; ")}"`,
    `"${c.psychologyTriggers.join("; ")}"`,
    `"${c.rationale.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * コンセプトをスプレッドシート形式でエクスポート
 */
export function exportToSpreadsheetData(
  result: ConceptGenerationResult
): (string | number)[][] {
  const headers = [
    "ヘッドライン",
    "ヘッドライン（長）",
    "ターゲットの悩み",
    "ベネフィット",
    "具体的ベネフィット",
    "明確度",
    "具体性",
    "インパクト",
    "独自性",
    "総合",
    "使用キーワード",
    "心理トリガー",
    "提案理由",
  ];

  const rows = result.concepts.map((c) => [
    c.headline,
    c.headlineLong || "",
    c.targetPain,
    c.benefit,
    c.benefitConcrete,
    c.scores.benefitClarity,
    c.scores.specificity,
    c.scores.impact,
    c.scores.uniqueness,
    c.scores.overall,
    c.usedKeywords.join("; "),
    c.psychologyTriggers.join("; "),
    c.rationale,
  ]);

  return [headers, ...rows];
}

/**
 * コンセプトの品質チェック
 */
export function validateConcept(concept: ConceptCandidate): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!concept.headline || concept.headline.length === 0) {
    issues.push("ヘッドラインが空です");
  }
  if (concept.headline.length > 30) {
    issues.push("ヘッドラインが長すぎます（30文字以内推奨）");
  }
  if (!concept.targetPain) {
    issues.push("ターゲットの悩みが未設定です");
  }
  if (!concept.benefit) {
    issues.push("ベネフィットが未設定です");
  }
  if (concept.scores.overall < 50) {
    issues.push("総合スコアが低いです（50以上推奨）");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
