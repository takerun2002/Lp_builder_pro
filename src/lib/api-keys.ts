/**
 * APIキー管理ユーティリティ
 * サーバーサイドでAPIキーを取得するヘルパー
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const KEYS_FILE = path.join(DATA_DIR, "api-keys.json");

// 環境変数名のマッピング
const ENV_VAR_MAPPING: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  manus: "MANUS_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  fal: "FAL_API_KEY",
  brightdata: "BRIGHTDATA_API_KEY",
  firecrawl: "FIRECRAWL_API_KEY",
};

interface StoredKeys {
  [keyId: string]: string;
}

async function loadStoredKeys(): Promise<StoredKeys> {
  try {
    if (!existsSync(KEYS_FILE)) {
      return {};
    }
    const content = await readFile(KEYS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * APIキーを取得するヘルパー関数（サーバーサイド用）
 * 環境変数 → ストレージの順で探す
 */
export async function getApiKey(keyId: string): Promise<string | null> {
  // 環境変数をチェック
  const envVarName = ENV_VAR_MAPPING[keyId];
  if (envVarName && process.env[envVarName]) {
    return process.env[envVarName] as string;
  }

  // ストレージをチェック
  const keys = await loadStoredKeys();
  return keys[keyId] || null;
}
