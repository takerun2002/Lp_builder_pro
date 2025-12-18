/**
 * Canvas レンダラー
 * バナーエディターのCanvas描画ロジック
 */

import { TextLayer } from "./text-layer";
import { ExportOptions } from "./banner-editor";

// =============================================================================
// 描画関数
// =============================================================================

/**
 * テキストレイヤーを描画
 */
export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  isSelected: boolean = false
): void {
  if (!layer.visible) return;

  ctx.save();

  // 不透明度
  ctx.globalAlpha = layer.opacity;

  // 回転
  if (layer.rotation !== 0) {
    ctx.translate(layer.x, layer.y);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-layer.x, -layer.y);
  }

  // フォント設定
  const fontStyle = `${layer.italic ? "italic " : ""}${
    layer.bold ? "bold " : ""
  }${layer.fontSize}px "${layer.fontFamily}"`;
  ctx.font = fontStyle;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "top";

  // テキストを行ごとに分割
  const lines = layer.text.split("\n");
  const lineHeight = layer.fontSize * 1.2;

  // 各行を描画
  lines.forEach((line, index) => {
    const y = layer.y + index * lineHeight;

    // シャドウ
    if (layer.shadow.enabled) {
      ctx.shadowColor = layer.shadow.color;
      ctx.shadowBlur = layer.shadow.blur;
      ctx.shadowOffsetX = layer.shadow.offsetX;
      ctx.shadowOffsetY = layer.shadow.offsetY;
    }

    // ストローク（縁取り）
    if (layer.stroke.enabled) {
      ctx.strokeStyle = layer.stroke.color;
      ctx.lineWidth = layer.stroke.width * 2;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(line, layer.x, y);
    }

    // シャドウをリセット（ストロークにのみ適用しないように）
    if (layer.stroke.enabled && layer.shadow.enabled) {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // テキスト本体
    ctx.fillStyle = layer.color;
    ctx.fillText(line, layer.x, y);

    // 下線
    if (layer.underline) {
      const textWidth = ctx.measureText(line).width;
      let startX = layer.x;
      if (layer.align === "center") {
        startX -= textWidth / 2;
      } else if (layer.align === "right") {
        startX -= textWidth;
      }

      ctx.beginPath();
      ctx.moveTo(startX, y + layer.fontSize + 2);
      ctx.lineTo(startX + textWidth, y + layer.fontSize + 2);
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = Math.max(1, layer.fontSize / 20);
      ctx.stroke();
    }
  });

  ctx.restore();

  // 選択状態の境界ボックス
  if (isSelected) {
    drawSelectionBox(ctx, layer);
  }
}

/**
 * 選択ボックスを描画
 */
function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer
): void {
  ctx.save();

  const bounds = getTextBounds(ctx, layer);

  // 破線の境界ボックス
  ctx.strokeStyle = "#0066ff";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);

  // コーナーハンドル
  const handleSize = 8;
  ctx.fillStyle = "#0066ff";
  ctx.setLineDash([]);

  // 左上
  ctx.fillRect(
    bounds.x - 5 - handleSize / 2,
    bounds.y - 5 - handleSize / 2,
    handleSize,
    handleSize
  );
  // 右上
  ctx.fillRect(
    bounds.x + bounds.width + 5 - handleSize / 2,
    bounds.y - 5 - handleSize / 2,
    handleSize,
    handleSize
  );
  // 左下
  ctx.fillRect(
    bounds.x - 5 - handleSize / 2,
    bounds.y + bounds.height + 5 - handleSize / 2,
    handleSize,
    handleSize
  );
  // 右下
  ctx.fillRect(
    bounds.x + bounds.width + 5 - handleSize / 2,
    bounds.y + bounds.height + 5 - handleSize / 2,
    handleSize,
    handleSize
  );

  ctx.restore();
}

/**
 * テキストの境界を取得
 */
export function getTextBounds(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer
): { x: number; y: number; width: number; height: number } {
  const fontStyle = `${layer.italic ? "italic " : ""}${
    layer.bold ? "bold " : ""
  }${layer.fontSize}px "${layer.fontFamily}"`;
  ctx.font = fontStyle;

  const lines = layer.text.split("\n");
  const lineHeight = layer.fontSize * 1.2;
  const maxWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line).width)
  );
  const totalHeight = lines.length * lineHeight;

  let x = layer.x;
  if (layer.align === "center") {
    x -= maxWidth / 2;
  } else if (layer.align === "right") {
    x -= maxWidth;
  }

  return {
    x,
    y: layer.y,
    width: maxWidth,
    height: totalHeight,
  };
}

/**
 * 全レイヤーを描画
 */
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  backgroundImage: HTMLImageElement | null,
  layers: TextLayer[],
  selectedLayerId: string | null,
  canvasWidth: number,
  canvasHeight: number
): void {
  // キャンバスをクリア
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 背景画像を描画
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
  } else {
    // デフォルト背景（チェッカーボード）
    drawCheckerboard(ctx, canvasWidth, canvasHeight);
  }

  // レイヤーを描画（下から上へ）
  layers.forEach((layer) => {
    drawTextLayer(ctx, layer, layer.id === selectedLayerId);
  });
}

/**
 * チェッカーボード背景を描画（透明を示す）
 */
function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const cellSize = 20;
  const colors = ["#ffffff", "#e0e0e0"];

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const colorIndex = ((x / cellSize) + (y / cellSize)) % 2;
      ctx.fillStyle = colors[colorIndex];
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

// =============================================================================
// エクスポート関数
// =============================================================================

/**
 * キャンバスをエクスポート
 */
export async function exportCanvas(
  canvas: HTMLCanvasElement,
  backgroundImage: HTMLImageElement | null,
  layers: TextLayer[],
  options: ExportOptions
): Promise<Blob> {
  const { format, quality = 92, width, height, scale = 1 } = options;

  // エクスポート用キャンバスを作成
  const exportCanvas = document.createElement("canvas");
  const targetWidth = width || canvas.width * scale;
  const targetHeight = height || canvas.height * scale;

  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;

  const ctx = exportCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // スケーリング
  const scaleX = targetWidth / canvas.width;
  const scaleY = targetHeight / canvas.height;
  ctx.scale(scaleX, scaleY);

  // 背景を描画
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    // 白背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // レイヤーを描画
  layers.filter((l) => l.visible).forEach((layer) => {
    drawTextLayer(ctx, layer, false);
  });

  // Blobに変換
  return new Promise((resolve, reject) => {
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      format === "jpeg" ? "image/jpeg" : "image/png",
      quality / 100
    );
  });
}

/**
 * キャンバスをDataURLに変換
 */
export function canvasToDataURL(
  canvas: HTMLCanvasElement,
  backgroundImage: HTMLImageElement | null,
  layers: TextLayer[],
  options: ExportOptions
): string {
  const { format, quality = 92 } = options;

  // エクスポート用キャンバスを作成
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;

  const ctx = exportCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // 背景を描画
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // レイヤーを描画
  layers.filter((l) => l.visible).forEach((layer) => {
    drawTextLayer(ctx, layer, false);
  });

  return exportCanvas.toDataURL(
    format === "jpeg" ? "image/jpeg" : "image/png",
    quality / 100
  );
}

/**
 * 画像をダウンロード
 */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 画像をクリップボードにコピー
 */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
  } catch (error) {
    console.error("Failed to copy image to clipboard:", error);
    throw error;
  }
}
