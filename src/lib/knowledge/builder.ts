/**
 * ナレッジ構築機能
 * テキスト/PDF → AI構造化 → YAMLナレッジ自動生成
 */

import { GoogleGenAI } from "@google/genai";
import yaml from "js-yaml";

// ============================================
// 型定義
// ============================================

export interface KnowledgeBuilderInput {
  /** 元のテキストコンテンツ */
  content: string;
  /** ナレッジの名前 */
  name: string;
  /** カテゴリ（オプション） */
  category?: string;
  /** 用途の説明 */
  description?: string;
  /** 出力形式 */
  outputFormat?: "yaml" | "json";
}

export interface KnowledgeCategory {
  name: string;
  description: string;
  items: KnowledgeItem[];
}

export interface KnowledgeItem {
  keyword?: string;
  phrase?: string;
  concept?: string;
  description: string;
  use_case?: string;
  example?: string;
  effect?: string;
}

export interface KnowledgeMeta {
  name: string;
  version: string;
  category: string;
  description: string;
  total_items: number;
  source: string;
  created_at: string;
  use_cases: string[];
}

export interface StructuredKnowledge {
  meta: KnowledgeMeta;
  categories: Record<string, KnowledgeCategory>;
}

export interface KnowledgeBuilderResult {
  success: boolean;
  knowledge?: StructuredKnowledge;
  yaml?: string;
  json?: string;
  error?: string;
  stats?: {
    totalCategories: number;
    totalItems: number;
    processingTime: number;
  };
}

// ============================================
// AI構造化プロンプト
// ============================================

const STRUCTURE_PROMPT = `
あなたはナレッジベース構築のエキスパートです。
与えられたテキストを分析し、構造化されたナレッジベースに変換してください。

## 入力テキスト
{content}

## ナレッジ情報
- 名前: {name}
- カテゴリ: {category}
- 説明: {description}

## 出力形式
以下のJSON形式で出力してください:

\`\`\`json
{
  "categories": {
    "category_id_1": {
      "name": "カテゴリ名1",
      "description": "カテゴリの説明",
      "items": [
        {
          "keyword": "キーワードや用語",
          "description": "詳細な説明",
          "use_case": "使用シーン",
          "example": "具体例（あれば）",
          "effect": "効果や影響"
        }
      ]
    },
    "category_id_2": {
      "name": "カテゴリ名2",
      ...
    }
  },
  "suggested_use_cases": ["用途1", "用途2", "用途3"]
}
\`\`\`

## ルール
1. テキストの内容を意味のあるカテゴリに分類する
2. 各アイテムには必ずdescriptionを含める
3. category_idはスネークケースの英語で（例: marketing_strategy）
4. 重複を避け、本質的な情報を抽出する
5. 最低3つ以上のカテゴリを作成する
6. 各カテゴリには最低3つ以上のアイテムを含める
7. JSONのみを出力し、説明文は含めない
`;

// ============================================
// メイン関数
// ============================================

/**
 * テキストからナレッジベースを構築
 */
