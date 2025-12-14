import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, GEMINI_IMAGE_MODEL_ID } from "@/lib/ai/gemini";

export const runtime = "nodejs";

interface RefImageInput {
  mimeType: string;
  base64: string;
}

type MangaStyle = "4koma" | "banner" | "hero" | "story";

interface MangaGenerateRequest {
  prompt: string;
  style: MangaStyle;
  characterRefs?: RefImageInput[];
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3";
  colorMode?: "fullcolor" | "monochrome";
}

interface MangaGenerateSuccessResponse {
  ok: true;
  imageDataUrl: string;
  modelUsed: string;
  elapsedMs: number;
}

interface MangaGenerateErrorResponse {
  ok: false;
  error: {
    message: string;
    status?: number;
  };
}

type MangaGenerateResponse = MangaGenerateSuccessResponse | MangaGenerateErrorResponse;

const MAX_CHARACTER_REFS = 4;

// ============================================================
// 年齢制御メタプロンプト構築
// ============================================================

/**
 * 年齢層の定義
 * - 各年齢層に対応するキーワードと視覚的特徴を定義
 */
type AgeGroup = "child" | "teen" | "adult" | "elderly";

interface AgeGroupDefinition {
  label: string;
  ageRange: string;
  keywords: string[];
  visualFeatures: string;
}

const AGE_GROUPS: Record<AgeGroup, AgeGroupDefinition> = {
  child: {
    label: "子供",
    ageRange: "5-12歳",
    keywords: [
      "子供", "子ども", "こども", "幼児", "小学生", "少年", "少女",
      "男の子", "女の子", "kid", "child", "children", "boy", "girl",
      "息子", "娘", "孫"
    ],
    visualFeatures: `
      - 頭身比: 4-5頭身（頭が大きく、体が小さい）
      - 顔立ち: 丸顔、大きな目、小さな鼻と口、ふっくらした頬
      - 体型: 手足が短く、体全体が丸みを帯びている
      - 身長: 大人の腰〜胸の高さ程度
      - 表情: 無邪気で純粋な印象`
  },
  teen: {
    label: "中高生",
    ageRange: "13-17歳",
    keywords: [
      "中学生", "高校生", "中高生", "ティーン", "ティーンエイジャー",
      "teen", "teenager", "学生", "生徒"
    ],
    visualFeatures: `
      - 頭身比: 6-7頭身（大人に近いが、やや頭が大きめ）
      - 顔立ち: やや丸みが残る顔、大きめの目、若々しい印象
      - 体型: 細身で華奢、成長途中の体つき
      - 身長: 大人より少し低い〜同程度
      - 表情: 若さと活力が感じられる`
  },
  adult: {
    label: "大人",
    ageRange: "25-45歳",
    keywords: [
      "大人", "成人", "女性", "男性", "お母さん", "お父さん",
      "母親", "父親", "ママ", "パパ", "親", "adult", "woman", "man",
      "mother", "father", "mom", "dad", "parent", "社会人", "会社員"
    ],
    visualFeatures: `
      - 頭身比: 7-8頭身（バランスの取れた大人のプロポーション）
      - 顔立ち: シャープな輪郭、落ち着いた目元、成熟した表情
      - 体型: 発達した体つき、しっかりした骨格
      - 身長: 標準的な大人の身長
      - 表情: 成熟した落ち着きのある印象`
  },
  elderly: {
    label: "高齢者",
    ageRange: "60-80歳",
    keywords: [
      "おばあちゃん", "おじいちゃん", "祖母", "祖父", "高齢", "老人",
      "お年寄り", "elderly", "grandmother", "grandfather", "grandma",
      "grandpa", "old", "senior", "年配"
    ],
    visualFeatures: `
      - 頭身比: 6-7頭身（やや縮んだ印象）
      - 顔立ち: シワ、たるみ、白髪または薄い髪、優しい目元
      - 体型: やや猫背、細身または丸みを帯びた体型
      - 身長: やや低め（姿勢の影響）
      - 表情: 穏やかで慈愛に満ちた印象`
  }
};

/**
 * プロンプトから年齢キーワードを検出
 * @param prompt ユーザーのプロンプト
 * @returns 検出された年齢層の配列
 */
