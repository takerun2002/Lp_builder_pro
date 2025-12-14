import { GoogleGenAI } from "@google/genai";
import { getDb } from "@/lib/db";

/**
 * IMPORTANT:
 * - Server-side only (never expose API key on client).
 * - Model IDs should follow official docs:
 *   https://ai.google.dev/gemini-api/docs/models
 */

export const GEMINI_TEXT_MODEL_IDS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
] as const;

export type GeminiTextModelId = (typeof GEMINI_TEXT_MODEL_IDS)[number];

export const GEMINI_IMAGE_MODEL_ID = "gemini-3-pro-image-preview" as const;
export type GeminiImageModelId = typeof GEMINI_IMAGE_MODEL_ID;

export const DEFAULT_GEMINI_TEXT_MODEL_ID: GeminiTextModelId = "gemini-2.5-flash";

export type GeminiTextModelPreset = "flash" | "pro25" | "pro3";

export function resolveGeminiTextModelId(input?: string): GeminiTextModelId {
  if (!input) return DEFAULT_GEMINI_TEXT_MODEL_ID;

  if ((GEMINI_TEXT_MODEL_IDS as readonly string[]).includes(input)) {
    return input as GeminiTextModelId;
  }

  // Fail-safe: fallback to default to avoid "wrong model name" foot-guns
  console.warn(
    `[gemini] Invalid GEMINI_TEXT_MODEL="${input}". Falling back to "${DEFAULT_GEMINI_TEXT_MODEL_ID}".`,
  );
  return DEFAULT_GEMINI_TEXT_MODEL_ID;
}

function shouldFallbackOnError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  // ApiError from @google/genai exposes `status` (number).
  // Fallback mainly helps for rate-limits / transient server errors.
  if (typeof status !== "number") return false;
  return status === 429 || (status >= 500 && status <= 599);
}

function defaultFallbackChain(primary: GeminiTextModelId): GeminiTextModelId[] {
  // Prefer "stronger" models as fallback.
  switch (primary) {
    case "gemini-2.5-flash":
      return ["gemini-2.5-pro", "gemini-3-pro-preview"];
    case "gemini-2.5-pro":
      return ["gemini-3-pro-preview"];
    case "gemini-3-pro-preview":
      return [];
  }
}

export function getDefaultGeminiTextModelId(): GeminiTextModelId {
  return resolveGeminiTextModelId(process.env.GEMINI_TEXT_MODEL);
}

export function presetToGeminiTextModelId(preset: GeminiTextModelPreset): GeminiTextModelId {
  switch (preset) {
    case "flash":
      return "gemini-2.5-flash";
    case "pro25":
      return "gemini-2.5-pro";
    case "pro3":
      return "gemini-3-pro-preview";
  }
}

function getStoredGoogleApiKey(): string | null {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get("google_api_key") as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function getGeminiClient(): GoogleGenAI {
  // @google/genai can read GOOGLE_API_KEY from env automatically.
  // We keep this explicit to avoid surprises across environments.
  const apiKey = process.env.GOOGLE_API_KEY ?? getStoredGoogleApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing GOOGLE_API_KEY. Set it in .env.local or open /settings to save it (local-only) before calling Gemini API.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateText(
  prompt: string,
  options?: {
    model?: GeminiTextModelId | GeminiTextModelPreset;
    /**
     * Optional fallback model chain.
     * If omitted, we fallback depending on the primary model:
     * - flash -> pro25 -> pro3
     * - pro25 -> pro3
     */
    fallbackModels?: GeminiTextModelId[];
    thinkingLevel?: "low" | "high";
  },
): Promise<string> {
  const ai = getGeminiClient();

  const modelId =
    typeof options?.model === "string" && ["flash", "pro25", "pro3"].includes(options.model)
      ? presetToGeminiTextModelId(options.model as GeminiTextModelPreset)
      : resolveGeminiTextModelId(options?.model ?? process.env.GEMINI_TEXT_MODEL);

  const fallback = (options?.fallbackModels ?? defaultFallbackChain(modelId)).filter(
    (m) => m !== modelId,
  );

  let lastError: unknown;
  for (const m of [modelId, ...fallback]) {
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents: prompt,
        config: options?.thinkingLevel
          ? {
              thinkingConfig: {
                thinkingLevel: options.thinkingLevel,
              },
            }
          : undefined,
      });
      return response.text ?? "";
    } catch (err) {
      lastError = err;
      if (!shouldFallbackOnError(err)) break;
      console.warn(`[gemini] generateText failed on model="${m}", trying fallback...`, err);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini API request failed");
}


