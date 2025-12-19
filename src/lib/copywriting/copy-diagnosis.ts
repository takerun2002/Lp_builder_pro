/**
 * コピー診断AIシステム
 * LPコピーを多角的に評価・改善提案
 *
 * hybridGenerate統合: ナレッジキャッシュを活用して診断精度向上
 */

import { hybridGenerate } from "@/lib/ai/hybrid-knowledge";

// ============================================
// 型定義
// ============================================

export interface CopyDiagnosisInput {
  text: string;
  type?: "headline" | "body" | "cta" | "full_lp";
  target?: string;
  product?: string;
  mode?: "quick" | "full";      // 診断モード
  projectId?: string;           // RAG用のプロジェクトID
}

export interface DiagnosisScore {
  category: string;
  score: number;
  maxScore: number;
  feedback: string;
  improvements: string[];
}

export interface DiagnosisResult {
  success: boolean;
  overallScore?: number;
  grade?: "S" | "A" | "B" | "C" | "D";
  summary?: string;
  scores?: DiagnosisScore[];
  strengths?: string[];
  weaknesses?: string[];
  rewriteSuggestions?: string[];
  error?: string;

  // RAG拡張による追加フィールド
  costSavings?: {
    estimatedSavingsPercent: number;
    explanation: string;
  };
  sources?: {
    cached: string[];
    retrieved: string[];
  };
  fallbackUsed?: boolean;  // JSONパース失敗時のフォールバック使用フラグ

  // 50点満点評価（各10点×5項目）
  qualityScore?: QualityScore;
  // ディテール強化チェックリスト
  detailEnhancement?: DetailEnhancementChecklist;
  // 改善提案
  improvementSuggestions?: ImprovementSuggestion[];
}

// ============================================
// 50点満点評価システム（5項目×10点）
// ============================================

export interface QualityScore {
  logic: number;           // 論理性（0-10）
  uniqueness: number;      // 独自性（0-10）
  readability: number;     // 読みやすさ（0-10）
  emotionalImpact: number; // 感情インパクト（0-10）
  goalAchievement: number; // 目的達成度（0-10）
  total: number;           // 合計（0-50）
  rank: "S" | "A" | "B" | "C" | "D";
}

export const QUALITY_RANK_THRESHOLDS = {
  S: 45,  // 45-50
  A: 40,  // 40-44
  B: 32,  // 32-39
  C: 25,  // 25-31
  D: 0,   // 0-24
} as const;

// ============================================
// ディテール強化チェックリスト
// ============================================

export interface DetailEnhancementChecklist {
  hasNumbers: boolean;           // 数字を含んでいる
  hasTargetClarity: boolean;     // ターゲットが明確
  hasBeliefBridge: boolean;      // 信念の橋渡しがある
  hasLossAversion: boolean;      // 損失回避訴求がある
  hasCommonEnemy: boolean;       // 共通の敵がある
  hasN1Language: boolean;        // N1言語（生の声）がある
  hasEvidence: boolean;          // 証拠・根拠がある
  hasCounterArgument: boolean;   // 反論処理がある
  hasClearCTA: boolean;          // 明確なCTAがある
  hasReducedAbstraction: boolean; // 抽象度が低い（具体的）
  passedCount: number;
  totalCount: number;
}

// ============================================
// 改善提案
// ============================================

export interface ImprovementSuggestion {
  checkItem: string;      // チェック項目名
  currentState: string;   // 現状
  suggestion: string;     // 改善案
  example: string;        // 例文
  priority: "high" | "medium" | "low";
}

// ============================================
// 評価カテゴリ
// ============================================

export const DIAGNOSIS_CATEGORIES = [
  {
    id: "clarity",
    name: "明確さ",
    description: "メッセージは明確で理解しやすいか",
    weight: 0.2,
  },
  {
    id: "emotional",
    name: "感情訴求",
    description: "感情に訴えかける要素があるか",
    weight: 0.2,
  },
  {
    id: "benefit",
    name: "ベネフィット",
    description: "顧客にとっての価値が明確か",
    weight: 0.2,
  },
  {
    id: "urgency",
    name: "緊急性",
    description: "今行動すべき理由があるか",
    weight: 0.15,
  },
  {
    id: "credibility",
    name: "信頼性",
    description: "信頼できる根拠や証拠があるか",
    weight: 0.15,
  },
  {
    id: "readability",
    name: "読みやすさ",
    description: "文章は読みやすく流れがあるか",
    weight: 0.1,
  },
] as const;

