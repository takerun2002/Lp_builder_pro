/**
 * LP構成 型定義
 *
 * LPの構成、セクション、コンテンツ要素の型定義
 */

// ============================================================
// コンテンツ要素
// ============================================================

export type ContentElementType =
  | "headline"      // メインタイトル
  | "subheadline"   // サブタイトル
  | "body"          // 本文
  | "cta"           // CTAボタン
  | "image"         // 画像
  | "logo"          // ロゴ
  | "badge"         // バッジ・タグ
  | "list"          // リスト
  | "testimonial"   // お客様の声
  | "number"        // 数字・実績
  | "icon"          // アイコン
  | "divider"       // 区切り線
  | "spacer"        // スペーサー
  | "faq"           // FAQ
  | "price"         // 価格表示
  | "guarantee"     // 保証
  | "bonus"         // 特典
  | "countdown";    // カウントダウン

export interface ContentElement {
  id: string;
  type: ContentElementType;
  content: string;
  style?: ContentElementStyle;
  position?: ElementPosition;
  decorations?: string[];
  metadata?: Record<string, unknown>;
}

export interface ContentElementStyle {
  fontSize?: "small" | "medium" | "large" | "xlarge";
  fontWeight?: "normal" | "bold" | "extrabold";
  textAlign?: "left" | "center" | "right";
  color?: string;
  backgroundColor?: string;
  emphasis?: string[];  // "金色グラデーション", "ハイライト" など
}

export interface ElementPosition {
  alignment?: "left" | "center" | "right";
  margin?: string;
  zIndex?: number;
}

// ============================================================
// セクション
// ============================================================

export type SectionType =
  | "firstview"      // ファーストビュー
  | "problem"        // 悩み・課題提起
  | "agitation"      // 煽り・共感
  | "solution"       // 解決策提示
  | "benefit"        // ベネフィット
  | "feature"        // 特徴・機能
  | "proof"          // 実績・信頼
  | "testimonial"    // お客様の声
  | "comparison"     // 比較
  | "process"        // 流れ・ステップ
  | "faq"            // よくある質問
  | "offer"          // オファー・特典
  | "price"          // 価格
  | "guarantee"      // 保証
  | "cta"            // CTA
  | "profile"        // プロフィール
  | "footer"         // フッター
  | "custom";        // カスタム

export interface SectionPlan {
  id: string;
  type: SectionType;
  name: string;
  order: number;
  purpose: string;
  elements: ContentElement[];
  estimatedHeight: "short" | "medium" | "long";
  style?: SectionStyle;
  isRequired: boolean;
}

export interface SectionStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundPattern?: string;
  padding?: string;
  border?: string;
}

// ============================================================
// グローバルデザインルール
// ============================================================

export type AspectRatio = "2:3" | "16:9" | "9:16" | "1:1" | "3:4" | "4:3" | "custom";

export type FontStyle = "formal" | "casual" | "elegant" | "pop" | "modern" | "traditional";

export type ColorSchemeType = "luxury" | "natural" | "corporate" | "warm" | "cool" | "vibrant" | "minimal";

export interface GlobalDesignRules {
  aspectRatio: AspectRatio;
  colorScheme: ColorScheme;
  fontStyle: FontStyle;
  backgroundStyle: string;
  overallMood: string;
  brandColors?: string[];
}

export interface ColorScheme {
  type: ColorSchemeType;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

// ============================================================
// LP構成
// ============================================================

export interface LPStructure {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sections: SectionPlan[];
  globalRules: GlobalDesignRules;
  metadata: StructureMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface StructureMetadata {
  targetAudience?: string;
  productType?: string;
  industry?: string;
  toneOfVoice?: string;
  version: number;
  sourceType: "scratch" | "template" | "import" | "swipe" | "ai-generated" | "imported";
  templateId?: string;
}

// ============================================================
// テンプレート
// ============================================================

export interface SectionTemplate {
  id: string;
  type: SectionType;
  name: string;
  description: string;
  variants: SectionVariant[];
  requiredElements: ContentElementType[];
  optionalElements: ContentElementType[];
  defaultElements: ContentElement[];
  previewImage?: string;
}

export interface SectionVariant {
  id: string;
  name: string;
  description: string;
  targetIndustry?: string[];
  elements: ContentElement[];
  style: SectionStyle;
}

export interface StructureTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry?: string[];
  sections: SectionPlan[];
  globalRules: GlobalDesignRules;
  previewImage?: string;
  popularity: number;
  isOfficial: boolean;
}

// ============================================================
// ヘルパー型
// ============================================================

export interface CreateSectionInput {
  type: SectionType;
  name?: string;
  purpose?: string;
  elements?: Partial<ContentElement>[];
}

export interface UpdateSectionInput {
  id: string;
  name?: string;
  purpose?: string;
  order?: number;
  elements?: ContentElement[];
  style?: SectionStyle;
}

// ============================================================
// デフォルト値
// ============================================================

export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  type: "minimal",
  primary: "#1a1a1a",
  secondary: "#666666",
  accent: "#c9a227",
  background: "#ffffff",
  text: "#1a1a1a",
};

export const DEFAULT_GLOBAL_RULES: GlobalDesignRules = {
  aspectRatio: "2:3",
  colorScheme: DEFAULT_COLOR_SCHEME,
  fontStyle: "modern",
  backgroundStyle: "シンプルな白背景",
  overallMood: "プロフェッショナルで信頼感のある",
};

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  firstview: "ファーストビュー",
  problem: "悩み・課題",
  agitation: "煽り・共感",
  solution: "解決策",
  benefit: "ベネフィット",
  feature: "特徴・機能",
  proof: "実績・信頼",
  testimonial: "お客様の声",
  comparison: "比較",
  process: "流れ・ステップ",
  faq: "よくある質問",
  offer: "オファー・特典",
  price: "価格",
  guarantee: "保証",
  cta: "CTA",
  profile: "プロフィール",
  footer: "フッター",
  custom: "カスタム",
};

export const ELEMENT_TYPE_LABELS: Record<ContentElementType, string> = {
  headline: "見出し",
  subheadline: "サブ見出し",
  body: "本文",
  cta: "CTAボタン",
  image: "画像",
  logo: "ロゴ",
  badge: "バッジ",
  list: "リスト",
  testimonial: "お客様の声",
  number: "数字・実績",
  icon: "アイコン",
  divider: "区切り線",
  spacer: "スペーサー",
  faq: "FAQ",
  price: "価格",
  guarantee: "保証",
  bonus: "特典",
  countdown: "カウントダウン",
};
