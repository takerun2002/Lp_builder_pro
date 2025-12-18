/**
 * PDF Text Extractor
 * PDFからテキストを抽出（OCR対応）
 */

import { getGeminiClient, getDefaultGeminiTextModelId } from "@/lib/ai/gemini";

// =============================================================================
// Types
// =============================================================================

export interface TextExtractOptions {
  /** OCR有効化（画像PDFの場合） */
  ocrEnabled?: boolean;
  /** 特定ページのみ処理 */
  pageRange?: { start: number; end: number };
  /** 言語設定 */
  language?: "ja" | "en" | "auto";
}

export interface TextExtractResult {
  /** 全テキスト */
  fullText: string;
  /** ページ別テキスト */
  pages: PageText[];
  /** ページ数 */
  pageCount: number;
  /** OCRを使用したか */
  usedOCR: boolean;
  /** 抽出されたテキストがあるか */
  hasText: boolean;
}

export interface PageText {
  pageNumber: number;
  text: string;
  /** OCRで取得したか */
  ocrUsed: boolean;
}

// =============================================================================
// Text Extraction
// =============================================================================

/**
 * PDFからテキストを抽出
 */
export async function extractTextFromPDF(
  pdfBuffer: ArrayBuffer,
  options: TextExtractOptions = {}
): Promise<TextExtractResult> {
  const pdfjsLib = await import("pdfjs-dist");

  // PDF読み込み
  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const pageCount = pdf.numPages;

  // ページ範囲を決定
  const startPage = options.pageRange?.start || 1;
  const endPage = Math.min(options.pageRange?.end || pageCount, pageCount);

  const pages: PageText[] = [];
  let fullText = "";
  let usedOCR = false;

  // 各ページからテキスト抽出
  for (let i = startPage; i <= endPage; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // テキストアイテムを結合
    const pageText = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }
        return "";
      })
      .join(" ")
      .trim();

    // テキストが少ない場合はOCRを試行
    let finalText = pageText;
    let ocrUsed = false;

    if (options.ocrEnabled && pageText.length < 50) {
      // OCR処理（Geminiを使用）
      try {
        const ocrText = await performOCR(pdfBuffer, i);
        if (ocrText && ocrText.length > pageText.length) {
          finalText = ocrText;
          ocrUsed = true;
          usedOCR = true;
        }
      } catch (error) {
        console.warn(`[text-extractor] OCR failed for page ${i}:`, error);
      }
    }

    pages.push({
      pageNumber: i,
      text: finalText,
      ocrUsed,
    });

    fullText += finalText + "\n\n";
  }

  return {
    fullText: fullText.trim(),
    pages,
    pageCount,
    usedOCR,
    hasText: fullText.trim().length > 0,
  };
}

/**
 * Gemini Vision APIでOCR処理
 */
async function performOCR(
  pdfBuffer: ArrayBuffer,
  pageNumber: number
): Promise<string> {
  // PDFページを画像に変換してOCR
  const { convertPDFPageToImage } = await import("./image-converter");
  const imageBase64 = await convertPDFPageToImage(pdfBuffer, pageNumber, {
    dpi: 300,
    format: "png",
    quality: 90,
  });

  if (!imageBase64) {
    return "";
  }

  // Gemini Vision APIでOCR
  const ai = getGeminiClient();
  const model = getDefaultGeminiTextModelId();

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64,
            },
          },
          {
            text: `この画像からテキストを抽出してください。
日本語と英語を含む可能性があります。
レイアウトを維持しながら、すべてのテキストを正確に抽出してください。
テキストのみを出力し、説明は不要です。`,
          },
        ],
      },
    ],
  });

  return response.text || "";
}

/**
 * テキストをプレーンテキストファイル形式に変換
 */
export function formatAsPlainText(result: TextExtractResult): string {
  let output = "";

  for (const page of result.pages) {
    output += `--- ページ ${page.pageNumber} ---\n`;
    output += page.text + "\n\n";
  }

  return output.trim();
}

/**
 * テキストをMarkdown形式に変換
 */
export function formatAsMarkdown(result: TextExtractResult): string {
  let output = "# PDF テキスト抽出結果\n\n";
  output += `- ページ数: ${result.pageCount}\n`;
  output += `- OCR使用: ${result.usedOCR ? "はい" : "いいえ"}\n\n`;

  for (const page of result.pages) {
    output += `## ページ ${page.pageNumber}`;
    if (page.ocrUsed) {
      output += " (OCR)";
    }
    output += "\n\n";
    output += page.text + "\n\n";
  }

  return output.trim();
}

/**
 * テキストをJSONファイル形式に変換
 */
export function formatAsJSON(result: TextExtractResult): string {
  return JSON.stringify(
    {
      pageCount: result.pageCount,
      usedOCR: result.usedOCR,
      hasText: result.hasText,
      fullText: result.fullText,
      pages: result.pages,
    },
    null,
    2
  );
}
