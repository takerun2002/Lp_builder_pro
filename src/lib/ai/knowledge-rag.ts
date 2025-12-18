/**
 * Knowledge RAG Integration
 * ナレッジベースを活用したRAG（Retrieval-Augmented Generation）機能
 */

import { getGeminiClient } from "./gemini";
import { searchKnowledge, indexKnowledgeBase, getIndexedFiles, type Citation } from "./file-search";
import { selectModelForTask, type TaskType } from "./model-selector";

// =============================================================================
// Types
// =============================================================================

export interface RAGQueryOptions {
  query: string;
  model?: string;
  maxCitations?: number;
  includeRawCitations?: boolean;
  systemPrompt?: string;
  task?: TaskType;
}

export interface RAGResponse {
  answer: string;
  citations: Citation[];
  model: string;
  tokensUsed: number;
  indexStatus: {
    totalFiles: number;
    readyFiles: number;
    needsReindex: boolean;
  };
}

// =============================================================================
// RAG Query Functions
// =============================================================================

/**
 * Query knowledge base with RAG
 */
export async function queryKnowledgeRAG(options: RAGQueryOptions): Promise<RAGResponse> {
  const { query, maxCitations = 5, includeRawCitations = false, systemPrompt } = options;

  // Check index status
  const indexedFiles = getIndexedFiles();
  const readyFiles = indexedFiles.filter((f) => f.status === "ready");

  // Auto-index if no files are indexed
  if (readyFiles.length === 0) {
    await indexKnowledgeBase();
  }

  // Search for relevant citations
  const citations = await searchKnowledge(query, maxCitations);

  // Select model
  let modelId: string;
  if (options.model) {
    modelId = options.model;
  } else if (options.task) {
    const modelConfig = await selectModelForTask(options.task);
    modelId = modelConfig.model;
  } else {
    // Default to flash for simple queries, pro for complex
    const isComplex = query.length > 200 || query.includes("分析") || query.includes("詳細");
    modelId = isComplex ? "gemini-2.5-pro" : "gemini-2.5-flash";
  }

  // Build prompt with citations
  const citationContext = citations
    .map(
      (c, i) => `
[ソース${i + 1}] ${c.source} - ${c.section}
${c.content}
---`
    )
    .join("\n");

  const augmentedPrompt = `${systemPrompt || "あなたはナレッジベースを参照して質問に回答するアシスタントです。"}

以下のナレッジベースの情報を参考に質問に回答してください。
回答には使用した情報源を明記してください。

## ナレッジベース

${citationContext}

## 質問

${query}

## 回答の形式
- 簡潔かつ具体的に回答
- 使用した情報源を[ソースN]の形式で明記
- ナレッジに無い場合は「ナレッジベースに該当情報がありません」と回答`;

  // Generate response
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: modelId,
    contents: augmentedPrompt,
  });

  const answer = response.text || "";
  const tokensUsed = Math.ceil(augmentedPrompt.length / 4) + Math.ceil(answer.length / 4);

  return {
    answer,
    citations: includeRawCitations ? citations : filterUsedCitations(answer, citations),
    model: modelId,
    tokensUsed,
    indexStatus: {
      totalFiles: indexedFiles.length,
      readyFiles: readyFiles.length,
      needsReindex: readyFiles.length === 0,
    },
  };
}

/**
 * Query knowledge for copywriting assistance
 */
export async function getCopywritingAssistance(
  topic: string,
  context?: string
): Promise<RAGResponse> {
  const query = `コピーライティングのアドバイス: ${topic}
${context ? `コンテキスト: ${context}` : ""}

以下について教えてください:
1. 使用すべきキラーワード
2. 適用すべきライティングテクニック
3. 効果的な心理トリガー
4. 具体的なコピー例`;

  return queryKnowledgeRAG({
    query,
    task: "copywriting",
    systemPrompt:
      "あなたはLP Builder Proのコピーライティングアシスタントです。ナレッジベースの知識を活用して、効果的なコピーの作成をサポートしてください。",
  });
}

/**
 * Query knowledge for marketing strategy
 */
export async function getMarketingStrategy(
  productType: string,
  targetAudience?: string
): Promise<RAGResponse> {
  const query = `マーケティング戦略のアドバイス
商品タイプ: ${productType}
${targetAudience ? `ターゲット: ${targetAudience}` : ""}

以下について教えてください:
1. 推奨されるオファー構成
2. ファネル設計
3. 価格戦略
4. 心理トリガーの活用方法`;

  return queryKnowledgeRAG({
    query,
    task: "analysis",
    systemPrompt:
      "あなたはマーケティング戦略のエキスパートです。ナレッジベースの知識を活用して、効果的なマーケティング戦略を提案してください。",
  });
}

/**
 * Query knowledge for LP design prompts
 */
export async function getDesignPromptSuggestions(
  section: string,
  style?: string
): Promise<RAGResponse> {
  const query = `デザインプロンプトの提案
LPセクション: ${section}
${style ? `スタイル: ${style}` : ""}

以下について教えてください:
1. このセクションに適したデザインテンプレート
2. 推奨されるプロンプト構成
3. 注意点とベストプラクティス`;

  return queryKnowledgeRAG({
    query,
    task: "draft",
    systemPrompt:
      "あなたはLP Builder Proのデザインアシスタントです。ナレッジベースのデザインプロンプトテンプレートを活用して、効果的な画像生成プロンプトを提案してください。",
  });
}

/**
 * Get psychological triggers for a specific LP section
 */
export async function getPsychologicalTriggers(
  section: string,
  goal?: string
): Promise<RAGResponse> {
  const query = `心理トリガーの提案
LPセクション: ${section}
${goal ? `達成したいこと: ${goal}` : ""}

以下について教えてください:
1. このセクションに効果的な心理トリガー
2. 具体的な活用方法
3. 注意点`;

  return queryKnowledgeRAG({
    query,
    task: "analysis",
    systemPrompt:
      "あなたは消費者心理のエキスパートです。ナレッジベースの心理トリガー情報を活用して、効果的なLP設計をサポートしてください。",
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Filter citations to only include those actually used in the answer
 */
function filterUsedCitations(answer: string, citations: Citation[]): Citation[] {
  return citations.filter((_, index) => {
    const marker = `[ソース${index + 1}]`;
    return answer.includes(marker);
  });
}

/**
 * Initialize knowledge base index
 */
export async function initializeKnowledgeBase(): Promise<{
  success: boolean;
  filesIndexed: number;
  errors: string[];
}> {
  try {
    const results = await indexKnowledgeBase();

    const errors = results
      .filter((r) => r.status === "error")
      .map((r) => `${r.filename}: ${r.errorMessage}`);

    return {
      success: errors.length === 0,
      filesIndexed: results.filter((r) => r.status === "ready").length,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      filesIndexed: 0,
      errors: [err instanceof Error ? err.message : "Unknown error"],
    };
  }
}

/**
 * Get knowledge base status
 */
export function getKnowledgeBaseStatus(): {
  totalFiles: number;
  readyFiles: number;
  indexingFiles: number;
  errorFiles: number;
  files: Array<{ filename: string; status: string; tokenCount: number }>;
} {
  const files = getIndexedFiles();

  return {
    totalFiles: files.length,
    readyFiles: files.filter((f) => f.status === "ready").length,
    indexingFiles: files.filter((f) => f.status === "indexing").length,
    errorFiles: files.filter((f) => f.status === "error").length,
    files: files.map((f) => ({
      filename: f.filename,
      status: f.status,
      tokenCount: f.tokenCount,
    })),
  };
}