// ============================================
// メイン診断関数
// ============================================

export async function diagnoseCopy(
  input: CopyDiagnosisInput
): Promise<DiagnosisResult> {
  const { text, type = "full_lp", target, product, mode = "full", projectId } = input;

  // quickモードは既存のまま維持（RAGに触れない）
  if (mode === "quick") {
    const quickResult = quickCheck(text);
    const detailEnhancement = checkDetailEnhancement(text);
    const improvementSuggestions = generateImprovementSuggestions(detailEnhancement);

    return {
      success: true,
      summary: `${quickResult.passedCount}/6項目をクリア（ディテール: ${detailEnhancement.passedCount}/10）`,
      overallScore: Math.round((quickResult.passedCount / 6) * 100),
      grade: getGrade(Math.round((quickResult.passedCount / 6) * 100)),
      detailEnhancement,
      improvementSuggestions,
    };
  }

  try {
    const typeLabel = {
      headline: "ヘッドライン",
      body: "本文",
      cta: "CTA（行動喚起）",
      full_lp: "LP全体",
    }[type];

    const prompt = `あなたはLP（ランディングページ）のコピーライティング診断エキスパートです。
ナレッジキャッシュに含まれる「キラーワード集」「セールスライティング技法」「心理トリガー」を参考に、以下のコピーを多角的に評価し、詳細なフィードバックを提供してください。

## 診断対象
種別: ${typeLabel}
${target ? `ターゲット: ${target}` : ""}
${product ? `商品/サービス: ${product}` : ""}

## コピー内容
${text}

## 評価カテゴリ（各100点満点）
1. **明確さ (clarity)**: メッセージは明確で理解しやすいか
2. **感情訴求 (emotional)**: 感情に訴えかける要素があるか
3. **ベネフィット (benefit)**: 顧客にとっての価値が明確か
4. **緊急性 (urgency)**: 今行動すべき理由があるか
5. **信頼性 (credibility)**: 信頼できる根拠や証拠があるか
6. **読みやすさ (readability)**: 文章は読みやすく流れがあるか

## 出力形式（JSON）
{
  "scores": [
    {
      "category": "clarity",
      "score": 75,
      "feedback": "フィードバック文",
      "improvements": ["改善案1", "改善案2"]
    }
  ],
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["弱点1", "弱点2"],
  "summary": "全体的な診断サマリー（2-3文）",
  "rewriteSuggestions": ["改善版コピー案1", "改善版コピー案2"]
}

各カテゴリについて:
- score: 0-100の評価点
- feedback: なぜその点数なのか具体的な理由
- improvements: 改善するための具体的なアドバイス

JSONのみを出力してください。`;

    // RAG有効化条件
    const hasProject = Boolean(projectId);

    // maxDynamicTokens はタイプで調整
    const maxTokensByType: Record<string, number> = {
      headline: 1200,
      cta: 1200,
      body: 2400,
      full_lp: 2400,
    };

    // hybridGenerateを使用してナレッジキャッシュを活用
    const response = await hybridGenerate({
      prompt,
      projectId,
      useCache: true,  // CAGは常時維持
      // RAGはprojectIdがある場合のみ有効
      dynamicSources: hasProject ? ["project_data"] : undefined,
      includeN1: hasProject,           // N1 + hearing_response を取得
      includeCompetitors: hasProject,  // competitor_lp + research_result を取得
      maxDynamicTokens: maxTokensByType[type] || 1500,
    });

    const responseText = response.text || "";

    // JSONパース（フェイルセーフ付き）
    const parsed = parseDiagnosisJson(responseText, text);

    if (parsed.fallbackUsed) {
      // フォールバック使用時はそのまま返す
      return {
        ...parsed,
        costSavings: response.costSavings,
        sources: response.sources,
      };
    }

    // スコアを整形
    const scores: DiagnosisScore[] = (parsed.rawScores || []).map((s) => ({
      category: s.category,
      score: s.score,
      maxScore: 100,
      feedback: s.feedback,
      improvements: s.improvements,
    }));

    // 総合スコアを計算（重み付け平均）
    let overallScore = 0;
    for (const score of scores) {
      const category = DIAGNOSIS_CATEGORIES.find((c) => c.id === score.category);
      const weight = category?.weight || 0.15;
      overallScore += score.score * weight;
    }
    overallScore = Math.round(overallScore);

    // グレード判定
    const grade = getGrade(overallScore);

    // 基本結果を作成
    const baseResult: DiagnosisResult = {
      success: true,
      overallScore,
      grade,
      summary: parsed.summary,
      scores,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      rewriteSuggestions: parsed.rewriteSuggestions,
      costSavings: response.costSavings,
      sources: response.sources,
    };

    // 50点評価・チェックリスト・改善提案を付与
    return enhanceDiagnosisResult(baseResult, text);
  } catch (error) {
    console.error("[CopyDiagnosis] Error:", error);

    // エラー時もフォールバックを返す（500ではなく）
    const fallback = createFallbackResult(text);
    const fallbackResult: DiagnosisResult = {
      success: true,
      overallScore: fallback.overallScore,
      grade: fallback.grade,
      summary: fallback.summary,
      scores: fallback.rawScores?.map((s) => ({
        category: s.category,
        score: s.score,
        maxScore: 100,
        feedback: s.feedback,
        improvements: s.improvements,
      })),
      strengths: fallback.strengths,
      weaknesses: fallback.weaknesses,
      rewriteSuggestions: fallback.rewriteSuggestions,
      fallbackUsed: true,
      error: error instanceof Error ? error.message : "Diagnosis failed",
    };

    // 50点評価・チェックリスト・改善提案を付与
    return enhanceDiagnosisResult(fallbackResult, text);
  }
}

