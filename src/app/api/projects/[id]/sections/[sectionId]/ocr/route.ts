import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getGeminiClient, getDefaultGeminiTextModelId } from "@/lib/ai/gemini";
import fs from "fs";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Section {
  id: string;
  project_id: string;
  image_path: string | null;
  width: number | null;
  height: number | null;
}

interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RouteContext {
  params: Promise<{ id: string; sectionId: string }>;
}

// POST /api/projects/[id]/sections/[sectionId]/ocr - OCR実行
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId, sectionId } = await context.params;
    const db = getDb();

    // セクション取得
    const section = db
      .prepare("SELECT * FROM sections WHERE id = ? AND project_id = ?")
      .get(sectionId, projectId) as Section | undefined;

    if (!section) {
      return NextResponse.json(
        { ok: false, error: "Section not found" },
        { status: 404 }
      );
    }

    if (!section.image_path || !fs.existsSync(section.image_path)) {
      return NextResponse.json(
        { ok: false, error: "Section has no image" },
        { status: 400 }
      );
    }

    // 画像をbase64で読み込み
    const imageBuffer = fs.readFileSync(section.image_path);
    const base64 = imageBuffer.toString("base64");
    const ext = section.image_path.split(".").pop()?.toLowerCase() || "png";
    const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

    // Gemini でOCR実行
    const ai = getGeminiClient();
    const modelId = getDefaultGeminiTextModelId();

    const prompt = `この画像内のテキストを検出し、各テキスト領域のバウンディングボックスと内容を返してください。

出力形式は必ず以下のJSONのみで、他の説明は一切不要です：
{
  "boxes": [
    { "id": "t1", "text": "テキスト内容", "x": 左端X座標, "y": 上端Y座標, "w": 幅, "h": 高さ },
    ...
  ]
}

重要:
- 座標はピクセル単位で、画像の左上を原点(0,0)とする
- 画像サイズは ${section.width || "不明"} x ${section.height || "不明"} ピクセル
- 各テキスト領域を個別のボックスとして検出
- 空のテキストや装飾のみのボックスは除外
- JSONのみを出力（コードフェンスやmarkdownは不要）`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
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

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("[ocr] Gemini response length:", responseText.length);

    // JSONをパース（コードフェンス除去）
    let boxes: TextBox[] = [];
    try {
      // コードフェンスを除去
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
      }

      // JSON抽出
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.boxes)) {
          boxes = parsed.boxes.filter((b: unknown) => {
            if (typeof b !== "object" || b === null) return false;
            const box = b as Record<string, unknown>;
            return (
              typeof box.text === "string" &&
              typeof box.x === "number" &&
              typeof box.y === "number" &&
              typeof box.w === "number" &&
              typeof box.h === "number"
            );
          }).map((b: Record<string, unknown>, idx: number) => ({
            id: typeof b.id === "string" ? b.id : `t${idx + 1}`,
            text: b.text as string,
            x: Math.round(b.x as number),
            y: Math.round(b.y as number),
            w: Math.round(b.w as number),
            h: Math.round(b.h as number),
          }));
        }
      }
    } catch (parseErr) {
      console.error("[ocr] JSON parse error:", parseErr);
      return NextResponse.json(
        { ok: false, error: "Failed to parse OCR result" },
        { status: 500 }
      );
    }

    console.log("[ocr] Detected boxes:", boxes.length);

    return NextResponse.json({
      ok: true,
      boxes,
      imageWidth: section.width,
      imageHeight: section.height,
    });
  } catch (err) {
    console.error("[ocr] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
