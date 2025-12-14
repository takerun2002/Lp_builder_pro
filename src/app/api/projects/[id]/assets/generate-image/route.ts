import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getGeminiClient, GEMINI_IMAGE_MODEL_ID } from "@/lib/ai/gemini";
import fs from "fs";

export const runtime = "nodejs";
export const maxDuration = 120;

interface SwipeFile {
  id: string;
  file_path: string;
  mime_type: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/assets/generate-image - 画像生成
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const body = await request.json();
    const { prompt, refSwipeIds } = body as { prompt: string; refSwipeIds?: string[] };

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { ok: false, error: "prompt is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // プロジェクト存在確認
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // 参照画像の準備
    const refImages: { mimeType: string; data: string }[] = [];
    if (refSwipeIds && Array.isArray(refSwipeIds) && refSwipeIds.length > 0) {
      for (const swipeId of refSwipeIds.slice(0, 3)) { // 最大3枚
        const swipe = db
          .prepare("SELECT * FROM swipe_files WHERE id = ?")
          .get(swipeId) as SwipeFile | undefined;

        if (swipe && swipe.file_path && fs.existsSync(swipe.file_path)) {
          const buffer = fs.readFileSync(swipe.file_path);
          const base64 = buffer.toString("base64");
          refImages.push({
            mimeType: swipe.mime_type || "image/png",
            data: base64,
          });
        }
      }
    }

    // Gemini 画像生成
    const ai = getGeminiClient();

    const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // プロンプト
    contentParts.push({
      text: `Generate an image based on this description: ${prompt}`,
    });

    // 参照画像を追加
    for (const img of refImages) {
      contentParts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }

    if (refImages.length > 0) {
      contentParts.push({
        text: "Use the above reference images as style/design inspiration.",
      });
    }

    console.log(`[generate-image] Generating with prompt: "${prompt.substring(0, 50)}..." (${refImages.length} refs)`);

    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL_ID,
      contents: [
        {
          role: "user",
          parts: contentParts,
        },
      ],
      config: {
        responseModalities: ["image", "text"],
      },
    });

    // 生成結果から画像を抽出
    const parts = response.candidates?.[0]?.content?.parts || [];
    let imageDataUrl: string | null = null;

    for (const part of parts) {
      if ("inlineData" in part && part.inlineData) {
        const { mimeType, data } = part.inlineData;
        imageDataUrl = `data:${mimeType};base64,${data}`;
        break;
      }
    }

    if (!imageDataUrl) {
      console.error("[generate-image] No image in response");
      return NextResponse.json(
        { ok: false, error: "Failed to generate image - no image returned" },
        { status: 500 }
      );
    }

    console.log("[generate-image] Image generated successfully");

    return NextResponse.json({
      ok: true,
      imageDataUrl,
    });
  } catch (err) {
    console.error("[generate-image] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
