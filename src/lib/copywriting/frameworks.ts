/**
 * Copywriting Frameworks
 * ファン化哲学ベースの診断フレームワーク
 */

// =============================================================================
// Types
// =============================================================================

export interface DiagnosisCategory {
  id: string;
  name: string;
  description: string;
  lessons: string[];   // 関連するレッスン番号
  checkpoints: Checkpoint[];
  maxScore: number;
}

export interface Checkpoint {
  id: string;
  question: string;
  weight: number;      // 1-5の重要度
  keywords?: string[]; // 検出キーワード
  lessonRef?: string;  // 参照レッスン
}

export interface DiagnosisResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: "S" | "A" | "B" | "C" | "D";
  categories: CategoryResult[];
  improvements: Improvement[];
  strengths: string[];
}

export interface CategoryResult {
  categoryId: string;
  categoryName: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: CheckpointResult[];
}

export interface CheckpointResult {
  checkpointId: string;
  question: string;
  score: number;
  maxScore: number;
  found: boolean;
  evidence?: string;
  suggestion?: string;
}

export interface Improvement {
  priority: "high" | "medium" | "low";
  category: string;
  issue: string;
  suggestion: string;
  lessonRef?: string;
}

// =============================================================================
// Diagnosis Categories
// =============================================================================

export const DIAGNOSIS_CATEGORIES: DiagnosisCategory[] = [
  {
    id: "persuasion",
    name: "説得力",
    description: "人を動かす説得技術が使われているか",
    lessons: ["1", "2", "3", "4", "5"],
    maxScore: 25,
    checkpoints: [
      {
        id: "belief_transfer",
        question: "信念の移転プロセスが設計されているか",
        weight: 5,
        keywords: ["だから", "なぜなら", "理由", "証拠", "実績"],
        lessonRef: "1",
      },
      {
        id: "emotional_trigger",
        question: "感情的トリガーが含まれているか",
        weight: 5,
        keywords: ["悩み", "不安", "希望", "夢", "変化", "未来"],
        lessonRef: "2",
      },
      {
        id: "simplicity",
        question: "顧客に考えさせない明快さがあるか",
        weight: 4,
        keywords: ["シンプル", "簡単", "たった", "だけ", "すぐに"],
        lessonRef: "3",
      },
      {
        id: "resistance_bypass",
        question: "心理抵抗を回避する工夫があるか",
        weight: 4,
        keywords: ["でも", "しかし", "もし", "仮に", "リスク", "保証"],
        lessonRef: "4",
      },
      {
        id: "psychological_techniques",
        question: "心理操作技術が効果的に使われているか",
        weight: 3,
        keywords: ["限定", "残り", "今だけ", "特別", "あなただけ"],
        lessonRef: "5",
      },
    ],
  },
  {
    id: "story",
    name: "ストーリー",
    description: "救世主の物語、ヒーローズジャーニーが活用されているか",
    lessons: ["6", "14", "21"],
    maxScore: 25,
    checkpoints: [
      {
        id: "hero_journey",
        question: "ヒーローズジャーニーの構造があるか",
        weight: 5,
        keywords: ["私は", "当時", "きっかけ", "そして", "今では"],
        lessonRef: "21",
      },
      {
        id: "savior_story",
        question: "救世主としての物語が描かれているか",
        weight: 5,
        keywords: ["発見", "開発", "たどり着いた", "使命", "あなたのため"],
        lessonRef: "6",
      },
      {
        id: "transformation",
        question: "変化・変容のストーリーがあるか",
        weight: 5,
        keywords: ["before", "after", "以前は", "今は", "変わった", "実現"],
        lessonRef: "14",
      },
      {
        id: "concrete_story",
        question: "具体的なエピソードが含まれているか",
        weight: 4,
        keywords: ["ある日", "実際に", "例えば", "具体的に"],
        lessonRef: "14",
      },
      {
        id: "emotional_arc",
        question: "感情の起伏があるか",
        weight: 3,
        keywords: ["苦労", "挫折", "諦め", "希望", "感動", "涙"],
        lessonRef: "6",
      },
    ],
  },
  {
    id: "movement",
    name: "ムーブメント",
    description: "共通の敵、ビジョン、マニフェストが明確か",
    lessons: ["7", "9", "10", "11", "12", "13"],
    maxScore: 25,
    checkpoints: [
      {
        id: "common_enemy",
        question: "共通の敵が明確に設定されているか",
        weight: 5,
        keywords: ["業界", "従来", "古い", "間違った", "搾取", "常識"],
        lessonRef: "12",
      },
      {
        id: "vision",
        question: "ビジョンが明確に描かれているか",
        weight: 5,
        keywords: ["目指す", "実現", "世界", "未来", "理想", "ゴール"],
        lessonRef: "9",
      },
      {
        id: "manifesto",
        question: "マニフェスト（信条）が伝わるか",
        weight: 4,
        keywords: ["信じる", "価値観", "哲学", "ポリシー", "約束"],
        lessonRef: "11",
      },
      {
        id: "slogan",
        question: "記憶に残るスローガンがあるか",
        weight: 4,
        keywords: [], // 短いキャッチーなフレーズを検出
        lessonRef: "13",
      },
      {
        id: "identity",
        question: "所属意識・アイデンティティを喚起するか",
        weight: 3,
        keywords: ["仲間", "一緒に", "私たち", "コミュニティ", "メンバー"],
        lessonRef: "10",
      },
    ],
  },
  {
    id: "technique",
    name: "心理テクニック",
    description: "高度な心理テクニックが適切に使われているか",
    lessons: ["15", "16", "17", "18", "19", "20"],
    maxScore: 25,
    checkpoints: [
      {
        id: "future_prediction",
        question: "未来予測型のコピーがあるか",
        weight: 4,
        keywords: ["これから", "将来", "時代", "トレンド", "予測"],
        lessonRef: "16",
      },
      {
        id: "origin_return",
        question: "原点回帰型のアプローチがあるか",
        weight: 4,
        keywords: ["本来", "本質", "原点", "シンプル", "基本"],
        lessonRef: "17",
      },
      {
        id: "industry_darkness",
        question: "業界の闘い暴露型があるか",
        weight: 4,
        keywords: ["実は", "知らない", "隠された", "真実", "裏側"],
        lessonRef: "18",
      },
      {
        id: "mystery",
        question: "ミステリー型の引きがあるか",
        weight: 4,
        keywords: ["秘密", "なぜ", "理由", "答え", "明かす"],
        lessonRef: "19",
      },
      {
        id: "evangelist",
        question: "伝道者型の熱量があるか",
        weight: 3,
        keywords: ["伝えたい", "広めたい", "知ってほしい", "使命"],
        lessonRef: "20",
      },
    ],
  },
];

