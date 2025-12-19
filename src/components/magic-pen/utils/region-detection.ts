/**
 * 領域検出ユーティリティ
 *
 * マスクキャンバスから塗られた領域を検出し、
 * 境界ボックスや重心を計算する
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MaskRegion {
  id: string;
  number: number;
  boundingBox: BoundingBox;
  maskDataUrl: string;
  centroid: { x: number; y: number };
  prompt: string;
  status: "idle" | "generating" | "done" | "error";
  resultDataUrl?: string;
}

/**
 * ユニークIDを生成
 */
export function generateRegionId(): string {
  return `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * マスクキャンバスから境界ボックスを検出
 * 白いピクセル（alpha > 0）の範囲を検出
 */
export function detectBoundingBox(
  maskCanvas: HTMLCanvasElement,
  threshold: number = 10
): BoundingBox | null {
  const ctx = maskCanvas.getContext("2d");
  if (!ctx) return null;

  const { width, height } = maskCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasContent = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // アルファ値が0より大きいピクセルを検出
      if (data[idx + 3] > threshold) {
        hasContent = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasContent) return null;

  // パディングを追加
  const padding = 5;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * 境界ボックス内の重心を計算
 */
export function calculateCentroid(
  maskCanvas: HTMLCanvasElement,
  boundingBox: BoundingBox
): { x: number; y: number } {
  const ctx = maskCanvas.getContext("2d");
  if (!ctx) {
    return {
      x: boundingBox.x + boundingBox.width / 2,
      y: boundingBox.y + boundingBox.height / 2,
    };
  }

  const imageData = ctx.getImageData(
    boundingBox.x,
    boundingBox.y,
    boundingBox.width,
    boundingBox.height
  );

  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < boundingBox.height; y++) {
    for (let x = 0; x < boundingBox.width; x++) {
      const idx = (y * boundingBox.width + x) * 4;
      // アルファ値が0より大きいピクセルをカウント
      if (imageData.data[idx + 3] > 10) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count === 0) {
    return {
      x: boundingBox.x + boundingBox.width / 2,
      y: boundingBox.y + boundingBox.height / 2,
    };
  }

  return {
    x: boundingBox.x + sumX / count,
    y: boundingBox.y + sumY / count,
  };
}

/**
 * 現在のマスクをデータURLとして取得
 * 白黒マスク形式（塗った部分が白、それ以外が黒）
 */
export function getMaskDataUrl(
  maskCanvas: HTMLCanvasElement,
  invert: boolean = false
): string | null {
  const { width, height } = maskCanvas;
  const ctx = maskCanvas.getContext("2d");
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, width, height);
  let hasContent = false;

  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > 0) {
      hasContent = true;
      break;
    }
  }

  if (!hasContent) return null;

  // 白黒マスクを作成
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext("2d")!;

  if (invert) {
    // 保護モード: 塗った部分が黒（保護）、それ以外が白（編集対象）
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, width, height);
    outCtx.globalCompositeOperation = "destination-out";
    outCtx.drawImage(maskCanvas, 0, 0);
    outCtx.globalCompositeOperation = "source-over";
  } else {
    // 通常モード: 塗った部分が白（編集対象）、それ以外が黒
    outCtx.fillStyle = "#000000";
    outCtx.fillRect(0, 0, width, height);
    outCtx.drawImage(maskCanvas, 0, 0);
  }

  return outputCanvas.toDataURL("image/png");
}

/**
 * 特定の領域のみのマスクを抽出
 */
export function extractRegionMask(
  maskCanvas: HTMLCanvasElement,
  boundingBox: BoundingBox
): string {
  const { width, height } = maskCanvas;

  // 全体サイズのキャンバスを作成
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const ctx = outputCanvas.getContext("2d")!;

  // 背景を黒で塗りつぶし
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // 領域部分のみコピー
  ctx.drawImage(
    maskCanvas,
    boundingBox.x,
    boundingBox.y,
    boundingBox.width,
    boundingBox.height,
    boundingBox.x,
    boundingBox.y,
    boundingBox.width,
    boundingBox.height
  );

  return outputCanvas.toDataURL("image/png");
}

/**
 * 領域が十分な大きさかチェック
 */
export function isValidRegion(boundingBox: BoundingBox, minSize: number = 10): boolean {
  return boundingBox.width >= minSize && boundingBox.height >= minSize;
}

/**
 * 2つの境界ボックスが重なっているかチェック
 */
export function boundingBoxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/**
 * 2つの境界ボックスをマージ
 */
export function mergeBoundingBoxes(a: BoundingBox, b: BoundingBox): BoundingBox {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
