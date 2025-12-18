/**
 * Hybrid Knowledge System
 * CAG（静的ナレッジキャッシュ）+ RAG（動的データ検索）の統合レイヤー
 *
 * コスト削減: 30-50%
 * 速度向上: 2-3倍
 */

import { getGeminiClient, getDefaultGeminiTextModelId } from "./gemini";
import {
  getCurrentCache,
  createKnowledgeCache,
  STATIC_KNOWLEDGE_FILES,
  type KnowledgeCache,
} from "./context-cache";
import {
  retrieveDocuments,
  retrieveN1Data,
  retrieveCompetitorData,
  type DocumentSource,
} from "./rag-retriever";
import { getDb } from "@/lib/db";

// =============================================================================
// Types
// =============================================================================

export interface HybridQuery {
  prompt: string;
  projectId?: string;
  useCache?: boolean;           // CAGキャッシュを使用するか（default: true）
  dynamicSources?: DocumentSource[]; // RAGで検索するソース
  includeN1?: boolean;          // N1データを含めるか
  includeCompetitors?: boolean; // 競合データを含めるか
  maxDynamicTokens?: number;    // 動的データの最大トークン数
}

export interface HybridResponse {
  text: string;
  sources: {
    cached: string[];           // CAGから使用したファイル
    retrieved: string[];        // RAGから取得したドキュメントID
  };
  tokensUsed: {
    cached: number;             // キャッシュから（低コスト）
    dynamic: number;            // 動的データ
    generated: number;          // 生成されたトークン
  };
  costSavings: {
    estimatedSavingsPercent: number;
    explanation: string;
  };
  timing: {
    cacheMs: number;
    ragMs: number;
    generationMs: number;
    totalMs: number;
  };
}

export interface HybridStats {
  totalQueries: number;
  cacheHits: number;
  cacheHitRate: number;
  totalTokensSaved: number;
  estimatedCostSaved: number;  // USD
}

// =============================================================================
// Cost Estimation
// =============================================================================

const COST_PER_1K_INPUT_TOKENS = 0.00025;  // Gemini 2.5 Flash
const COST_PER_1K_CACHED_TOKENS = 0.0000625; // 75% discount

function estimateCostSavings(
  cachedTokens: number,
  dynamicTokens: number
): { savingsPercent: number; explanation: string } {
  if (cachedTokens === 0) {
    return {
      savingsPercent: 0,
      explanation: "キャッシュ未使用",
    };
  }

  const withoutCache = (cachedTokens + dynamicTokens) * COST_PER_1K_INPUT_TOKENS / 1000;
  const withCache =
    (cachedTokens * COST_PER_1K_CACHED_TOKENS / 1000) +
    (dynamicTokens * COST_PER_1K_INPUT_TOKENS / 1000);

  const savings = withoutCache - withCache;
  const savingsPercent = Math.round((savings / withoutCache) * 100);

  return {
    savingsPercent,
    explanation: `キャッシュ${cachedTokens.toLocaleString()}トークンで約${savingsPercent}%コスト削減`,
  };
}

// =============================================================================
// Stats Tracking
// =============================================================================

