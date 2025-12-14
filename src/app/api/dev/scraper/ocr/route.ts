import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

// Use Gemini 2.5 Flash for fast OCR
const OCR_MODEL_ID = "gemini-2.5-flash";

interface OcrRequest {
  imageDataUrl: string;
}

interface OcrSuccessResponse {
  ok: true;
  text: string;
  elapsedMs: number;
}

interface OcrErrorResponse {
  ok: false;
  error: string;
}

type OcrResponse = OcrSuccessResponse | OcrErrorResponse;

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  if (!dataUrl.startsWith("data:")) return null;
  const semicolonIdx = dataUrl.indexOf(";");
  if (semicolonIdx === -1) return null;
  const mimeType = dataUrl.slice(5, semicolonIdx);
  const base64Marker = ";base64,";
  const base64Start = dataUrl.indexOf(base64Marker);
  if (base64Start === -1) return null;
  const base64 = dataUrl.slice(base64Start + base64Marker.length);
  if (!mimeType || !base64) return null;
  return { mimeType, base64 };
}

export async function POST(request: NextRequest): Promise<NextResponse<OcrResponse>> {
  const startTime = Date.now();

  let body: OcrRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageDataUrl } = body;

  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return NextResponse.json({ ok: false, error: "imageDataUrl is required" }, { status: 400 });
  }

  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Invalid imageDataUrl format" }, { status: 400 });
  }

  try {
    const ai = getGeminiClient();

    const ocrPrompt = `あなたは高精度なOCRエキスパートです。

この画像に含まれるすべてのテキストを正確に抽出してください。

【指示】
1. 画像内のすべてのテキストを読み取る
2. レイアウトを可能な限り維持する（見出し、段落、リストなど）
3. 日本語・英語・数字・記号すべて正確に抽出する
4. 読み取れない部分は [不明] と記載する
5. テキストのみを出力し、説明や解説は不要

【出力】
抽出したテキストをそのまま出力してください。`;

    const response = await ai.models.generateContent({
      model: OCR_MODEL_ID,
      contents: [
        {
          role: "user",
          parts: [
            { text: ocrPrompt },
            {
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.base64,
              },
            },
          ],
        },
      ],
    });

    const extractedText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const elapsedMs = Date.now() - startTime;

    console.log(`[ocr] Extracted ${extractedText.length} characters in ${elapsedMs}ms`);

    return NextResponse.json({
      ok: true,
      text: extractedText.trim(),
      elapsedMs,
    });
  } catch (err) {
    console.error("[ocr] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("Missing GOOGLE_API_KEY")) {
      return NextResponse.json(
        { ok: false, error: "API key not configured. Set GOOGLE_API_KEY in .env.local" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
