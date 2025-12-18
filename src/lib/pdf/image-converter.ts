/**
 * PDF Image Converter
 * PDFを画像（PNG/JPEG）に変換
 */

// =============================================================================
// Types
// =============================================================================

export interface ImageConvertOptions {
  /** DPI（150/300/600） */
  dpi?: number;
  /** 画像品質（0-100） */
  quality?: number;
  /** 出力フォーマット */
  format?: "png" | "jpeg";
  /** 特定ページのみ処理 */
  pageRange?: { start: number; end: number };
  /** 背景色（JPEG用） */
  backgroundColor?: string;
}

export interface ImageConvertResult {
  /** 画像データ（Base64） */
  images: PageImage[];
  /** ページ数 */
  pageCount: number;
  /** 設定 */
  settings: {
    dpi: number;
    format: string;
    quality: number;
  };
}

export interface PageImage {
  pageNumber: number;
  /** Base64エンコード画像データ（data:image/...形式） */
  dataUrl: string;
  /** 画像サイズ */
  width: number;
  height: number;
  /** ファイルサイズ（バイト） */
  fileSize: number;
}

// =============================================================================
// Image Conversion
// =============================================================================

/**
 * PDFを画像に変換
 */
export async function convertPDFToImages(
  pdfBuffer: ArrayBuffer,
  options: ImageConvertOptions = {}
): Promise<ImageConvertResult> {
  const pdfjsLib = await import("pdfjs-dist");

  // デフォルト設定
  const dpi = options.dpi || 150;
  const format = options.format || "png";
  const quality = options.quality || 85;
  const backgroundColor = options.backgroundColor || "#ffffff";

  // PDF読み込み
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const pageCount = pdf.numPages;

  // ページ範囲を決定
  const startPage = options.pageRange?.start || 1;
  const endPage = Math.min(options.pageRange?.end || pageCount, pageCount);

  const images: PageImage[] = [];

  // 各ページを画像に変換
  for (let i = startPage; i <= endPage; i++) {
    const pageImage = await convertPageToImage(pdf, i, {
      dpi,
      format,
      quality,
      backgroundColor,
    });
    images.push(pageImage);
  }

  return {
    images,
    pageCount,
    settings: { dpi, format, quality },
  };
}

/**
 * 単一ページを画像に変換
 */
async function convertPageToImage(
  pdf: Awaited<ReturnType<typeof import("pdfjs-dist").getDocument>["promise"]>,
  pageNumber: number,
  options: {
    dpi: number;
    format: "png" | "jpeg";
    quality: number;
    backgroundColor: string;
  }
): Promise<PageImage> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: options.dpi / 72 });

  // Node.js環境ではcanvasパッケージを使用
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createCanvas } = await import(/* webpackIgnore: true */ "canvas" as string);
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  // 背景色を設定（JPEG用）
  if (options.format === "jpeg") {
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  // PDFをレンダリング
  await page.render({
    canvasContext: context,
    viewport,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any).promise;

  // 画像に変換
  let dataUrl: string;
  if (options.format === "jpeg") {
    dataUrl = canvas.toDataURL("image/jpeg", options.quality / 100);
  } else {
    dataUrl = canvas.toDataURL("image/png");
  }

  // ファイルサイズを計算
  const base64Data = dataUrl.split(",")[1];
  const fileSize = Math.ceil((base64Data.length * 3) / 4);

  return {
    pageNumber,
    dataUrl,
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    fileSize,
  };
}

/**
 * 単一ページを画像に変換（Base64のみ返す）
 * OCR用のヘルパー関数
 */
export async function convertPDFPageToImage(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  options: {
    dpi?: number;
    format?: "png" | "jpeg";
    quality?: number;
  } = {}
): Promise<string> {
  const result = await convertPDFToImages(pdfBuffer, {
    dpi: options.dpi || 150,
    format: options.format || "png",
    quality: options.quality || 85,
    pageRange: { start: pageNumber, end: pageNumber },
  });

  if (result.images.length === 0) {
    return "";
  }

  // data:image/png;base64, プレフィックスを除去
  const dataUrl = result.images[0].dataUrl;
  return dataUrl.split(",")[1];
}

/**
 * 画像データをZIPファイルに圧縮（Base64）
 * ブラウザ側での実装を想定
 */
export function createImageZipDownloadUrl(
  images: PageImage[],
  baseName = "pdf-images"
): { filename: string; dataUrl: string } | null {
  // この関数はクライアントサイドで実装
  // JSZipなどのライブラリを使用
  console.warn(
    `[image-converter] ZIP creation for ${images.length} images (${baseName}) should be done on client side`
  );
  return null;
}

/**
 * DPI設定の説明を取得
 */
export function getDPIDescription(dpi: number): string {
  switch (dpi) {
    case 150:
      return "低解像度（高速、ファイルサイズ小）";
    case 300:
      return "標準解像度（印刷品質）";
    case 600:
      return "高解像度（高品質、ファイルサイズ大）";
    default:
      return `${dpi} DPI`;
  }
}

/**
 * 推定ファイルサイズを計算
 */
export function estimateImageSize(
  pageCount: number,
  dpi: number,
  format: "png" | "jpeg"
): string {
  // 平均的なA4サイズを基準に計算
  const baseSize = format === "png" ? 500000 : 200000; // 150 DPIでの概算
  const dpiMultiplier = Math.pow(dpi / 150, 2);
  const totalSize = pageCount * baseSize * dpiMultiplier;

  if (totalSize < 1024 * 1024) {
    return `約 ${Math.round(totalSize / 1024)} KB`;
  }
  return `約 ${Math.round(totalSize / (1024 * 1024))} MB`;
}
