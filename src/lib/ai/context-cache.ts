/**
 * Context Cache Manager
 * Gemini Context Caching (CAG) を使用した静的ナレッジのキャッシュ管理
 *
 * 参考: https://ai.google.dev/gemini-api/docs/caching
 */

import { getGeminiClient, getDefaultGeminiTextModelId } from "./gemini";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getDb } from "@/lib/db";

// =============================================================================
// Types
// =============================================================================

export interface KnowledgeCache {
  cacheId: string;
  name: string;
  model: string;
  createdAt: string;
  expiresAt: string;
  tokenCount: number;
  files: string[];
}

export interface CacheCreateOptions {
  name?: string;
  files: string[];
  ttlSeconds?: number; // Default: 3600 (1時間)
  systemInstruction?: string;
}

export interface CachedContentInfo {
  name: string;
  model: string;
  createTime: string;
  expireTime: string;
  usageMetadata?: {
    totalTokenCount: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TTL_SECONDS = 3600; // 1時間
const MIN_TTL_SECONDS = 60; // 最小1分
const MAX_TTL_SECONDS = 86400; // 最大24時間

// 静的ナレッジファイル（COLDデータ）
export const STATIC_KNOWLEDGE_FILES = [
  "killer_words.yaml",
  "writing_techniques.yaml",
  "marketing_strategy.yaml",
  "consumer_behavior.yaml",
  "design_prompts.yaml",
];

// =============================================================================
// Cache Database Operations
// =============================================================================

function saveCacheToDb(cache: KnowledgeCache): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run("gemini_context_cache", JSON.stringify(cache), now);
}

function loadCacheFromDb(): KnowledgeCache | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get("gemini_context_cache") as { value: string } | undefined;

  if (!row) return null;

  try {
    return JSON.parse(row.value) as KnowledgeCache;
  } catch {
    return null;
  }
}

function clearCacheFromDb(): void {
  const db = getDb();
  db.prepare("DELETE FROM app_settings WHERE key = ?").run("gemini_context_cache");
}

// =============================================================================
// File Loading
// =============================================================================

function loadKnowledgeFileContent(filename: string): string {
  const knowledgePath = join(process.cwd(), "src/lib/knowledge");
  const filePath = join(knowledgePath, filename);

  if (!existsSync(filePath)) {
    console.warn(`[context-cache] File not found: ${filename}`);
    return "";
  }

  return readFileSync(filePath, "utf-8");
}

