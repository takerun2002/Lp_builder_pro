/**
 * Copy Analyzer
 * ファン化哲学ナレッジ（21レッスン）でLP/原稿を自動診断
 *
 * hybridGenerate統合: ナレッジキャッシュを活用して診断精度向上
 */

import { hybridGenerate } from "@/lib/ai/hybrid-knowledge";
import {
  DIAGNOSIS_CATEGORIES,
  calculateGrade,
  prioritizeImprovements,
  type DiagnosisResult,
  type CategoryResult,
  type CheckpointResult,
} from "./frameworks";

// =============================================================================
// Types
// =============================================================================

export interface AnalyzeOptions {
  /** AIによる詳細分析を行うか */
  useAI?: boolean;
  /** 分析する言語 */
  language?: "ja" | "en";
  /** フォーカスするカテゴリ */
  focusCategories?: string[];
}

export interface AnalysisInput {
  /** 分析するコピーテキスト */
  text: string;
  /** コピーの種類 */
  type?: "lp" | "email" | "ad" | "sales_letter" | "general";
  /** 商品/サービス名（任意） */
  productName?: string;
}

// =============================================================================
// Knowledge Loading - hybridGenerateがキャッシュを自動管理
// =============================================================================

// 注: ナレッジはhybridGenerateのCAGキャッシュで自動管理される
// killer_words.yaml, writing_techniques.yaml等がキャッシュされる

// =============================================================================
// Keyword-based Analysis
// =============================================================================

function analyzeWithKeywords(text: string): CategoryResult[] {
  const results: CategoryResult[] = [];
  const textLower = text.toLowerCase();

  for (const category of DIAGNOSIS_CATEGORIES) {
    const checkpointResults: CheckpointResult[] = [];
    let categoryScore = 0;

    for (const checkpoint of category.checkpoints) {
      let found = false;
      let evidence: string | undefined;

      // キーワードマッチング
      if (checkpoint.keywords && checkpoint.keywords.length > 0) {
        for (const keyword of checkpoint.keywords) {
          const keywordLower = keyword.toLowerCase();
          if (textLower.includes(keywordLower)) {
            found = true;
            // 証拠となるテキストを抽出
            const idx = textLower.indexOf(keywordLower);
            const start = Math.max(0, idx - 30);
            const end = Math.min(text.length, idx + keyword.length + 30);
            evidence = "..." + text.slice(start, end) + "...";
            break;
          }
        }
      }

      const score = found ? checkpoint.weight : 0;
      categoryScore += score;

      checkpointResults.push({
        checkpointId: checkpoint.id,
        question: checkpoint.question,
        score,
        maxScore: checkpoint.weight,
        found,
        evidence,
      });
    }

    results.push({
      categoryId: category.id,
      categoryName: category.name,
      score: categoryScore,
      maxScore: category.maxScore,
      percentage: Math.round((categoryScore / category.maxScore) * 100),
      details: checkpointResults,
    });
  }

  return results;
}

// =============================================================================
// AI-based Analysis (hybridGenerate統合)
// =============================================================================

async function analyzeWithAI(
  text: string,
  keywordResults: CategoryResult[]
): Promise<CategoryResult[]> {
  // hybridGenerateを使用: ナレッジキャッシュを自動活用
  const prompt = `あなたはコピーライティングの専門家です。ナレッジキャッシュに含まれる「ファン化哲学」「セールスライティング技法」「心理トリガー」を参考に、以下のコピーを分析してください。

【分析対象コピー】
${text.slice(0, 5000)}

【評価カテゴリ】
1. 説得力: 信念移転、感情トリガー、シンプルさ
2. ストーリー: ヒーローズジャーニー、変容の物語
3. ムーブメント: 共通の敵、ビジョン、マニフェスト
4. 心理テクニック: 未来予測、原点回帰、ミステリー

【現在のキーワード分析結果】
${JSON.stringify(keywordResults.map(r => ({ category: r.categoryName, score: r.score, max: r.maxScore })), null, 2)}

【出力形式】
以下のJSON形式で出力してください：
{
  "categories": [
    {
      "categoryId": "persuasion",
      "adjustedScore": 数値,
      "analysis": "分析コメント",
      "checkpointAdjustments": [
        { "checkpointId": "belief_transfer", "found": true/false, "evidence": "根拠テキスト", "suggestion": "改善提案" }
      ]
    }
  ],
  "strengths": ["良い点1", "良い点2"],
  "overallAnalysis": "総合分析"
}`;

  try {
    const response = await hybridGenerate({
      prompt,
      useCache: true, // ナレッジキャッシュを活用
    });

    const responseText = response.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[copy-analyzer] No JSON in AI response");
      return keywordResults;
    }

    const aiResult = JSON.parse(jsonMatch[0]) as {
      categories: {
        categoryId: string;
        adjustedScore: number;
        analysis: string;
        checkpointAdjustments?: {
          checkpointId: string;
          found: boolean;
          evidence?: string;
          suggestion?: string;
        }[];
      }[];
      strengths?: string[];
      overallAnalysis?: string;
    };

    // AI結果をマージ
    return keywordResults.map((catResult) => {
      const aiCat = aiResult.categories.find((c) => c.categoryId === catResult.categoryId);
      if (!aiCat) return catResult;

      // チェックポイントの調整
      const adjustedDetails = catResult.details.map((cp) => {
        const aiCp = aiCat.checkpointAdjustments?.find((a) => a.checkpointId === cp.checkpointId);
        if (!aiCp) return cp;

        return {
          ...cp,
          found: aiCp.found,
          evidence: aiCp.evidence || cp.evidence,
          suggestion: aiCp.suggestion,
          score: aiCp.found ? cp.maxScore : 0,
        };
      });

      const newScore = adjustedDetails.reduce((sum, d) => sum + d.score, 0);

      return {
        ...catResult,
        score: newScore,
        percentage: Math.round((newScore / catResult.maxScore) * 100),
        details: adjustedDetails,
      };
    });
  } catch (error) {
    console.error("[copy-analyzer] AI analysis failed:", error);
    return keywordResults;
  }
}

