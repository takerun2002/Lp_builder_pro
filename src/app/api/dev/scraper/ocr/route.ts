import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 180; // Extended for parallel OCR

// Use Gemini 2.5 Flash for fast OCR
const OCR_MODEL_ID = "gemini-2.5-flash";

// OCR configuration (mioji_share style)
const OCR_CONFIG = {
  maxHeight: 5000, // Max height per chunk (pixels)
  overlap: 200, // Overlap between chunks
  maxRetries: 3,
  baseDelay: 1000, // ms
  maxDelay: 16000, // ms
  parallelWorkers: 4,
};

interface OcrRequest {
  imageDataUrl: string;
  parallel?: boolean; // Enable parallel processing
}

interface ChunkProgress {
  index: number;
  total: number;
  status: "pending" | "processing" | "completed" | "error";
  yStart: number;
  yEnd: number;
  error?: string;
}

interface OcrSuccessResponse {
  ok: true;
  text: string;
  elapsedMs: number;
  chunks?: ChunkProgress[];
  totalHeight?: number;
}

interface OcrErrorResponse {
  ok: false;
  error: string;
  chunks?: ChunkProgress[];
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

// Get image dimensions from base64
async function getImageDimensions(base64: string, mimeType: string): Promise<{ width: number; height: number }> {
  // Decode base64 to get PNG/JPEG header info
  const buffer = Buffer.from(base64, "base64");
  
  if (mimeType.includes("png")) {
    // PNG: Width at bytes 16-19, Height at bytes 20-23 (big-endian)
    if (buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
  } else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    // JPEG: Find SOF0/SOF2 marker for dimensions
    let i = 2;
    while (i < buffer.length - 9) {
      if (buffer[i] === 0xff) {
        const marker = buffer[i + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buffer.readUInt16BE(i + 5);
          const width = buffer.readUInt16BE(i + 7);
          return { width, height };
        }
        i += 2 + buffer.readUInt16BE(i + 2);
      } else {
        i++;
      }
    }
  }
  
  // Default fallback
  return { width: 1920, height: 10000 };
}

// Split image into chunks (vertical slices)
function splitImageIntoChunks(
  base64: string,
  totalHeight: number,
  maxHeight: number,
  overlap: number
): { yStart: number; yEnd: number }[] {
  const chunks: { yStart: number; yEnd: number }[] = [];
  let yStart = 0;
  
  while (yStart < totalHeight) {
    const yEnd = Math.min(yStart + maxHeight, totalHeight);
    chunks.push({ yStart, yEnd });
    
    if (yEnd >= totalHeight) break;
    yStart = yEnd - overlap;
  }
  
  return chunks;
}

// OCR with retry and exponential backoff
async function ocrWithRetry(
  ai: ReturnType<typeof getGeminiClient>,
  base64: string,
  mimeType: string,
  chunkInfo: { yStart: number; yEnd: number; index: number; total: number },
  ocrPrompt: string
): Promise<{ text: string; error?: string }> {
  const { maxRetries, baseDelay, maxDelay } = OCR_CONFIG;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: OCR_MODEL_ID,
        contents: [
          {
            role: "user",
            parts: [
              { text: ocrPrompt },
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
      });

      const extractedText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log(`[ocr] Chunk ${chunkInfo.index + 1}/${chunkInfo.total} (y=${chunkInfo.yStart}~${chunkInfo.yEnd}): ${extractedText.length} chars`);
      
      return { text: extractedText.trim() };
    } catch (err) {
      const isRetryable = err instanceof Error && 
        (err.message.includes("503") || 
         err.message.includes("UNAVAILABLE") || 
         err.message.includes("overloaded"));
      
      if (attempt < maxRetries - 1 && isRetryable) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
        console.log(`[ocr] Chunk ${chunkInfo.index + 1} retry ${attempt + 1}/${maxRetries} in ${delay}ms: ${err}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[ocr] Chunk ${chunkInfo.index + 1} failed:`, err);
        return { 
          text: "", 
          error: err instanceof Error ? err.message : "Unknown error" 
        };
      }
    }
  }
  
  return { text: "", error: "Max retries exceeded" };
}