function buildCacheContent(files: string[]): string {
  const contents: string[] = [];

  for (const file of files) {
    const content = loadKnowledgeFileContent(file);
    if (content) {
      contents.push(`\n### ${file}\n\n${content}`);
    }
  }

  return `# LP Builder Pro ナレッジベース

以下は、LP制作に活用するための静的ナレッジデータです。
このデータを参照して、ユーザーのリクエストに対して最適なコピーライティングやデザイン提案を行ってください。

${contents.join("\n---\n")}`;
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * コンテキストキャッシュを作成
 */
export async function createKnowledgeCache(
  options: CacheCreateOptions
): Promise<KnowledgeCache> {
  const ai = getGeminiClient();
  const model = getDefaultGeminiTextModelId();

  // TTLの検証
  const ttl = Math.min(
    Math.max(options.ttlSeconds ?? DEFAULT_TTL_SECONDS, MIN_TTL_SECONDS),
    MAX_TTL_SECONDS
  );

  // ファイルコンテンツを構築
  const content = buildCacheContent(options.files);

  // システム指示を構築
  const systemInstruction = options.systemInstruction || `
あなたはLP（ランディングページ）制作の専門家です。
提供されたナレッジベースの情報を活用して、効果的なコピーライティングとデザイン提案を行ってください。

【重要なルール】
1. 心理トリガーを意識した訴求を心がける
2. N1（一人の実在顧客）に向けて語りかける
3. 具体的な数字やファクトを盛り込む
4. ベネフィットを明確に伝える
`;

  try {
    // Gemini Context Caching API を使用
    // Note: 実際のAPI呼び出しは @google/genai の caching 機能を使用
    // Note: @google/genai の型定義が変更される可能性があるため、実際のAPIに合わせて調整
    const cachedContent = await ai.caches.create({
      model: `models/${model}`,
      contents: [
        {
          role: "user",
          parts: [{ text: content }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      ttl: `${ttl}s`,
      displayName: options.name || "lp-builder-knowledge",
    } as Parameters<typeof ai.caches.create>[0]);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const cache: KnowledgeCache = {
      cacheId: cachedContent.name || `cache_${Date.now()}`,
      name: options.name || "lp-builder-knowledge",
      model,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      tokenCount: cachedContent.usageMetadata?.totalTokenCount || 0,
      files: options.files,
    };

    // DBに保存
    saveCacheToDb(cache);

    console.log(`[context-cache] Created cache: ${cache.cacheId}, tokens: ${cache.tokenCount}`);

    return cache;
  } catch (error) {
    console.error("[context-cache] Failed to create cache:", error);
    throw error;
  }
}

/**
 * 現在のキャッシュ情報を取得
 */
export async function getCurrentCache(): Promise<KnowledgeCache | null> {
  const cached = loadCacheFromDb();

  if (!cached) return null;

  // 有効期限チェック
  if (new Date(cached.expiresAt) < new Date()) {
    console.log("[context-cache] Cache expired, clearing...");
    clearCacheFromDb();
    return null;
  }

  return cached;
}

/**
 * キャッシュを更新（TTL延長または再作成）
 */
export async function refreshCache(
  ttlSeconds?: number
): Promise<KnowledgeCache> {
  const existing = await getCurrentCache();

  return createKnowledgeCache({
    name: existing?.name || "lp-builder-knowledge",
    files: existing?.files || STATIC_KNOWLEDGE_FILES,
    ttlSeconds: ttlSeconds ?? DEFAULT_TTL_SECONDS,
  });
}

/**
 * キャッシュを削除
 */
export async function deleteCache(): Promise<void> {
  const cached = loadCacheFromDb();

  if (cached) {
    try {
      const ai = getGeminiClient();
      await ai.caches.delete({ name: cached.cacheId });
    } catch (error) {
      console.warn("[context-cache] Failed to delete remote cache:", error);
    }
  }

  clearCacheFromDb();
  console.log("[context-cache] Cache cleared");
}

/**
 * キャッシュを使用してテキスト生成
 */
export async function generateWithCache(
  prompt: string,
  cacheId?: string
): Promise<{ text: string; fromCache: boolean; tokensSaved: number }> {
  const ai = getGeminiClient();

  // キャッシュを取得または作成
  let cache = await getCurrentCache();

  if (!cache) {
    console.log("[context-cache] No cache found, creating...");
    cache = await createKnowledgeCache({
      files: STATIC_KNOWLEDGE_FILES,
    });
  }

  const useCacheId = cacheId || cache.cacheId;

  try {
    // Note: cachedContent プロパティは @google/genai の型定義には未定義だがAPIでは使用可能
    const response = await ai.models.generateContent({
      model: cache.model,
      contents: prompt,
      cachedContent: useCacheId,
    } as Parameters<typeof ai.models.generateContent>[0]);

    return {
      text: response.text || "",
      fromCache: true,
      tokensSaved: cache.tokenCount,
    };
  } catch (error) {
    console.warn("[context-cache] Cache generation failed, falling back:", error);

    // フォールバック: キャッシュなしで生成
    const response = await ai.models.generateContent({
      model: cache.model,
      contents: prompt,
    });

    return {
      text: response.text || "",
      fromCache: false,
      tokensSaved: 0,
    };
  }
}

/**
 * キャッシュ統計を取得
 */
export async function getCacheStats(): Promise<{
  hasCache: boolean;
  cacheId?: string;
  model?: string;
  tokenCount?: number;
  createdAt?: string;
  expiresAt?: string;
  remainingTtlSeconds?: number;
  files?: string[];
}> {
  const cache = await getCurrentCache();

  if (!cache) {
    return { hasCache: false };
  }

  const now = new Date();
  const expiresAt = new Date(cache.expiresAt);
  const remainingTtlSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

  return {
    hasCache: true,
    cacheId: cache.cacheId,
    model: cache.model,
    tokenCount: cache.tokenCount,
    createdAt: cache.createdAt,
    expiresAt: cache.expiresAt,
    remainingTtlSeconds,
    files: cache.files,
  };
}

/**
 * 自動初期化（アプリ起動時に呼び出し）
 */
export async function initializeCache(): Promise<KnowledgeCache | null> {
  try {
    const existing = await getCurrentCache();

    if (existing) {
      console.log(`[context-cache] Using existing cache: ${existing.cacheId}`);
      return existing;
    }

    // 新規作成
    const cache = await createKnowledgeCache({
      files: STATIC_KNOWLEDGE_FILES,
    });

    return cache;
  } catch (error) {
    console.error("[context-cache] Failed to initialize cache:", error);
    return null;
  }
}