// =============================================================================
// Main Analyzer
// =============================================================================

/**
 * コピーを診断
 */
export async function analyzeCopy(
  input: AnalysisInput,
  options: AnalyzeOptions = {}
): Promise<DiagnosisResult> {
  const { useAI = true } = options;
  const text = input.text.trim();

  if (!text) {
    throw new Error("分析するテキストが空です");
  }

  // 1. キーワードベースの分析
  let categoryResults = analyzeWithKeywords(text);

  // 2. AI分析（オプション）
  if (useAI && text.length > 100) {
    categoryResults = await analyzeWithAI(text, categoryResults);
  }

  // 3. スコア集計
  const totalScore = categoryResults.reduce((sum, cat) => sum + cat.score, 0);
  const maxScore = categoryResults.reduce((sum, cat) => sum + cat.maxScore, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);
  const grade = calculateGrade(percentage);

  // 4. 改善提案を生成
  const improvements = prioritizeImprovements(categoryResults);

  // 5. 強みを抽出
  const strengths = extractStrengths(categoryResults);

  return {
    totalScore,
    maxScore,
    percentage,
    grade,
    categories: categoryResults,
    improvements,
    strengths,
  };
}

function extractStrengths(categories: CategoryResult[]): string[] {
  const strengths: string[] = [];

  for (const cat of categories) {
    if (cat.percentage >= 70) {
      strengths.push(`${cat.categoryName}が効果的に活用されています`);
    }

    for (const detail of cat.details) {
      if (detail.found && detail.score >= detail.maxScore * 0.8) {
        strengths.push(`「${detail.question}」がクリアされています`);
      }
    }
  }

  return strengths.slice(0, 5); // 上位5つ
}

// =============================================================================
// Quick Analysis (Lightweight)
// =============================================================================

/**
 * 簡易診断（AIなし、キーワードのみ）
 */
export function quickAnalyze(text: string): {
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  summary: string;
} {
  const categoryResults = analyzeWithKeywords(text);
  const totalScore = categoryResults.reduce((sum, cat) => sum + cat.score, 0);
  const maxScore = categoryResults.reduce((sum, cat) => sum + cat.maxScore, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);
  const grade = calculateGrade(percentage);

  const weakest = categoryResults.reduce((min, cat) =>
    cat.percentage < min.percentage ? cat : min
  );

  const summary = `総合スコア: ${percentage}点（${grade}）。最も改善が必要: ${weakest.categoryName}（${weakest.percentage}%）`;

  return { score: percentage, grade, summary };
}

// =============================================================================
// Specific Analyzers
// =============================================================================

/**
 * ヘッドラインを診断 (hybridGenerate統合)
 */
export async function analyzeHeadline(headline: string): Promise<{
  score: number;
  issues: string[];
  suggestions: string[];
}> {
  const prompt = `ナレッジキャッシュの「キラーワード集」「心理トリガー」を参考に、以下のヘッドラインを診断してください。

【ヘッドライン】
${headline}

【診断ポイント】
1. 興味を引く力（好奇心を刺激するか）
2. ベネフィットの明確さ
3. 具体性（数字、ファクト）
4. ターゲットの明確さ
5. 緊急性・限定性

【出力形式】
{
  "score": 0-100,
  "issues": ["問題点1", "問題点2"],
  "suggestions": ["改善案1", "改善案2"],
  "improvedVersions": ["改善版1", "改善版2"]
}`;

  try {
    const response = await hybridGenerate({
      prompt,
      useCache: true,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        score: 50,
        issues: ["分析に失敗しました"],
        suggestions: [],
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[copy-analyzer] Headline analysis failed:", error);
    return {
      score: 50,
      issues: ["分析に失敗しました"],
      suggestions: [],
    };
  }
}

/**
 * CTAを診断 (hybridGenerate統合)
 */
export async function analyzeCTA(ctaText: string): Promise<{
  score: number;
  analysis: string;
  suggestions: string[];
}> {
  const prompt = `ナレッジキャッシュの「キラーワード集」「心理トリガー」を参考に、以下のCTA（行動喚起）を診断してください。

【CTA】
${ctaText}

【診断ポイント】
1. アクションの明確さ
2. 緊急性の演出
3. ベネフィットの提示
4. 心理的障壁の低減

出力: {"score": 0-100, "analysis": "分析", "suggestions": ["提案1", "提案2"]}`;

  try {
    const response = await hybridGenerate({
      prompt,
      useCache: true,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        score: 50,
        analysis: "分析に失敗しました",
        suggestions: [],
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[copy-analyzer] CTA analysis failed:", error);
    return {
      score: 50,
      analysis: "分析に失敗しました",
      suggestions: [],
    };
  }
}
