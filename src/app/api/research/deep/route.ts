/**
 * Deep Research API エンドポイント
 *
 * Gemini 2.5 Pro + Google Search Grounding を使用した
 * 詳細な市場分析・トレンド調査を実行
 *
 * コピーライティング強化版:
 * - 信念移転（Belief Transfer）
 * - 損失回避バイアス
 * - AIDAインサイト
 * - 競合分析（業界の闇、共通の敵）
 * - N1ペルソナ生成
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  ResearchContext,
  DeepResearchResult,
  Citation,
  BeliefTransfer,
  LossAversion,
  AidaInsights,
  DeepCompetitorAnalysis,
  N1Persona,
  AttractiveCharacter,
} from "@/lib/research/types";
import { GENRE_LABELS } from "@/lib/research/types";

// 5分タイムアウト（Vercel Pro対応）
export const maxDuration = 300;

// Geminiクライアント取得
function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({});
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const context: ResearchContext = body.context;

    if (!context) {
      return NextResponse.json(
        { ok: false, error: "context is required" },
        { status: 400 }
      );
    }

    console.log("[deep-research] Starting Deep Research...");
    console.log("[deep-research] Context:", {
      genre: context.genre,
      subGenre: context.subGenre,
      target: context.target,
    });

    const client = getGeminiClient();
    const prompt = buildPrompt(context);

    // Gemini 2.5 Pro + Google Search Grounding で実行
    const result = await runDeepResearch(client, prompt);

    const elapsedMs = Date.now() - startTime;
    console.log(`[deep-research] Completed in ${elapsedMs}ms`);

    return NextResponse.json({
      ok: true,
      result,
      elapsedMs,
    });
  } catch (err) {
    console.error("[deep-research] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * Deep Research 実行（Gemini 2.5 Pro + Grounding）
 */
async function runDeepResearch(
  client: GoogleGenAI,
  prompt: string
): Promise<DeepResearchResult> {
  console.log("[deep-research] Running with Gemini 2.5 Pro + Google Search...");

  const response = await client.models.generateContent({
    model: "gemini-2.5-pro",
    contents: prompt,
    config: {
      // Web検索を有効化（grounding）
      tools: [{
        googleSearch: {},
      }],
    },
  });

  const text = response.text || "";

  // Grounding metadataから引用を抽出
  const citations: Citation[] = [];
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

  if (groundingMetadata?.groundingChunks) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk.web?.uri) {
        citations.push({
          title: chunk.web.title || "参考情報",
          url: chunk.web.uri,
          snippet: "",
        });
      }
    }
  }

  const parsed = parseResult(text);

  // 引用情報をマージ
  if (citations.length > 0 && parsed.citations.length === 0) {
    parsed.citations = citations;
  }

  return parsed;
}

/**
 * プロンプト生成（日本市場特化・コピーライティング強化版）
 */
