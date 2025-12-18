/**
 * プロンプトジェネレーター
 *
 * 構成データからセクション別プロンプトを生成
 */

import type { PromptFormat } from "@/lib/workflow/types";
import type {
  SectionPlan,
  GlobalDesignRules,
  ContentElement,
} from "@/lib/structure/types";
import type {
  GeneratedPrompt,
  PromptElement,
  PromptGenerationOptions,
  YamlPromptStructure,
  JsonPromptStructure,
  StyleModifiers,
} from "./types";
import {
  DEFAULT_ELEMENT_TEMPLATES,
  DEFAULT_STYLE_MODIFIERS,
} from "./types";
import { SECTION_TYPE_LABELS } from "@/lib/structure/types";

// Simple UUID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// メイン生成関数
// ============================================================

export function generateSectionPrompt(
  section: SectionPlan,
  globalRules: GlobalDesignRules,
  options: PromptGenerationOptions
): GeneratedPrompt {
  const elements = convertToPromptElements(section.elements, options.stylePreset);

  let content: string;

  switch (options.format) {
    case "yaml":
      content = generateYamlPrompt(section, globalRules, elements, options);
      break;
    case "json":
      content = generateJsonPrompt(section, globalRules, elements, options);
      break;
    case "text":
    default:
      content = generateTextPrompt(section, globalRules, elements, options);
      break;
  }

  return {
    id: generateId(),
    sectionId: section.id,
    sectionName: section.name,
    format: options.format,
    content,
    elements,
    metadata: {
      version: 1,
      isCustomized: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================
// 要素変換
// ============================================================

function convertToPromptElements(
  elements: ContentElement[],
  stylePreset?: keyof StyleModifiers
): PromptElement[] {
  return elements.map((element) => {
    const template = DEFAULT_ELEMENT_TEMPLATES[element.type];
    let styleDescription = element.style?.emphasis?.join("、") || template?.defaultStyle || "";

    // スタイルプリセットがあれば追加
    if (stylePreset && DEFAULT_STYLE_MODIFIERS[stylePreset]) {
      const modifiers = DEFAULT_STYLE_MODIFIERS[stylePreset];
      if (modifiers.length > 0) {
        styleDescription = styleDescription
          ? `${styleDescription}、${modifiers[0]}`
          : modifiers[0];
      }
    }

    return {
      type: element.type,
      label: getElementLabel(element.type),
      content: element.content,
      style: styleDescription,
      decorations: element.decorations,
    };
  });
}

function getElementLabel(type: ContentElement["type"]): string {
  const labels: Record<string, string> = {
    headline: "タイトル（見出し）",
    subheadline: "サブタイトル",
    body: "説明テキスト",
    logo: "ロゴ",
    image: "写真",
    cta: "ボタン",
    badge: "バッジ",
    list: "リスト",
    testimonial: "お客様の声",
    number: "数字",
    icon: "アイコン",
    divider: "区切り線",
    spacer: "スペーサー",
    faq: "FAQ",
    price: "価格",
    guarantee: "保証",
    bonus: "特典",
    countdown: "カウントダウン",
  };
  return labels[type] || type;
}

// ============================================================
// テキスト形式生成
// ============================================================

function generateTextPrompt(
  section: SectionPlan,
  globalRules: GlobalDesignRules,
  elements: PromptElement[],
  options: PromptGenerationOptions
): string {
  const lines: string[] = [];

  // ルール部分
  if (options.includeRules) {
    lines.push("#ルール");
    lines.push("以下を画像にそのまま描画する");
    lines.push(`サイズは${formatAspectRatio(globalRules.aspectRatio)}サイズ`);
    lines.push(`${SECTION_TYPE_LABELS[section.type] || section.name}セクション`);
    lines.push(`背景には${globalRules.backgroundStyle}`);

    if (options.customRules) {
      options.customRules.forEach((rule) => lines.push(rule));
    }

    lines.push("");
  }

  // 要素部分
  elements.forEach((element) => {
    const template = DEFAULT_ELEMENT_TEMPLATES[element.type];
    let line = `${template?.prefix || `| ${element.label}：`}`;
    line += `\n${element.content}`;

    if (element.style) {
      line += `\n（${element.style}）`;
    }

    if (element.decorations && element.decorations.length > 0) {
      element.decorations.forEach((dec) => {
        line += `\n  - ${dec}`;
      });
    }

    lines.push(line);
    lines.push("");
  });

  return lines.join("\n").trim();
}

// ============================================================
// YAML形式生成
// ============================================================

function generateYamlPrompt(
  section: SectionPlan,
  globalRules: GlobalDesignRules,
  elements: PromptElement[],
  options: PromptGenerationOptions
): string {
  const lines: string[] = [];

  lines.push(`section: ${section.name}`);

  if (options.includeRules) {
    lines.push("rules:");
    lines.push(`  aspect_ratio: "${formatAspectRatio(globalRules.aspectRatio)}"`);
    lines.push(`  background: ${globalRules.backgroundStyle}`);
    lines.push(`  mood: ${globalRules.overallMood}`);

    if (options.customRules) {
      lines.push("  additional:");
      options.customRules.forEach((rule) => {
        lines.push(`    - ${rule}`);
      });
    }
  }

  lines.push("");
  lines.push("elements:");

  elements.forEach((element) => {
    lines.push(`  - type: ${element.type}`);

    // 複数行コンテンツの処理
    if (element.content.includes("\n")) {
      lines.push("    content: |");
      element.content.split("\n").forEach((line) => {
        lines.push(`      ${line}`);
      });
    } else {
      lines.push(`    content: ${element.content}`);
    }

    if (element.style) {
      lines.push(`    style: ${element.style}`);
    }

    if (element.decorations && element.decorations.length > 0) {
      lines.push("    decorations:");
      element.decorations.forEach((dec) => {
        lines.push(`      - ${dec}`);
      });
    }
  });

  return lines.join("\n");
}

// ============================================================
// JSON形式生成
// ============================================================

function generateJsonPrompt(
  section: SectionPlan,
  globalRules: GlobalDesignRules,
  elements: PromptElement[],
  options: PromptGenerationOptions
): string {
  const structure: JsonPromptStructure = {
    section: section.name,
    rules: {
      aspectRatio: formatAspectRatio(globalRules.aspectRatio),
      background: globalRules.backgroundStyle,
      style: globalRules.overallMood,
      additionalRules: options.customRules,
    },
    elements: elements.map((el) => ({
      type: el.type,
      content: el.content,
      style: el.style ? { description: el.style } : undefined,
      decorations: el.decorations,
    })),
  };

  return JSON.stringify(structure, null, 2);
}

// ============================================================
// 形式変換
// ============================================================

export function convertPromptFormat(
  content: string,
  fromFormat: PromptFormat,
  toFormat: PromptFormat
): string {
  if (fromFormat === toFormat) return content;

  // まずパースして構造化
  let parsed: YamlPromptStructure | JsonPromptStructure | null = null;

  try {
    if (fromFormat === "json") {
      parsed = JSON.parse(content);
    } else if (fromFormat === "yaml") {
      parsed = parseYamlToStructure(content);
    } else {
      parsed = parseTextToStructure(content);
    }
  } catch {
    throw new Error(`Failed to parse ${fromFormat} format`);
  }

  if (!parsed) {
    throw new Error("Failed to parse prompt content");
  }

  // 目的形式に変換
  if (toFormat === "json") {
    return JSON.stringify(parsed, null, 2);
  } else if (toFormat === "yaml") {
    return structureToYaml(parsed);
  } else {
    return structureToText(parsed);
  }
}

function parseYamlToStructure(content: string): YamlPromptStructure {
  // 簡易YAMLパーサー（本番では yaml パッケージを使用推奨）
  const lines = content.split("\n");
  const result: YamlPromptStructure = {
    section: "",
    rules: { aspect_ratio: "", background: "" },
    elements: [],
  };

  let currentElement: YamlPromptStructure["elements"][0] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("section:")) {
      result.section = trimmed.replace("section:", "").trim();
    } else if (trimmed.startsWith("aspect_ratio:")) {
      result.rules.aspect_ratio = trimmed.replace("aspect_ratio:", "").trim().replace(/"/g, "");
    } else if (trimmed.startsWith("background:")) {
      result.rules.background = trimmed.replace("background:", "").trim();
    } else if (trimmed.startsWith("- type:")) {
      if (currentElement) {
        result.elements.push(currentElement);
      }
      currentElement = {
        type: trimmed.replace("- type:", "").trim(),
        content: "",
      };
    } else if (trimmed.startsWith("content:") && currentElement) {
      currentElement.content = trimmed.replace("content:", "").trim();
    } else if (trimmed.startsWith("style:") && currentElement) {
      currentElement.style = trimmed.replace("style:", "").trim();
    }
  }

  if (currentElement) {
    result.elements.push(currentElement);
  }

  return result;
}

function parseTextToStructure(content: string): YamlPromptStructure {
  const result: YamlPromptStructure = {
    section: "",
    rules: { aspect_ratio: "", background: "" },
    elements: [],
  };

  const lines = content.split("\n");

  for (const line of lines) {
    if (line.startsWith("サイズは")) {
      const match = line.match(/サイズは(.+)サイズ/);
      if (match) {
        result.rules.aspect_ratio = match[1];
      }
    } else if (line.includes("セクション")) {
      result.section = line.replace("セクション", "").trim();
    } else if (line.startsWith("背景には")) {
      result.rules.background = line.replace("背景には", "").trim();
    } else if (line.startsWith("| ")) {
      const match = line.match(/\| (.+?)[:：](.+)?/);
      if (match) {
        result.elements.push({
          type: match[1].trim(),
          content: match[2]?.trim() || "",
        });
      }
    }
  }

  return result;
}

function structureToYaml(structure: YamlPromptStructure | JsonPromptStructure): string {
  const lines: string[] = [];

  const section = "section" in structure ? structure.section : "";
  lines.push(`section: ${section}`);
  lines.push("rules:");

  if ("rules" in structure) {
    const rules = structure.rules;
    if ("aspect_ratio" in rules) {
      lines.push(`  aspect_ratio: "${rules.aspect_ratio}"`);
      lines.push(`  background: ${rules.background}`);
    } else if ("aspectRatio" in rules) {
      lines.push(`  aspect_ratio: "${rules.aspectRatio}"`);
      lines.push(`  background: ${rules.background}`);
    }
  }

  lines.push("");
  lines.push("elements:");

  const elements = "elements" in structure ? structure.elements : [];
  elements.forEach((el) => {
    lines.push(`  - type: ${el.type}`);
    lines.push(`    content: ${el.content}`);
    if (el.style) {
      const styleStr = typeof el.style === "string" ? el.style : JSON.stringify(el.style);
      lines.push(`    style: ${styleStr}`);
    }
  });

  return lines.join("\n");
}

function structureToText(structure: YamlPromptStructure | JsonPromptStructure): string {
  const lines: string[] = [];

  lines.push("#ルール");
  lines.push("以下を画像にそのまま描画する");

  if ("rules" in structure) {
    const rules = structure.rules;
    if ("aspect_ratio" in rules) {
      lines.push(`サイズは${rules.aspect_ratio}サイズ`);
      lines.push(`背景には${rules.background}`);
    } else if ("aspectRatio" in rules) {
      lines.push(`サイズは${rules.aspectRatio}サイズ`);
      lines.push(`背景には${rules.background}`);
    }
  }

  lines.push("");

  const elements = "elements" in structure ? structure.elements : [];
  elements.forEach((el) => {
    lines.push(`| ${el.type}：${el.content}`);
    if (el.style) {
      const styleStr = typeof el.style === "string" ? el.style : JSON.stringify(el.style);
      lines.push(`（${styleStr}）`);
    }
    lines.push("");
  });

  return lines.join("\n").trim();
}

// ============================================================
// ヘルパー
// ============================================================

function formatAspectRatio(ratio: string): string {
  const formats: Record<string, string> = {
    "2:3": "2:3の縦長",
    "16:9": "16:9の横長",
    "9:16": "9:16の縦長",
    "1:1": "1:1の正方形",
    "3:4": "3:4の縦長",
    "4:3": "4:3の横長",
  };
  return formats[ratio] || ratio;
}

// ============================================================
// 一括生成
// ============================================================

export function generateAllSectionPrompts(
  sections: SectionPlan[],
  globalRules: GlobalDesignRules,
  options: PromptGenerationOptions
): GeneratedPrompt[] {
  return sections.map((section) =>
    generateSectionPrompt(section, globalRules, options)
  );
}

// ============================================================
// プロンプト結合
// ============================================================

export function combinePrompts(
  prompts: GeneratedPrompt[],
  separator: string = "\n\n---\n\n"
): string {
  return prompts.map((p) => p.content).join(separator);
}
