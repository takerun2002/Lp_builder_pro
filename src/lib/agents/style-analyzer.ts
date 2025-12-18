/**
 * LPスタイル分析エージェント
 *
 * Gemini Vision APIでLP画像を分析
 */

import { getGeminiClient } from "@/lib/ai/gemini";

// ============================================================
// 型定義
// ============================================================

export interface StyleAnalysis {
  layout: LayoutPattern;
  toneManner: ToneManner;
  targetAudience: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    headlineStyle: string;
    bodyStyle: string;
    fontMood: string;
  };
  strengths: string[];
  weaknesses?: string[];
  designTips?: string[];
  overallScore: number; // 1-10
}

export type LayoutPattern =
  | "Z型"
  | "F型"
  | "縦長スクロール"
  | "カード型"
  | "ストーリー型"
  | "比較型"
  | "ステップ型"
  | "その他";

export type ToneManner =
  | "高級感"
  | "ポップ・カジュアル"
  | "信頼感・誠実"
  | "親しみやすい"
  | "クール・モダン"
  | "ナチュラル・オーガニック"
  | "ビジネス・プロフェッショナル"
  | "女性向け・エレガント"
  | "男性向け・力強い"
  | "その他";

// ============================================================
// メイン分析関数
// ============================================================

/**
 * LP画像のスタイル分析
 */
export async function analyzeLpStyle(
  imageUrl: string
): Promise<StyleAnalysis> {
  const gemini = getGeminiClient();

  const prompt = `あなたはプロのWebデザイナーです。以下のLP（ランディングページ）画像を分析し、JSON形式で結果を返してください。

## 分析項目

1. **layout** - レイアウトパターン（以下から選択）:
   - "Z型" - 視線がZ字に動く
   - "F型" - 視線がF字に動く
   - "縦長スクロール" - シンプルに縦スクロール
   - "カード型" - カード要素で構成
   - "ストーリー型" - ストーリーテリング
   - "比較型" - ビフォーアフター、比較表
   - "ステップ型" - ステップバイステップ
   - "その他"

2. **toneManner** - トンマナ（以下から選択）:
   - "高級感"
   - "ポップ・カジュアル"
   - "信頼感・誠実"
   - "親しみやすい"
   - "クール・モダン"
   - "ナチュラル・オーガニック"
   - "ビジネス・プロフェッショナル"
   - "女性向け・エレガント"
   - "男性向け・力強い"
   - "その他"

3. **targetAudience** - 想定ターゲット層（例: "30-40代女性、美容に関心が高い"）

4. **colorPalette** - カラーパレット（HEXコード）:
   - primary: メインカラー
   - secondary: サブカラー
   - accent: アクセントカラー
   - background: 背景色

5. **typography** - タイポグラフィ:
   - headlineStyle: 見出しのスタイル（例: "太字ゴシック"）
   - bodyStyle: 本文のスタイル（例: "明朝体"）
   - fontMood: フォントの印象（例: "力強い"）

6. **strengths** - このデザインの強み（3-5つ）

7. **weaknesses** - 改善点があれば（0-3つ）

8. **designTips** - このLPから学べるデザインテクニック（2-3つ）

9. **overallScore** - 総合評価（1-10、10が最高）

## 出力形式

\`\`\`json
{
  "layout": "レイアウトパターン",
  "toneManner": "トンマナ",
  "targetAudience": "ターゲット層の説明",
  "colorPalette": {
    "primary": "#XXXXXX",
    "secondary": "#XXXXXX",
    "accent": "#XXXXXX",
    "background": "#XXXXXX"
  },
  "typography": {
    "headlineStyle": "見出しスタイル",
    "bodyStyle": "本文スタイル",
    "fontMood": "フォントの印象"
  },
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["改善点1"],
  "designTips": ["テクニック1", "テクニック2"],
  "overallScore": 8
}
\`\`\`

必ずJSON形式のみで回答してください。`;

  try {
    // 画像をBase64に変換してGeminiに送信
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: getImageMimeType(imageUrl),
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });

    const text = response.text || "";

    // JSONを抽出
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        layout: parsed.layout || "その他",
        toneManner: parsed.toneManner || "その他",
        targetAudience: parsed.targetAudience || "不明",
        colorPalette: parsed.colorPalette || {
          primary: "#000000",
          secondary: "#666666",
          accent: "#0066CC",
          background: "#FFFFFF",
        },
        typography: parsed.typography || {
          headlineStyle: "不明",
          bodyStyle: "不明",
          fontMood: "不明",
        },
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        designTips: parsed.designTips || [],
        overallScore: parsed.overallScore || 5,
      };
    }

    throw new Error("Failed to parse JSON response");
  } catch (error) {
    console.error("[style-analyzer] Analysis error:", error);

    // フォールバック
    return getDefaultStyleAnalysis();
  }
}

/**
 * 複数のLP画像を比較分析
 */
export async function compareLpStyles(
  imageUrls: string[]
): Promise<{
  commonPatterns: string[];
  uniqueFeatures: Array<{ url: string; features: string[] }>;
  recommendations: string[];
}> {
  // 個別に分析
  const analyses = await Promise.all(
    imageUrls.slice(0, 5).map((url) => analyzeLpStyle(url))
  );

  // 共通パターンを抽出
  const layoutCounts: Record<string, number> = {};
  const toneCounts: Record<string, number> = {};
  const allStrengths: string[] = [];

  analyses.forEach((analysis) => {
    layoutCounts[analysis.layout] = (layoutCounts[analysis.layout] || 0) + 1;
    toneCounts[analysis.toneManner] = (toneCounts[analysis.toneManner] || 0) + 1;
    allStrengths.push(...analysis.strengths);
  });

  const commonPatterns = [
    `最も多いレイアウト: ${getTopKey(layoutCounts)}`,
    `最も多いトンマナ: ${getTopKey(toneCounts)}`,
  ];

  const uniqueFeatures = analyses.map((analysis, i) => ({
    url: imageUrls[i],
    features: analysis.strengths.slice(0, 3),
  }));

  const recommendations = [
    "トップLPで共通して使われているレイアウトパターンを参考にしましょう",
    "ターゲット層に合ったトンマナを選択することが重要です",
    "カラーパレットは業界の慣習も考慮して決定しましょう",
  ];

  return { commonPatterns, uniqueFeatures, recommendations };
}

// ============================================================
// ユーティリティ
// ============================================================

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return base64;
}

function getImageMimeType(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

function getTopKey(counts: Record<string, number>): string {
  let topKey = "";
  let topCount = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > topCount) {
      topCount = count;
      topKey = key;
    }
  }
  return topKey;
}

function getDefaultStyleAnalysis(): StyleAnalysis {
  return {
    layout: "縦長スクロール",
    toneManner: "その他",
    targetAudience: "不明",
    colorPalette: {
      primary: "#333333",
      secondary: "#666666",
      accent: "#0066CC",
      background: "#FFFFFF",
    },
    typography: {
      headlineStyle: "ゴシック体",
      bodyStyle: "ゴシック体",
      fontMood: "標準",
    },
    strengths: ["分析データなし"],
    overallScore: 5,
  };
}