function buildPrompt(context: ResearchContext): string {
  const genreLabel = GENRE_LABELS[context.genre] || context.genre;
  const subGenre = context.subGenre || "";
  const targetSummary = buildTargetSummary(context);
  const problems = context.target.problems || "未指定（調査で発見）";
  const desires = context.target.desires || "未指定（調査で発見）";
  const moods = context.toneManner?.moods?.join(", ") || "professional";
  const freeText = context.freeText || "";

  return `あなたはLP（ランディングページ）とセールスコピーの専門家です。
日本市場向けにWeb調査を行い、必ずJSONのみで出力してください。Markdownは禁止です。

【案件情報】
ジャンル: ${genreLabel}
サブジャンル: ${subGenre}
ターゲット: ${targetSummary}
悩み: ${problems}
理想: ${desires}
トンマナ: ${moods}
追加情報: ${freeText}

【必須テーマ】
1) ターゲット心理分析
  - 信念移転（現状の信念→望ましい信念）
  - 損失回避バイアス（行動しない損失）
  - AIDAごとの心理障壁
2) 競合LP分析
  - 共通構成 / コピー型
  - 業界の闇・不都合な真実
  - 共通の敵の候補
3) N1ペルソナ生成
  - アトラクティブキャラクター4要素（バックストーリー/パラブル/欠点/ポラリティ）

【日本市場条件】
- 価格帯・相場は日本円を基準に推定
- 引用は日本語ソース中心（.jp優先）
- 可能なら日本の事例や市場データを優先

【出力形式(JSONのみ)】
{
  "trendReport": "最新トレンド分析（文字列）",
  "marketAnalysis": "市場分析レポート（文字列）",
  "psychologyInsights": "心理学的インサイト（文字列）",
  "recommendations": ["推奨事項1", "推奨事項2", "推奨事項3"],
  "citations": [
    {"title": "参考ページタイトル", "url": "https://...", "snippet": "関連する抜粋"}
  ],
  "beliefTransfer": {
    "currentBeliefs": ["現状の信念1", "現状の信念2"],
    "desiredBeliefs": ["望ましい信念1", "望ましい信念2"],
    "bridgeLogic": ["橋渡しロジック1", "橋渡しロジック2"]
  },
  "lossAversion": {
    "doNothingRisks": ["行動しないリスク1", "行動しないリスク2"],
    "timeLossExamples": ["時間損失例1", "時間損失例2"],
    "opportunityCosts": ["機会損失1", "機会損失2"]
  },
  "aidaInsights": {
    "attention": ["注意を引くポイント1", "注意を引くポイント2"],
    "interest": ["興味を持たせるポイント1", "興味を持たせるポイント2"],
    "desire": ["欲求を高めるポイント1", "欲求を高めるポイント2"],
    "action": ["行動を促すポイント1", "行動を促すポイント2"]
  },
  "competitorAnalysis": {
    "commonStructure": ["共通構成要素1", "共通構成要素2"],
    "headlinePatterns": ["ヘッドラインパターン1", "ヘッドラインパターン2"],
    "ctaPatterns": ["CTAパターン1", "CTAパターン2"],
    "industryDarkness": ["業界の闇1", "業界の闘2"],
    "commonEnemyCandidates": ["共通の敵候補1", "共通の敵候補2"]
  },
  "persona": {
    "name": "ペルソナ名",
    "age": 35,
    "occupation": "職業",
    "context": "状況・背景の説明",
    "painQuotes": ["痛みの言葉1", "痛みの言葉2"],
    "desireQuotes": ["欲求の言葉1", "欲求の言葉2"],
    "triggers": ["購買トリガー1", "購買トリガー2"],
    "hesitations": ["躊躇・障壁1", "躊躇・障壁2"],
    "attractiveCharacter": {
      "backstory": "バックストーリー",
      "parable": "寓話・比喩",
      "flaw": "欠点",
      "polarity": "極性・立場"
    }
  }
}

【必須ルール】
- JSON以外は出力しない
- 未確定な項目は空文字 / 空配列で返す
- citationsはhttps URLのみ`;
}

/**
 * ターゲットサマリー生成
 */
function buildTargetSummary(context: ResearchContext): string {
  const ages = context.target.ageGroups.join(", ");
  const gender = context.target.gender === "female" ? "女性"
    : context.target.gender === "male" ? "男性"
    : "男女";
  const occupation = context.target.occupation || "";
  return `${ages}歳代 ${gender}${occupation ? ` ${occupation}` : ""}`;
}

/**
 * 結果をパース（拡張版）
 */
function parseResult(text: string): DeepResearchResult {
  try {
    // JSONブロックを抽出（```json ... ```）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    // JSON前後の余分なテキストを削除
    const cleanedText = jsonText.trim();

    // JSONパース試行
    const parsed = tryParseRawJson(cleanedText);

    if (parsed) {
      return buildDeepResearchResult(parsed);
    }
  } catch (e) {
    console.warn("[deep-research] Failed to parse JSON:", e);
  }

  // パース失敗時はテキストをそのまま使用
  return {
    trendReport: text,
    marketAnalysis: "",
    psychologyInsights: "",
    recommendations: [],
    citations: [],
  };
}

