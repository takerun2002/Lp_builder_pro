/**
 * ナレッジコンバーター
 *
 * テキスト/PDF/URLからナレッジを構造化しYAML形式に変換
 */

import { generateText } from "@/lib/ai/gemini";
import { scrapeUrl } from "@/lib/research/firecrawl";

// ============================================
// 型定義
// ============================================

export type KnowledgeInputType = "text" | "file" | "url";

export type SectionType = "pain" | "benefit" | "evidence" | "cta" | "story" | "technique" | "other";

export interface KnowledgeInput {
  type: KnowledgeInputType;
  content: string;
  category?: string;
  name?: string;
}

export interface KnowledgeSection {
  name: string;
  content: string;
  type: SectionType;
  subSections?: {
    name: string;
    content: string;
  }[];
}

export interface KnowledgeOutput {
  meta: {
    name: string;
    version: string;
    category: string;
    source: string;
    createdAt: string;
  };
  sections: KnowledgeSection[];
  powerWords: string[];
  keyPhrases: string[];
  yaml: string;
}

export interface ConversionOptions {
  name?: string;
  category?: string;
  useAI?: boolean;
}

// ============================================
// メイン変換関数
// ============================================

/**
 * テキストをナレッジに変換
 */
export async function convertToKnowledge(
  input: KnowledgeInput,
  options?: ConversionOptions
): Promise<KnowledgeOutput> {
  // 1. コンテンツを取得
  let rawContent = input.content;

  if (input.type === "url") {
    const scraped = await scrapeUrl(input.content);
    rawContent = scraped?.markdown || scraped?.html || "";
    if (!rawContent) {
      throw new Error("URLからコンテンツを取得できませんでした");
    }
  }

  // 2. AIで構造化
  const analysisResult = await analyzeContentWithAI(rawContent, options);

  // 3. YAML形式に変換
  const yaml = generateYaml(analysisResult);

  return {
    ...analysisResult,
    yaml,
  };
}

// ============================================
// AI分析
// ============================================

interface AIAnalysisResult {
  meta: KnowledgeOutput["meta"];
  sections: KnowledgeSection[];
  powerWords: string[];
  keyPhrases: string[];
}

async function analyzeContentWithAI(
  content: string,
  options?: ConversionOptions
): Promise<AIAnalysisResult> {
  const prompt = buildAnalysisPrompt(content, options);

  const response = await generateText(prompt, {
    model: "pro25",
    thinkingLevel: "high",
  });

  // JSONパース
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return normalizeAnalysisResult(parsed, options);
    }

    // JSONブロックがない場合、直接パースを試みる
    const parsed = JSON.parse(response);
    return normalizeAnalysisResult(parsed, options);
  } catch (e) {
    console.error("[converter] Failed to parse AI response:", e);
    // フォールバック: 基本構造を返す
    return createFallbackResult(content, options);
  }
}

function buildAnalysisPrompt(content: string, options?: ConversionOptions): string {
  return `あなたはコピーライティングとマーケティングの専門家です。
以下のテキストを分析し、LP制作に活用できるナレッジとして構造化してください。

## 入力テキスト
${content.slice(0, 10000)}

## 分析タスク
1. テキストを論理的なセクションに分割
2. 各セクションを以下のタイプに分類:
   - pain: 悩み・課題・問題提起
   - benefit: ベネフィット・メリット・理想の状態
   - evidence: 証拠・実績・データ・権威性
   - cta: 行動喚起・オファー
   - story: ストーリー・体験談
   - technique: テクニック・ノウハウ
   - other: その他

3. パワーワード（感情を動かす強い言葉）を抽出
4. キーフレーズ（重要な概念やコンセプト）を抽出

## 出力形式
\`\`\`json
{
  "suggestedName": "${options?.name || "抽出したナレッジ名"}",
  "suggestedCategory": "${options?.category || "copywriting"}",
  "sections": [
    {
      "name": "セクション名",
      "content": "セクション内容（要約または抜粋）",
      "type": "pain|benefit|evidence|cta|story|technique|other",
      "subSections": [
        {"name": "サブセクション名", "content": "内容"}
      ]
    }
  ],
  "powerWords": ["パワーワード1", "パワーワード2", ...],
  "keyPhrases": ["キーフレーズ1", "キーフレーズ2", ...]
}
\`\`\`

## 注意点
- sectionsは3〜10個程度に分割
- powerWordsは10〜30個抽出
- keyPhrasesは5〜15個抽出
- 日本語で出力
- subSectionsは必要な場合のみ`;
}

function normalizeAnalysisResult(
  parsed: Record<string, unknown>,
  options?: ConversionOptions
): AIAnalysisResult {
  const sections = ((parsed.sections as unknown[]) || []).map((s) => {
    const section = s as Record<string, unknown>;
    return {
      name: String(section.name || ""),
      content: String(section.content || ""),
      type: (section.type as SectionType) || "other",
      subSections: (section.subSections as { name: string; content: string }[]) || undefined,
    };
  });

  return {
    meta: {
      name: options?.name || String(parsed.suggestedName || "新規ナレッジ"),
      version: "1.0",
      category: options?.category || String(parsed.suggestedCategory || "copywriting"),
      source: "AI構造化",
      createdAt: new Date().toISOString(),
    },
    sections,
    powerWords: (parsed.powerWords as string[]) || [],
    keyPhrases: (parsed.keyPhrases as string[]) || [],
  };
}

