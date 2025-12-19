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
    return {
      success: true,
      summary: `${quickResult.passedCount}/6項目をクリア`,
      overallScore: Math.round((quickResult.passedCount / 6) * 100),
      grade: getGrade(Math.round((quickResult.passedCount / 6) * 100)),
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

    return {
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
  } catch (error) {
    console.error("[CopyDiagnosis] Error:", error);

    // エラー時もフォールバックを返す（500ではなく）
    const fallback = createFallbackResult(text);
    return {
      ...fallback,
      error: error instanceof Error ? error.message : "Diagnosis failed",
    };
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