// Merge OCR results, removing duplicates from overlap
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mergeOcrTexts(texts: string[]): string {
  const merged: string[] = [];
  
  for (const text of texts) {
    if (!text) continue;
    
    for (const line of text.split("\n")) {
      const stripped = line.trim();
      if (!stripped) {
        if (merged.length && merged[merged.length - 1] !== "") {
          merged.push("");
        }
        continue;
      }
      // Skip duplicate lines (from overlap)
      if (merged.length && merged[merged.length - 1].trim() === stripped) {
        continue;
      }
      merged.push(line.trimEnd());
    }
    
    if (merged.length && merged[merged.length - 1] !== "") {
      merged.push("");
    }
  }
  
  // Remove trailing empty line
  while (merged.length && merged[merged.length - 1] === "") {
    merged.pop();
  }
  
  return merged.join("\n");
}

export async function POST(request: NextRequest): Promise<NextResponse<OcrResponse>> {
  const startTime = Date.now();

  let body: OcrRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageDataUrl, parallel = true } = body;

  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return NextResponse.json({ ok: false, error: "imageDataUrl is required" }, { status: 400 });
  }

  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Invalid imageDataUrl format" }, { status: 400 });
  }

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

  try {
    const ai = getGeminiClient();
    
    // Get image dimensions
    const dimensions = await getImageDimensions(parsed.base64, parsed.mimeType);
    console.log(`[ocr] Image dimensions: ${dimensions.width}x${dimensions.height}`);
    
    // Determine if we need chunking
    const needsChunking = dimensions.height > OCR_CONFIG.maxHeight && parallel;
    
    if (!needsChunking) {
      // Simple single-request OCR with retry
      const result = await ocrWithRetry(
        ai,
        parsed.base64,
        parsed.mimeType,
        { yStart: 0, yEnd: dimensions.height, index: 0, total: 1 },
        ocrPrompt
      );
      
      const elapsedMs = Date.now() - startTime;
      
      if (result.error && !result.text) {
        return NextResponse.json({
          ok: false,
          error: result.error,
        }, { status: 500 });
      }
      
      console.log(`[ocr] Single chunk: ${result.text.length} chars in ${elapsedMs}ms`);
      
      return NextResponse.json({
        ok: true,
        text: result.text,
        elapsedMs,
        totalHeight: dimensions.height,
      });
    }
    
    // Parallel chunked OCR
    const chunkRanges = splitImageIntoChunks(
      parsed.base64,
      dimensions.height,
      OCR_CONFIG.maxHeight,
      OCR_CONFIG.overlap
    );
    
    console.log(`[ocr] Splitting ${dimensions.height}px into ${chunkRanges.length} chunks (parallel=${OCR_CONFIG.parallelWorkers})`);
    
    const chunkProgress: ChunkProgress[] = chunkRanges.map((range, i) => ({
      index: i,
      total: chunkRanges.length,
      status: "pending" as const,
      yStart: range.yStart,
      yEnd: range.yEnd,
    }));
    
    // Process chunks in parallel (limited concurrency)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const results: { index: number; text: string; error?: string }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const workers = Math.min(OCR_CONFIG.parallelWorkers, chunkRanges.length);
    
    // Note: For true parallel processing with chunks, we'd need to crop the image server-side.
    // Since we're sending the full image for each request (Gemini will process the full image anyway),
    // we'll use a different approach: we'll ask Gemini to focus on specific Y ranges.
    
    // For now, we process the full image but with retry capability
    // TODO: Implement server-side image cropping using sharp or jimp for true chunked OCR
    
    const result = await ocrWithRetry(
      ai,
      parsed.base64,
      parsed.mimeType,
      { yStart: 0, yEnd: dimensions.height, index: 0, total: 1 },
      ocrPrompt
    );
    
    const elapsedMs = Date.now() - startTime;
    
    // Update progress
    chunkProgress[0].status = result.error ? "error" : "completed";
    if (result.error) {
      chunkProgress[0].error = result.error;
    }
    
    if (result.error && !result.text) {
      return NextResponse.json({
        ok: false,
        error: result.error,
        chunks: chunkProgress,
      }, { status: 500 });
    }
    
    console.log(`[ocr] Completed: ${result.text.length} chars in ${elapsedMs}ms`);
    
    return NextResponse.json({
      ok: true,
      text: result.text,
      elapsedMs,
      chunks: chunkProgress,
      totalHeight: dimensions.height,
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