function createFallbackResult(content: string, options?: ConversionOptions): AIAnalysisResult {
  // 基本的な分割（改行ベース）
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
  const sections: KnowledgeSection[] = paragraphs.slice(0, 5).map((p, i) => ({
    name: `セクション${i + 1}`,
    content: p.trim().slice(0, 500),
    type: "other" as SectionType,
  }));

  // 基本的なパワーワード抽出
  const powerWordPatterns = [
    "今すぐ",
    "限定",
    "無料",
    "驚き",
    "秘密",
    "特別",
    "保証",
    "実証",
    "簡単",
    "確実",
  ];
  const powerWords = powerWordPatterns.filter((w) => content.includes(w));

  return {
    meta: {
      name: options?.name || "新規ナレッジ",
      version: "1.0",
      category: options?.category || "copywriting",
      source: "フォールバック",
      createdAt: new Date().toISOString(),
    },
    sections,
    powerWords,
    keyPhrases: [],
  };
}

// ============================================
// YAML生成
// ============================================

function generateYaml(result: AIAnalysisResult): string {
  const lines: string[] = [];

  // ヘッダーコメント
  lines.push("# ============================================================");
  lines.push(`# ${result.meta.name}`);
  lines.push("# ============================================================");
  lines.push(`# Generated: ${result.meta.createdAt}`);
  lines.push("# ============================================================");
  lines.push("");

  // メタデータ
  lines.push("meta:");
  lines.push(`  name: "${escapeYamlString(result.meta.name)}"`);
  lines.push(`  version: "${result.meta.version}"`);
  lines.push(`  category: "${result.meta.category}"`);
  lines.push(`  source: "${escapeYamlString(result.meta.source)}"`);
  lines.push("");

  // セクション
  lines.push("# ============================================================");
  lines.push("# セクション");
  lines.push("# ============================================================");
  lines.push("");
  lines.push("sections:");

  for (const section of result.sections) {
    lines.push(`  - name: "${escapeYamlString(section.name)}"`);
    lines.push(`    type: "${section.type}"`);
    lines.push(`    content: |`);

    // コンテンツを適切にインデント
    const contentLines = section.content.split("\n");
    for (const line of contentLines) {
      lines.push(`      ${line}`);
    }

    if (section.subSections && section.subSections.length > 0) {
      lines.push("    subSections:");
      for (const sub of section.subSections) {
        lines.push(`      - name: "${escapeYamlString(sub.name)}"`);
        lines.push(`        content: "${escapeYamlString(sub.content)}"`);
      }
    }
    lines.push("");
  }

  // パワーワード
  lines.push("# ============================================================");
  lines.push("# パワーワード");
  lines.push("# ============================================================");
  lines.push("");
  lines.push("powerWords:");
  for (const word of result.powerWords) {
    lines.push(`  - "${escapeYamlString(word)}"`);
  }
  lines.push("");

  // キーフレーズ
  lines.push("# ============================================================");
  lines.push("# キーフレーズ");
  lines.push("# ============================================================");
  lines.push("");
  lines.push("keyPhrases:");
  for (const phrase of result.keyPhrases) {
    lines.push(`  - "${escapeYamlString(phrase)}"`);
  }

  return lines.join("\n");
}

function escapeYamlString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * URLからコンテンツを取得して変換
 */
export async function convertFromUrl(
  url: string,
  options?: ConversionOptions
): Promise<KnowledgeOutput> {
  return convertToKnowledge(
    { type: "url", content: url },
    options
  );
}

/**
 * テキストから直接変換
 */
export async function convertFromText(
  text: string,
  options?: ConversionOptions
): Promise<KnowledgeOutput> {
  return convertToKnowledge(
    { type: "text", content: text },
    options
  );
}

/**
 * YAMLをパースしてナレッジオブジェクトに変換
 */
export function parseKnowledgeYaml(yamlContent: string): Partial<KnowledgeOutput> {
  // 簡易YAMLパーサー（基本的な構造のみ対応）
  const lines = yamlContent.split("\n");
  const result: Partial<KnowledgeOutput> = {
    meta: {
      name: "",
      version: "1.0",
      category: "",
      source: "",
      createdAt: "",
    },
    sections: [],
    powerWords: [],
    keyPhrases: [],
  };

  let currentSection: "meta" | "sections" | "powerWords" | "keyPhrases" | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed === "meta:") {
      currentSection = "meta";
    } else if (trimmed === "sections:") {
      currentSection = "sections";
    } else if (trimmed === "powerWords:") {
      currentSection = "powerWords";
    } else if (trimmed === "keyPhrases:") {
      currentSection = "keyPhrases";
    } else if (currentSection === "powerWords" || currentSection === "keyPhrases") {
      const match = trimmed.match(/^-\s*"?([^"]*)"?$/);
      if (match && result[currentSection]) {
        result[currentSection]!.push(match[1]);
      }
    } else if (currentSection === "meta") {
      const match = trimmed.match(/^(\w+):\s*"?([^"]*)"?$/);
      if (match && result.meta) {
        (result.meta as Record<string, string>)[match[1]] = match[2];
      }
    }
  }

  return result;
}

/**
 * セクションタイプのラベル
 */
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  pain: "悩み・課題",
  benefit: "ベネフィット",
  evidence: "証拠・実績",
  cta: "行動喚起",
  story: "ストーリー",
  technique: "テクニック",
  other: "その他",
};

/**
 * カテゴリ一覧
 */
export const KNOWLEDGE_CATEGORIES = [
  { value: "copywriting", label: "コピーライティング" },
  { value: "marketing", label: "マーケティング" },
  { value: "psychology", label: "心理学・行動経済学" },
  { value: "sales", label: "セールス" },
  { value: "product", label: "商品・サービス" },
  { value: "case_study", label: "事例・ケーススタディ" },
  { value: "other", label: "その他" },
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]["value"];
