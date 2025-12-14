import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, GEMINI_IMAGE_MODEL_ID } from "@/lib/ai/gemini";

export const runtime = "nodejs";

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RefImageInput {
  mimeType: string;
  base64: string;
}

interface MagicPenRequest {
  prompt: string;
  imageDataUrl: string;
  selection?: Selection;
  maskDataUrl?: string;
  refImages?: RefImageInput[];
}

interface MagicPenSuccessResponse {
  ok: true;
  modelUsed: string;
  imageDataUrl: string;
  elapsedMs: number;
}

interface MagicPenErrorResponse {
  ok: false;
  error: {
    message: string;
    status?: number;
  };
}

type MagicPenResponse = MagicPenSuccessResponse | MagicPenErrorResponse;

const MAX_REF_IMAGES = 6;

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  // Use string operations instead of regex to avoid stack overflow on large strings
  if (!dataUrl.startsWith("data:")) return null;
  const semicolonIdx = dataUrl.indexOf(";");
  if (semicolonIdx === -1) return null;
  const mimeType = dataUrl.slice(5, semicolonIdx); // "data:".length === 5
  const base64Marker = ";base64,";
  const base64Start = dataUrl.indexOf(base64Marker);
  if (base64Start === -1) return null;
  const base64 = dataUrl.slice(base64Start + base64Marker.length);
  if (!mimeType || !base64) return null;
  return { mimeType, base64 };
}

function validateSelection(selection: unknown): selection is Selection {
  if (!selection || typeof selection !== "object") return false;
  const s = selection as Record<string, unknown>;
  return (
    typeof s.x === "number" &&
    typeof s.y === "number" &&
    typeof s.width === "number" &&
    typeof s.height === "number" &&
    s.width > 0 &&
    s.height > 0
  );
}

function validateRefImage(ref: unknown): ref is RefImageInput {
  if (!ref || typeof ref !== "object") return false;
  const r = ref as Record<string, unknown>;
  return typeof r.mimeType === "string" && typeof r.base64 === "string";
}

