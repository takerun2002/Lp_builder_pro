/**
 * 動的モデル選択システム
 * easy_banana参考: モデル設定の動的管理
 */

// ============================================
// 型定義
// ============================================

export type ModelProvider = "gemini" | "openrouter" | "openai" | "anthropic" | "fal";
export type ModelCapability = "text" | "image_generation" | "image_editing" | "vision" | "code";

export interface ModelConfig {
  /** モデルID（内部識別子） */
  id: string;
  /** 表示名 */
  label: string;
  /** プロバイダー */
  provider: ModelProvider;
  /** モデル名（API用） */
  model: string;
  /** APIエンドポイント（オプション） */
  endpoint?: string;
  /** タイムアウト（秒） */
  timeoutSec: number;
  /** 対応機能 */
  capabilities: ModelCapability[];
  /** テキスト生成対応 */
  text_generation?: boolean;
  /** 画像生成対応 */
  text_to_image?: boolean;
  /** 画像編集対応 */
  image_to_image?: boolean;
  /** ビジョン対応 */
  vision?: boolean;
  /** サイズ指定対応 */
  size?: boolean;
  /** デフォルト幅 */
  default_width?: number;
  /** デフォルト高さ */
  default_height?: number;
  /** アスペクト比選択肢 */
  aspectRatios?: string[];
  /** デフォルトアスペクト比 */
  defaultAspectRatio?: string;
  /** デフォルトで選択 */
  default?: boolean;
  /** システムプロンプト */
  systemPrompt?: string;
  /** 1Kトークンあたりの入力コスト（USD） */
  inputCostPer1k?: number;
  /** 1Kトークンあたりの出力コスト（USD） */
  outputCostPer1k?: number;
  /** 説明 */
  description?: string;
  /** 有効/無効 */
  enabled: boolean;
}

export interface ModelCategory {
  id: string;
  name: string;
  description: string;
  models: ModelConfig[];
}

// ============================================
// デフォルトモデル設定
// ============================================

export const DEFAULT_MODELS: ModelConfig[] = [
  // --- Gemini Text Models ---
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    timeoutSec: 60,
    capabilities: ["text", "vision", "code"],
    text_generation: true,
    vision: true,
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
    description: "高速・低コストのテキスト生成モデル",
    default: true,
    enabled: true,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "gemini",
    model: "gemini-2.5-pro",
    timeoutSec: 120,
    capabilities: ["text", "vision", "code"],
    text_generation: true,
    vision: true,
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
    description: "高精度のテキスト生成モデル",
    enabled: true,
  },
  {
    id: "gemini-3-pro-preview",
    label: "Gemini 3.0 Pro Preview",
    provider: "gemini",
    model: "gemini-3-pro-preview",
    timeoutSec: 120,
    capabilities: ["text", "vision", "code"],
    text_generation: true,
    vision: true,
    description: "最新プレビュー版（実験的）",
    enabled: true,
  },

  // --- Gemini Image Models ---
  {
    id: "gemini-3-pro-image-preview",
    label: "Gemini 3.0 Pro Image",
    provider: "gemini",
    model: "gemini-3-pro-image-preview",
    timeoutSec: 90,
    capabilities: ["image_generation", "image_editing"],
    text_to_image: true,
    image_to_image: true,
    systemPrompt:
      "You are an expert assistant for single-shot image generation. Do not ask follow-up questions. Immediately produce images from the user's prompt.",
    description: "Gemini画像生成モデル（推奨）",
    default: true,
    enabled: true,
  },

  // --- fal.ai Models ---
  {
    id: "fal-nano-banana",
    label: "Nano Banana (Text to Image)",
    provider: "fal",
    model: "fal-ai/nano-banana",
    endpoint: "https://queue.fal.run/fal-ai/nano-banana",
    timeoutSec: 60,
    capabilities: ["image_generation"],
    text_to_image: true,
    image_to_image: false,
    description: "高速マンガ・イラスト生成",
    enabled: true,
  },
  {
    id: "fal-nano-banana-edit",
    label: "Nano Banana (Image Edit)",
    provider: "fal",
    model: "fal-ai/nano-banana/edit",
    endpoint: "https://queue.fal.run/fal-ai/nano-banana/edit",
    timeoutSec: 60,
    capabilities: ["image_editing"],
    text_to_image: false,
    image_to_image: true,
    description: "高速マンガ・イラスト編集",
    enabled: true,
  },
  {
    id: "fal-nano-banana-pro",
    label: "Nano Banana Pro (Text to Image)",
    provider: "fal",
    model: "fal-ai/nano-banana-pro",
    endpoint: "https://queue.fal.run/fal-ai/nano-banana-pro",
    timeoutSec: 300,
    capabilities: ["image_generation"],
    text_to_image: true,
    image_to_image: false,
    aspectRatios: ["21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"],
    defaultAspectRatio: "1:1",
    description: "高品質マンガ・イラスト生成",
    enabled: true,
  },
  {
    id: "fal-seedream-t2i",
    label: "SeeDream v4 (Text to Image)",
    provider: "fal",
    model: "fal-ai/bytedance/seedream/v4/text-to-image",
    endpoint: "https://queue.fal.run/fal-ai/bytedance/seedream/v4/text-to-image",
    timeoutSec: 60,
    capabilities: ["image_generation"],
    text_to_image: true,
    size: true,
    default_width: 1920,
    default_height: 1080,
    description: "ByteDance製高品質画像生成",
    enabled: true,
  },

  // --- OpenRouter Models ---
  {
    id: "openrouter-claude-sonnet",
    label: "Claude 3.5 Sonnet (via OpenRouter)",
    provider: "openrouter",
    model: "anthropic/claude-3.5-sonnet",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    timeoutSec: 120,
    capabilities: ["text", "vision", "code"],
    text_generation: true,
    vision: true,
    description: "高精度コード生成・分析",
    enabled: false, // デフォルト無効
  },
  {
    id: "openrouter-gpt-4o",
    label: "GPT-4o (via OpenRouter)",
    provider: "openrouter",
    model: "openai/gpt-4o",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    timeoutSec: 120,
    capabilities: ["text", "vision", "code"],
    text_generation: true,
    vision: true,
    description: "OpenAI最新マルチモーダルモデル",
    enabled: false, // デフォルト無効
  },
];

