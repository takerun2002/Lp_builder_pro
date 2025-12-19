/**
 * たけるん式コンセプトジェネレーター
 *
 * Task 4.1: 収集データを統合してコンセプトを生成
 * たけるん式6ステップに基づき、競合コンセプト + 収集キーワード → 新コンセプト
 *
 * 拡張機能:
 * - ストーリー7型の自動推薦
 * - ムーブメント7要素の統合
 */

import { generateText } from "@/lib/ai/gemini";
import type { CompetitorAnalysis } from "./analyzers/concept-extractor";
import type { ClassifiedPainPoint } from "./analyzers/pain-classifier";
import type { DeepResearchResult } from "./types";

// ============================================================
// ストーリー7型
// ============================================================

export type StoryType =
  | "hero_journey"       // ヒーローズジャーニー（王道）
  | "last_piece"         // 最後のピース（努力→結果出ない→これで解決）
  | "future_prediction"  // 未来予測（時代変化・危機感）
  | "origin_return"      // 原点回帰（本来の自然な姿に戻る）
  | "industry_darkness"  // 業界の闇暴露（不都合な真実）
  | "mystery_solving"    // 謎解き（原因不明の問題を解明）
  | "evangelist";        // 伝道師（権威者の弟子・代弁者）

export const STORY_TYPE_LABELS: Record<StoryType, string> = {
  hero_journey: "ヒーローズジャーニー",
  last_piece: "最後のピース",
  future_prediction: "未来予測型",
  origin_return: "原点回帰型",
  industry_darkness: "業界の闇暴露",
  mystery_solving: "謎解き型",
  evangelist: "伝道師型",
};

export const STORY_TYPE_DESCRIPTIONS: Record<StoryType, string> = {
  hero_journey: "困難を乗り越えて成功を掴むストーリー。最も汎用的で共感を得やすい",
  last_piece: "「色々試したけどダメだった人」に刺さる。最後の一押しを提供",
  future_prediction: "時代の変化や危機を予見。「今やらないと手遅れ」という緊急性を訴求",
  origin_return: "本来あるべき姿・自然な状態への回帰を提案。オーガニック系に有効",
  industry_darkness: "業界の闇や不都合な真実を暴露。共通の敵を作り連帯感を生む",
  mystery_solving: "「なぜうまくいかないのか」の謎を解明。論理的な読者に響く",
  evangelist: "権威ある師匠・監修者の教えを代弁。信頼性と権威性を借りる",
};

// ============================================================
// ムーブメント7要素
// ============================================================

export interface MovementElements {
  vision?: string;              // ビジョン（目指す世界観）
  manifesto?: string;           // マニフェスト（宣言・約束）
  commonEnemy?: string;         // 共通の敵
  slogan?: string;              // スローガン
  attractiveCharacter?: {       // アトラクティブキャラクター
    backstory?: string;         // バックストーリー
    parable?: string;           // 寓話・比喩
    flaw?: string;              // 欠点
    polarity?: string;          // 極性・立場
  };
  story?: string;               // ストーリー（自由記述）
  tribe?: string;               // 部族（コミュニティ名）
}

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

  // 拡張フィールド
  movement?: MovementElements;           // ムーブメント7要素
  storyType?: StoryType;                 // ユーザー指定のストーリー型
  recommendedStoryType?: StoryType;      // 自動推薦のストーリー型
  deepResearchResult?: DeepResearchResult; // Deep Researchの結果
  deepResearchInsights?: string;         // Deep Researchからの洞察（文字列形式）
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
  // 拡張フィールド
  recommendedStoryType?: StoryType;
  storyTypeLabel?: string;
  storyTypeDescription?: string;
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
// ストーリー7型自動推薦
// ============================================================

/**
 * ストーリー7型を自動推薦
 * 入力データ（悩み、キーワード、競合分析）から最適なストーリー型を判定
 */
