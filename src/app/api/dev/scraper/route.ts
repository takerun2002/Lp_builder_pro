import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { getGeminiClient, GEMINI_TEXT_MODEL_ID } from "@/lib/ai/gemini";
import fs from "fs";
import path from "path";
import { generateId } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes

interface ScrapeRequest {
  url: string;
}

interface SectionInfo {
  index: number;
  name: string;
  startY: number;
  endY: number;
  description: string;
}

interface ScrapeResult {
  ok: true;
  scrapeId: string;
  url: string;
  fullImagePath: string;
  fullImageUrl: string;
  pageHeight: number;
  pageWidth: number;
  sections: SectionInfo[];
  ocrText: string;
  elapsedMs: number;
}

interface ScrapeError {
  ok: false;
  error: string;
}

type ScrapeResponse = ScrapeResult | ScrapeError;

const SCRAPES_DIR = path.join(process.cwd(), "data", "scrapes");

export async function POST(request: NextRequest): Promise<NextResponse<ScrapeResponse>> {
  const startTime = Date.now();

  let body: ScrapeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ ok: false, error: "Only http/https URLs allowed" }, { status: 400 });
  }

  const scrapeId = generateId();
  const scrapeDir = path.join(SCRAPES_DIR, scrapeId);

  try {
    // Create scrape directory
    if (!fs.existsSync(scrapeDir)) {
      fs.mkdirSync(scrapeDir, { recursive: true });
    }

    console.log(`[scraper] Starting scrape for ${url}`);

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });

    const page = await context.newPage();

    // Navigate to URL (use domcontentloaded for faster initial load, then wait for network)
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 90000, // Extended timeout for slow LPs
    });
    
    // Try to wait for network idle, but don't fail if it times out
    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 });
    } catch {
      console.log("[scraper] Network idle timeout, proceeding anyway");
    }

    // Wait for page to stabilize
    await page.waitForTimeout(3000);

    // Scroll to load lazy content
    await autoScroll(page);
    await page.waitForTimeout(1000);

    // Get page dimensions
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const pageWidth = await page.evaluate(() => document.body.scrollWidth);

    console.log(`[scraper] Page dimensions: ${pageWidth}x${pageHeight}`);

    // Disable animations and fixed elements for screenshot
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
        [style*="position: fixed"], [style*="position:fixed"] {
          position: absolute !important;
        }
      `,
    });

    // Take full page screenshot
    const fullImagePath = path.join(scrapeDir, "full.png");
    await page.screenshot({
      path: fullImagePath,
      fullPage: true,
    });

    console.log(`[scraper] Screenshot saved: ${fullImagePath}`);

    // Close browser
    await browser.close();

    // Read screenshot as base64
    const screenshotBuffer = fs.readFileSync(fullImagePath);
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // Call Gemini for section detection and OCR
    let sections: SectionInfo[] = [];
    let ocrText = "";

    try {
      const ai = getGeminiClient();

      const analysisPrompt = `あなたはLP（ランディングページ）の構成分析エキスパートです。

この画像はLPのフルページスクリーンショットです。以下の2つのタスクを実行してください：

【タスク1: セクション検出】
画像を分析し、LPのセクション境界を検出してください。
各セクションについて以下を推定してください：
- セクション名（例: "ヒーロー", "課題提起", "解決策", "お客様の声", "CTA"など）
- 開始Y座標（ピクセル、画像上端を0とする）
- 終了Y座標
- 簡単な説明

【タスク2: テキスト抽出（OCR）】
画像内のすべてのテキストを抽出してください。

【出力形式（JSON）】
{
  "sections": [
    {"index": 0, "name": "セクション名", "startY": 0, "endY": 800, "description": "説明"},
    ...
  ],
  "ocrText": "抽出されたテキスト全文..."
}

注意：JSONのみを出力し、他の説明は不要です。`;

      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL_ID,
        contents: [
          {
            role: "user",
            parts: [
              { text: analysisPrompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: screenshotBase64,
                },
              },
            ],
          },
        ],
      });

      const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log(`[scraper] Gemini response length: ${responseText.length}`);

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        sections = parsed.sections || [];
        ocrText = parsed.ocrText || "";
      }
    } catch (geminiErr) {
      console.error("[scraper] Gemini analysis error:", geminiErr);
      // Continue without Gemini analysis
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`[scraper] Completed in ${elapsedMs}ms, ${sections.length} sections detected`);

    return NextResponse.json({
      ok: true,
      scrapeId,
      url,
      fullImagePath,
      fullImageUrl: `/api/dev/scraper/${scrapeId}/image`,
      pageHeight,
      pageWidth,
      sections,
      ocrText,
      elapsedMs,
    });
  } catch (err) {
    console.error("[scraper] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Auto-scroll to load lazy content
async function autoScroll(page: import("playwright").Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
}
