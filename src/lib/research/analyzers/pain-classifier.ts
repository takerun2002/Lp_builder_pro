/**
 * 悩み分類アナライザー
 *
 * 収集した悩みを深さ×緊急性でスコアリング・分類
 * Task 2.2: 悩み分類（深さ×緊急性マトリックス）
 */

import { generateText } from "@/lib/ai/gemini";

// ============================================================
// 型定義
// ============================================================

export type DepthScore = 1 | 2 | 3 | 4 | 5;
export type UrgencyScore = 1 | 2 | 3 | 4 | 5;

export type PainQuadrant =
  | "priority"   // 高深刻度 × 高緊急性 → 最優先ターゲット
  | "important"  // 高深刻度 × 低緊急性 → 教育して緊急性を高める
  | "consider"   // 低深刻度 × 高緊急性 → 即効性訴求で取れる
  | "ignore";    // 低深刻度 × 低緊急性 → ターゲット外

export interface ClassifiedPainPoint {
  original: string;
  summary: string;
  depth: DepthScore;
  urgency: UrgencyScore;
  quadrant: PainQuadrant;
  keywords: string[];
  emotionalIntensity: "low" | "medium" | "high";
  willingness_to_pay: "low" | "medium" | "high";
  frequency: number;
  source?: string;
}

export interface PainClassificationResult {
  painPoints: ClassifiedPainPoint[];
  quadrantSummary: {
    priority: ClassifiedPainPoint[];
    important: ClassifiedPainPoint[];
    consider: ClassifiedPainPoint[];
    ignore: ClassifiedPainPoint[];
  };
  insights: {
    topPains: string[];
    commonKeywords: string[];
    recommendedAngle: string;
    targetingAdvice: string;
  };
}

export interface PainClassificationOptions {
  genre?: string;
  targetGender?: string;
  priceRange?: "low" | "mid" | "high";
  batchSize?: number;
}

// ============================================================
// 深刻度キーワード辞書
// ============================================================

const SEVERITY_KEYWORDS = {
  high: [
    "死にたい", "助けて", "限界", "もう無理", "つらい", "苦しい",
    "眠れない", "食べられない", "泣いてしまう", "絶望",
    "どうしたらいい", "誰か", "お願い", "本当に困って",
  ],
  medium: [
    "悩んでいる", "困っている", "わからない", "不安", "心配",
    "ストレス", "疲れた", "イライラ", "うまくいかない",
    "どうすれば", "教えて", "アドバイス",
  ],
  low: [
    "気になる", "知りたい", "興味", "おすすめ", "比較",
    "どっちがいい", "違いは", "メリット",
  ],
};

const URGENCY_KEYWORDS = {
  high: [
    "今すぐ", "急ぎ", "緊急", "明日", "今日中", "至急",
    "締め切り", "間に合わない", "すぐに", "早く",
  ],
  medium: [
    "そろそろ", "近いうち", "来月", "今年中", "できれば早めに",
  ],
  low: [
    "いつか", "将来", "余裕があれば", "時間がある時",
  ],
};

// ============================================================
// メイン関数
// ============================================================

/**
 * 悩みを分類
 */