export async function buildKnowledge(
  input: KnowledgeBuilderInput
): Promise<KnowledgeBuilderResult> {
  const startTime = Date.now();

  try {
    // Gemini AI で構造化
    const ai = new GoogleGenAI({});
    const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

    const prompt = STRUCTURE_PROMPT
      .replace("{content}", input.content)
      .replace("{name}", input.name)
      .replace("{category}", input.category || "general")
      .replace("{description}", input.description || "AIナレッジベース");

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    // レスポンスからJSONを抽出
    const responseText = response.text || "";
    let parsedResponse: {
      categories: Record<string, Omit<KnowledgeCategory, "items"> & { items: KnowledgeItem[] }>;
      suggested_use_cases?: string[];
    };

    try {
      // JSONブロックを抽出
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      // 直接パースを試みる
      parsedResponse = JSON.parse(responseText);
    }

    // 構造化ナレッジの構築
    const knowledge: StructuredKnowledge = {
      meta: {
        name: input.name,
        version: "1.0",
        category: input.category || "general",
        description: input.description || "AIで自動構築されたナレッジベース",
        total_items: Object.values(parsedResponse.categories).reduce(
          (acc, cat) => acc + cat.items.length,
          0
        ),
        source: "LP Builder Pro - Knowledge Builder",
        created_at: new Date().toISOString(),
        use_cases: parsedResponse.suggested_use_cases || [
          "AIプロンプト強化",
          "コンテンツ生成",
          "リサーチ支援",
        ],
      },
      categories: parsedResponse.categories,
    };

    // 出力形式に応じて変換
    const yamlOutput = generateYaml(knowledge);
    const jsonOutput = JSON.stringify(knowledge, null, 2);

    return {
      success: true,
      knowledge,
      yaml: yamlOutput,
      json: jsonOutput,
      stats: {
        totalCategories: Object.keys(knowledge.categories).length,
        totalItems: knowledge.meta.total_items,
        processingTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    console.error("[KnowledgeBuilder] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 構造化ナレッジをYAML形式に変換
 */
function generateYaml(knowledge: StructuredKnowledge): string {
  const header = `# ============================================================
# LP Builder Pro - ${knowledge.meta.name}
# ${knowledge.meta.description}
# ============================================================
# 作成日時: ${knowledge.meta.created_at}
# 総アイテム数: ${knowledge.meta.total_items}
# ============================================================

`;

  const yamlContent = yaml.dump(knowledge, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });

  return header + yamlContent;
}

/**
 * PDFからテキストを抽出
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  const pdfData = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const textParts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    textParts.push(pageText);
  }

  return textParts.join("\n\n");
}

/**
 * URLからコンテンツを取得
 */
export async function fetchContentFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    const html = await response.text();
    // 簡易的なHTMLタグ除去
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch (error) {
    throw new Error(`URL fetch failed: ${error instanceof Error ? error.message : "Unknown"}`);
  }
}

/**
 * 既存のYAMLナレッジをマージ
 */
export function mergeKnowledge(
  base: StructuredKnowledge,
  additional: StructuredKnowledge
): StructuredKnowledge {
  const merged: StructuredKnowledge = {
    meta: {
      ...base.meta,
      total_items: base.meta.total_items + additional.meta.total_items,
      version: incrementVersion(base.meta.version),
    },
    categories: { ...base.categories },
  };

  // カテゴリをマージ
  for (const [key, category] of Object.entries(additional.categories)) {
    if (merged.categories[key]) {
      // 既存カテゴリにアイテムを追加
      merged.categories[key].items = [
        ...merged.categories[key].items,
        ...category.items,
      ];
    } else {
      // 新規カテゴリを追加
      merged.categories[key] = category;
    }
  }

  return merged;
}

/**
 * バージョン番号をインクリメント
 */
function incrementVersion(version: string): string {
  const parts = version.split(".");
  const minor = parseInt(parts[1] || "0", 10) + 1;
  return `${parts[0]}.${minor}`;
}

/**
 * ナレッジの検証
 */
export function validateKnowledge(knowledge: StructuredKnowledge): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!knowledge.meta?.name) {
    errors.push("meta.name is required");
  }

  if (!knowledge.categories || Object.keys(knowledge.categories).length === 0) {
    errors.push("At least one category is required");
  }

  for (const [key, category] of Object.entries(knowledge.categories || {})) {
    if (!category.name) {
      errors.push(`Category "${key}" is missing name`);
    }
    if (!category.items || category.items.length === 0) {
      errors.push(`Category "${key}" has no items`);
    }
    for (let i = 0; i < (category.items || []).length; i++) {
      const item = category.items[i];
      if (!item.description) {
        errors.push(`Category "${key}" item ${i} is missing description`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
