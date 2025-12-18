import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * APIキー管理エンドポイント
 * 
 * 対応キー:
 * - openrouter: OpenRouter API（Nemotron, Perplexity, Claude等）
 * - manus: Manus AI API（動的スクレイピング）
 * - perplexity: Perplexity API（直接）
 * - fal: fal.ai API（画像生成）
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const KEYS_FILE = path.join(DATA_DIR, "api-keys.json");

// 許可されたキーID
const ALLOWED_KEY_IDS = ["openrouter", "manus", "perplexity", "fal", "brightdata", "firecrawl"];

// 環境変数名のマッピング（参照用・src/lib/api-keys.tsで使用）
const _ENV_VAR_MAPPING: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  manus: "MANUS_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  fal: "FAL_API_KEY",
  brightdata: "BRIGHTDATA_API_KEY",
  firecrawl: "FIRECRAWL_API_KEY",
};
void _ENV_VAR_MAPPING; // ESLint対策

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

async function saveStoredKeys(keys: StoredKeys): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
}

/**
 * POST: APIキーを保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyId, value } = body as { keyId: string; value: string };

    if (!keyId || !value) {
      return NextResponse.json({ ok: false, error: "keyId and value are required" }, { status: 400 });
    }

    if (!ALLOWED_KEY_IDS.includes(keyId)) {
      return NextResponse.json({ ok: false, error: `Invalid keyId: ${keyId}` }, { status: 400 });
    }

    // 既存のキーを読み込み
    const keys = await loadStoredKeys();
    
    // 新しいキーを追加
    keys[keyId] = value;
    
    // 保存
    await saveStoredKeys(keys);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save API key:", error);
    return NextResponse.json({ ok: false, error: "保存に失敗しました" }, { status: 500 });
  }
}

/**
 * DELETE: APIキーを削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");

    if (!keyId) {
      return NextResponse.json({ ok: false, error: "keyId is required" }, { status: 400 });
    }

    if (!ALLOWED_KEY_IDS.includes(keyId)) {
      return NextResponse.json({ ok: false, error: `Invalid keyId: ${keyId}` }, { status: 400 });
    }

    // 既存のキーを読み込み
    const keys = await loadStoredKeys();
    
    // キーを削除
    delete keys[keyId];
    
    // 保存
    await saveStoredKeys(keys);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return NextResponse.json({ ok: false, error: "削除に失敗しました" }, { status: 500 });
  }
}

/**
 * GET: APIキーの取得（内部用、値は返さない）
 */
export async function GET() {
  try {
    const keys = await loadStoredKeys();
    
    // キーの値は返さず、存在するかどうかだけを返す
    const result: Record<string, boolean> = {};
    for (const keyId of ALLOWED_KEY_IDS) {
      result[keyId] = !!keys[keyId];
    }
    
    return NextResponse.json({ ok: true, keys: result });
  } catch (error) {
    console.error("Failed to get API keys:", error);
    return NextResponse.json({ ok: false, error: "取得に失敗しました" }, { status: 500 });
  }
}

// ヘルパー関数は src/lib/api-keys.ts に移動
// import { getApiKey } from "@/lib/api-keys";