export function recommendStoryType(input: ConceptGeneratorInput): StoryType {
  // ユーザー指定があればそれを優先
  if (input.storyType) {
    return input.storyType;
  }

  const painTexts = input.painPoints.map(p => p.summary.toLowerCase());
  const allKeywords = [
    ...input.keywords.amazon,
    ...input.keywords.youtube,
    ...input.keywords.infotop,
    ...(input.keywords.general || []),
  ].map(k => k.toLowerCase());

  // Deep Research結果からの情報
  const industryDarkness = input.deepResearchResult?.competitorAnalysis?.industryDarkness || [];
  const commonEnemyCandidates = input.deepResearchResult?.competitorAnalysis?.commonEnemyCandidates || [];

  // 1. 努力しているが結果が出ない → last_piece
  if (hasEffortNoResult(painTexts, allKeywords)) {
    return "last_piece";
  }

  // 2. 時代変化や危機感が強い → future_prediction
  if (hasFutureAnxiety(painTexts, allKeywords)) {
    return "future_prediction";
  }

  // 3. 原点回帰が刺さる → origin_return
  if (hasOriginReturnKeywords(painTexts, allKeywords)) {
    return "origin_return";
  }

  // 4. 業界不信・不正への怒り → industry_darkness
  if (hasIndustryDarkness(painTexts, industryDarkness, commonEnemyCandidates)) {
    return "industry_darkness";
  }

  // 5. 原因不明の混乱 → mystery_solving
  if (hasMysterySymptoms(painTexts, allKeywords)) {
    return "mystery_solving";
  }

  // 6. 権威者の弟子・代弁 → evangelist
  if (hasAuthorityMentor(input, allKeywords)) {
    return "evangelist";
  }

  // 7. デフォルト → hero_journey
  return "hero_journey";
}

// 判定ヘルパー関数群

function hasEffortNoResult(painTexts: string[], keywords: string[]): boolean {
  const effortWords = ["頑張っ", "努力", "試した", "やってみた", "続けて", "でもダメ", "結果が出ない", "効果なし"];
  const allTexts = [...painTexts, ...keywords].join(" ");
  return effortWords.some(word => allTexts.includes(word));
}

function hasFutureAnxiety(painTexts: string[], keywords: string[]): boolean {
  const futureWords = ["今後", "将来", "時代", "淘汰", "ai", "変化", "取り残", "遅れ", "手遅れ", "危機"];
  const allTexts = [...painTexts, ...keywords].join(" ");
  return futureWords.some(word => allTexts.includes(word));
}

function hasOriginReturnKeywords(painTexts: string[], keywords: string[]): boolean {
  const originWords = ["本来", "自然", "伝統", "オーガニック", "無添加", "原点", "シンプル", "昔ながら", "本質"];
  const allTexts = [...painTexts, ...keywords].join(" ");
  return originWords.some(word => allTexts.includes(word));
}

function hasIndustryDarkness(
  painTexts: string[],
  industryDarkness: string[],
  commonEnemyCandidates: string[]
): boolean {
  // Deep Researchで闇や共通の敵が見つかっている場合
  if (industryDarkness.length >= 2 || commonEnemyCandidates.length >= 2) {
    return true;
  }

  const darknessWords = ["嘘", "騙", "詐欺", "業界", "闘", "裏", "本当は", "真実", "秘密", "隠された"];
  const allTexts = painTexts.join(" ");
  return darknessWords.some(word => allTexts.includes(word));
}

function hasMysterySymptoms(painTexts: string[], keywords: string[]): boolean {
  const mysteryWords = ["なぜ", "原因不明", "わからない", "理由が", "どうして", "謎", "不思議"];
  const allTexts = [...painTexts, ...keywords].join(" ");
  return mysteryWords.some(word => allTexts.includes(word));
}

function hasAuthorityMentor(input: ConceptGeneratorInput, keywords: string[]): boolean {
  // 監修、師匠、権威者の存在をチェック
  const authorityWords = ["監修", "師匠", "先生", "教授", "専門家", "権威", "ドクター", "博士"];

  // ムーブメント要素でアトラクティブキャラクターが設定されている場合
  if (input.movement?.attractiveCharacter?.backstory) {
    return true;
  }

  const allTexts = keywords.join(" ");
  return authorityWords.some(word => allTexts.includes(word));
}

/**
 * ストーリー型に基づくプロンプト追加指示を生成
 */