// ============================================
// ヘルパー関数
// ============================================

function getGrade(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

// ============================================
// JSONパース（フェイルセーフ付き）
// ============================================

interface ParsedDiagnosisJson {
  success: boolean;
  summary?: string;
  rawScores?: Array<{
    category: string;
    score: number;
    feedback: string;
    improvements: string[];
  }>;
  strengths?: string[];
  weaknesses?: string[];
  rewriteSuggestions?: string[];
  fallbackUsed?: boolean;
  overallScore?: number;
  grade?: "S" | "A" | "B" | "C" | "D";
}

function parseDiagnosisJson(text: string, originalText: string): ParsedDiagnosisJson {
  let jsonStr = text;

  // Step 1: マークダウンコードブロックを除去
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1];
  }

  // Step 2: JSON.parse を試行
  try {
    const parsed = JSON.parse(jsonStr.trim());
    return {
      success: true,
      summary: parsed.summary,
      rawScores: parsed.scores,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      rewriteSuggestions: parsed.rewriteSuggestions,
    };
  } catch (e) {
    // Step 3: 最初のJSON塊を抽出して再parse
    const jsonBlockMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[0]);
        return {
          success: true,
          summary: parsed.summary,
          rawScores: parsed.scores,
          strengths: parsed.strengths,
          weaknesses: parsed.weaknesses,
          rewriteSuggestions: parsed.rewriteSuggestions,
        };
      } catch (e2) {
        console.warn("[CopyDiagnosis] JSON re-parse failed:", e2);
      }
    }

    // Step 4: フォールバック
    console.error("[CopyDiagnosis] JSON parse failed, using fallback. Error:", e);
    return createFallbackResult(originalText);
  }
}

function createFallbackResult(originalText: string): ParsedDiagnosisJson {
  // quickCheckを使って簡易診断を生成
  const quickResult = quickCheck(originalText);
  const overallScore = Math.round((quickResult.passedCount / 6) * 100);

  return {
    success: true,
    summary: "簡易診断にフォールバックしました。詳細診断は再試行してください。",
    overallScore,
    grade: getGrade(overallScore),
    rawScores: DIAGNOSIS_CATEGORIES.map((cat) => ({
      category: cat.id,
      score: 50, // 中間値
      feedback: "詳細診断が利用できないため、簡易診断結果を表示しています。",
      improvements: quickResult.checks
        .filter((c) => !c.passed)
        .map((c) => c.tip),
    })),
    strengths: quickResult.checks.filter((c) => c.passed).map((c) => c.item),
    weaknesses: quickResult.checks.filter((c) => !c.passed).map((c) => c.item),
    rewriteSuggestions: [],
    fallbackUsed: true,
  };
}

/**
 * グレードの説明を取得
 */