export async function classifyPainPoints(
  painPoints: string[],
  options?: PainClassificationOptions
): Promise<PainClassificationResult> {
  const batchSize = options?.batchSize || 10;
  const allClassified: ClassifiedPainPoint[] = [];

  // バッチ処理
  for (let i = 0; i < painPoints.length; i += batchSize) {
    const batch = painPoints.slice(i, i + batchSize);
    const classified = await classifyBatch(batch, options);
    allClassified.push(...classified);

    // レート制限対策
    if (i + batchSize < painPoints.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 四象限に分類
  const quadrantSummary = categorizeByQuadrant(allClassified);

  // インサイト生成
  const insights = generateInsights(allClassified, quadrantSummary);

  return {
    painPoints: allClassified,
    quadrantSummary,
    insights,
  };
}

/**
 * 単一の悩みを分類（軽量版）
 */
export function classifyPainPointSimple(text: string): {
  depth: DepthScore;
  urgency: UrgencyScore;
  quadrant: PainQuadrant;
} {
  const depth = estimateDepth(text);
  const urgency = estimateUrgency(text);
  const quadrant = determineQuadrant(depth, urgency);

  return { depth, urgency, quadrant };
}

/**
 * 悩みの頻度をカウント（類似悩みをグループ化）
 */
export async function groupSimilarPains(
  painPoints: string[]
): Promise<Array<{ representative: string; count: number; variants: string[] }>> {
  if (painPoints.length === 0) return [];

  const prompt = `以下の悩みテキストを意味が似ているものでグループ化してください。
各グループの代表的な表現と、そのバリエーション、件数を出力してください。

## 悩みリスト
${painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 出力形式（JSON）
\`\`\`json
{
  "groups": [
    {
      "representative": "代表的な悩み表現",
      "count": グループ内の件数,
      "variants": ["バリエーション1", "バリエーション2"]
    }
  ]
}
\`\`\``;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed.groups || [];
    }
  } catch (error) {
    console.error("[pain-classifier] Grouping error:", error);
  }

  // フォールバック：グループ化なしで返す
  return painPoints.map((p) => ({
    representative: p,
    count: 1,
    variants: [],
  }));
}

// ============================================================
// バッチ分類
// ============================================================

async function classifyBatch(
  painPoints: string[],
  options?: PainClassificationOptions
): Promise<ClassifiedPainPoint[]> {
  const prompt = buildClassificationPrompt(painPoints, options);

  try {
    const response = await generateText(prompt, {
      model: "flash",
    });

    return parseClassificationResponse(response, painPoints);
  } catch (error) {
    console.error("[pain-classifier] Batch error:", error);
    // フォールバック：簡易分類
    return painPoints.map((p) => classifyWithKeywords(p));
  }
}

function buildClassificationPrompt(
  painPoints: string[],
  options?: PainClassificationOptions
): string {
  const genreContext = options?.genre ? `ジャンル: ${options.genre}` : "";
  const genderContext = options?.targetGender
    ? `ターゲット性別: ${options.targetGender}`
    : "";

  return `あなたは消費者心理の専門家です。
以下の悩みテキストを分析し、深刻度と緊急性をスコアリングしてください。

## 悩みリスト
${painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## コンテキスト
${genreContext}
${genderContext}

## スコアリング基準

### 深刻度（depth: 1-5）
- 5: お金をかけてでも今すぐ解決したい重大な問題
- 4: 日常生活に支障をきたしている深刻な悩み
- 3: 気になっているが我慢できなくはない
- 2: あったらいいな程度の願望
- 1: 軽い興味・情報収集レベル

### 緊急性（urgency: 1-5）
- 5: 今すぐ、今日中に解決したい
- 4: 今週中に何とかしたい
- 3: 近いうちに解決したい
- 2: 時間があるときに対処したい
- 1: いつかは…程度

### 支払い意欲（willingness_to_pay）
- high: 高額でも払う
- medium: 妥当な価格なら払う
- low: 無料or格安でないと払わない

## 出力形式（JSON）
\`\`\`json
{
  "classifications": [
    {
      "index": 番号,
      "summary": "悩みの要約（1行）",
      "depth": 1-5,
      "urgency": 1-5,
      "keywords": ["キーワード1", "キーワード2"],
      "emotionalIntensity": "low|medium|high",
      "willingness_to_pay": "low|medium|high"
    }
  ]
}
\`\`\``;
}

function parseClassificationResponse(
  response: string,
  originalPainPoints: string[]
): ClassifiedPainPoint[] {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      return originalPainPoints.map((p) => classifyWithKeywords(p));
    }

    const parsed = JSON.parse(jsonMatch[1]);
    const classifications = parsed.classifications || [];

    return originalPainPoints.map((original, i) => {
      const cls = classifications.find(
        (c: { index: number }) => c.index === i + 1
      ) || {};

      const depth = validateScore(cls.depth, 3) as DepthScore;
      const urgency = validateScore(cls.urgency, 3) as UrgencyScore;

      return {
        original,
        summary: cls.summary || original.slice(0, 50),
        depth,
        urgency,
        quadrant: determineQuadrant(depth, urgency),
        keywords: cls.keywords || extractKeywordsSimple(original),
        emotionalIntensity: cls.emotionalIntensity || "medium",
        willingness_to_pay: cls.willingness_to_pay || "medium",
        frequency: 1,
      };
    });
  } catch (error) {
    console.error("[pain-classifier] Parse error:", error);
    return originalPainPoints.map((p) => classifyWithKeywords(p));
  }
}

