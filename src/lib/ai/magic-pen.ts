/**
 * Magic Pen - ナレッジ連携コピー生成
 *
 * ナレッジファイルを活用して高品質なコピーを生成
 * - キラーワード自動適用
 * - ライティング6テクニック適用
 * - 心理トリガー自動適用
 */

import { generateText, type GeminiTextModelPreset } from "./gemini";
import {
  loadKnowledge,
  getTriggersForSection,
  getTechniqueInstructions,
  getWritingChecklist,
  type PsychologicalTrigger,
} from "@/lib/knowledge/loader";

// ============================================
// 型定義
// ============================================

export type CopySectionType =
  | "headline"
  | "subheadline"
  | "hero"
  | "problem"
  | "solution"
  | "features"
  | "benefits"
  | "testimonials"
  | "pricing"
  | "offer"
  | "guarantee"
  | "faq"
  | "cta"
  | "story"
  | "ps";

export interface CopyGenerationRequest {
  sectionType: CopySectionType;
  context: {
    genre: string;
    subGenre?: string;
    targetAudience: string;
    problems: string;
    desires: string;
    productName?: string;
    productDescription?: string;
    toneManner?: string[];
    existingContent?: string;
  };
  options?: {
    applyKillerWords?: boolean;
    applyTechniques?: boolean;
    applyTriggers?: boolean;
    triggerIds?: string[];
    length?: "short" | "medium" | "long";
    variations?: number;
    model?: GeminiTextModelPreset;
  };
}

export interface CopyGenerationResult {
  primary: string;
  variations?: string[];
  appliedTriggers: PsychologicalTrigger[];
  appliedTechniques: string[];
  checklist: { item: string; applied: boolean }[];
}

// ============================================
// コピー生成
// ============================================

/**
 * セクション別コピー生成
 */
export async function generateCopy(
  request: CopyGenerationRequest
): Promise<CopyGenerationResult> {
  const { sectionType, context, options = {} } = request;
  const {
    applyKillerWords = true,
    applyTechniques = true,
    applyTriggers = true,
    triggerIds,
    length = "medium",
    variations = 0,
    model = "pro25",
  } = options;

  // ナレッジを読み込み
  const knowledge = loadKnowledge();

  // 適用する心理トリガーを決定
  let triggers: PsychologicalTrigger[] = [];
  if (applyTriggers) {
    if (triggerIds && triggerIds.length > 0) {
      triggers = knowledge.psychologicalTriggers.all.filter((t) =>
        triggerIds.includes(t.id)
      );
    } else {
      triggers = getTriggersForSection(sectionType);
    }
  }

  // プロンプト構築
  const prompt = buildCopyPrompt({
    sectionType,
    context,
    triggers,
    applyKillerWords,
    applyTechniques,
    length,
    variations,
  });

  // 生成
  const response = await generateText(prompt, { model });

  // レスポンスをパース
  const result = parseCopyResponse(response);

  // チェックリスト評価
  const checklist = evaluateChecklist(result.primary);

  return {
    ...result,
    appliedTriggers: triggers,
    appliedTechniques: applyTechniques
      ? Object.keys(knowledge.writingTechniques)
      : [],
    checklist,
  };
}

// ============================================
// プロンプト構築
// ============================================

interface PromptBuildOptions {
  sectionType: CopySectionType;
  context: CopyGenerationRequest["context"];
  triggers: PsychologicalTrigger[];
  applyKillerWords: boolean;
  applyTechniques: boolean;
  length: "short" | "medium" | "long";
  variations: number;
}

