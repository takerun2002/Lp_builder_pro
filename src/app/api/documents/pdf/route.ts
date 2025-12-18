/**
 * PDF処理API
 * POST /api/documents/pdf - PDFからテキスト抽出
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let pdfData: Uint8Array;

    if (contentType.includes("multipart/form-data")) {
      // FormDataからファイル取得
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 }
        );
      }

      if (!file.type.includes("pdf")) {
        return NextResponse.json(
          { success: false, error: "File must be a PDF" },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      pdfData = new Uint8Array(buffer);
    } else if (contentType.includes("application/json")) {
      // JSONからBase64データ取得
      const body = await request.json();
      const { base64, url } = body;

      if (url) {
        // URLからPDF取得
        const response = await fetch(url);
        if (!response.ok) {
          return NextResponse.json(
            { success: false, error: `Failed to fetch PDF: ${response.status}` },
            { status: 400 }
          );
        }
        const buffer = await response.arrayBuffer();
        pdfData = new Uint8Array(buffer);
      } else if (base64) {
        // Base64デコード
        const binaryString = atob(base64.replace(/^data:application\/pdf;base64,/, ""));
        pdfData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          pdfData[i] = binaryString.charCodeAt(i);
        }
      } else {
        return NextResponse.json(
          { success: false, error: "No PDF data provided" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported content type" },
        { status: 400 }
      );
    }

    // サーバーサイドでのPDF処理
    // pdfjs-distはNode.js環境でも動作するが、workerの設定が異なる
    const pdfjsLib = await import("pdfjs-dist");
    
    const startTime = Date.now();
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages: Array<{ pageNumber: number; text: string }> = [];

    // メタデータを取得
    const metadata = await pdf.getMetadata().catch(() => null);
    interface PdfInfo {
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
      Creator?: string;
      Producer?: string;
    }
    
    const pdfMetadata: Record<string, string | undefined> = {};
    if (metadata?.info) {
      const info = metadata.info as PdfInfo;
      pdfMetadata.title = info.Title;
      pdfMetadata.author = info.Author;
      pdfMetadata.subject = info.Subject;
      pdfMetadata.keywords = info.Keywords;
      pdfMetadata.creator = info.Creator;
      pdfMetadata.producer = info.Producer;
    }

    // 各ページを処理
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({
        pageNumber: i,
        text: pageText,
      });
    }

    const fullText = pages.map((p) => p.text).join("\n\n");

    // テキスト品質評価
    let qualityScore = 100;
    const issues: string[] = [];

    const garbledRatio = (fullText.match(/[^\u0000-\u007F\u3000-\u9FFF\uFF00-\uFFEF]/g)?.length || 0) / Math.max(fullText.length, 1);
    if (garbledRatio > 0.1) {
      issues.push("文字化けの可能性があります");
      qualityScore -= 30;
    }

    if (fullText.length < 50) {
      issues.push("テキストが短すぎます（OCRが必要な可能性）");
      qualityScore -= 40;
    }

    return NextResponse.json({
      success: true,
      pages,
      metadata: pdfMetadata,
      fullText,
      quality: {
        score: Math.max(0, qualityScore),
        issues,
      },
      stats: {
        totalPages: numPages,
        totalCharacters: fullText.length,
        processingTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/documents/pdf error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "PDF processing failed",
      },
      { status: 500 }
    );
  }
}