// ============================================================
// キーワードベース分類（フォールバック）
// ============================================================

function classifyWithKeywords(text: string): ClassifiedPainPoint {
  const depth = estimateDepth(text);
  const urgency = estimateUrgency(text);

  return {
    original: text,
    summary: text.slice(0, 50),
    depth,
    urgency,
    quadrant: determineQuadrant(depth, urgency),
    keywords: extractKeywordsSimple(text),
    emotionalIntensity: depth >= 4 ? "high" : depth >= 2 ? "medium" : "low",
    willingness_to_pay: depth >= 4 ? "high" : depth >= 2 ? "medium" : "low",
    frequency: 1,
  };
}

function estimateDepth(text: string): DepthScore {
  const lowerText = text.toLowerCase();

  let score = 3; // デフォルト

  // 高深刻度キーワード
  for (const keyword of SEVERITY_KEYWORDS.high) {
    if (lowerText.includes(keyword)) {
      score = Math.max(score, 5);
      break;
    }
  }

  // 中深刻度キーワード
  if (score < 5) {
    for (const keyword of SEVERITY_KEYWORDS.medium) {
      if (lowerText.includes(keyword)) {
        score = Math.max(score, 3);
        break;
      }
    }
  }

  // 低深刻度キーワード
  let hasLowKeyword = false;
  for (const keyword of SEVERITY_KEYWORDS.low) {
    if (lowerText.includes(keyword)) {
      hasLowKeyword = true;
      break;
    }
  }
  if (hasLowKeyword && score === 3) {
    score = 2;
  }

  return score as DepthScore;
}

function estimateUrgency(text: string): UrgencyScore {
  const lowerText = text.toLowerCase();

  // 高緊急性キーワード
  for (const keyword of URGENCY_KEYWORDS.high) {
    if (lowerText.includes(keyword)) {
      return 5;
    }
  }

  // 中緊急性キーワード
  for (const keyword of URGENCY_KEYWORDS.medium) {
    if (lowerText.includes(keyword)) {
      return 3;
    }
  }

  // 低緊急性キーワード
  for (const keyword of URGENCY_KEYWORDS.low) {
    if (lowerText.includes(keyword)) {
      return 1;
    }
  }

  return 3; // デフォルト
}

function extractKeywordsSimple(text: string): string[] {
  // 簡易キーワード抽出
  const allKeywords = [
    ...SEVERITY_KEYWORDS.high,
    ...SEVERITY_KEYWORDS.medium,
    ...SEVERITY_KEYWORDS.low,
    ...URGENCY_KEYWORDS.high,
    ...URGENCY_KEYWORDS.medium,
  ];

  return allKeywords.filter((kw) => text.includes(kw)).slice(0, 5);
}

// ============================================================
// 四象限分類
// ============================================================

function determineQuadrant(depth: DepthScore, urgency: UrgencyScore): PainQuadrant {
  if (depth >= 4 && urgency >= 4) return "priority";
  if (depth >= 4 && urgency < 4) return "important";
  if (depth < 4 && urgency >= 4) return "consider";
  return "ignore";
}

function categorizeByQuadrant(
  painPoints: ClassifiedPainPoint[]
): PainClassificationResult["quadrantSummary"] {
  return {
    priority: painPoints.filter((p) => p.quadrant === "priority"),
    important: painPoints.filter((p) => p.quadrant === "important"),
    consider: painPoints.filter((p) => p.quadrant === "consider"),
    ignore: painPoints.filter((p) => p.quadrant === "ignore"),
  };
}

// ============================================================
// インサイト生成
// ============================================================

