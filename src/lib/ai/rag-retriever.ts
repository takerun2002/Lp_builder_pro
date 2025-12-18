/**
 * RAG Retriever
 * 動的データの検索・取得機能
 *
 * HOTデータ（動的）: リサーチ結果、N1データ、プロジェクト固有情報
 */

import { getDb } from "@/lib/db";
import { getGeminiClient, getDefaultGeminiTextModelId } from "./gemini";

// =============================================================================
// Types
// =============================================================================

export interface RetrievedDocument {
  id: string;
  content: string;
  source: DocumentSource;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

export type DocumentSource =
  | "research_result"    // リサーチ結果
  | "n1_data"           // N1顧客データ
  | "competitor_lp"     // 競合LP
  | "hearing_response"  // ヒアリング回答
  | "project_data"      // プロジェクト固有データ
  | "user_upload";      // ユーザーアップロード資料

export interface RAGQuery {
  query: string;
  sources?: DocumentSource[];
  maxResults?: number;
  minRelevance?: number;
  projectId?: string;
}

export interface RAGResult {
  documents: RetrievedDocument[];
  contextText: string;
  totalTokens: number;
}

// =============================================================================
// Document Store
// =============================================================================

interface StoredDocument {
  key: string;
  data: string;
  data_type: string;
  created_at: string;
  updated_at: string;
}

/**
 * ドキュメントをストレージから取得
 */
function getDocumentsFromStorage(
  sources?: DocumentSource[],
  projectId?: string
): StoredDocument[] {
  const db = getDb();

  let query = "SELECT key, data, data_type, created_at, updated_at FROM storage_items";
  const params: string[] = [];
  const conditions: string[] = [];

  // ソースタイプでフィルタ
  if (sources && sources.length > 0) {
    const placeholders = sources.map(() => "?").join(", ");
    conditions.push(`data_type IN (${placeholders})`);
    params.push(...sources);
  }

  // プロジェクトIDでフィルタ
  if (projectId) {
    conditions.push("key LIKE ?");
    params.push(`%${projectId}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY updated_at DESC LIMIT 100";

  try {
    return db.prepare(query).all(...params) as StoredDocument[];
  } catch (error) {
    console.error("[rag-retriever] Failed to get documents:", error);
    return [];
  }
}

// =============================================================================
// Relevance Scoring
// =============================================================================

/**
 * 簡易的なキーワードベースの関連度スコアリング
 * 本番環境ではベクトル検索（Embeddings）に置き換え推奨
 */
function calculateRelevance(query: string, content: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  const contentLower = content.toLowerCase();

  if (queryTerms.length === 0) return 0;

  let matchCount = 0;
  for (const term of queryTerms) {
    if (contentLower.includes(term)) {
      matchCount++;
    }
  }

  // 基本スコア（マッチ率）
  const baseScore = matchCount / queryTerms.length;

  // コンテンツ長によるブースト（短すぎ・長すぎはペナルティ）
  const contentLength = content.length;
  let lengthBoost = 1.0;
  if (contentLength < 100) lengthBoost = 0.7;
  else if (contentLength > 10000) lengthBoost = 0.9;

  return Math.min(1.0, baseScore * lengthBoost);
}

// =============================================================================
// AI-based Relevance (optional)
// =============================================================================

/**
 * AIを使用した関連度判定（より精度が必要な場合）
 */
async function calculateRelevanceWithAI(
  query: string,
  documents: { id: string; content: string }[]
): Promise<Map<string, number>> {
  const ai = getGeminiClient();
  const model = getDefaultGeminiTextModelId();

  const prompt = `以下のクエリに対する各ドキュメントの関連度を0-100のスコアで評価してください。
JSONで {"doc_id": score} の形式で返してください。

クエリ: ${query}

ドキュメント:
${documents.map((d, i) => `[Doc ${i + 1}] ID: ${d.id}\n${d.content.slice(0, 500)}...`).join("\n\n")}

出力例: {"doc_0": 85, "doc_1": 45, "doc_2": 70}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return new Map();

    const scores = JSON.parse(jsonMatch[0]) as Record<string, number>;
    const result = new Map<string, number>();

    documents.forEach((doc, i) => {
      const key = `doc_${i}`;
      result.set(doc.id, (scores[key] || 0) / 100);
    });

    return result;
  } catch (error) {
    console.error("[rag-retriever] AI relevance calculation failed:", error);
    return new Map();
  }
}

// =============================================================================
// Main Retriever
// =============================================================================

/**
 * 動的データを検索して取得
 */
export async function retrieveDocuments(query: RAGQuery): Promise<RAGResult> {
  const maxResults = query.maxResults ?? 5;
  const minRelevance = query.minRelevance ?? 0.3;

  // ストレージからドキュメント取得
  const storedDocs = getDocumentsFromStorage(query.sources, query.projectId);

  if (storedDocs.length === 0) {
    return {
      documents: [],
      contextText: "",
      totalTokens: 0,
    };
  }

  // 関連度スコアリング
  const scoredDocs: RetrievedDocument[] = storedDocs.map((doc) => {
    let content: string;
    try {
      const parsed = JSON.parse(doc.data);
      content = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
    } catch {
      content = doc.data;
    }

    return {
      id: doc.key,
      content,
      source: doc.data_type as DocumentSource,
      relevanceScore: calculateRelevance(query.query, content),
      metadata: {
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      },
    };
  });

  // フィルタリングとソート
  const filteredDocs = scoredDocs
    .filter((doc) => doc.relevanceScore >= minRelevance)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);

  // コンテキストテキストを構築
  const contextText = filteredDocs
    .map((doc) => `【${doc.source}】\n${doc.content}`)
    .join("\n\n---\n\n");

  // トークン数を推定（簡易: 文字数 / 3）
  const totalTokens = Math.ceil(contextText.length / 3);

  return {
    documents: filteredDocs,
    contextText,
    totalTokens,
  };
}

/**
 * プロジェクトのN1データを取得
 */
export async function retrieveN1Data(projectId: string): Promise<RAGResult> {
  return retrieveDocuments({
    query: "N1 顧客 インタビュー 悩み 購入理由 変化",
    sources: ["n1_data", "hearing_response"],
    projectId,
    maxResults: 3,
    minRelevance: 0.1,
  });
}

/**
 * 競合分析データを取得
 */
export async function retrieveCompetitorData(projectId: string): Promise<RAGResult> {
  return retrieveDocuments({
    query: "競合 LP ヘッドライン オファー CTA 強み 弱み",
    sources: ["competitor_lp", "research_result"],
    projectId,
    maxResults: 5,
    minRelevance: 0.2,
  });
}

/**
 * リサーチ結果を取得
 */
export async function retrieveResearchData(
  projectId: string,
  topic?: string
): Promise<RAGResult> {
  return retrieveDocuments({
    query: topic || "市場 トレンド ターゲット ニーズ 課題",
    sources: ["research_result"],
    projectId,
    maxResults: 10,
    minRelevance: 0.2,
  });
}

// =============================================================================
// Document Management
// =============================================================================

/**
 * ドキュメントを保存
 */
export function saveDocument(
  key: string,
  content: unknown,
  source: DocumentSource
): void {
  const db = getDb();
  const now = new Date().toISOString();
  const data = typeof content === "string" ? content : JSON.stringify(content);

  db.prepare(
    `INSERT INTO storage_items (key, data, data_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET data = excluded.data, data_type = excluded.data_type, updated_at = excluded.updated_at`
  ).run(key, data, source, now, now);
}

/**
 * ドキュメントを削除
 */
export function deleteDocument(key: string): void {
  const db = getDb();
  db.prepare("DELETE FROM storage_items WHERE key = ?").run(key);
}

/**
 * ソースタイプ別のドキュメント数を取得
 */
export function getDocumentStats(): Record<DocumentSource, number> {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT data_type, COUNT(*) as count
       FROM storage_items
       GROUP BY data_type`
    )
    .all() as { data_type: string; count: number }[];

  const stats: Record<string, number> = {};
  for (const row of rows) {
    stats[row.data_type] = row.count;
  }

  return stats as Record<DocumentSource, number>;
}

/**
 * AIベースの高精度検索（必要な場合のみ使用）
 */
export async function retrieveWithAI(query: RAGQuery): Promise<RAGResult> {
  // 最初にキーワードベースで候補を取得
  const initialResult = await retrieveDocuments({
    ...query,
    maxResults: 20, // 多めに取得
    minRelevance: 0.1,
  });

  if (initialResult.documents.length <= 5) {
    return initialResult;
  }

  // AIで再スコアリング
  const aiScores = await calculateRelevanceWithAI(
    query.query,
    initialResult.documents.map((d) => ({ id: d.id, content: d.content }))
  );

  // スコアを更新
  const rescoredDocs = initialResult.documents.map((doc) => ({
    ...doc,
    relevanceScore: aiScores.get(doc.id) ?? doc.relevanceScore,
  }));

  // 再ソートして上位を返す
  const maxResults = query.maxResults ?? 5;
  const topDocs = rescoredDocs
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);

  const contextText = topDocs
    .map((doc) => `【${doc.source}】\n${doc.content}`)
    .join("\n\n---\n\n");

  return {
    documents: topDocs,
    contextText,
    totalTokens: Math.ceil(contextText.length / 3),
  };
}
