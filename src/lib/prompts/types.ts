/**
 * プロンプト関連 型定義
 *
 * プロンプト生成、テンプレート、変換に関する型定義
 */

import type { PromptFormat } from "@/lib/workflow/types";
import type {
  SectionPlan,
  GlobalDesignRules,
  ContentElement,
  SectionType,
} from "@/lib/structure/types";

// ============================================================
// プロンプト構造
// ============================================================

export interface GeneratedPrompt {
  id: string;
  sectionId: string;
  sectionName: string;
  format: PromptFormat;
  content: string;
  elements: PromptElement[];
  metadata: PromptMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptElement {
  type: ContentElement["type"];
  label: string;
  content: string;
  style?: string;
  decorations?: string[];
}

export interface PromptMetadata {
  version: number;
  templateId?: string;
  isCustomized: boolean;
  originalContent?: string;
}

// ============================================================
// ルールセクション
// ============================================================

export interface PromptRules {
  aspectRatio: string;
  sectionName: string;
  background: string;
  additionalRules: string[];
}

// ============================================================
// テンプレート
// ============================================================

export interface PromptTemplate {
  id: string;
  name: string;
  category: SectionType;
  format: PromptFormat;
  description: string;

  // ルール部分のテンプレート
  rulesTemplate: string;

  // 要素別テンプレート
  elementTemplates: Record<string, ElementTemplate>;

  // スタイル修飾子
  styleModifiers: StyleModifiers;

  // カスタマイズ可能なフィールド
  customizableFields: string[];

  // ユーザーカスタムかどうか
  isUserCustom: boolean;

  // プレビュー用サンプル
  sampleOutput?: string;
}

export interface ElementTemplate {
  prefix: string;
  suffix?: string;
  defaultStyle?: string;
  wrapInQuotes?: boolean;
}

export interface StyleModifiers {
  luxury: string[];
  casual: string[];
  professional: string[];
  emotional: string[];
  minimal: string[];
  vibrant: string[];
}

// ============================================================
// プロンプト生成オプション
// ============================================================

export interface PromptGenerationOptions {
  format: PromptFormat;
  stylePreset?: keyof StyleModifiers;
  includeRules: boolean;
  includeMetadata: boolean;
  customRules?: string[];
}

export interface PromptConversionOptions {
  preserveComments: boolean;
  prettyPrint: boolean;
}

// ============================================================
// YAML形式の構造
// ============================================================

export interface YamlPromptStructure {
  section: string;
  rules: {
    aspect_ratio: string;
    background: string;
    style?: string;
    [key: string]: string | undefined;
  };
  elements: YamlElement[];
}

export interface YamlElement {
  type: string;
  content: string;
  style?: string | string[];
  decorations?: string[];
  position?: string;
}

// ============================================================
// JSON形式の構造
// ============================================================

export interface JsonPromptStructure {
  section: string;
  rules: {
    aspectRatio: string;
    background: string;
    style?: string;
    additionalRules?: string[];
  };
  elements: JsonElement[];
}

export interface JsonElement {
  type: string;
  content: string;
  style?: {
    [key: string]: string | boolean | number;
  };
  decorations?: string[];
  position?: string;
}

// ============================================================
// テキスト形式の構造
// ============================================================

export interface TextPromptStructure {
  rules: string;
  elements: string;
  fullText: string;
}

// ============================================================
// 入力・出力型
// ============================================================

export interface GeneratePromptInput {
  section: SectionPlan;
  globalRules: GlobalDesignRules;
  options: PromptGenerationOptions;
  templateId?: string;
}

export interface GeneratePromptOutput {
  prompt: GeneratedPrompt;
  rawContent: string;
  parsedStructure: YamlPromptStructure | JsonPromptStructure | TextPromptStructure;
}

// ============================================================
// バリデーション
// ============================================================

export interface PromptValidationResult {
  isValid: boolean;
  errors: PromptValidationError[];
  warnings: PromptValidationWarning[];
}

export interface PromptValidationError {
  field: string;
  message: string;
  line?: number;
}

export interface PromptValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================
// デフォルト値
// ============================================================

export const DEFAULT_STYLE_MODIFIERS: StyleModifiers = {
  luxury: [
    "金色グラデーション",
    "シルクのようなテクスチャ",
    "上品で洗練された",
    "高級感のある",
  ],
  casual: [
    "カジュアルで親しみやすい",
    "手書き風",
    "ポップな色使い",
    "フレンドリーな雰囲気",
  ],
  professional: [
    "プロフェッショナルで信頼感のある",
    "シャープで洗練された",
    "ビジネスライクな",
    "権威性を感じさせる",
  ],
  emotional: [
    "感情に訴えかける",
    "温かみのある",
    "心に響く",
    "共感を呼ぶ",
  ],
  minimal: [
    "シンプルでミニマル",
    "余白を活かした",
    "クリーンで整然とした",
    "無駄のない",
  ],
  vibrant: [
    "活気のある",
    "エネルギッシュな",
    "鮮やかな色彩",
    "ダイナミックな",
  ],
};

export const DEFAULT_ELEMENT_TEMPLATES: Record<string, ElementTemplate> = {
  headline: {
    prefix: "| タイトル（見出し）：",
    defaultStyle: "大きく堂々と、目立つように",
  },
  subheadline: {
    prefix: "| サブタイトル：",
    defaultStyle: "見出しを補足する形で",
  },
  body: {
    prefix: "| 説明テキスト：",
  },
  logo: {
    prefix: "| ロゴ：",
    suffix: "（シンプルで上品なロゴ）",
  },
  image: {
    prefix: "| 写真：",
  },
  cta: {
    prefix: "| ボタン：",
    defaultStyle: "目立つ色で、クリックを促す",
  },
  badge: {
    prefix: "| バッジ：",
    defaultStyle: "目を引く装飾付き",
  },
  list: {
    prefix: "| リスト：",
  },
  testimonial: {
    prefix: "| お客様の声：",
    wrapInQuotes: true,
  },
  number: {
    prefix: "| 数字：",
    defaultStyle: "大きく目立つように",
  },
};