export async function POST(request: NextRequest): Promise<NextResponse<MagicPenResponse>> {
  let body: MagicPenRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 }
    );
  }

  const { prompt, imageDataUrl, selection, maskDataUrl, refImages } = body;

  // Validate prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json(
      { ok: false, error: { message: "prompt is required and must be a non-empty string", status: 400 } },
      { status: 400 }
    );
  }

  // Validate imageDataUrl
  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return NextResponse.json(
      { ok: false, error: { message: "imageDataUrl is required", status: 400 } },
      { status: 400 }
    );
  }

  let parsedImage: { mimeType: string; base64: string } | null;
  try {
    parsedImage = parseDataUrl(imageDataUrl);
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Failed to parse imageDataUrl", status: 400 } },
      { status: 400 }
    );
  }

  if (!parsedImage) {
    return NextResponse.json(
      { ok: false, error: { message: "imageDataUrl must be a valid data URL (data:<mimeType>;base64,...)", status: 400 } },
      { status: 400 }
    );
  }

  // Validate selection (optional if maskDataUrl is provided)
  const hasSelection = selection !== undefined && validateSelection(selection);

  // Validate maskDataUrl (optional)
  let parsedMask: { mimeType: string; base64: string } | null = null;
  if (maskDataUrl) {
    if (typeof maskDataUrl !== "string") {
      return NextResponse.json(
        { ok: false, error: { message: "maskDataUrl must be a string", status: 400 } },
        { status: 400 }
      );
    }
    parsedMask = parseDataUrl(maskDataUrl);
    if (!parsedMask) {
      return NextResponse.json(
        { ok: false, error: { message: "maskDataUrl must be a valid data URL", status: 400 } },
        { status: 400 }
      );
    }
  }

  // Must have either selection or mask
  if (!hasSelection && !parsedMask) {
    return NextResponse.json(
      { ok: false, error: { message: "Either selection or maskDataUrl is required", status: 400 } },
      { status: 400 }
    );
  }

  // Validate refImages (optional)
  const validRefImages: RefImageInput[] = [];
  if (refImages && Array.isArray(refImages)) {
    for (const ref of refImages.slice(0, MAX_REF_IMAGES)) {
      if (validateRefImage(ref)) {
        validRefImages.push(ref);
      }
    }
  }

  const startTime = Date.now();

  try {
    const ai = getGeminiClient();

    // Build prompt based on mode
    let fullPrompt: string;

    if (parsedMask) {
      // Brush mask mode - improved prompt for better quality
      if (validRefImages.length > 0) {
        // Reference image mode: extract from reference and place in mask
        fullPrompt = `You are an expert image compositor. Your task is to seamlessly blend content from a reference image into a target image.

## Images Provided (in order):
1. **Target Image**: The main image to edit
2. **Mask Image**: White areas = where to place new content, Black areas = DO NOT MODIFY (protected)
3. **Reference Image(s)**: Source material to extract elements from

## Task:
${prompt}

## Critical Requirements:
1. **EXTRACT the relevant element** from the reference image(s)
2. **PLACE it precisely** within the white masked area of the target image
3. **MATCH the lighting, perspective, and color grading** of the target image
4. **BLEND seamlessly** at the mask boundaries - no visible edges or artifacts
5. **PRESERVE EXACTLY** all pixels in the black (protected) mask areas - they must be pixel-perfect identical to the original

## Blending Guidelines:
- Adjust the extracted element's lighting to match the target scene
- Ensure shadows and highlights are consistent
- Match the color temperature and saturation
- Maintain proper perspective and scale relative to the scene
- Create natural transitions at mask boundaries

Generate the final composited image with professional-quality blending.`;
      } else {
        // No reference image: general inpainting/editing
        fullPrompt = `You are an expert image editor. Your task is to modify a specific region of an image.

## Images Provided (in order):
1. **Target Image**: The image to edit
2. **Mask Image**: White areas = editable region, Black areas = DO NOT MODIFY (protected)

## Task:
${prompt}

## Critical Requirements:
1. Edit ONLY the white masked area
2. PRESERVE EXACTLY all pixels in the black (protected) mask areas
3. Blend the edited region seamlessly with the surrounding protected areas
4. Match lighting, colors, and textures of the surrounding image
5. Ensure no visible seams or artifacts at mask boundaries

Generate the final edited image.`;
      }
    } else if (hasSelection) {
      // Rectangle selection mode
      if (validRefImages.length > 0) {
        fullPrompt = `You are an expert image compositor.

## Images Provided (in order):
1. **Target Image**: The main image to edit
2. **Reference Image(s)**: Source material to extract elements from

## Edit Region (pixel coordinates):
Rectangle: x=${selection!.x}, y=${selection!.y}, width=${selection!.width}, height=${selection!.height}

## Task:
${prompt}

## Critical Requirements:
1. **EXTRACT the relevant element** from the reference image(s)
2. **PLACE it precisely** within the specified rectangle region
3. **MATCH the lighting and perspective** of the target image
4. **BLEND seamlessly** at the rectangle boundaries
5. **PRESERVE EXACTLY** all pixels outside the rectangle - they must be identical to the original

Generate the final composited image.`;
      } else {
        fullPrompt = `You are an expert image editor.

## Images Provided:
1. **Target Image**: The image to edit

## Edit Region (pixel coordinates):
Rectangle: x=${selection!.x}, y=${selection!.y}, width=${selection!.width}, height=${selection!.height}

## Task:
${prompt}

## Critical Requirements:
1. Edit ONLY within the specified rectangle
2. PRESERVE EXACTLY all pixels outside the rectangle
3. Blend the edited region seamlessly with surroundings

Generate the final edited image.`;
      }
    } else {
      fullPrompt = prompt;
    }

    // Build parts array
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: fullPrompt },
      {
        inlineData: {
          mimeType: parsedImage.mimeType,
          data: parsedImage.base64,
        },
      },
    ];

    // Add mask image if present
    if (parsedMask) {
      parts.push({
        inlineData: {
          mimeType: parsedMask.mimeType,
          data: parsedMask.base64,
        },
      });
    }

    // Add reference images
    for (const ref of validRefImages) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.base64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL_ID,
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        responseModalities: ["image", "text"],
      },
    });

    const elapsedMs = Date.now() - startTime;

    // Extract image from response
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts || responseParts.length === 0) {
      return NextResponse.json(
        { ok: false, error: { message: "No response parts from Gemini", status: 500 } },
        { status: 500 }
      );
    }

    // Find image part
    const imagePart = responseParts.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData) {
      const textPart = responseParts.find((p) => p.text);
      const textMessage = textPart?.text ?? "No image generated";
      return NextResponse.json(
        { ok: false, error: { message: `Image generation failed: ${textMessage}`, status: 500 } },
        { status: 500 }
      );
    }

    const resultMimeType = imagePart.inlineData.mimeType ?? "image/png";
    const resultBase64 = imagePart.inlineData.data;
    const resultDataUrl = `data:${resultMimeType};base64,${resultBase64}`;

    console.log(`[magic-pen] Success: mode=${parsedMask ? "brush" : "rect"}, refImages=${validRefImages.length}, elapsed=${elapsedMs}ms`);

    return NextResponse.json({
      ok: true,
      modelUsed: GEMINI_IMAGE_MODEL_ID,
      imageDataUrl: resultDataUrl,
      elapsedMs,
    });
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[magic-pen] Gemini API error after ${elapsedMs}ms:`, err);

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