function detectAgeGroups(prompt: string): AgeGroup[] {
  const lowerPrompt = prompt.toLowerCase();
  const detected: AgeGroup[] = [];

  for (const [group, definition] of Object.entries(AGE_GROUPS)) {
    const hasKeyword = definition.keywords.some(keyword =>
      lowerPrompt.includes(keyword.toLowerCase())
    );
    if (hasKeyword) {
      detected.push(group as AgeGroup);
    }
  }

  return detected;
}

/**
 * 年齢制御指示を構築するメタプロンプト関数
 * @param prompt ユーザーのプロンプト
 * @param hasCharacterRefs キャラクター参照画像があるかどうか
 * @returns 年齢制御指示の文字列
 */
function buildAgeControlInstruction(prompt: string, hasCharacterRefs: boolean): string {
  const detectedGroups = detectAgeGroups(prompt);

  // 基本的な年齢制御ルール（常に含める）
  const baseRules = `
【年齢制御の基本原則】
- 各キャラクターの年齢は、外見的特徴で明確に区別すること
- 同じシーン内で複数の年齢層が登場する場合、年齢差を誇張するくらい明確に描き分けること
- 年齢の混同は絶対に避けること（子供が大人のように見えたり、その逆は厳禁）`;

  let instruction = baseRules;

  if (detectedGroups.length > 0) {
    // 年齢キーワードが検出された場合
    instruction += `

【検出された年齢層と視覚的特徴（厳守）】`;

    for (const group of detectedGroups) {
      const def = AGE_GROUPS[group];
      instruction += `

■ ${def.label}（${def.ageRange}）${def.visualFeatures}`;
    }

    // 複数の年齢層が検出された場合の追加指示
    if (detectedGroups.length > 1) {
      instruction += `

【複数年齢層の描き分け（最重要）】
- 上記の年齢層が同じシーンに登場する場合、それぞれの特徴を明確に描き分けること
- 特に頭身比と身長差を誇張して、年齢差が一目で分かるようにすること
- 子供は大人の腰〜胸の高さに描くこと
- 顔の丸み、目の大きさ、体のプロポーションで年齢を表現すること`;
    }
  } else {
    // 年齢キーワードが検出されなかった場合
    instruction += `

【年齢推測のガイドライン】
- プロンプトの文脈から適切な年齢を推測し、一貫性を保つこと
- 複数のキャラクターが登場する場合、それぞれに適切な年齢を設定し、外見で区別すること
- 年齢が不明な場合は、成人（25-35歳程度）として描くこと
- ただし、「親子」「家族」などの関係性が示唆される場合は、年齢差を明確にすること`;
  }

  // キャラクター参照画像がある場合の追加指示
  if (hasCharacterRefs) {
    instruction += `

【キャラクター参照画像の年齢維持】
- 参照画像に写っているキャラクターの年齢を正確に維持すること
- 参照画像の顔立ち、体型、プロポーションを忠実に再現すること
- プロンプトの年齢指定と参照画像の年齢が矛盾する場合は、参照画像の年齢を優先すること
- 参照画像のキャラクターを老けさせたり、若返らせたりしないこと`;
  }

  return instruction;
}

// ============================================================
// スタイル別プロンプト
// ============================================================

const STYLE_PROMPTS: Record<MangaStyle, string> = {
  "4koma": `【4コマ漫画スタイル】
- 縦長のキャンバスに4つのコマを縦に配置
- 各コマは横長（16:9程度）
- 漫画的な表現（効果線、吹き出し、オノマトペ）を使用
- キャラクターの表情は豊かに
- セリフは日本語で`,

  banner: `【漫画バナースタイル】
- 広告バナー向けの漫画イラスト
- インパクトのある構図
- テキストスペースを確保
- 鮮やかな色使い
- 視線誘導を意識したレイアウト`,

  hero: `【ファーストビュー漫画スタイル】
- ランディングページのヒーローセクション向け
- キャラクターを大きく配置
- 感情が伝わる表現
- 背景は商品/サービスに関連
- CTA領域を確保`,

  story: `【ストーリー漫画スタイル】
- 複数コマで物語を伝える
- 起承転結を意識
- キャラクター同士の会話や関係性を表現
- 読者を引き込む構成`,
};