function getStoryTypePromptAddition(storyType: StoryType): string {
  const additions: Record<StoryType, string> = {
    hero_journey: `
【ストーリー型: ヒーローズジャーニー】
- 困難 → 出会い → 変化 → 成功の流れを意識
- ターゲットが主人公として感情移入できる構成
- 「あなたも変われる」というメッセージ`,

    last_piece: `
【ストーリー型: 最後のピース】
- 「色々試したけどダメだった」共感から入る
- 「実はこれが足りなかった」という発見を提示
- 「これさえあれば」という期待感を演出`,

    future_prediction: `
【ストーリー型: 未来予測型】
- 時代の変化・業界の転換点を強調
- 「今やらないと手遅れ」の緊急性
- 先行者利益を示唆`,

    origin_return: `
【ストーリー型: 原点回帰型】
- 「本来あるべき姿」への回帰を提案
- 自然・シンプル・本質的な価値を強調
- 「実は〇〇は不要だった」という発見`,

    industry_darkness: `
【ストーリー型: 業界の闇暴露】
- 業界の不都合な真実を明かす
- 共通の敵を設定して連帯感を生む
- 「だからこそこの方法」という解決策提示`,

    mystery_solving: `
【ストーリー型: 謎解き型】
- 「なぜうまくいかないのか」の謎を提示
- 論理的な原因解明プロセス
- 「実は原因は〇〇だった」という発見`,

    evangelist: `
【ストーリー型: 伝道師型】
- 権威ある師匠・専門家の存在を前面に
- 「師匠から学んだ秘伝」という特別感
- 信頼性・専門性を借りた訴求`,
  };

  return additions[storyType] || additions.hero_journey;
}

/**
 * ムーブメント7要素をプロンプトに変換
 */
function getMovementPromptAddition(movement?: MovementElements): string {
  if (!movement) return "";

  const parts: string[] = [];

  if (movement.vision) {
    parts.push(`ビジョン: ${movement.vision}`);
  }
  if (movement.manifesto) {
    parts.push(`マニフェスト: ${movement.manifesto}`);
  }
  if (movement.commonEnemy) {
    parts.push(`共通の敵: ${movement.commonEnemy}`);
  }
  if (movement.slogan) {
    parts.push(`スローガン: ${movement.slogan}`);
  }
  if (movement.attractiveCharacter) {
    const ac = movement.attractiveCharacter;
    if (ac.backstory) parts.push(`バックストーリー: ${ac.backstory}`);
    if (ac.parable) parts.push(`寓話・比喩: ${ac.parable}`);
    if (ac.flaw) parts.push(`欠点: ${ac.flaw}`);
    if (ac.polarity) parts.push(`立場・極性: ${ac.polarity}`);
  }
  if (movement.story) {
    parts.push(`ストーリー: ${movement.story}`);
  }
  if (movement.tribe) {
    parts.push(`コミュニティ名: ${movement.tribe}`);
  }

  if (parts.length === 0) return "";

  return `
【ムーブメント7要素】
${parts.map(p => `- ${p}`).join("\n")}

※上記要素をコンセプトに反映させてください`;
}

/**
 * Deep Research結果をプロンプトセクションに変換
 */