// ============================================
// モデルカテゴリ
// ============================================

export const MODEL_CATEGORIES: ModelCategory[] = [
  {
    id: "text",
    name: "テキスト生成",
    description: "文章生成、分析、コード生成に使用",
    models: DEFAULT_MODELS.filter((m) => m.text_generation),
  },
  {
    id: "image_generation",
    name: "画像生成",
    description: "テキストから画像を生成",
    models: DEFAULT_MODELS.filter((m) => m.text_to_image),
  },
  {
    id: "image_editing",
    name: "画像編集",
    description: "既存画像の編集・加工",
    models: DEFAULT_MODELS.filter((m) => m.image_to_image),
  },
];

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 機能に対応するモデル一覧を取得
 */
export function getModelsByCapability(capability: ModelCapability): ModelConfig[] {
  return DEFAULT_MODELS.filter(
    (m) => m.enabled && m.capabilities.includes(capability)
  );
}

/**
 * デフォルトモデルを取得（機能別）
 */
export function getDefaultModel(capability: ModelCapability): ModelConfig | undefined {
  const models = getModelsByCapability(capability);
  return models.find((m) => m.default) || models[0];
}

/**
 * モデルIDからモデル設定を取得
 */
export function getModelById(id: string): ModelConfig | undefined {
  return DEFAULT_MODELS.find((m) => m.id === id);
}

/**
 * テキスト生成用のデフォルトモデル名を取得
 */
export function getDefaultTextModel(): string {
  const envModel = process.env.GEMINI_TEXT_MODEL;
  if (envModel) return envModel;

  const defaultModel = getDefaultModel("text");
  return defaultModel?.model || "gemini-2.5-flash";
}

/**
 * 画像生成用のデフォルトモデル名を取得
 */
export function getDefaultImageModel(): string {
  const envModel = process.env.GEMINI_IMAGE_MODEL;
  if (envModel) return envModel;

  const defaultModel = getDefaultModel("image_generation");
  return defaultModel?.model || "gemini-3-pro-image-preview";
}

/**
 * プロバイダー別のモデル一覧を取得
 */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return DEFAULT_MODELS.filter((m) => m.enabled && m.provider === provider);
}

/**
 * モデル情報の概要を生成
 */
export function getModelSummary(model: ModelConfig): string {
  const caps = [];
  if (model.text_generation) caps.push("テキスト");
  if (model.text_to_image) caps.push("画像生成");
  if (model.image_to_image) caps.push("画像編集");
  if (model.vision) caps.push("ビジョン");

  return `${model.label} (${caps.join(", ")})`;
}

// ============================================
// モデル選択のための設定
// ============================================

export interface ModelPreferences {
  /** テキスト生成に使用するモデルID */
  textModelId: string;
  /** 画像生成に使用するモデルID */
  imageModelId: string;
  /** 画像編集に使用するモデルID */
  imageEditModelId: string;
  /** フォールバックを許可 */
  allowFallback: boolean;
}

export const DEFAULT_PREFERENCES: ModelPreferences = {
  textModelId: "gemini-2.5-flash",
  imageModelId: "gemini-3-pro-image-preview",
  imageEditModelId: "gemini-3-pro-image-preview",
  allowFallback: true,
};

/**
 * フォールバックチェーン
 * エラー時に次のモデルを試行
 */
export const FALLBACK_CHAINS: Record<string, string[]> = {
  text: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3-pro-preview"],
  image_generation: ["gemini-3-pro-image-preview", "fal-nano-banana", "fal-seedream-t2i"],
  image_editing: ["gemini-3-pro-image-preview", "fal-nano-banana-edit"],
};