function buildCopyPrompt(opts: PromptBuildOptions): string {
  const {
    sectionType,
    context,
    triggers,
    applyKillerWords,
    applyTechniques,
    length,
    variations,
  } = opts;

  const sectionLabels: Record<CopySectionType, string> = {
    headline: "ヘッドコピー（メインキャッチ）",
    subheadline: "サブヘッドライン",
    hero: "ヒーローセクション",
    problem: "問題提起セクション",
    solution: "解決策セクション",
    features: "特徴・機能セクション",
    benefits: "ベネフィットセクション",
    testimonials: "お客様の声セクション",
    pricing: "価格セクション",
    offer: "オファーセクション",
    guarantee: "保証セクション",
    faq: "よくある質問セクション",
    cta: "CTAセクション",
    story: "ストーリーセクション",
    ps: "追伸（PS）",
  };

  const lengthGuide: Record<string, string> = {
    short: "50〜100文字程度",
    medium: "150〜300文字程度",
    long: "400〜600文字程度",
  };

  let prompt = `あなたはLP（ランディングページ）専門のコピーライターです。
以下の条件に基づいて、${sectionLabels[sectionType]}のコピーを生成してください。

## 案件情報
- ジャンル: ${context.genre}${context.subGenre ? ` / ${context.subGenre}` : ""}
- ターゲット: ${context.targetAudience}
- 悩み・課題: ${context.problems}
- 理想の状態: ${context.desires}
${context.productName ? `- 商品名: ${context.productName}` : ""}
${context.productDescription ? `- 商品説明: ${context.productDescription}` : ""}
${context.toneManner ? `- トンマナ: ${context.toneManner.join(", ")}` : ""}
${context.existingContent ? `\n## 既存コンテンツ（参考）\n${context.existingContent}` : ""}

## 生成要件
- セクション: ${sectionLabels[sectionType]}
- 長さ: ${lengthGuide[length]}
${variations > 0 ? `- バリエーション: ${variations}案` : ""}
`;

  // 心理トリガー指示
  if (triggers.length > 0) {
    prompt += `
## 適用する心理トリガー
${triggers.map((t) => `- ${t.name}（${t.id}）: ${t.description}\n  LP例: ${t.lp_usage}`).join("\n")}

上記のトリガーを自然に組み込んでください。
`;
  }

  // ライティングテクニック指示
  if (applyTechniques) {
    prompt += `
## ライティングテクニック（6大原則）
${getTechniqueInstructions()}

上記テクニックを適用してください。
`;
  }

  // キラーワード指示
  if (applyKillerWords) {
    prompt += `
## キラーワード活用指示
以下のようなパワーワードを効果的に使用してください：
- 「今すぐ」「限定」「無料」「驚き」「秘密」「特別」「保証」「実証」「簡単」「確実」
- 具体的な数字（96.7%、1,247人など）
- 感情を動かす表現
`;
  }

  // 出力形式
  prompt += `
## 出力形式
\`\`\`json
{
  "primary": "メインのコピー文",
  "variations": ["バリエーション1", "バリエーション2"]
}
\`\`\`

primary は${lengthGuide[length]}で生成してください。
${variations > 0 ? `variations は${variations}案生成してください。` : "variations は空配列で構いません。"}

## 注意点
- 押し付けがましくならないこと
- 自信を持った表現を使うこと
- 具体的な数字やエビデンスを含めること
- ターゲットの悩みに共感すること
`;

  return prompt;
}

// ============================================
// レスポンス処理
// ============================================

function parseCopyResponse(
  response: string
): { primary: string; variations: string[] } {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        primary: parsed.primary || "",
        variations: parsed.variations || [],
      };
    }

    // JSONがない場合はテキスト全体を使用
    return {
      primary: response.trim(),
      variations: [],
    };
  } catch (e) {
    console.error("[magic-pen] Failed to parse response:", e);
    return {
      primary: response.trim(),
      variations: [],
    };
  }
}

