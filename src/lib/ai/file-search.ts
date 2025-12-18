/**
 * Gemini File Search Tool API
 * ナレッジベースのベクトル検索・RAG機能
 *
 * 参考: https://blog.google/technology/developers/file-search-gemini-api/
 */

import { getGeminiClient } from "./gemini";
import { getDb } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// Types
// =============================================================================

export interface IndexedFile {
  id: string;
  filename: string;
  filepath: string;
  tokenCount: number;
  indexedAt: string;
  status: "indexing" | "ready" | "error";
  errorMessage?: string;
}

export interface FileSearchConfig {
  indexedFiles: IndexedFile[];
  queryModel: string;
  autoSelectModel: boolean;
}

export interface RAGQuery {
  query: string;
  model?: string;
  maxResults?: number;
  includeContent?: boolean;
}

export interface Citation {
  source: string;
  section: string;
  content: string;
  relevance: number;
}

export interface RAGResult {
  answer: string;
  citations: Citation[];
  model: string;
  tokensUsed: number;
}

// =============================================================================
// Database Schema
// =============================================================================

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS file_search_index (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,
  token_count INTEGER DEFAULT 0,
  indexed_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'ready',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS file_search_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,
  FOREIGN KEY (file_id) REFERENCES file_search_index(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_search_chunks_file_id ON file_search_chunks(file_id);
`;

function ensureSchema(): void {
  const db = getDb();
  db.exec(INIT_SQL);
}

// =============================================================================
// File Search Manager
// =============================================================================

export class FileSearchManager {
  private embeddingModel = "gemini-embedding-001";
  private chunkSize = 1000; // tokens per chunk
  private chunkOverlap = 100;

  constructor() {
    ensureSchema();
  }

  /**
   * Index a file for search
   */
  async indexFile(filepath: string): Promise<IndexedFile> {
    const db = getDb();
    const ai = getGeminiClient();

    const filename = path.basename(filepath);
    const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(filepath, "utf-8");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to read file";
      return {
        id,
        filename,
        filepath,
        tokenCount: 0,
        indexedAt: new Date().toISOString(),
        status: "error",
        errorMessage,
      };
    }

    // Insert file record
    db.prepare(
      `INSERT INTO file_search_index (id, filename, filepath, content, status) VALUES (?, ?, ?, ?, ?)`
    ).run(id, filename, filepath, content, "indexing");

    try {
      // Split into chunks
      const chunks = this.splitIntoChunks(content);

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = `${id}_chunk_${i}`;

        // Generate embedding
        const embeddingResponse = await ai.models.embedContent({
          model: this.embeddingModel,
          contents: chunk,
        });

        const embedding = embeddingResponse.embeddings?.[0]?.values;

        db.prepare(
          `INSERT INTO file_search_chunks (id, file_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?, ?)`
        ).run(chunkId, id, i, chunk, JSON.stringify(embedding || []));
      }

      // Estimate token count
      const tokenCount = Math.ceil(content.length / 4);

      // Update file status
      db.prepare(
        `UPDATE file_search_index SET status = ?, token_count = ? WHERE id = ?`
      ).run("ready", tokenCount, id);

      return {
        id,
        filename,
        filepath,
        tokenCount,
        indexedAt: new Date().toISOString(),
        status: "ready",
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Indexing failed";
      db.prepare(`UPDATE file_search_index SET status = ?, error_message = ? WHERE id = ?`).run(
        "error",
        errorMessage,
        id
      );

      return {
        id,
        filename,
        filepath,
        tokenCount: 0,
        indexedAt: new Date().toISOString(),
        status: "error",
        errorMessage,
      };
    }
  }

  /**
   * Index all knowledge files
   */
  async indexKnowledgeFiles(): Promise<IndexedFile[]> {
    const knowledgeDir = path.join(process.cwd(), "src/lib/knowledge");
    const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".yaml"));

    const results: IndexedFile[] = [];
    for (const file of files) {
      const filepath = path.join(knowledgeDir, file);

      // Check if already indexed
      const existing = this.getIndexedFile(filepath);
      if (existing && existing.status === "ready") {
        results.push(existing);
        continue;
      }

      const result = await this.indexFile(filepath);
      results.push(result);
    }

    return results;
  }

  /**
   * Search indexed files
   */
  async search(query: string, maxResults: number = 5): Promise<Citation[]> {
    const db = getDb();
    const ai = getGeminiClient();

    // Generate query embedding
    const queryEmbedding = await ai.models.embedContent({
      model: this.embeddingModel,
      contents: query,
    });

    const queryVector = queryEmbedding.embeddings?.[0]?.values;
    if (!queryVector || queryVector.length === 0) {
      return [];
    }

    // Get all chunks with embeddings
    const chunks = db
      .prepare(
        `SELECT c.id, c.content, c.embedding, f.filename
         FROM file_search_chunks c
         JOIN file_search_index f ON c.file_id = f.id
         WHERE c.embedding IS NOT NULL AND f.status = 'ready'`
      )
      .all() as { id: string; content: string; embedding: string; filename: string }[];

    // Calculate cosine similarity
    const results = chunks
      .map((chunk) => {
        const chunkVector = JSON.parse(chunk.embedding) as number[];
        const similarity = this.cosineSimilarity(queryVector, chunkVector);
        return {
          source: chunk.filename,
          section: this.extractSection(chunk.content),
          content: chunk.content,
          relevance: similarity,
        };
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);

    return results;
  }

  /**
   * Get all indexed files
   */
  getIndexedFiles(): IndexedFile[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, filename, filepath, token_count, indexed_at, status, error_message
         FROM file_search_index`
      )
      .all() as {
      id: string;
      filename: string;
      filepath: string;
      token_count: number;
      indexed_at: string;
      status: string;
      error_message: string | null;
    }[];

    return rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      filepath: row.filepath,
      tokenCount: row.token_count,
      indexedAt: row.indexed_at,
      status: row.status as "indexing" | "ready" | "error",
      errorMessage: row.error_message || undefined,
    }));
  }

  /**
   * Get indexed file by filepath
   */
  getIndexedFile(filepath: string): IndexedFile | null {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, filename, filepath, token_count, indexed_at, status, error_message
         FROM file_search_index WHERE filepath = ?`
      )
      .get(filepath) as
      | {
          id: string;
          filename: string;
          filepath: string;
          token_count: number;
          indexed_at: string;
          status: string;
          error_message: string | null;
        }
      | undefined;

    if (!row) return null;

    return {
      id: row.id,
      filename: row.filename,
      filepath: row.filepath,
      tokenCount: row.token_count,
      indexedAt: row.indexed_at,
      status: row.status as "indexing" | "ready" | "error",
      errorMessage: row.error_message || undefined,
    };
  }

  /**
   * Delete indexed file
   */
  deleteIndexedFile(id: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM file_search_chunks WHERE file_id = ?`).run(id);
    db.prepare(`DELETE FROM file_search_index WHERE id = ?`).run(id);
  }

  /**
   * Reindex a file
   */
  async reindexFile(id: string): Promise<IndexedFile | null> {
    const db = getDb();
    const row = db.prepare(`SELECT filepath FROM file_search_index WHERE id = ?`).get(id) as
      | { filepath: string }
      | undefined;

    if (!row) return null;

    // Delete existing
    this.deleteIndexedFile(id);

    // Reindex
    return this.indexFile(row.filepath);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private splitIntoChunks(content: string): string[] {
    const chunks: string[] = [];
    const lines = content.split("\n");
    let currentChunk = "";

    for (const line of lines) {
      if (currentChunk.length + line.length > this.chunkSize * 4) {
        // Rough char-to-token
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }
        // Start new chunk with overlap
        const words = currentChunk.split(" ");
        const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 4));
        currentChunk = overlapWords.join(" ") + "\n" + line;
      } else {
        currentChunk += (currentChunk ? "\n" : "") + line;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private extractSection(content: string): string {
    // Try to extract section name from YAML-like content
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.endsWith(":") && !trimmed.startsWith("-")) {
        return trimmed.slice(0, -1);
      }
      if (trimmed.startsWith("name:")) {
        return trimmed.replace("name:", "").trim().replace(/["']/g, "");
      }
    }
    return "General";
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: FileSearchManager | null = null;

export function getFileSearchManager(): FileSearchManager {
  if (!instance) {
    instance = new FileSearchManager();
  }
  return instance;
}

// =============================================================================
// Convenience Functions
// =============================================================================

export async function indexKnowledgeBase(): Promise<IndexedFile[]> {
  const manager = getFileSearchManager();
  return manager.indexKnowledgeFiles();
}

export async function searchKnowledge(query: string, maxResults?: number): Promise<Citation[]> {
  const manager = getFileSearchManager();
  return manager.search(query, maxResults);
}

export function getIndexedFiles(): IndexedFile[] {
  const manager = getFileSearchManager();
  return manager.getIndexedFiles();
}