function buildDeepResearchSection(result?: DeepResearchResult): string {
  if (!result) return "";

  const sections: string[] = [];

  // 信念移転（Belief Transfer）
  if (result.beliefTransfer) {
    const bt = result.beliefTransfer;
    if (bt.currentBeliefs.length > 0 || bt.desiredBeliefs.length > 0) {
      sections.push(`【信念移転】
- 現状の信念: ${bt.currentBeliefs.slice(0, 3).join("、") || "N/A"}
- 望ましい信念: ${bt.desiredBeliefs.slice(0, 3).join("、") || "N/A"}
- 橋渡しロジック: ${bt.bridgeLogic.slice(0, 2).join("、") || "N/A"}`);
    }
  }

  // 損失回避バイアス
  if (result.lossAversion) {
    const la = result.lossAversion;
    if (la.doNothingRisks.length > 0) {
      sections.push(`【損失回避バイアス】
- 行動しないリスク: ${la.doNothingRisks.slice(0, 3).join("、")}
- 機会損失: ${la.opportunityCosts.slice(0, 2).join("、") || "N/A"}`);
    }
  }

  // AIDAインサイト
  if (result.aidaInsights) {
    const aida = result.aidaInsights;
    sections.push(`【AIDAインサイト】
- 注意: ${aida.attention.slice(0, 2).join("、") || "N/A"}
- 興味: ${aida.interest.slice(0, 2).join("、") || "N/A"}
- 欲求: ${aida.desire.slice(0, 2).join("、") || "N/A"}
- 行動: ${aida.action.slice(0, 2).join("、") || "N/A"}`);
  }

  // 競合分析（業界の闇・共通の敵）
  if (result.competitorAnalysis) {
    const ca = result.competitorAnalysis;
    const parts: string[] = [];
    if (ca.industryDarkness.length > 0) {
      parts.push(`業界の闇: ${ca.industryDarkness.slice(0, 2).join("、")}`);
    }
    if (ca.commonEnemyCandidates.length > 0) {
      parts.push(`共通の敵候補: ${ca.commonEnemyCandidates.slice(0, 2).join("、")}`);
    }
    if (ca.headlinePatterns.length > 0) {
      parts.push(`ヘッドラインパターン: ${ca.headlinePatterns.slice(0, 2).join("、")}`);
    }
    if (parts.length > 0) {
      sections.push(`【競合LP分析】\n${parts.map(p => `- ${p}`).join("\n")}`);
    }
  }

  // N1ペルソナ
  if (result.persona) {
    const p = result.persona;
    sections.push(`【N1ペルソナ】
- ${p.name || "ターゲット"}（${p.age || "?"}歳、${p.occupation || "職業不明"}）
- 痛みの言葉: ${p.painQuotes.slice(0, 2).join("、") || "N/A"}
- 欲求の言葉: ${p.desireQuotes.slice(0, 2).join("、") || "N/A"}
- 購買トリガー: ${p.triggers.slice(0, 2).join("、") || "N/A"}`);
  }

  if (sections.length === 0) return "";

  return `
## Deep Research インサイト（Web調査結果）
${sections.join("\n\n")}

※上記インサイトを活用して、より説得力のあるコンセプトを生成してください`;
}

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

  // 2. AI でコンセプト生成（ストーリー型・ムーブメント・Deep Research統合）
  const concepts = await generateConceptsWithAI(
    preparedData,
    {
      count,
      maxHeadlineLength,
      style: options?.style,
      includeEmoji: options?.includeEmoji,
    },
    input  // 元の入力を渡してストーリー型・ムーブメント要素を活用
  );

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

  // 推薦されたストーリー型
  const recommendedStoryType = recommendStoryType(input);

  return {
    concepts: scoredConcepts,
    bestConcept,
    insights,
    keywordSuggestions,
    generatedAt: new Date().toISOString(),
    // ストーリー型情報
    recommendedStoryType,
    storyTypeLabel: STORY_TYPE_LABELS[recommendedStoryType],
    storyTypeDescription: STORY_TYPE_DESCRIPTIONS[recommendedStoryType],
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
  },
  input?: ConceptGeneratorInput
): Promise<ConceptCandidate[]> {
  const styleGuide = getStyleGuide(options.style);

  // ストーリー型の決定（入力から推薦 or ユーザー指定）
  const storyType = input ? recommendStoryType(input) : "hero_journey";
  const storyTypeAddition = getStoryTypePromptAddition(storyType);

  // ムーブメント7要素の取得
  const movementAddition = input ? getMovementPromptAddition(input.movement) : "";

  // Deep Research結果からの追加インサイト
  const deepResearchSection = buildDeepResearchSection(input?.deepResearchResult);

  const prompt = `あなたはたけるん式コンセプト作成メソッドの専門家です。
以下のリサーチデータを元に、売れるコンセプトを${options.count}個生成してください。

## たけるん式6ステップ
${Object.values(UCHIDA_6_STEPS).map((s, i) => `${i + 1}. ${s}`).join("\n")}

${storyTypeAddition}
${movementAddition}
${deepResearchSection}

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
6. 指定されたストーリー型（${STORY_TYPE_LABELS[storyType]}）の構成を意識
${options.includeEmoji ? "7. 絵文字を適度に使用OK" : "7. 絵文字は使用しない"}

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