/**
 * パース結果からDeepResearchResultを構築
 */
function buildDeepResearchResult(parsed: Record<string, unknown>): DeepResearchResult {
  return {
    // 基本フィールド
    trendReport: String(parsed.trendReport || ""),
    marketAnalysis: String(parsed.marketAnalysis || ""),
    psychologyInsights: String(parsed.psychologyInsights || ""),
    recommendations: parseStringArray(parsed.recommendations),
    citations: parseCitations(parsed.citations),

    // 拡張フィールド
    beliefTransfer: parseBeliefTransfer(parsed.beliefTransfer),
    lossAversion: parseLossAversion(parsed.lossAversion),
    aidaInsights: parseAidaInsights(parsed.aidaInsights),
    competitorAnalysis: parseCompetitorAnalysis(parsed.competitorAnalysis),
    persona: parsePersona(parsed.persona),
  };
}

/**
 * 生のJSONテキストをパース試行
 */
function tryParseRawJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * 文字列配列のパース
 */
function parseStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item): item is string => typeof item === "string");
}

/**
 * Citation配列をパース
 */
function parseCitations(citations: unknown): Citation[] {
  if (!Array.isArray(citations)) return [];

  return citations
    .filter((c): c is { title?: string; url?: string; snippet?: string } =>
      typeof c === "object" && c !== null
    )
    .map((c) => ({
      title: String(c.title || "参考情報"),
      url: String(c.url || ""),
      snippet: String(c.snippet || ""),
    }))
    .filter((c) => c.url); // URLがないものは除外
}

/**
 * BeliefTransferのパース
 */
function parseBeliefTransfer(data: unknown): BeliefTransfer | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;

  return {
    currentBeliefs: parseStringArray(obj.currentBeliefs),
    desiredBeliefs: parseStringArray(obj.desiredBeliefs),
    bridgeLogic: parseStringArray(obj.bridgeLogic),
  };
}

/**
 * LossAversionのパース
 */
function parseLossAversion(data: unknown): LossAversion | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;

  return {
    doNothingRisks: parseStringArray(obj.doNothingRisks),
    timeLossExamples: parseStringArray(obj.timeLossExamples),
    opportunityCosts: parseStringArray(obj.opportunityCosts),
  };
}

/**
 * AidaInsightsのパース
 */
function parseAidaInsights(data: unknown): AidaInsights | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;

  return {
    attention: parseStringArray(obj.attention),
    interest: parseStringArray(obj.interest),
    desire: parseStringArray(obj.desire),
    action: parseStringArray(obj.action),
  };
}

/**
 * DeepCompetitorAnalysisのパース
 */
function parseCompetitorAnalysis(data: unknown): DeepCompetitorAnalysis | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;

  return {
    commonStructure: parseStringArray(obj.commonStructure),
    headlinePatterns: parseStringArray(obj.headlinePatterns),
    ctaPatterns: parseStringArray(obj.ctaPatterns),
    industryDarkness: parseStringArray(obj.industryDarkness),
    commonEnemyCandidates: parseStringArray(obj.commonEnemyCandidates),
  };
}

/**
 * AttractiveCharacterのパース
 */
function parseAttractiveCharacter(data: unknown): AttractiveCharacter | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;

  return {
    backstory: String(obj.backstory || ""),
    parable: String(obj.parable || ""),
    flaw: String(obj.flaw || ""),
    polarity: String(obj.polarity || ""),
  };
}

/**
 * N1Personaのパース
 */
function parsePersona(data: unknown): N1Persona | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;

  return {
    name: String(obj.name || ""),
    age: typeof obj.age === "number" ? obj.age : 0,
    occupation: String(obj.occupation || ""),
    context: String(obj.context || ""),
    painQuotes: parseStringArray(obj.painQuotes),
    desireQuotes: parseStringArray(obj.desireQuotes),
    triggers: parseStringArray(obj.triggers),
    hesitations: parseStringArray(obj.hesitations),
    attractiveCharacter: parseAttractiveCharacter(obj.attractiveCharacter),
  };
}