function evaluateChecklist(
  copy: string
): { item: string; applied: boolean }[] {
  const checklist = getWritingChecklist();

  return checklist.map((item) => {
    // 簡易的な評価ロジック
    let applied = false;

    if (item.includes("数字")) {
      applied = /\d+/.test(copy);
    } else if (item.includes("繰り返し")) {
      // 同じキーワードが2回以上出現
      const words = copy.split(/\s+/);
      const wordCounts = words.reduce(
        (acc, w) => {
          acc[w] = (acc[w] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      applied = Object.values(wordCounts).some((c) => c >= 2);
    } else if (item.includes("権威")) {
      applied = /教授|博士|専門家|認定|賞|メディア/.test(copy);
    } else {
      // デフォルトは適用済みとする
      applied = true;
    }

    return { item, applied };
  });
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * ヘッドライン専用生成
 */
export async function generateHeadline(
  context: CopyGenerationRequest["context"],
  options?: {
    count?: number;
    types?: ("benefit" | "curiosity" | "problem" | "social_proof")[];
  }
): Promise<string[]> {
  const { count = 5, types = ["benefit", "curiosity", "problem"] } =
    options || {};

  const typeLabels: Record<string, string> = {
    benefit: "ベネフィット訴求",
    curiosity: "好奇心喚起",
    problem: "問題提起",
    social_proof: "社会的証明",
  };

  const prompt = `あなたはLP専門のコピーライターです。
以下の条件でヘッドコピーを${count}案生成してください。

## 案件情報
- ジャンル: ${context.genre}
- ターゲット: ${context.targetAudience}
- 悩み: ${context.problems}
- 理想: ${context.desires}
${context.productName ? `- 商品名: ${context.productName}` : ""}

## 生成タイプ
${types.map((t) => `- ${typeLabels[t]}`).join("\n")}

## 出力形式
\`\`\`json
{
  "headlines": [
    {"text": "ヘッドライン1", "type": "benefit"},
    {"text": "ヘッドライン2", "type": "curiosity"}
  ]
}
\`\`\`

## 条件
- 21文字以内が理想（最大30文字）
- 具体的な数字を含める
- ターゲットの悩みに刺さる表現
- パワーワードを活用
`;

  const response = await generateText(prompt, { model: "pro25" });

  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return (parsed.headlines || []).map(
        (h: { text: string }) => h.text
      );
    }
  } catch (e) {
    console.error("[magic-pen] Failed to parse headlines:", e);
  }

  return [];
}

/**
 * CTA専用生成
 */
export async function generateCTA(
  context: CopyGenerationRequest["context"],
  options?: {
    urgency?: "low" | "medium" | "high";
    count?: number;
  }
): Promise<string[]> {
  const { urgency = "medium", count = 3 } = options || {};

  const urgencyGuide: Record<string, string> = {
    low: "穏やかな誘導（「詳しく見る」「無料で始める」）",
    medium: "適度な緊急性（「今すぐ始める」「特典を受け取る」）",
    high: "強い緊急性（「今だけの特典」「残りわずか」）",
  };

  const prompt = `あなたはLP専門のコピーライターです。
CTAボタンのテキストを${count}案生成してください。

## 案件情報
- ジャンル: ${context.genre}
- 商品: ${context.productName || context.productDescription || "サービス"}

## 緊急性レベル
${urgencyGuide[urgency]}

## 出力形式
\`\`\`json
{
  "ctas": ["CTA1", "CTA2", "CTA3"]
}
\`\`\`

## 条件
- 10文字以内
- 行動を促す動詞を使う
- ${urgency === "high" ? "希少性・緊急性を含める" : "押し付けがましくない"}
`;

  const response = await generateText(prompt, { model: "flash" });

  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed.ctas || [];
    }
  } catch (e) {
    console.error("[magic-pen] Failed to parse CTAs:", e);
  }

  return [];
}

/**
 * 利用可能な心理トリガー一覧を取得
 */
export function getAvailableTriggers(): PsychologicalTrigger[] {
  const knowledge = loadKnowledge();
  return knowledge.psychologicalTriggers.all;
}

/**
 * セクションタイプに推奨されるトリガーを取得
 */
export function getRecommendedTriggers(
  sectionType: CopySectionType
): PsychologicalTrigger[] {
  return getTriggersForSection(sectionType);
}
