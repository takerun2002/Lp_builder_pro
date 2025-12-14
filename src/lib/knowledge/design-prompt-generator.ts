/**
 * デザインプロンプトジェネレーター
 *
 * design_prompts.yaml のテンプレートを使用して
 * LP画像/バナー/SNS素材用のプロンプトを生成
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "yaml";

// ============================================
// 型定義
// ============================================

export interface DesignTemplate {
  name: string;
  target_persona?: string;
  description?: string;
  template: string;
  examples?: Array<Record<string, string>>;
}

export interface DesignCategory {
  [templateId: string]: DesignTemplate;
}

export interface LpSectionPrompt {
  recommended_templates: string[];
  trigger_keywords: string[];
}

export interface DesignPromptsData {
  meta: {
    name: string;
    version: string;
    source: string;
    categories: string[];
  };
  marketing_materials: DesignCategory;
  product_images: DesignCategory;
  design_branding: DesignCategory;
  web_design: DesignCategory;
  entertainment: DesignCategory;
  sns_marketing: DesignCategory;
  data_visualization: DesignCategory;
  food_photography: DesignCategory;
  special_effects: DesignCategory;
  lp_section_prompts: Record<string, LpSectionPrompt>;
}

export interface DesignPromptRequest {
  category: string;
  templateId: string;
  variables: Record<string, string>;
  lpSection?: string;
}

export interface GeneratedPrompt {
  prompt: string;
  templateName: string;
  category: string;
  suggestedTool: "gemini" | "dalle" | "midjourney";
  aspectRatio: string;
  resolution: string;
  variables: Record<string, string>;
}

export interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  targetPersona?: string;
  description?: string;
  variables: string[];
  examples?: Array<Record<string, string>>;
}

// ============================================
// キャッシュ
// ============================================

let cachedData: DesignPromptsData | null = null;

// ============================================
// ローダー
// ============================================

/**
 * design_prompts.yaml を読み込む
 */
export function loadDesignPrompts(): DesignPromptsData {
  if (cachedData) {
    return cachedData;
  }

  const filePath = join(process.cwd(), "src/lib/knowledge/design_prompts.yaml");

  if (!existsSync(filePath)) {
    throw new Error("design_prompts.yaml not found");
  }

  const content = readFileSync(filePath, "utf-8");
  cachedData = yaml.parse(content) as DesignPromptsData;

  return cachedData;
}

/**
 * キャッシュをクリア
 */
export function clearDesignPromptsCache(): void {
  cachedData = null;
}

// ============================================
// カテゴリ情報
// ============================================

const CATEGORY_LABELS: Record<string, string> = {
  marketing_materials: "マーケティング資料",
  product_images: "商品画像",
  design_branding: "デザイン/ブランディング",
  web_design: "Web制作",
  entertainment: "エンタメ/クリエイティブ",
  sns_marketing: "SNSマーケティング",
  data_visualization: "データ可視化",
  food_photography: "フード/料理",
  special_effects: "特殊効果/スタイル変換",
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

// ============================================
// テンプレート取得
// ============================================

/**
 * 全カテゴリ一覧を取得
 */
export function getCategories(): Array<{ id: string; label: string }> {
  return CATEGORY_KEYS.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
  }));
}

/**
 * カテゴリ内のテンプレート一覧を取得
 */
export function getTemplatesInCategory(categoryId: string): TemplateInfo[] {
  const data = loadDesignPrompts();
  const category = data[categoryId as keyof DesignPromptsData] as DesignCategory;

  if (!category || typeof category !== "object") {
    return [];
  }

  return Object.entries(category).map(([id, template]) => ({
    id,
    name: template.name,
    category: categoryId,
    categoryLabel: CATEGORY_LABELS[categoryId] || categoryId,
    targetPersona: template.target_persona,
    description: template.description,
    variables: extractVariables(template.template),
    examples: template.examples,
  }));
}

/**
 * 全テンプレート一覧を取得
 */
export function getAllTemplates(): TemplateInfo[] {
  const templates: TemplateInfo[] = [];

  for (const categoryId of CATEGORY_KEYS) {
    templates.push(...getTemplatesInCategory(categoryId));
  }

  return templates;
}

/**
 * テンプレートを取得
 */
export function getTemplate(
  categoryId: string,
  templateId: string
): DesignTemplate | null {
  const data = loadDesignPrompts();
  const category = data[categoryId as keyof DesignPromptsData] as DesignCategory;

  if (!category || typeof category !== "object") {
    return null;
  }

  return category[templateId] || null;
}

// ============================================
// LP セクション連携
// ============================================

/**
 * LPセクションに推奨されるテンプレートを取得
 */
export function getRecommendedTemplatesForSection(
  sectionType: string
): TemplateInfo[] {
  const data = loadDesignPrompts();
  const sectionPrompts = data.lp_section_prompts;

  if (!sectionPrompts || !sectionPrompts[sectionType]) {
    return [];
  }

  const recommended = sectionPrompts[sectionType].recommended_templates;
  const allTemplates = getAllTemplates();

  return allTemplates.filter((t) => recommended.includes(t.id));
}

/**
 * LPセクション一覧を取得
 */