// ============================================================
// バリデーション
// ============================================================

function validateRefImage(ref: unknown): ref is RefImageInput {
  if (!ref || typeof ref !== "object") return false;
  const r = ref as Record<string, unknown>;
  return typeof r.mimeType === "string" && typeof r.base64 === "string";
}

// ============================================================
// メインハンドラー
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse<MangaGenerateResponse>> {
  let body: MangaGenerateRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body", status: 400 } },
      { status: 400 }
    );
  }

  const { prompt, style, characterRefs, aspectRatio = "16:9", colorMode = "fullcolor" } = body;

  // Validate prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json(
      { ok: false, error: { message: "prompt is required", status: 400 } },
      { status: 400 }
    );
  }

  // Validate style
  if (!style || !["4koma", "banner", "hero", "story"].includes(style)) {
    return NextResponse.json(
      { ok: false, error: { message: "style must be one of: 4koma, banner, hero, story", status: 400 } },
      { status: 400 }
    );
  }

  // Validate character references
  const validCharRefs: RefImageInput[] = [];
  if (characterRefs && Array.isArray(characterRefs)) {
    for (const ref of characterRefs.slice(0, MAX_CHARACTER_REFS)) {
      if (validateRefImage(ref)) {
        validCharRefs.push(ref);
      }
    }
  }

  const startTime = Date.now();

  try {
    const ai = getGeminiClient();

    // Build the full prompt with age control
    const stylePrompt = STYLE_PROMPTS[style];
    const colorInstruction = colorMode === "monochrome"
      ? "【カラーモード】モノクロ（白黒）で描いてください。"
      : "【カラーモード】フルカラーで鮮やかに描いてください。";

    const aspectInstruction = `【アスペクト比】${aspectRatio}`;

    const charRefInstruction = validCharRefs.length > 0
      ? `【キャラクター参照】添付のキャラクター参照画像（${validCharRefs.length}枚）を元に、キャラクターの顔や特徴を忠実に再現してください。`
      : "";

    // 年齢制御メタプロンプトを構築
    const ageControlInstruction = buildAgeControlInstruction(prompt, validCharRefs.length > 0);

    const fullPrompt = `あなたは漫画・イラスト生成の専門家です。以下の指示に従って高品質な漫画イラストを生成してください。

${stylePrompt}

${colorInstruction}
${aspectInstruction}
${charRefInstruction}

${ageControlInstruction}

【ユーザーの指示】
${prompt}

【重要】
- 高品質な漫画/アニメスタイルで描画
- 日本の漫画の表現技法を活用
- **キャラクターの年齢を厳密に守る（最重要・最優先）**
- 年齢の混同は絶対に避ける
- 子供は子供らしく、大人は大人らしく、高齢者は高齢者らしく描く
- プロフェッショナルな仕上がり`;

    // Build parts array
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: fullPrompt },
    ];

    // Add character reference images
    for (const ref of validCharRefs) {
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
        { ok: false, error: { message: "No response from Gemini", status: 500 } },
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

    // Log detected age groups for debugging
    const detectedAges = detectAgeGroups(prompt);
    console.log(`[manga-generate] Success: style=${style}, charRefs=${validCharRefs.length}, detectedAges=[${detectedAges.join(",")}], elapsed=${elapsedMs}ms`);

    return NextResponse.json({
      ok: true,
      imageDataUrl: resultDataUrl,
      modelUsed: GEMINI_IMAGE_MODEL_ID,
      elapsedMs,
    });
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[manga-generate] Error after ${elapsedMs}ms:`, err);

    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("Missing GOOGLE_API_KEY")) {
      return NextResponse.json(
        { ok: false, error: { message: "API key not configured", status: 401 } },
        { status: 401 }
      );
    }

    if (status === 429) {
      return NextResponse.json(
        { ok: false, error: { message: "Rate limit exceeded. Please wait and try again.", status: 429 } },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { ok: false, error: { message, status: status ?? 500 } },
      { status: status ?? 500 }
    );
  }
}