export function getGradeDescription(grade: string): string {
  const descriptions: Record<string, string> = {
    S: "素晴らしい！プロレベルのコピーです",
    A: "良好です。細かい調整で更に良くなります",
    B: "平均的なコピーです。改善の余地があります",
    C: "改善が必要です。主要な要素を見直しましょう",
    D: "大幅な改善が必要です。基本から見直しましょう",
  };
  return descriptions[grade] || "";
}

/**
 * カテゴリ名を取得
 */
export function getCategoryName(categoryId: string): string {
  const category = DIAGNOSIS_CATEGORIES.find((c) => c.id === categoryId);
  return category?.name || categoryId;
}

/**
 * スコアの色を取得
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

/**
 * 簡易チェックリスト診断
 */
export function quickCheck(text: string): {
  checks: Array<{ item: string; passed: boolean; tip: string }>;
  passedCount: number;
} {
  const checks = [
    {
      item: "数字を含んでいる",
      test: /\d+/.test(text),
      tip: "具体的な数字を入れると説得力が増します",
    },
    {
      item: "ベネフィットを含んでいる",
      test: /できる|なれる|手に入る|実現/.test(text),
      tip: "顧客が得られる価値を明確に伝えましょう",
    },
    {
      item: "緊急性がある",
      test: /今|限定|残り|特別/.test(text),
      tip: "今行動すべき理由を追加しましょう",
    },
    {
      item: "問いかけがある",
      test: /\?|か\?|ですか|でしょうか/.test(text),
      tip: "問いかけで読者の注意を引きましょう",
    },
    {
      item: "感情的な言葉がある",
      test: /悩み|不安|夢|理想|辛い|嬉しい|感動/.test(text),
      tip: "感情に訴える言葉を追加しましょう",
    },
    {
      item: "適切な長さ",
      test: text.length >= 10 && text.length <= 500,
      tip: "ヘッドラインは15-40文字、本文は適度な長さに",
    },
  ];

  const results = checks.map((c) => ({
    item: c.item,
    passed: c.test,
    tip: c.tip,
  }));

  return {
    checks: results,
    passedCount: results.filter((r) => r.passed).length,
  };
}

// ============================================
// ディテール強化チェックリスト判定
// ============================================

/**
 * ディテール強化チェックリストを判定
 */
export function checkDetailEnhancement(text: string): DetailEnhancementChecklist {
  const checks = {
    // 数字を含んでいる
    hasNumbers: /\d+/.test(text),

    // ターゲットが明確（あなた、〇〇の方、〇〇でお悩みの方など）
    hasTargetClarity: /あなた|の方|にとって|向け|のための|でお悩み|に悩む/.test(text),

    // 信念の橋渡しがある（実は、本当は、多くの人が、一般的には〜しかし）
    hasBeliefBridge: /実は|本当は|多くの人が|一般的には|常識では|今まで|従来|しかし|ところが/.test(text),

    // 損失回避訴求がある
    hasLossAversion: /損|失う|手遅れ|後悔|逃す|なくなる|間に合わ|もったいない|リスク/.test(text),

    // 共通の敵がある
    hasCommonEnemy: /業界|詐欺|嘘|騙|間違い|誤解|搾取|悪徳|問題は|原因は/.test(text),

    // N1言語（生の声）がある
    hasN1Language: /「.*」|『.*』|という声|体験談|お客様の声|〜と言われ/.test(text),

    // 証拠・根拠がある
    hasEvidence: /実績|データ|研究|監修|満足度|保証|%|人中|件中|証明/.test(text),

    // 反論処理がある
    hasCounterArgument: /もしかすると|とはいえ|心配|不安|でも大丈夫|ご安心|よくある質問|Q\s*[：:]/.test(text),

    // 明確なCTAがある
    hasClearCTA: /今すぐ|申し込む|無料|体験|登録|お問い合わせ|ダウンロード|クリック|購入|注文/.test(text),

    // 抽象度が低い（具体的）- 数字、固有名詞、具体的な期間/金額を含む
    hasReducedAbstraction: /\d+[日週月年円%]|\d+万|\d+時間|[A-Z][a-z]+|具体的|詳しく|例えば/.test(text),
  };

  const passedCount = Object.values(checks).filter(Boolean).length;

  return {
    ...checks,
    passedCount,
    totalCount: 10,
  };
}

// ============================================
// 50点満点評価計算
// ============================================

