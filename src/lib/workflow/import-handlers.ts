/**
 * インポートハンドラー
 *
 * 原稿、構成、ワイヤーフレームのインポート処理
 */

import type { LPStructure, SectionPlan, ContentElement } from "@/lib/structure/types";
import type { Wireframe, WireframeSection } from "@/lib/wireframe/types";
import type { GeneratedPrompt } from "@/lib/prompts/types";
import { parseYaml } from "@/lib/prompts/prompt-converter";
import { detectFormat } from "@/lib/prompts/prompt-validator";

// ============================================================
// インポート結果型
// ============================================================

export interface ImportResult<T> {
  success: boolean;
  data: T | null;
  warnings: string[];
  errors: string[];
}

export type ManuscriptData = {
  title?: string;
  sections: Array<{
    name: string;
    content: string;
  }>;
  metadata?: Record<string, unknown>;
};

// ============================================================
// 原稿インポート
// ============================================================

/**
 * テキストファイルから原稿をインポート
 */
export function importManuscriptFromText(content: string): ImportResult<ManuscriptData> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const sections: ManuscriptData["sections"] = [];
    let currentSection: { name: string; content: string } | null = null;

    const lines = content.split("\n");
    let title = "";

    for (const line of lines) {
      // タイトル検出（#で始まる行）
      if (line.startsWith("# ") && !title) {
        title = line.substring(2).trim();
        continue;
      }

      // セクション見出し検出（##で始まる行）
      if (line.startsWith("## ")) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          name: line.substring(3).trim(),
          content: "",
        };
        continue;
      }

      // 【】で囲まれたセクション見出し
      const bracketMatch = line.match(/^【(.+?)】$/);
      if (bracketMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          name: bracketMatch[1],
          content: "",
        };
        continue;
      }

      // コンテンツ追加
      if (currentSection) {
        currentSection.content += line + "\n";
      }
    }

    // 最後のセクションを追加
    if (currentSection) {
      sections.push(currentSection);
    }

    // セクションがない場合は全体を1セクションとして扱う
    if (sections.length === 0) {
      sections.push({
        name: "メインコンテンツ",
        content: content,
      });
      warnings.push("セクション区切りが見つかりませんでした。全体を1セクションとしてインポートしました。");
    }

    return {
      success: true,
      data: {
        title,
        sections: sections.map((s) => ({
          ...s,
          content: s.content.trim(),
        })),
      },
      warnings,
      errors,
    };
  } catch (error) {
    errors.push(`インポートエラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    return { success: false, data: null, warnings, errors };
  }
}

/**
 * Markdownファイルから原稿をインポート
 */
export function importManuscriptFromMarkdown(content: string): ImportResult<ManuscriptData> {
  // 基本的にテキストと同じ処理
  return importManuscriptFromText(content);
}

/**
 * JSONから原稿をインポート
 */
export function importManuscriptFromJson(content: string): ImportResult<ManuscriptData> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(content);

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      errors.push("sectionsフィールドが必要です");
      return { success: false, data: null, warnings, errors };
    }

    return {
      success: true,
      data: {
        title: parsed.title,
        sections: parsed.sections.map((s: { name?: string; title?: string; content?: string; text?: string }) => ({
          name: s.name || s.title || "セクション",
          content: s.content || s.text || "",
        })),
        metadata: parsed.metadata,
      },
      warnings,
      errors,
    };
  } catch (error) {
    errors.push(`JSONパースエラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    return { success: false, data: null, warnings, errors };
  }
}

// ============================================================
// 構成インポート
// ============================================================

/**
 * JSONから構成をインポート
 */
