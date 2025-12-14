import { NextRequest, NextResponse } from "next/server";
import {
  generateText,
  GeminiTextModelId,
  GeminiTextModelPreset,
  GEMINI_TEXT_MODEL_IDS,
} from "@/lib/ai/gemini";

export const runtime = "nodejs";

type ModelInput = GeminiTextModelId | GeminiTextModelPreset;

const VALID_MODEL_INPUTS: readonly string[] = [
  ...GEMINI_TEXT_MODEL_IDS,
  "flash",
  "pro25",
  "pro3",
];

interface SmokeRequest {
  prompt: string;
  model?: ModelInput;
  thinkingLevel?: "low" | "high";
}

interface SmokeSuccessResponse {
  ok: true;
  modelUsed: string;
  text: string;
  elapsedMs: number;
}

interface SmokeErrorResponse {
  ok: false;
  error: {
    message: string;
    status?: number;
  };
}

type SmokeResponse = SmokeSuccessResponse | SmokeErrorResponse;

export async function POST(request: NextRequest): Promise<NextResponse<SmokeResponse>> {
  let body: SmokeRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 }
    );
  }

  const { prompt, model, thinkingLevel } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json(
      { ok: false, error: { message: "prompt is required and must be a non-empty string", status: 400 } },
      { status: 400 }
    );
  }

  if (model !== undefined && !VALID_MODEL_INPUTS.includes(model)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: `Invalid model. Must be one of: ${VALID_MODEL_INPUTS.join(", ")}`,
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  if (thinkingLevel !== undefined && thinkingLevel !== "low" && thinkingLevel !== "high") {
    return NextResponse.json(
      { ok: false, error: { message: "thinkingLevel must be 'low' or 'high'", status: 400 } },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    const text = await generateText(prompt, {
      model: model as ModelInput | undefined,
      thinkingLevel,
    });
    const elapsedMs = Date.now() - startTime;

    // Resolve actual model used for display
    let modelUsed = model ?? "flash";
    if (model === "flash") modelUsed = "gemini-2.5-flash";
    else if (model === "pro25") modelUsed = "gemini-2.5-pro";
    else if (model === "pro3") modelUsed = "gemini-3-pro-preview";
    else if (!model) modelUsed = "gemini-2.5-flash";
    else modelUsed = model;

    return NextResponse.json({
      ok: true,
      modelUsed,
      text,
      elapsedMs,
    });
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[smoke] Gemini API error after ${elapsedMs}ms:`, err);

    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("Missing GOOGLE_API_KEY")) {
      return NextResponse.json(
        { ok: false, error: { message: "API key not configured. Set GOOGLE_API_KEY in .env.local", status: 401 } },
        { status: 401 }
      );
    }

    if (status === 429) {
      return NextResponse.json(
        { ok: false, error: { message: "Rate limit exceeded. Please wait and try again.", status: 429 } },
        { status: 429 }
      );
    }

    if (status && status >= 500 && status <= 599) {
      return NextResponse.json(
        { ok: false, error: { message: `Gemini API server error (${status})`, status } },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { message, status: status ?? 500 } },
      { status: status ?? 500 }
    );
  }
}
