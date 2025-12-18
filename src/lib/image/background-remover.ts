/**
 * Background Remover
 * @imgly/background-removal を使用したWebAssemblyベースの背景除去
 *
 * ローカル完結（外部API不要）、処理時間: 5-10秒目標
 * 参考: https://qiita.com/ijma34/items/b95485706fb54c89951c
 */

import { removeBackground, Config } from "@imgly/background-removal";

// =============================================================================
// Types
// =============================================================================

export interface RemoveBgOptions {
  /** モデルの精度（default: 'medium'） */
  quality?: "low" | "medium" | "high";
  /** 出力フォーマット */
  outputFormat?: "png" | "webp";
  /** 進捗コールバック */
  onProgress?: (progress: number) => void;
}

export interface RemoveBgResult {
  /** 背景除去後の画像Blob */
  blob: Blob;
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
  /** 入力画像サイズ */
  inputSize: { width: number; height: number };
  /** 出力画像サイズ */
  outputSize: { width: number; height: number };
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * 画像から背景を除去
 */
export async function removeBackgroundFromImage(
  imageSource: Blob | File | string,
  options: RemoveBgOptions = {}
): Promise<RemoveBgResult> {
  const startTime = Date.now();
  const quality = options.quality || "medium";

  // 設定を構築
  const config: Config = {
    output: {
      format: options.outputFormat === "webp" ? "image/webp" : "image/png",
      quality: 0.9,
    },
    progress: options.onProgress
      ? (key: string, current: number, total: number) => {
          const progress = total > 0 ? (current / total) * 100 : 0;
          options.onProgress?.(progress);
        }
      : undefined,
  };

  // 入力画像のサイズを取得
  const inputSize = await getImageSize(imageSource);

  // 背景除去実行
  const resultBlob = await removeBackground(imageSource, config);

  // 出力画像のサイズを取得
  const outputSize = await getImageSize(resultBlob);

  const processingTimeMs = Date.now() - startTime;

  console.log(
    `[background-remover] Completed in ${processingTimeMs}ms, ` +
      `quality: ${quality}, ` +
      `input: ${inputSize.width}x${inputSize.height}, ` +
      `output: ${outputSize.width}x${outputSize.height}`
  );

  return {
    blob: resultBlob,
    processingTimeMs,
    inputSize,
    outputSize,
  };
}

/**
 * Base64画像から背景を除去
 */
export async function removeBackgroundFromBase64(
  base64Data: string,
  options: RemoveBgOptions = {}
): Promise<{ base64: string; processingTimeMs: number }> {
  // Base64をBlobに変換
  const blob = base64ToBlob(base64Data);

  // 背景除去
  const result = await removeBackgroundFromImage(blob, options);

  // 結果をBase64に変換
  const resultBase64 = await blobToBase64(result.blob);

  return {
    base64: resultBase64,
    processingTimeMs: result.processingTimeMs,
  };
}

/**
 * URLから画像を取得して背景除去
 */
export async function removeBackgroundFromUrl(
  imageUrl: string,
  options: RemoveBgOptions = {}
): Promise<RemoveBgResult> {
  // 画像をフェッチ
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  return removeBackgroundFromImage(blob, options);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * 画像のサイズを取得
 */
async function getImageSize(
  source: Blob | File | string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(img.src);
    };

    if (typeof source === "string") {
      // URLまたはBase64
      img.src = source;
    } else {
      // BlobまたはFile
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Base64文字列をBlobに変換
 */
function base64ToBlob(base64: string): Blob {
  // data:image/xxx;base64, プレフィックスを除去
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // MIMEタイプを推定
  const mimeType = base64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/png";

  return new Blob([bytes], { type: mimeType });
}

/**
 * BlobをBase64に変換
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 処理時間の推定（画像サイズに基づく）
 */
export function estimateProcessingTime(
  width: number,
  height: number,
  quality: "low" | "medium" | "high" = "medium"
): number {
  const pixels = width * height;

  // 基準: 1Mpixで約3秒（mediumモデル）
  const baseTime = {
    low: 1500,
    medium: 3000,
    high: 6000,
  };

  const estimatedMs = (pixels / 1000000) * baseTime[quality];

  return Math.max(1000, Math.min(30000, estimatedMs));
}

/**
 * 画像が背景除去に適しているか検証
 */
export function validateImageForRemoval(
  width: number,
  height: number
): { valid: boolean; message?: string } {
  // 最小サイズ
  if (width < 32 || height < 32) {
    return {
      valid: false,
      message: "画像が小さすぎます（最小32x32ピクセル）",
    };
  }

  // 最大サイズ（メモリ考慮）
  if (width > 4096 || height > 4096) {
    return {
      valid: false,
      message: "画像が大きすぎます（最大4096x4096ピクセル）",
    };
  }

  // アスペクト比チェック
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  if (aspectRatio > 10) {
    return {
      valid: false,
      message: "アスペクト比が極端です（最大1:10）",
    };
  }

  return { valid: true };
}