function generateInsights(
  painPoints: ClassifiedPainPoint[],
  quadrantSummary: PainClassificationResult["quadrantSummary"]
): PainClassificationResult["insights"] {
  // 上位の悩み（深刻度×緊急性でソート）
  const sorted = [...painPoints].sort(
    (a, b) => b.depth * b.urgency - a.depth * a.urgency
  );
  const topPains = sorted.slice(0, 5).map((p) => p.summary);

  // 共通キーワード
  const allKeywords = painPoints.flatMap((p) => p.keywords);
  const keywordCounts = new Map<string, number>();
  for (const kw of allKeywords) {
    keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
  }
  const commonKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw]) => kw);

  // 推奨アングル
  let recommendedAngle = "";
  if (quadrantSummary.priority.length > 0) {
    recommendedAngle = `「${quadrantSummary.priority[0].summary}」を即座に解決できる緊急性訴求`;
  } else if (quadrantSummary.important.length > 0) {
    recommendedAngle = `「${quadrantSummary.important[0].summary}」の深刻さを教育し、今解決すべき理由を提示`;
  } else if (quadrantSummary.consider.length > 0) {
    recommendedAngle = `「${quadrantSummary.consider[0].summary}」を素早く解決できる即効性訴求`;
  } else {
    recommendedAngle = "より深い悩みを持つターゲット層の再検討を推奨";
  }

  // ターゲティングアドバイス
  const priorityRatio = quadrantSummary.priority.length / painPoints.length;
  let targetingAdvice = "";
  if (priorityRatio > 0.3) {
    targetingAdvice = "優良見込み客が多い。高単価商品の訴求が有効。";
  } else if (priorityRatio > 0.1) {
    targetingAdvice = "一定数の熱い見込み客あり。教育コンテンツで温度感を上げる戦略が有効。";
  } else {
    targetingAdvice = "緊急性の低い層が多い。無料オファーでリスト獲得→ステップメールで教育の戦略を推奨。";
  }

  return {
    topPains,
    commonKeywords,
    recommendedAngle,
    targetingAdvice,
  };
}

// ============================================================
// ユーティリティ
// ============================================================

function validateScore(score: unknown, defaultValue: number): number {
  if (typeof score === "number" && score >= 1 && score <= 5) {
    return Math.round(score);
  }
  return defaultValue;
}

/**
 * 分類結果をCSV形式でエクスポート
 */
export function exportToCSV(result: PainClassificationResult): string {
  const headers = [
    "悩み（原文）",
    "要約",
    "深刻度",
    "緊急性",
    "象限",
    "キーワード",
    "感情強度",
    "支払意欲",
  ];

  const rows = result.painPoints.map((p) => [
    `"${p.original.replace(/"/g, '""')}"`,
    `"${p.summary.replace(/"/g, '""')}"`,
    p.depth.toString(),
    p.urgency.toString(),
    p.quadrant,
    `"${p.keywords.join("; ")}"`,
    p.emotionalIntensity,
    p.willingness_to_pay,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * 象限の説明を取得
 */
export function getQuadrantDescription(quadrant: PainQuadrant): {
  name: string;
  description: string;
  strategy: string;
} {
  const descriptions: Record<PainQuadrant, ReturnType<typeof getQuadrantDescription>> = {
    priority: {
      name: "最優先",
      description: "高深刻度 × 高緊急性：今すぐお金を払ってでも解決したい",
      strategy: "即効性と実績を訴求。高単価でも成約可能。",
    },
    important: {
      name: "重要",
      description: "高深刻度 × 低緊急性：深刻だが後回しにしがち",
      strategy: "放置した場合のリスクを教育し、緊急性を創出。",
    },
    consider: {
      name: "検討",
      description: "低深刻度 × 高緊急性：すぐ解決したいが軽い悩み",
      strategy: "低単価・即効性訴求。お試しオファーが有効。",
    },
    ignore: {
      name: "対象外",
      description: "低深刻度 × 低緊急性：優先度の低い見込み客",
      strategy: "基本的にターゲット外。無料コンテンツで教育検討。",
    },
  };

  return descriptions[quadrant];
}