// =============================================================================
// Grading
// =============================================================================

export function calculateGrade(percentage: number): "S" | "A" | "B" | "C" | "D" {
  if (percentage >= 90) return "S";
  if (percentage >= 75) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 40) return "C";
  return "D";
}

export const GRADE_DESCRIPTIONS: Record<"S" | "A" | "B" | "C" | "D", string> = {
  S: "素晴らしい！プロレベルのコピーです。このまま公開できます。",
  A: "良いコピーです。微調整でさらに効果的になります。",
  B: "改善の余地があります。提案を参考にブラッシュアップしてください。",
  C: "基本的な要素が不足しています。大幅な改善が必要です。",
  D: "根本的な見直しが必要です。フレームワークを参考に再構築してください。",
};

// =============================================================================
// Improvement Priorities
// =============================================================================

export function prioritizeImprovements(
  categoryResults: CategoryResult[]
): Improvement[] {
  const improvements: Improvement[] = [];

  for (const cat of categoryResults) {
    for (const checkpoint of cat.details) {
      if (!checkpoint.found || checkpoint.score < checkpoint.maxScore * 0.6) {
        const priority = getPriority(checkpoint.maxScore, cat.percentage);
        improvements.push({
          priority,
          category: cat.categoryName,
          issue: checkpoint.question,
          suggestion: checkpoint.suggestion || generateSuggestion(checkpoint),
          lessonRef: getCheckpointById(checkpoint.checkpointId)?.lessonRef,
        });
      }
    }
  }

  // 優先度でソート
  return improvements.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getPriority(
  maxScore: number,
  categoryPercentage: number
): "high" | "medium" | "low" {
  if (maxScore >= 5 && categoryPercentage < 50) return "high";
  if (maxScore >= 4 || categoryPercentage < 70) return "medium";
  return "low";
}

function getCheckpointById(id: string): Checkpoint | undefined {
  for (const cat of DIAGNOSIS_CATEGORIES) {
    const found = cat.checkpoints.find((c) => c.id === id);
    if (found) return found;
  }
  return undefined;
}

function generateSuggestion(checkpoint: CheckpointResult): string {
  const suggestions: Record<string, string> = {
    belief_transfer: "「なぜこの商品が効果的なのか」の理由と証拠を追加してください",
    emotional_trigger: "読者の感情に訴える言葉（悩み、希望、夢）を追加してください",
    simplicity: "「たった〇〇するだけ」のようなシンプルな表現を使ってください",
    resistance_bypass: "返金保証やリスクフリーの提案を追加してください",
    psychological_techniques: "限定性や緊急性を示す表現を追加してください",
    hero_journey: "あなた自身の変化のストーリーを追加してください",
    savior_story: "この商品/サービスを提供する使命・きっかけを語ってください",
    transformation: "Before/Afterの具体的な変化を描写してください",
    concrete_story: "具体的なエピソードや事例を追加してください",
    emotional_arc: "困難を乗り越えた感動的なストーリーを追加してください",
    common_enemy: "業界の問題点や従来の方法の欠点を指摘してください",
    vision: "このビジネスが目指す理想の未来を描いてください",
    manifesto: "あなたの信条や価値観を明確に伝えてください",
    slogan: "記憶に残る短いキャッチフレーズを作成してください",
    identity: "読者が「仲間」だと感じる言葉を使ってください",
    future_prediction: "市場のトレンドや未来の変化について言及してください",
    origin_return: "本質的な価値や原点を強調してください",
    industry_darkness: "業界の裏側や知られていない事実を共有してください",
    mystery: "読者の興味を引く「秘密」や「謎」を提示してください",
    evangelist: "この商品を広めたい熱意を伝えてください",
  };

  return suggestions[checkpoint.checkpointId] || "この要素を強化してください";
}