export function getLpSections(): Array<{
  id: string;
  label: string;
  keywords: string[];
}> {
  const data = loadDesignPrompts();
  const sectionPrompts = data.lp_section_prompts;

  if (!sectionPrompts) {
    return [];
  }

  const sectionLabels: Record<string, string> = {
    hero: "ヒーローセクション",
    story: "ストーリー",
    proof: "実績・証拠",
    testimonial: "お客様の声",
    offer: "オファー",
    cta: "CTA",
  };

  return Object.entries(sectionPrompts).map(([id, section]) => ({
    id,
    label: sectionLabels[id] || id,
    keywords: section.trigger_keywords,
  }));
}

// ============================================
// プロンプト生成
// ============================================

/**
 * テンプレートから変数を抽出
 */
export function extractVariables(template: string): string[] {
  const regex = /\[([^\]]+)\]/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * プロンプトを生成
 */
export function generateDesignPrompt(
  request: DesignPromptRequest
): GeneratedPrompt {
  const { category, templateId, variables, lpSection } = request;

  const template = getTemplate(category, templateId);

  if (!template) {
    throw new Error(`Template not found: ${category}/${templateId}`);
  }

  // 変数を置換
  let prompt = template.template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\[${key}\\]`, "g");
    prompt = prompt.replace(regex, value);
  }

  // 未置換の変数をチェック
  const remainingVars = extractVariables(prompt);
  if (remainingVars.length > 0) {
    console.warn(
      `[design-prompt] Unresolved variables: ${remainingVars.join(", ")}`
    );
  }

  // 推奨ツールと設定を決定
  const { suggestedTool, aspectRatio, resolution } =
    determineSuggestedSettings(category, templateId, lpSection);

  return {
    prompt: prompt.trim(),
    templateName: template.name,
    category,
    suggestedTool,
    aspectRatio,
    resolution,
    variables,
  };
}

/**
 * 推奨設定を決定
 */
function determineSuggestedSettings(
  category: string,
  templateId: string,
  lpSection?: string
): { suggestedTool: "gemini" | "dalle" | "midjourney"; aspectRatio: string; resolution: string } {
  // デフォルト設定
  let suggestedTool: "gemini" | "dalle" | "midjourney" = "gemini";
  let aspectRatio = "16:9";
  let resolution = "1920x1080";

  // カテゴリ別設定
  switch (category) {
    case "sns_marketing":
      if (templateId === "youtube_thumbnail") {
        aspectRatio = "16:9";
        resolution = "1280x720";
      } else {
        aspectRatio = "1:1";
        resolution = "1080x1080";
      }
      break;

    case "product_images":
      aspectRatio = "1:1";
      resolution = "2048x2048";
      suggestedTool = "gemini";
      break;

    case "web_design":
      if (templateId === "lp_hero_section") {
        aspectRatio = "21:9";
        resolution = "1920x823";
      }
      break;

    case "entertainment":
      if (templateId === "album_cover") {
        aspectRatio = "1:1";
        resolution = "3000x3000";
      } else if (templateId === "storyboard") {
        aspectRatio = "16:9";
        resolution = "1920x1080";
      }
      break;

    case "special_effects":
      if (templateId === "line_sticker") {
        aspectRatio = "1:1";
        resolution = "370x320";
      }
      break;

    case "data_visualization":
      aspectRatio = "16:9";
      resolution = "3840x2160";
      break;
  }

  // LPセクション別調整
  if (lpSection) {
    switch (lpSection) {
      case "hero":
        aspectRatio = "21:9";
        resolution = "1920x823";
        break;
      case "testimonial":
        aspectRatio = "1:1";
        resolution = "800x800";
        break;
      case "cta":
        aspectRatio = "16:9";
        resolution = "1200x675";
        break;
    }
  }

  return { suggestedTool, aspectRatio, resolution };
}

// ============================================
// ユーティリティ
// ============================================

/**
 * テンプレートを検索
 */
export function searchTemplates(query: string): TemplateInfo[] {
  const allTemplates = getAllTemplates();
  const lowerQuery = query.toLowerCase();

  return allTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.categoryLabel.toLowerCase().includes(lowerQuery) ||
      t.targetPersona?.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * LPセクションからキーワードでテンプレートを推奨
 */
export function recommendTemplatesByKeyword(keyword: string): TemplateInfo[] {
  const data = loadDesignPrompts();
  const sectionPrompts = data.lp_section_prompts;

  if (!sectionPrompts) {
    return [];
  }

  const lowerKeyword = keyword.toLowerCase();
  const matchedSections: string[] = [];

  for (const [sectionId, section] of Object.entries(sectionPrompts)) {
    if (
      section.trigger_keywords.some((k) =>
        k.toLowerCase().includes(lowerKeyword)
      )
    ) {
      matchedSections.push(sectionId);
    }
  }

  const recommendedTemplates: TemplateInfo[] = [];
  for (const sectionId of matchedSections) {
    recommendedTemplates.push(...getRecommendedTemplatesForSection(sectionId));
  }

  // 重複を除去
  const seen = new Set<string>();
  return recommendedTemplates.filter((t) => {
    const key = `${t.category}/${t.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * テンプレートのプレビュー情報を取得
 */
export function getTemplatePreview(
  categoryId: string,
  templateId: string
): {
  name: string;
  template: string;
  variables: string[];
  examples?: Array<Record<string, string>>;
} | null {
  const template = getTemplate(categoryId, templateId);

  if (!template) {
    return null;
  }

  return {
    name: template.name,
    template: template.template,
    variables: extractVariables(template.template),
    examples: template.examples,
  };
}