/**
 * 50点満点の品質スコアを計算
 * 各項目0-10点×5項目＝50点満点
 */
export function calculateQualityScore(
  diagnosisScores: DiagnosisScore[],
  detailChecklist: DetailEnhancementChecklist
): QualityScore {
  // 診断スコアを5項目にマッピング
  const scoreMap = new Map<string, number>();
  for (const score of diagnosisScores) {
    scoreMap.set(score.category, score.score);
  }

  // 各項目を10点満点に変換
  // 論理性 = clarity + 構造チェック（ベリーフブリッジ、反論処理）
  const clarityBase = (scoreMap.get("clarity") || 50) / 10;
  const logicBonus = (detailChecklist.hasBeliefBridge ? 1 : 0) +
                     (detailChecklist.hasCounterArgument ? 1 : 0);
  const logic = Math.min(10, Math.round(clarityBase + logicBonus));

  // 独自性 = 共通の敵 + N1言語 + ベースの差別化
  const uniquenessBase = 5;
  const uniquenessBonus = (detailChecklist.hasCommonEnemy ? 2 : 0) +
                          (detailChecklist.hasN1Language ? 2 : 0) +
                          (detailChecklist.hasReducedAbstraction ? 1 : 0);
  const uniqueness = Math.min(10, uniquenessBase + uniquenessBonus);

  // 読みやすさ = readability スコアを10点満点に
  const readability = Math.round((scoreMap.get("readability") || 50) / 10);

  // 感情インパクト = emotional + 損失回避 + 共通の敵
  const emotionalBase = (scoreMap.get("emotional") || 50) / 10;
  const emotionalBonus = (detailChecklist.hasLossAversion ? 1.5 : 0) +
                         (detailChecklist.hasCommonEnemy ? 0.5 : 0);
  const emotionalImpact = Math.min(10, Math.round(emotionalBase + emotionalBonus));

  // 目的達成度 = benefit + urgency + CTA + 証拠
  const benefitBase = (scoreMap.get("benefit") || 50) / 20;
  const urgencyBase = (scoreMap.get("urgency") || 50) / 20;
  const goalBonus = (detailChecklist.hasClearCTA ? 2 : 0) +
                    (detailChecklist.hasEvidence ? 1 : 0) +
                    (detailChecklist.hasNumbers ? 1 : 0);
  const goalAchievement = Math.min(10, Math.round(benefitBase + urgencyBase + goalBonus));

  const total = logic + uniqueness + readability + emotionalImpact + goalAchievement;
  const rank = getQualityRank(total);

  return {
    logic,
    uniqueness,
    readability,
    emotionalImpact,
    goalAchievement,
    total,
    rank,
  };
}

function getQualityRank(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= QUALITY_RANK_THRESHOLDS.S) return "S";
  if (score >= QUALITY_RANK_THRESHOLDS.A) return "A";
  if (score >= QUALITY_RANK_THRESHOLDS.B) return "B";
  if (score >= QUALITY_RANK_THRESHOLDS.C) return "C";
  return "D";
}

// ============================================
// 改善提案生成
// ============================================

