/**
 * Blank Canvas Generator
 * 白紙キャンバスを生成し、参考画像として使用することで
 * 画像生成の精度を向上させる
 *
 * 参考: easy_banana の白紙キャンバス機能
 * - 白紙を参考画像にしてマージすると出力精度UP
 * - 特に漫画/イラスト系で効果的
 */

import { type SizePreset, validateSize } from "./size-presets";

// =============================================================================
// Types
// =============================================================================

export interface BlankCanvasOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  format?: "png" | "jpeg";
  quality?: number; // 0-1 for JPEG
  border?: {
    width: number;
    color: string;
  };
  guideLine?: boolean; // Add guide lines for composition
}

export interface GeneratedCanvas {
  dataUrl: string;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

// =============================================================================
// Canvas Generation (Browser)
// =============================================================================

/**
 * Generate a blank canvas as a data URL
 * This runs in the browser using the Canvas API
 */
export function generateBlankCanvas(options: BlankCanvasOptions): GeneratedCanvas {
  const {
    width,
    height,
    backgroundColor = "#FFFFFF",
    format = "png",
    quality = 0.92,
    border,
    guideLine = false,
  } = options;

  // Validate size
  const validation = validateSize(width, height);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Add border if specified
  if (border) {
    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width;
    ctx.strokeRect(
      border.width / 2,
      border.width / 2,
      width - border.width,
      height - border.width
    );
  }

  // Add guide lines if specified (rule of thirds)
  if (guideLine) {
    ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Vertical thirds
    const thirdW = width / 3;
    ctx.beginPath();
    ctx.moveTo(thirdW, 0);
    ctx.lineTo(thirdW, height);
    ctx.moveTo(thirdW * 2, 0);
    ctx.lineTo(thirdW * 2, height);

    // Horizontal thirds
    const thirdH = height / 3;
    ctx.moveTo(0, thirdH);
    ctx.lineTo(width, thirdH);
    ctx.moveTo(0, thirdH * 2);
    ctx.lineTo(width, thirdH * 2);
    ctx.stroke();

    // Center cross
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(200, 200, 200, 0.3)";
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  // Convert to data URL
  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
  const dataUrl = canvas.toDataURL(mimeType, format === "jpeg" ? quality : undefined);

  // Calculate size
  const base64 = dataUrl.split(",")[1];
  const sizeBytes = Math.ceil((base64.length * 3) / 4);

  return {
    dataUrl,
    width,
    height,
    format,
    sizeBytes,
  };
}

/**
 * Generate blank canvas from a preset
 */
export function generateBlankCanvasFromPreset(
  preset: SizePreset,
  options?: Partial<Omit<BlankCanvasOptions, "width" | "height">>
): GeneratedCanvas {
  return generateBlankCanvas({
    width: preset.width,
    height: preset.height,
    ...options,
  });
}

// =============================================================================
// Canvas Generation (Server-side compatible)
// =============================================================================

/**
 * Generate a simple white PNG as base64 (no Canvas API needed)
 * This can be used server-side or as a fallback
 * Note: The width and height parameters are reserved for future implementation
 * of actual dynamic image generation on the server side
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateSimpleWhiteImage(width: number, height: number): string {
  // For simple cases, we can generate a minimal PNG
  // This is a 1x1 white pixel PNG that can be used as a placeholder
  // For actual use, the browser-based generateBlankCanvas should be preferred
  // Future: implement actual server-side image generation with sharp or similar

  // Minimal white 1x1 PNG in base64
  const minimalWhitePNG =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

  return `data:image/png;base64,${minimalWhitePNG}`;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type: mimeType });
}

/**
 * Convert data URL to File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}

/**
 * Download canvas as file
 */
export function downloadCanvas(canvas: GeneratedCanvas, filename?: string): void {
  const extension = canvas.format === "jpeg" ? "jpg" : "png";
  const name = filename || `blank_${canvas.width}x${canvas.height}.${extension}`;

  const link = document.createElement("a");
  link.href = canvas.dataUrl;
  link.download = name;
  link.click();
}

/**
 * Create a canvas with specific background color for better AI generation
 */
export function createReferenceCanvas(
  width: number,
  height: number,
  style: "clean" | "manga" | "photo" | "illustration" = "clean"
): GeneratedCanvas {
  const styleConfigs = {
    clean: {
      backgroundColor: "#FFFFFF",
      guideLine: false,
    },
    manga: {
      backgroundColor: "#FFFFFF",
      border: { width: 2, color: "#000000" },
      guideLine: true,
    },
    photo: {
      backgroundColor: "#F5F5F5",
      guideLine: true,
    },
    illustration: {
      backgroundColor: "#FAFAFA",
      guideLine: false,
    },
  };

  const config = styleConfigs[style];

  return generateBlankCanvas({
    width,
    height,
    ...config,
  });
}

// =============================================================================
// Reference Image Utilities
// =============================================================================

/**
 * Check if a data URL is a blank/white image
 */
export function isBlankImage(dataUrl: string): boolean {
  // Simple heuristic: blank images have very small base64 size
  const base64 = dataUrl.split(",")[1];
  // A mostly white image should compress well
  return base64.length < 1000;
}

/**
 * Get recommended canvas style for a given use case
 */
export function getRecommendedCanvasStyle(
  useCase: string
): "clean" | "manga" | "photo" | "illustration" {
  const useCaseMap: Record<string, "clean" | "manga" | "photo" | "illustration"> = {
    lp: "clean",
    website: "clean",
    manga: "manga",
    comic: "manga",
    photo: "photo",
    product: "photo",
    illustration: "illustration",
    art: "illustration",
    banner: "clean",
    thumbnail: "photo",
  };

  return useCaseMap[useCase.toLowerCase()] || "clean";
}

/**
 * Generate multiple reference canvases for comparison
 */
export function generateCanvasVariants(
  width: number,
  height: number
): Record<string, GeneratedCanvas> {
  return {
    clean: createReferenceCanvas(width, height, "clean"),
    manga: createReferenceCanvas(width, height, "manga"),
    photo: createReferenceCanvas(width, height, "photo"),
    illustration: createReferenceCanvas(width, height, "illustration"),
  };
}
