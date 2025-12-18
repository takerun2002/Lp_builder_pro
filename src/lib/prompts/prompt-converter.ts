/**
 * プロンプト形式変換
 *
 * text, yaml, json 形式間の相互変換
 */

import type { PromptFormat } from "@/lib/workflow/types";
import type {
  GeneratedPrompt,
  YamlPromptStructure,
  JsonPromptStructure,
  TextPromptStructure,
  PromptElement,
} from "./types";

// ============================================================
// YAML変換
// ============================================================

/**
 * プロンプトをYAML形式に変換
 */
export function convertToYaml(prompt: GeneratedPrompt): string {
  const lines: string[] = [];

  // セクション名
  lines.push(`section: ${prompt.sectionName}`);
  lines.push("");

  // ルール
  lines.push("rules:");
  lines.push(`  aspect_ratio: "2:3"`);
  lines.push(`  background: "シンプルな背景"`);
  lines.push("");

  // 要素
  lines.push("elements:");
  for (const element of prompt.elements) {
    lines.push(`  - type: ${element.type}`);
    lines.push(`    content: "${escapeYamlString(element.content)}"`);
    if (element.style) {
      lines.push(`    style: "${element.style}"`);
    }
    if (element.decorations && element.decorations.length > 0) {
      lines.push(`    decorations:`);
      for (const dec of element.decorations) {
        lines.push(`      - "${dec}"`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * YAML文字列からプロンプト構造をパース
 */
export function parseYaml(yamlContent: string): YamlPromptStructure | null {
  try {
    const lines = yamlContent.split("\n");
    const result: YamlPromptStructure = {
      section: "",
      rules: {
        aspect_ratio: "2:3",
        background: "",
      },
      elements: [],
    };

    let currentSection = "";
    let currentElement: Partial<YamlPromptStructure["elements"][0]> | null = null;
    let inDecorations = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      // セクション名
      if (trimmed.startsWith("section:")) {
        result.section = extractValue(trimmed, "section:");
        continue;
      }

      // ルールセクション
      if (trimmed === "rules:") {
        currentSection = "rules";
        continue;
      }

      // 要素セクション
      if (trimmed === "elements:") {
        currentSection = "elements";
        continue;
      }

      // ルール内のプロパティ
      if (currentSection === "rules") {
        if (trimmed.startsWith("aspect_ratio:")) {
          result.rules.aspect_ratio = extractValue(trimmed, "aspect_ratio:");
        } else if (trimmed.startsWith("background:")) {
          result.rules.background = extractValue(trimmed, "background:");
        } else if (trimmed.startsWith("style:")) {
          result.rules.style = extractValue(trimmed, "style:");
        }
        continue;
      }

      // 要素内のプロパティ
      if (currentSection === "elements") {
        if (trimmed.startsWith("- type:")) {
          // 前の要素を保存
          if (currentElement && currentElement.type) {
            result.elements.push({
              type: currentElement.type,
              content: currentElement.content || "",
              style: currentElement.style,
              decorations: currentElement.decorations,
            });
          }
          currentElement = { type: extractValue(trimmed, "- type:") };
          inDecorations = false;
        } else if (trimmed.startsWith("content:") && currentElement) {
          currentElement.content = extractValue(trimmed, "content:");
        } else if (trimmed.startsWith("style:") && currentElement) {
          currentElement.style = extractValue(trimmed, "style:");
        } else if (trimmed.startsWith("decorations:") && currentElement) {
          currentElement.decorations = [];
          inDecorations = true;
        } else if (trimmed.startsWith("- ") && inDecorations && currentElement) {
          const dec = extractValue(trimmed, "- ");
          if (!currentElement.decorations) currentElement.decorations = [];
          currentElement.decorations.push(dec);
        }
      }
    }

    // 最後の要素を保存
    if (currentElement && currentElement.type) {
      result.elements.push({
        type: currentElement.type,
        content: currentElement.content || "",
        style: currentElement.style,
        decorations: currentElement.decorations,
      });
    }

    return result;
  } catch (error) {
    console.error("YAML parse error:", error);
    return null;
  }
}

// ============================================================
// JSON変換
// ============================================================

/**
 * プロンプトをJSON形式に変換
 */
export function convertToJson(prompt: GeneratedPrompt): string {
  const structure: JsonPromptStructure = {
    section: prompt.sectionName,
    rules: {
      aspectRatio: "2:3",
      background: "シンプルな背景",
    },
    elements: prompt.elements.map((el) => ({
      type: el.type,
      content: el.content,
      style: el.style ? { description: el.style } : undefined,
      decorations: el.decorations,
    })),
  };

  return JSON.stringify(structure, null, 2);
}

/**
 * JSON文字列からプロンプト構造をパース
 */
export function parseJson(jsonContent: string): JsonPromptStructure | null {
  try {
    const parsed = JSON.parse(jsonContent);

    // 基本的な構造チェック
    if (!parsed.section || !parsed.elements) {
      return null;
    }

    return {
      section: parsed.section,
      rules: {
        aspectRatio: parsed.rules?.aspectRatio || "2:3",
        background: parsed.rules?.background || "",
        style: parsed.rules?.style,
        additionalRules: parsed.rules?.additionalRules,
      },
      elements: parsed.elements.map((el: Record<string, unknown>) => ({
        type: el.type as string,
        content: el.content as string,
        style: el.style as Record<string, string | boolean | number> | undefined,
        decorations: el.decorations as string[] | undefined,
      })),
    };
  } catch (error) {
    console.error("JSON parse error:", error);
    return null;
  }
}

// ============================================================
// テキスト変換
// ============================================================

/**
 * プロンプトをテキスト形式に変換
 */
export function convertToText(prompt: GeneratedPrompt): string {
  const lines: string[] = [];

  // ルール部分
  lines.push("【ルール】");
  lines.push("- アスペクト比: 2:3");
  lines.push("- 背景: シンプルな背景");
  lines.push("");

  // セクション名
  lines.push(`【${prompt.sectionName}】`);
  lines.push("");

  // 要素
  for (const element of prompt.elements) {
    const label = getElementLabel(element.type);
    let line = `| ${label}：${element.content}`;
    if (element.style) {
      line += `（${element.style}）`;
    }
    lines.push(line);

    if (element.decorations && element.decorations.length > 0) {
      lines.push(`  装飾: ${element.decorations.join(", ")}`);
    }
  }

  return lines.join("\n");
}

/**
 * テキスト形式からプロンプト構造をパース
 */
export function parseText(textContent: string): TextPromptStructure | null {
  try {
    const lines = textContent.split("\n");
    let rulesSection = "";
    let elementsSection = "";
    let currentSection = "";

    for (const line of lines) {
      if (line.startsWith("【ルール】")) {
        currentSection = "rules";
        continue;
      }
      if (line.startsWith("【") && line.endsWith("】")) {
        currentSection = "elements";
        continue;
      }

      if (currentSection === "rules") {
        rulesSection += line + "\n";
      } else if (currentSection === "elements") {
        elementsSection += line + "\n";
      }
    }

    return {
      rules: rulesSection.trim(),
      elements: elementsSection.trim(),
      fullText: textContent,
    };
  } catch (error) {
    console.error("Text parse error:", error);
    return null;
  }
}

// ============================================================
// 形式間変換
// ============================================================

/**
 * 任意の形式から別の形式に変換
 */
export function convertFormat(
  content: string,
  fromFormat: PromptFormat,
  toFormat: PromptFormat
): string {
  if (fromFormat === toFormat) {
    return content;
  }

  // まず中間形式（GeneratedPrompt的な構造）に変換
  const elements = parseToElements(content, fromFormat);

  // 仮のプロンプトオブジェクトを作成
  const tempPrompt: GeneratedPrompt = {
    id: "temp",
    sectionId: "temp",
    sectionName: "セクション",
    format: toFormat,
    content: "",
    elements,
    metadata: {
      version: 1,
      isCustomized: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 目的の形式に変換
  switch (toFormat) {
    case "yaml":
      return convertToYaml(tempPrompt);
    case "json":
      return convertToJson(tempPrompt);
    case "text":
      return convertToText(tempPrompt);
    default:
      return content;
  }
}

/**
 * コンテンツから要素リストをパース
 */
function parseToElements(content: string, format: PromptFormat): PromptElement[] {
  switch (format) {
    case "yaml": {
      const parsed = parseYaml(content);
      if (!parsed) return [];
      return parsed.elements.map((el) => ({
        type: el.type as PromptElement["type"],
        label: getElementLabel(el.type),
        content: el.content,
        style: typeof el.style === "string" ? el.style : undefined,
        decorations: el.decorations,
      }));
    }
    case "json": {
      const parsed = parseJson(content);
      if (!parsed) return [];
      return parsed.elements.map((el) => ({
        type: el.type as PromptElement["type"],
        label: getElementLabel(el.type),
        content: el.content,
        style: el.style?.description as string | undefined,
        decorations: el.decorations,
      }));
    }
    case "text": {
      // テキスト形式からの簡易パース
      const elements: PromptElement[] = [];
      const lines = content.split("\n");
      for (const line of lines) {
        if (line.startsWith("| ")) {
          const match = line.match(/\| (.+?)：(.+?)(?:（(.+?)）)?$/);
          if (match) {
            elements.push({
              type: inferElementType(match[1]),
              label: match[1],
              content: match[2],
              style: match[3],
            });
          }
        }
      }
      return elements;
    }
    default:
      return [];
  }
}

// ============================================================
// ヘルパー関数
// ============================================================

function escapeYamlString(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function extractValue(line: string, prefix: string): string {
  const value = line.substring(line.indexOf(prefix) + prefix.length).trim();
  // クォートを除去
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function getElementLabel(type: string): string {
  const labels: Record<string, string> = {
    headline: "タイトル（見出し）",
    subheadline: "サブタイトル",
    body: "説明テキスト",
    cta: "ボタン",
    image: "写真",
    logo: "ロゴ",
    badge: "バッジ",
    list: "リスト",
    testimonial: "お客様の声",
    number: "数字",
  };
  return labels[type] || type;
}

function inferElementType(label: string): PromptElement["type"] {
  const typeMap: Record<string, PromptElement["type"]> = {
    "タイトル": "headline",
    "見出し": "headline",
    "サブタイトル": "subheadline",
    "説明": "body",
    "テキスト": "body",
    "ボタン": "cta",
    "写真": "image",
    "画像": "image",
    "ロゴ": "logo",
    "バッジ": "badge",
    "リスト": "list",
    "お客様の声": "testimonial",
    "数字": "number",
  };

  for (const [key, value] of Object.entries(typeMap)) {
    if (label.includes(key)) {
      return value;
    }
  }
  return "body";
}

// ============================================================
// エクスポート用ユーティリティ
// ============================================================

/**
 * プロンプト配列を結合してエクスポート用文字列を生成
 */
export function exportPromptsToString(
  prompts: GeneratedPrompt[],
  format: PromptFormat
): string {
  switch (format) {
    case "yaml":
      return prompts.map((p) => convertToYaml(p)).join("\n---\n\n");
    case "json":
      return JSON.stringify(
        prompts.map((p) => JSON.parse(convertToJson(p))),
        null,
        2
      );
    case "text":
      return prompts.map((p) => convertToText(p)).join("\n\n" + "=".repeat(50) + "\n\n");
    default:
      return "";
  }
}

/**
 * ファイル拡張子を取得
 */
export function getFileExtension(format: PromptFormat): string {
  switch (format) {
    case "yaml":
      return "yaml";
    case "json":
      return "json";
    case "text":
      return "txt";
    default:
      return "txt";
  }
}

/**
 * MIMEタイプを取得
 */
export function getMimeType(format: PromptFormat): string {
  switch (format) {
    case "yaml":
      return "text/yaml";
    case "json":
      return "application/json";
    case "text":
      return "text/plain";
    default:
      return "text/plain";
  }
}