export function importStructureFromJson(content: string): ImportResult<LPStructure> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(content);

    // LPStructure形式かチェック
    if (parsed.sections && Array.isArray(parsed.sections)) {
      const structure: LPStructure = {
        id: parsed.id || `imported-${Date.now()}`,
        projectId: parsed.projectId || "imported",
        name: parsed.name || "インポートされた構成",
        sections: parsed.sections.map((s: Partial<SectionPlan>, index: number) => ({
          id: s.id || `section-${Date.now()}-${index}`,
          type: s.type || "custom",
          name: s.name || `セクション${index + 1}`,
          order: s.order ?? index,
          purpose: s.purpose || "",
          elements: (s.elements || []).map((e: Partial<ContentElement>, eIndex: number) => ({
            id: e.id || `element-${Date.now()}-${index}-${eIndex}`,
            type: e.type || "body",
            content: e.content || "",
            style: e.style,
          })),
          estimatedHeight: s.estimatedHeight || "medium",
          isRequired: s.isRequired ?? false,
        })),
        globalRules: parsed.globalRules || {
          aspectRatio: "2:3",
          colorScheme: { type: "minimal", primary: "#1a1a1a", secondary: "#666", accent: "#c9a227", background: "#fff", text: "#1a1a1a" },
          fontStyle: "modern",
          backgroundStyle: "シンプル",
          overallMood: "プロフェッショナル",
        },
        metadata: {
          version: parsed.metadata?.version || 1,
          sourceType: "imported",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { success: true, data: structure, warnings, errors };
    }

    errors.push("有効な構成データが見つかりませんでした");
    return { success: false, data: null, warnings, errors };
  } catch (error) {
    errors.push(`JSONパースエラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    return { success: false, data: null, warnings, errors };
  }
}

/**
 * YAMLから構成をインポート
 */
export function importStructureFromYaml(content: string): ImportResult<LPStructure> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // 簡易YAMLパーサーを使用
    const parsed = parseYaml(content);
    if (!parsed) {
      errors.push("YAMLパースに失敗しました");
      return { success: false, data: null, warnings, errors };
    }

    // YamlPromptStructureからLPStructureに変換
    const structure: LPStructure = {
      id: `imported-${Date.now()}`,
      projectId: "imported",
      name: parsed.section || "インポートされた構成",
      sections: [{
        id: `section-${Date.now()}-0`,
        type: "custom",
        name: parsed.section,
        order: 0,
        purpose: "",
        elements: parsed.elements.map((e, index) => ({
          id: `element-${Date.now()}-0-${index}`,
          type: e.type as ContentElement["type"],
          content: e.content,
        })),
        estimatedHeight: "medium",
        isRequired: false,
      }],
      globalRules: {
        aspectRatio: (parsed.rules.aspect_ratio as "2:3") || "2:3",
        colorScheme: { type: "minimal", primary: "#1a1a1a", secondary: "#666", accent: "#c9a227", background: "#fff", text: "#1a1a1a" },
        fontStyle: "modern",
        backgroundStyle: parsed.rules.background || "シンプル",
        overallMood: parsed.rules.style || "プロフェッショナル",
      },
      metadata: {
        version: 1,
        sourceType: "imported",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    warnings.push("YAML形式からの変換は簡易的です。構成を確認・調整してください。");

    return { success: true, data: structure, warnings, errors };
  } catch (error) {
    errors.push(`YAMLパースエラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    return { success: false, data: null, warnings, errors };
  }
}

// ============================================================
// ワイヤーフレームインポート
// ============================================================

/**
 * JSONからワイヤーフレームをインポート
 */
export function importWireframeFromJson(content: string): ImportResult<Wireframe> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(content);

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      errors.push("sectionsフィールドが必要です");
      return { success: false, data: null, warnings, errors };
    }

    const wireframe: Wireframe = {
      id: parsed.id || `wireframe-${Date.now()}`,
      projectId: parsed.projectId || "imported",
      name: parsed.name || "インポートされたワイヤーフレーム",
      canvasWidth: parsed.canvasWidth || 1200,
      canvasHeight: parsed.canvasHeight || 0,
      sections: parsed.sections.map((s: Partial<WireframeSection>, index: number) => ({
        id: s.id || `section-${Date.now()}-${index}`,
        name: s.name || `セクション${index + 1}`,
        order: s.order ?? index,
        height: s.height || 600,
        backgroundColor: s.backgroundColor || "#ffffff",
        elements: s.elements || [],
      })),
      settings: parsed.settings || {
        gridSize: 20,
        snapToGrid: true,
        showGuides: true,
        showLabels: true,
      },
      createdAt: new Date(parsed.createdAt) || new Date(),
      updatedAt: new Date(),
    };

    return { success: true, data: wireframe, warnings, errors };
  } catch (error) {
    errors.push(`JSONパースエラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    return { success: false, data: null, warnings, errors };
  }
}

// ============================================================
// プロンプトインポート
// ============================================================

/**
 * ファイルからプロンプトをインポート
 */
export function importPromptsFromFile(
  content: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filename: string
): ImportResult<GeneratedPrompt[]> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const format = detectFormat(content);
    const prompts: GeneratedPrompt[] = [];

    if (format === "json") {
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        prompts.push({
          id: item.id || `prompt-${Date.now()}-${i}`,
          sectionId: item.sectionId || `section-${i}`,
          sectionName: item.section || item.sectionName || `セクション${i + 1}`,
          format: "json",
          content: JSON.stringify(item, null, 2),
          elements: (item.elements || []).map((e: { type: string; content: string; style?: string }) => ({
            type: e.type,
            label: e.type,
            content: e.content,
            style: e.style,
          })),
          metadata: {
            version: 1,
            isCustomized: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else if (format === "yaml") {
      // YAML（---で区切られた複数ドキュメント対応）
      const documents = content.split(/\n---\n/);
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i].trim();
        if (!doc) continue;

        const parsed = parseYaml(doc);
        if (parsed) {
          prompts.push({
            id: `prompt-${Date.now()}-${i}`,
            sectionId: `section-${i}`,
            sectionName: parsed.section || `セクション${i + 1}`,
            format: "yaml",
            content: doc,
            elements: parsed.elements.map((e) => ({
              type: e.type as GeneratedPrompt["elements"][0]["type"],
              label: e.type,
              content: e.content,
              style: typeof e.style === "string" ? e.style : undefined,
            })),
            metadata: {
              version: 1,
              isCustomized: false,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    } else {
      // テキスト形式（=====で区切られた複数セクション対応）
      const sections = content.split(/\n={10,}\n/);
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (!section) continue;

        prompts.push({
          id: `prompt-${Date.now()}-${i}`,
          sectionId: `section-${i}`,
          sectionName: `セクション${i + 1}`,
          format: "text",
          content: section,
          elements: [],
          metadata: {
            version: 1,
            isCustomized: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (prompts.length === 0) {
      errors.push("有効なプロンプトが見つかりませんでした");
      return { success: false, data: null, warnings, errors };
    }

    warnings.push(`${prompts.length}件のプロンプトをインポートしました`);

    return { success: true, data: prompts, warnings, errors };
  } catch (error) {
    errors.push(`インポートエラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    return { success: false, data: null, warnings, errors };
  }
}

