/**
 * PDF処理ユーティリティ
 * PDFからテキスト・画像を抽出
 */

import * as pdfjsLib from "pdfjs-dist";

// Web Worker設定（Next.js向け）
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// ============================================
// 型定義
// ============================================

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  images: ExtractedImage[];
}

export interface ExtractedImage {
  index: number;
  width: number;
  height: number;
  dataUrl?: string;
}

export interface PdfExtractionResult {
  success: boolean;
  pages?: ExtractedPage[];
  metadata?: PdfMetadata;
  fullText?: string;
  stats?: {
    totalPages: number;
    totalCharacters: number;
    totalImages: number;
    processingTime: number;
  };
  error?: string;
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
}

// ============================================
// メイン関数
// ============================================

/**
 * PDFからテキストを抽出
 */
export async function extractTextFromPdf(
  source: ArrayBuffer | Uint8Array | string
): Promise<PdfExtractionResult> {
  const startTime = Date.now();

  try {
    // PDFドキュメントを読み込み
    const loadingTask = pdfjsLib.getDocument({
      data: source,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages: ExtractedPage[] = [];

    // メタデータを取得
    const metadata = await pdf.getMetadata().catch(() => null);
    const pdfMetadata: PdfMetadata = {};
    if (metadata?.info) {
      const info = metadata.info as Record<string, unknown>;
      pdfMetadata.title = info.Title as string;
      pdfMetadata.author = info.Author as string;
      pdfMetadata.subject = info.Subject as string;
      pdfMetadata.keywords = info.Keywords as string;
      pdfMetadata.creator = info.Creator as string;
      pdfMetadata.producer = info.Producer as string;
    }

    // 各ページを処理
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // テキストを抽出
      const pageText = textContent.items
        .map((item) => {
          if ("str" in item) {
            return item.str;
          }
          return "";
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({
        pageNumber: i,
        text: pageText,
        images: [], // 画像抽出は別途実装
      });
    }

    // 全文テキストを生成
    const fullText = pages.map((p) => p.text).join("\n\n");

    return {
      success: true,
      pages,
      metadata: pdfMetadata,
      fullText,
      stats: {
        totalPages: numPages,
        totalCharacters: fullText.length,
        totalImages: 0,
        processingTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    console.error("[PdfProcessor] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF processing failed",
    };
  }
}

/**
 * PDFファイルをArrayBufferに変換
 */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Base64からPDFを処理
 */
export async function extractTextFromBase64Pdf(
  base64: string
): Promise<PdfExtractionResult> {
  try {
    // Base64からバイナリに変換
    const binaryString = atob(base64.replace(/^data:application\/pdf;base64,/, ""));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return extractTextFromPdf(bytes);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Base64 conversion failed",
    };
  }
}

/**
 * URLからPDFを取得して処理
 */
export async function extractTextFromPdfUrl(
  url: string
): Promise<PdfExtractionResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return extractTextFromPdf(arrayBuffer);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "URL fetch failed",
    };
  }
}

/**
 * テキストをセクションに分割
 */
export function splitIntoSections(
  text: string,
  options?: {
    minSectionLength?: number;
    maxSectionLength?: number;
    separators?: RegExp[];
  }
): string[] {
  const {
    minSectionLength = 100,
    maxSectionLength = 2000,
    separators = [/\n{2,}/g, /[。！？]\s*/g],
  } = options || {};

  let sections: string[] = [text];

  // セパレータで分割
  for (const separator of separators) {
    sections = sections.flatMap((section) => {
      if (section.length <= maxSectionLength) return [section];
      return section.split(separator).filter((s) => s.trim().length > 0);
    });
  }

  // 短すぎるセクションをマージ
  const merged: string[] = [];
  let current = "";

  for (const section of sections) {
    if (current.length + section.length < minSectionLength) {
      current += " " + section;
    } else {
      if (current) merged.push(current.trim());
      current = section;
    }
  }
  if (current) merged.push(current.trim());

  return merged;
}

/**
 * PDFテキストの品質を評価
 */
export function evaluateTextQuality(text: string): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // 文字化けチェック
  const garbledRatio = (text.match(/[^\u0000-\u007F\u3000-\u9FFF\uFF00-\uFFEF]/g)?.length || 0) / text.length;
  if (garbledRatio > 0.1) {
    issues.push("文字化けの可能性があります");
    score -= 30;
  }

  // 空白過多チェック
  const whitespaceRatio = (text.match(/\s/g)?.length || 0) / text.length;
  if (whitespaceRatio > 0.5) {
    issues.push("空白が多すぎます");
    score -= 20;
  }

  // 短すぎるチェック
  if (text.length < 50) {
    issues.push("テキストが短すぎます（OCRが必要な可能性）");
    score -= 40;
  }

  // 数字のみチェック
  if (/^\d+$/.test(text.replace(/\s/g, ""))) {
    issues.push("数字のみのテキストです");
    score -= 50;
  }

  return {
    score: Math.max(0, score),
    issues,
  };
}
