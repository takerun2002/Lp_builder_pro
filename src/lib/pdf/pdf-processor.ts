/**
 * PDF Processor
 * PDFファイルの処理（テキスト抽出・画像変換）を統合管理
 */

import { extractTextFromPDF, type TextExtractResult } from "./text-extractor";
import { convertPDFToImages, type ImageConvertResult } from "./image-converter";
import { loadPDFFromGoogleDrive } from "./google-drive-loader";

// =============================================================================
// Types
// =============================================================================

export interface PDFProcessRequest {
  /** ファイルソース：Base64, URL, Google Drive ID */
  source: string;
  /** ソースタイプ */
  sourceType: "base64" | "url" | "google-drive";
  /** 実行する操作 */
  operations: ("extract-text" | "to-images")[];
  /** オプション */
  options?: PDFProcessOptions;
}

export interface PDFProcessOptions {
  /** 画像化時のDPI（150/300/600） */
  dpi?: number;
  /** 画像品質（0-100） */
  quality?: number;
  /** OCR有効化（画像PDFの場合） */
  ocrEnabled?: boolean;
  /** 出力フォーマット */
  imageFormat?: "png" | "jpeg";
  /** 特定ページのみ処理 */
  pageRange?: { start: number; end: number };
}

export interface PDFProcessResult {
  success: boolean;
  /** 抽出されたテキスト */
  text?: TextExtractResult;
  /** 画像データ（Base64） */
  images?: ImageConvertResult;
  /** ページ数 */
  pageCount: number;
  /** 処理時間（ms） */
  processingTime: number;
  /** エラー */
  error?: string;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
  fileSize: number;
}

// =============================================================================
// Main Processor
// =============================================================================

/**
 * PDFを処理
 */
export async function processPDF(
  request: PDFProcessRequest
): Promise<PDFProcessResult> {
  const startTime = Date.now();

  try {
    // 1. PDFデータを取得
    const pdfBuffer = await loadPDFData(request);

    // 2. 各操作を実行
    let textResult: TextExtractResult | undefined;
    let imageResult: ImageConvertResult | undefined;

    const options = request.options || {};

    for (const operation of request.operations) {
      switch (operation) {
        case "extract-text":
          textResult = await extractTextFromPDF(pdfBuffer, {
            ocrEnabled: options.ocrEnabled,
            pageRange: options.pageRange,
          });
          break;

        case "to-images":
          imageResult = await convertPDFToImages(pdfBuffer, {
            dpi: options.dpi || 150,
            quality: options.quality || 85,
            format: options.imageFormat || "png",
            pageRange: options.pageRange,
          });
          break;
      }
    }

    // ページ数を取得
    const pageCount = textResult?.pageCount || imageResult?.pageCount || 0;

    return {
      success: true,
      text: textResult,
      images: imageResult,
      pageCount,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[pdf-processor] Error:", error);
    return {
      success: false,
      pageCount: 0,
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "PDF処理に失敗しました",
    };
  }
}

/**
 * PDFデータをロード
 */
async function loadPDFData(request: PDFProcessRequest): Promise<ArrayBuffer> {
  switch (request.sourceType) {
    case "base64": {
      // Base64をArrayBufferに変換
      const base64Data = request.source.replace(/^data:application\/pdf;base64,/, "");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    case "url": {
      // URLからフェッチ
      const response = await fetch(request.source);
      if (!response.ok) {
        throw new Error(`PDF取得に失敗: ${response.status}`);
      }
      return await response.arrayBuffer();
    }

    case "google-drive": {
      // Google Driveから取得
      return await loadPDFFromGoogleDrive(request.source);
    }

    default:
      throw new Error(`Unknown source type: ${request.sourceType}`);
  }
}

/**
 * PDFメタデータを取得
 */
export async function getPDFMetadata(
  pdfBuffer: ArrayBuffer
): Promise<PDFMetadata> {
  // pdfjs-distはブラウザ/Node両対応のため動的インポート
  const pdfjsLib = await import("pdfjs-dist");

  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const metadata = await pdf.getMetadata();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info = metadata.info as any;

  return {
    title: info?.Title,
    author: info?.Author,
    subject: info?.Subject,
    creator: info?.Creator,
    producer: info?.Producer,
    creationDate: info?.CreationDate,
    modificationDate: info?.ModDate,
    pageCount: pdf.numPages,
    fileSize: pdfBuffer.byteLength,
  };
}

/**
 * PDFをBase64に変換
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64をArrayBufferに変換
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
