import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * 全APIキーの状態を取得するエンドポイント
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const KEYS_FILE = path.join(DATA_DIR, "api-keys.json");

// キーIDと環境変数のマッピング
const KEY_ENV_MAPPING: Record<string, string> = {
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

interface KeyStatus {
  configured: boolean;
  source: "env" | "stored" | "none";
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

export async function GET() {
  try {
    const storedKeys = await loadStoredKeys();
    
    const result: Record<string, KeyStatus> = {};
    
    for (const [keyId, envVarName] of Object.entries(KEY_ENV_MAPPING)) {
      // 環境変数をチェック
      if (process.env[envVarName]) {
        result[keyId] = { configured: true, source: "env" };
      }
      // ストレージをチェック
      else if (storedKeys[keyId]) {
        result[keyId] = { configured: true, source: "stored" };
      }
      // 未設定
      else {
        result[keyId] = { configured: false, source: "none" };
      }
    }
    
    return NextResponse.json({ ok: true, keys: result });
  } catch (error) {
    console.error("Failed to get API key statuses:", error);
    return NextResponse.json({ ok: false, error: "取得に失敗しました" }, { status: 500 });
  }
}