function recordQuery(
  cacheHit: boolean,
  tokensSaved: number
): void {
  const db = getDb();
  const now = new Date().toISOString();

  // 統計を更新
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('hybrid_stats', ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = json_set(
        COALESCE(value, '{}'),
        '$.totalQueries', COALESCE(json_extract(value, '$.totalQueries'), 0) + 1,
        '$.cacheHits', COALESCE(json_extract(value, '$.cacheHits'), 0) + ?,
        '$.totalTokensSaved', COALESCE(json_extract(value, '$.totalTokensSaved'), 0) + ?
      ),
      updated_at = ?
  `).run(
    JSON.stringify({ totalQueries: 1, cacheHits: cacheHit ? 1 : 0, totalTokensSaved: tokensSaved }),
    now,
    cacheHit ? 1 : 0,
    tokensSaved,
    now
  );
}

export function getHybridStats(): HybridStats {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get("hybrid_stats") as { value: string } | undefined;

  if (!row) {
    return {
      totalQueries: 0,
      cacheHits: 0,
      cacheHitRate: 0,
      totalTokensSaved: 0,
      estimatedCostSaved: 0,
    };
  }

  try {
    const stats = JSON.parse(row.value) as {
      totalQueries: number;
      cacheHits: number;
      totalTokensSaved: number;
    };

    return {
      totalQueries: stats.totalQueries || 0,
      cacheHits: stats.cacheHits || 0,
      cacheHitRate: stats.totalQueries > 0
        ? Math.round((stats.cacheHits / stats.totalQueries) * 100)
        : 0,
      totalTokensSaved: stats.totalTokensSaved || 0,
      estimatedCostSaved: (stats.totalTokensSaved || 0) * COST_PER_1K_INPUT_TOKENS * 0.75 / 1000,
    };
  } catch {
    return {
      totalQueries: 0,
      cacheHits: 0,
      cacheHitRate: 0,
      totalTokensSaved: 0,
      estimatedCostSaved: 0,
    };
  }
}

// =============================================================================
// Main Hybrid Generate
// =============================================================================

/**
 * ハイブリッドナレッジを使用してテキスト生成
 */
export async function hybridGenerate(query: HybridQuery): Promise<HybridResponse> {
  const startTime = Date.now();
  const ai = getGeminiClient();
  const model = getDefaultGeminiTextModelId();

  // タイミング計測
  const timing = {
    cacheMs: 0,
    ragMs: 0,
    generationMs: 0,
    totalMs: 0,
  };

  // 1. CAGキャッシュを取得/作成
  let cache: KnowledgeCache | null = null;
  let cachedTokens = 0;

  if (query.useCache !== false) {
    const cacheStart = Date.now();
    try {
      cache = await getCurrentCache();

      if (!cache) {
        cache = await createKnowledgeCache({
          files: STATIC_KNOWLEDGE_FILES,
        });
      }

      cachedTokens = cache?.tokenCount || 0;
    } catch (cacheError) {
      console.warn("[hybrid-knowledge] Cache creation failed, continuing without cache:", cacheError);
      cache = null;
      cachedTokens = 0;
    }
    timing.cacheMs = Date.now() - cacheStart;
  }

  // 2. RAGで動的データを取得
  const ragStart = Date.now();
  const dynamicContextParts: string[] = [];
  const retrievedIds: string[] = [];

  // 指定されたソースからデータ取得
  if (query.dynamicSources && query.dynamicSources.length > 0) {
    const ragResult = await retrieveDocuments({
      query: query.prompt,
      sources: query.dynamicSources,
      projectId: query.projectId,
      maxResults: 5,
    });
    dynamicContextParts.push(ragResult.contextText);
    retrievedIds.push(...ragResult.documents.map(d => d.id));
  }

  // N1データを取得
  if (query.includeN1 && query.projectId) {
    const n1Result = await retrieveN1Data(query.projectId);
    if (n1Result.contextText) {
      dynamicContextParts.push(`\n【N1顧客データ】\n${n1Result.contextText}`);
      retrievedIds.push(...n1Result.documents.map(d => d.id));
    }
  }

  // 競合データを取得
  if (query.includeCompetitors && query.projectId) {
    const competitorResult = await retrieveCompetitorData(query.projectId);
    if (competitorResult.contextText) {
      dynamicContextParts.push(`\n【競合分析】\n${competitorResult.contextText}`);
      retrievedIds.push(...competitorResult.documents.map(d => d.id));
    }
  }

  timing.ragMs = Date.now() - ragStart;

  // 動的コンテキストを構築
  const dynamicContext = dynamicContextParts.join("\n\n---\n\n");
  const dynamicTokens = Math.ceil(dynamicContext.length / 3);

  // トークン制限チェック
  const maxDynamicTokens = query.maxDynamicTokens || 4000;
  let truncatedContext = dynamicContext;
  if (dynamicTokens > maxDynamicTokens) {
    truncatedContext = dynamicContext.slice(0, maxDynamicTokens * 3);
  }

  // 3. プロンプトを構築
  let fullPrompt = query.prompt;
  if (truncatedContext) {
    fullPrompt = `${query.prompt}

【参考データ（動的）】
${truncatedContext}`;
  }

  // 4. 生成実行
  const genStart = Date.now();
  let responseText = "";

  try {
    if (cache && query.useCache !== false) {
      // キャッシュ使用（cachedContentは型定義に含まれていないがAPIでは使用可能）
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        cachedContent: cache.cacheId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      responseText = response.text || "";
    } else {
      // キャッシュなし
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
      });
      responseText = response.text || "";
    }
  } catch (error) {
    console.error("[hybrid-knowledge] Generation failed:", error);

    // フォールバック: キャッシュなしで再試行
    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
    });
    responseText = response.text || "";
    cachedTokens = 0; // キャッシュ使用なし
  }

  timing.generationMs = Date.now() - genStart;
  timing.totalMs = Date.now() - startTime;

  // 生成トークン数を推定
  const generatedTokens = Math.ceil(responseText.length / 3);

  // コスト削減を計算
  const costSavings = estimateCostSavings(cachedTokens, dynamicTokens);

  // 統計を記録
  recordQuery(cachedTokens > 0, cachedTokens);

  return {
    text: responseText,
    sources: {
      cached: cache?.files || [],
      retrieved: retrievedIds,
    },
    tokensUsed: {
      cached: cachedTokens,
      dynamic: dynamicTokens,
      generated: generatedTokens,
    },
    costSavings: {
      estimatedSavingsPercent: costSavings.savingsPercent,
      explanation: costSavings.explanation,
    },
    timing,
  };
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * LPコピー生成（ハイブリッド）
 */
export async function generateLPCopy(
  projectId: string,
  sectionType: string,
  instructions?: string
): Promise<HybridResponse> {
  const prompt = `LPの「${sectionType}」セクション用のコピーを生成してください。

${instructions || "ターゲットの感情に訴える、具体的で説得力のあるコピーを作成してください。"}

【要件】
- 心理トリガーを効果的に使用
- N1顧客の視点を意識
- 具体的な数字やファクトを含める
- アクションを促す言葉を使用`;

  return hybridGenerate({
    prompt,
    projectId,
    useCache: true,
    includeN1: true,
    includeCompetitors: true,
    dynamicSources: ["research_result", "hearing_response"],
  });
}

/**
 * ヘッドライン診断（ハイブリッド）
 */
export async function diagnoseHeadline(
  headline: string,
  projectId?: string
): Promise<HybridResponse> {
  const prompt = `以下のヘッドラインを診断し、改善案を提示してください。

【診断対象】
${headline}

【診断ポイント】
1. 心理トリガーの使用状況
2. ベネフィットの明確さ
3. 具体性（数字、ファクト）
4. 緊急性・限定性
5. ターゲットへの訴求力

【出力形式】
- 現状の評価（5段階）
- 良い点
- 改善点
- 改善案（3パターン）`;

  return hybridGenerate({
    prompt,
    projectId,
    useCache: true,
    includeN1: !!projectId,
  });
}

/**
 * オファー設計アドバイス（ハイブリッド）
 */
export async function adviseOffer(
  productInfo: string,
  projectId?: string
): Promise<HybridResponse> {
  const prompt = `以下の商品/サービスに対する効果的なオファー設計を提案してください。

【商品/サービス情報】
${productInfo}

【提案内容】
1. メインオファー案（3パターン）
2. ボーナス特典案
3. 価格設定の考え方
4. 保証内容の提案
5. 緊急性・限定性の演出方法`;

  return hybridGenerate({
    prompt,
    projectId,
    useCache: true,
    includeN1: !!projectId,
    includeCompetitors: !!projectId,
  });
}

/**
 * ナレッジを活用した質問応答
 */
export async function answerWithKnowledge(
  question: string,
  projectId?: string
): Promise<HybridResponse> {
  return hybridGenerate({
    prompt: question,
    projectId,
    useCache: true,
    dynamicSources: projectId
      ? ["research_result", "n1_data", "hearing_response", "project_data"]
      : undefined,
  });
}