const IMPROVEMENT_TEMPLATES: Record<string, {
  currentState: string;
  suggestion: string;
  example: string;
  priority: "high" | "medium" | "low";
}> = {
  hasNumbers: {
    currentState: "具体的な数字が含まれていません",
    suggestion: "数字を1つ以上追加して説得力を高めてください",
    example: "「多くの人が成功」→「92%の人が3ヶ月で成功」",
    priority: "high",
  },
  hasTargetClarity: {
    currentState: "ターゲットが明確ではありません",
    suggestion: "「あなた」「〇〇でお悩みの方」など、ターゲットを明示してください",
    example: "「この商品は効果的」→「40代で肌荒れに悩むあなたへ」",
    priority: "high",
  },
  hasBeliefBridge: {
    currentState: "信念の橋渡しがありません",
    suggestion: "「実は...」「今までは〜でしたが」など、既存の信念から新しい信念への橋渡しを追加",
    example: "「この方法が効果的です」→「実は、今まで常識と思われていた方法には問題がありました」",
    priority: "medium",
  },
  hasLossAversion: {
    currentState: "損失回避の訴求がありません",
    suggestion: "行動しないことのリスク・損失を明示してください",
    example: "「今すぐ始めましょう」→「今始めないと、毎月3万円を失い続けることになります」",
    priority: "high",
  },
  hasCommonEnemy: {
    currentState: "共通の敵が設定されていません",
    suggestion: "ターゲットと共通の敵（問題の原因）を明示して連帯感を生みましょう",
    example: "「業界の常識に騙されていませんか？」「本当の原因は○○でした」",
    priority: "medium",
  },
  hasN1Language: {
    currentState: "N1言語（生の声）がありません",
    suggestion: "実際のお客様の声や具体的なエピソードを「」で引用してください",
    example: "「効果があります」→「『これを使って3キロ痩せました！』という声が続出」",
    priority: "medium",
  },
  hasEvidence: {
    currentState: "証拠・根拠がありません",
    suggestion: "実績、データ、研究結果、専門家の監修などを追加してください",
    example: "「効果的です」→「医師監修、臨床試験で効果を実証、満足度98%」",
    priority: "high",
  },
  hasCounterArgument: {
    currentState: "反論処理がありません",
    suggestion: "読者が抱きそうな不安や疑問に先回りして回答してください",
    example: "「もしかすると『本当に効果あるの？』と思われるかもしれません。ご安心ください...」",
    priority: "low",
  },
  hasClearCTA: {
    currentState: "明確なCTAがありません",
    suggestion: "今すぐ取るべきアクションを明確に提示してください",
    example: "「興味があれば...」→「今すぐ下のボタンから無料体験に申し込む」",
    priority: "high",
  },
  hasReducedAbstraction: {
    currentState: "抽象的な表現が多いです",
    suggestion: "具体的な数字、期間、金額、固有名詞を使って抽象度を下げてください",
    example: "「短期間で成果」→「たった2週間で月商30万円アップ」",
    priority: "medium",
  },
};

/**
 * チェックリスト結果から改善提案を生成
 */
export function generateImprovementSuggestions(
  checklist: DetailEnhancementChecklist
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];

  // チェック項目名のマッピング
  const checkItemNames: Record<string, string> = {
    hasNumbers: "数字の使用",
    hasTargetClarity: "ターゲット明確化",
    hasBeliefBridge: "信念の橋渡し",
    hasLossAversion: "損失回避訴求",
    hasCommonEnemy: "共通の敵",
    hasN1Language: "N1言語（生の声）",
    hasEvidence: "証拠・根拠",
    hasCounterArgument: "反論処理",
    hasClearCTA: "明確なCTA",
    hasReducedAbstraction: "具体性",
  };

  // 各項目をチェック
  const checkKeys = Object.keys(IMPROVEMENT_TEMPLATES) as (keyof typeof IMPROVEMENT_TEMPLATES)[];

  for (const key of checkKeys) {
    const checkValue = checklist[key as keyof DetailEnhancementChecklist];
    if (checkValue === false) {
      const template = IMPROVEMENT_TEMPLATES[key];
      suggestions.push({
        checkItem: checkItemNames[key] || key,
        currentState: template.currentState,
        suggestion: template.suggestion,
        example: template.example,
        priority: template.priority,
      });
    }
  }

  // 優先度順にソート
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

// ============================================
// ランク説明（50点満点用）
// ============================================

export function getQualityRankDescription(rank: string): string {
  const descriptions: Record<string, string> = {
    S: "プロ級！このままでも十分効果的なコピーです（45-50点）",
    A: "優秀！細かい調整でさらに効果が上がります（40-44点）",
    B: "良好！いくつかの改善で大きく伸びる余地があります（32-39点）",
    C: "改善必要！重要な要素が欠けています（25-31点）",
    D: "基礎から見直しが必要です（0-24点）",
  };
  return descriptions[rank] || "";
}

/**
 * 診断結果に50点評価・チェックリスト・改善提案を付与
 */
export function enhanceDiagnosisResult(
  result: DiagnosisResult,
  originalText: string
): DiagnosisResult {
  // ディテール強化チェックリスト
  const detailEnhancement = checkDetailEnhancement(originalText);

  // 50点満点評価
  const qualityScore = result.scores
    ? calculateQualityScore(result.scores, detailEnhancement)
    : undefined;

  // 改善提案
  const improvementSuggestions = generateImprovementSuggestions(detailEnhancement);

  return {
    ...result,
    qualityScore,
    detailEnhancement,
    improvementSuggestions,
  };
}