// ============================================================
// 汎用インポート
// ============================================================

/**
 * ファイル種別を自動判定してインポート
 */
export function importFromFile(
  content: string,
  filename: string
): ImportResult<unknown> {
  const ext = filename.split(".").pop()?.toLowerCase();

  // 拡張子とコンテンツから種別を推測
  if (ext === "json") {
    try {
      const parsed = JSON.parse(content);

      // LPStructure
      if (parsed.sections && parsed.globalRules) {
        return importStructureFromJson(content);
      }

      // Wireframe
      if (parsed.sections && parsed.canvasWidth) {
        return importWireframeFromJson(content);
      }

      // Prompts
      if (parsed.elements || (Array.isArray(parsed) && parsed[0]?.elements)) {
        return importPromptsFromFile(content, filename);
      }

      // Manuscript
      if (parsed.sections && !parsed.globalRules) {
        return importManuscriptFromJson(content);
      }
    } catch {
      // パース失敗
    }
  }

  if (ext === "yaml" || ext === "yml") {
    return importStructureFromYaml(content);
  }

  if (ext === "md" || ext === "markdown") {
    return importManuscriptFromMarkdown(content);
  }

  if (ext === "txt") {
    return importManuscriptFromText(content);
  }

  return {
    success: false,
    data: null,
    warnings: [],
    errors: [`サポートされていないファイル形式です: ${ext}`],
  };
}
