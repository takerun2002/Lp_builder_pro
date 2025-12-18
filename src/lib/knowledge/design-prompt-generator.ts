/**
 * デザインプロンプトジェネレーター
 *
 * design_prompts.yaml のテンプレートを使用して
 * LP画像/バナー/SNS素材用のプロンプトを生成
 *
 * Phase 3.5: YouTubeサムネイル心理学フレームワーク追加
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

// ============================================
// YouTubeサムネイル心理学フレームワーク
// ============================================

// 型定義
export interface YouTubeThumbnailPsychologyData {
  meta: {
    version: string;
    description: string;
  };
  core_principle: {
    summary: string;
    conditions: Array<{
      id: string;
      name: string;
      mechanism: string;
      check_question: string;
    }>;
  };
  target_personas: Array<{
    id: string;
    name: string;
    description: string;
    interests: string[];
    effective_triggers: string[];
    pain_points: string[];
  }>;
  scoring_system: {
    total_score: {
      max: number;
      ranges: Record<
        string,
        { min: number; max: number; label: string; color: string; recommendation: string }
      >;
    };
    condition_scores: Array<{
      id: string;
      max: number;
      levels: Array<{ score: number; label: string; description: string }>;
    }>;
  };
  image_generation_template: {
    name: string;
    template: string;
  };
  color_psychology: Record<string, {
    primary: string;
    secondary: string;
    accent: string;
    effect: string;
  }>;
  auto_improvement_suggestions: Record<string, {
    problem: string;
    suggestions: string[];
  }>;
}

export interface SurvivalTrigger {
  id: string;
  name: string;
  japanese: string;
  icon: string;
  examples: string[];
  visual_cues: string[];
}

export interface TargetPersona {
  id: string;
  name: string;
  description: string;
  interests: string[];
  effective_triggers: string[];
  pain_points: string[];
}

export interface ThreeConditionScore {
  prediction_error: number;
  survival_circuit: number;
  self_relevance: number;
  total: number;
  rating: "excellent" | "good" | "needs_improvement";
  ratingLabel: string;
  ratingColor: string;
  recommendation: string;
}

export interface YouTubeThumbnailRequest {
  videoTitle: string;
  targetPersona: string;
  survivalTrigger: string;
  catchCopy?: string;
  predictionErrorElement?: string;
  survivalElement?: string;
  personalizationElement?: string;
  scores: {
    prediction_error: number;
    survival_circuit: number;
    self_relevance: number;
  };
}

export interface YouTubeThumbnailResult {
  prompt: string;
  scores: ThreeConditionScore;
  suggestions: string[];
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// キャッシュ
let cachedPsychologyData: YouTubeThumbnailPsychologyData | null = null;

/**
 * youtube_thumbnail_psychology.yaml を読み込む
 */
export function loadYouTubePsychology(): YouTubeThumbnailPsychologyData {
  if (cachedPsychologyData) {
    return cachedPsychologyData;
  }

  const filePath = join(
    process.cwd(),
    "src/lib/knowledge/youtube_thumbnail_psychology.yaml"
  );

  if (!existsSync(filePath)) {
    throw new Error("youtube_thumbnail_psychology.yaml not found");
  }

  const content = readFileSync(filePath, "utf-8");
  cachedPsychologyData = yaml.parse(content) as YouTubeThumbnailPsychologyData;

  return cachedPsychologyData;
}

/**
 * 心理学データキャッシュをクリア
 */
export function clearYouTubePsychologyCache(): void {
  cachedPsychologyData = null;
}

/**
 * 生存回路トリガー一覧を取得
 */
export function getSurvivalTriggers(): SurvivalTrigger[] {
  return [
    {
      id: "threat",
      name: "脅威",
      japanese: "脅威/恐怖",
      icon: "⚠️",
      examples: ["○○しないと損する", "知らないとヤバい", "今すぐ辞めて"],
      visual_cues: ["警告色（赤・黄）", "驚いた表情", "×マーク"],
    },
    {
      id: "reward",
      name: "報酬",
      japanese: "報酬/利益",
      icon: "💰",
      examples: ["○○で月100万", "たった3日で", "無料で手に入る"],
      visual_cues: ["お金のイメージ", "笑顔・歓喜の表情", "上昇矢印"],
    },
    {
      id: "social_status",
      name: "地位",
      japanese: "地位/権威",
      icon: "👑",
      examples: ["周りと差がつく", "選ばれる人の特徴", "99%が知らない"],
      visual_cues: ["ピラミッド構造", "王冠・トロフィー", "VIP感"],
    },
    {
      id: "sexual",
      name: "性",
      japanese: "性/魅力",
      icon: "💕",
      examples: ["モテる○○", "異性ウケ", "魅力的に見える"],
      visual_cues: ["魅力的な人物", "目を引く服装"],
    },
  ];
}

/**
 * ターゲットペルソナ一覧を取得
 */
export function getTargetPersonas(): TargetPersona[] {
  try {
    const data = loadYouTubePsychology();
    return data.target_personas || [];
  } catch {
    // デフォルト値を返す
    return [
      {
        id: "business_person",
        name: "ビジネスパーソン",
        description: "20-40代の会社員・起業家",
        interests: ["収入アップ", "キャリア", "効率化"],
        effective_triggers: ["reward", "social_status"],
        pain_points: ["収入に不満", "時間がない"],
      },
      {
        id: "homemaker",
        name: "主婦/主夫",
        description: "家庭を管理する20-50代",
        interests: ["節約", "時短", "子育て"],
        effective_triggers: ["threat", "reward"],
        pain_points: ["家計の不安", "時間に追われる"],
      },
      {
        id: "student",
        name: "学生",
        description: "中高生〜大学生",
        interests: ["勉強法", "アルバイト", "恋愛"],
        effective_triggers: ["social_status", "sexual"],
        pain_points: ["成績が上がらない", "お金がない"],
      },
      {
        id: "creator",
        name: "クリエイター",
        description: "YouTuber/ブロガー/インフルエンサー",
        interests: ["再生数アップ", "収益化", "マーケティング"],
        effective_triggers: ["reward", "social_status"],
        pain_points: ["再生数が伸びない", "差別化できない"],
      },
      {
        id: "health_conscious",
        name: "健康意識層",
        description: "美容・健康に関心の高い層",
        interests: ["ダイエット", "美容", "運動"],
        effective_triggers: ["threat", "sexual"],
        pain_points: ["体型の悩み", "老化の不安"],
      },
      {
        id: "general",
        name: "一般視聴者",
        description: "特定のセグメントに限定しない層",
        interests: ["エンタメ", "ニュース", "トレンド"],
        effective_triggers: ["threat", "reward", "social_status"],
        pain_points: ["退屈", "話題についていけない"],
      },
    ];
  }
}

/**
 * 3条件スコアを評価
 */
export function evaluateThreeConditions(scores: {
  prediction_error: number;
  survival_circuit: number;
  self_relevance: number;
}): ThreeConditionScore {
  const total =
    scores.prediction_error + scores.survival_circuit + scores.self_relevance;

  let rating: "excellent" | "good" | "needs_improvement";
  let ratingLabel: string;
  let ratingColor: string;
  let recommendation: string;

  if (total >= 8) {
    rating = "excellent";
    ratingLabel = "優秀";
    ratingColor = "#22C55E";
    recommendation = "このまま使用可能。クリック率が期待できる";
  } else if (total >= 6) {
    rating = "good";
    ratingLabel = "良好";
    ratingColor = "#EAB308";
    recommendation = "微調整で改善可能。弱い条件を強化しよう";
  } else {
    rating = "needs_improvement";
    ratingLabel = "要改善";
    ratingColor = "#EF4444";
    recommendation = "3条件のうち複数が弱い。大幅な見直しが必要";
  }

  return {
    ...scores,
    total,
    rating,
    ratingLabel,
    ratingColor,
    recommendation,
  };
}

/**
 * 改善提案を生成
 */
export function getImprovementSuggestions(scores: {
  prediction_error: number;
  survival_circuit: number;
  self_relevance: number;
}): string[] {
  const suggestions: string[] = [];

  if (scores.prediction_error <= 1) {
    suggestions.push(
      "予測誤差が低い: 意外な比較対象を追加、スケールを極端に変える、異なるジャンルの要素を組み合わせる"
    );
  }

  if (scores.survival_circuit <= 1) {
    suggestions.push(
      "生存回路が弱い: 人物の表情をより感情的に、数字（金額、期間）を大きく見せる、警告色を追加"
    );
  }

  if (scores.self_relevance <= 1) {
    suggestions.push(
      "自分ごと化が弱い: ターゲットを明示する言葉を追加、Before/After要素を入れる、「あなた」「私も」を使う"
    );
  }

  return suggestions;
}

/**
 * トリガーに基づくカラーパレットを取得
 */
export function getColorPaletteForTrigger(triggerId: string): {
  primary: string;
  secondary: string;
  accent: string;
} {
  const palettes: Record<string, { primary: string; secondary: string; accent: string }> = {
    threat: { primary: "#FF0000", secondary: "#FF6600", accent: "#FFCC00" },
    reward: { primary: "#FFD700", secondary: "#00FF00", accent: "#00BFFF" },
    social_status: { primary: "#9932CC", secondary: "#000000", accent: "#C0C0C0" },
    sexual: { primary: "#FF69B4", secondary: "#FF1493", accent: "#FFB6C1" },
  };

  return palettes[triggerId] || palettes.reward;
}

/**
 * YouTubeサムネイル心理最適化プロンプトを生成
 */
export function generateYouTubeThumbnailPrompt(
  request: YouTubeThumbnailRequest
): YouTubeThumbnailResult {
  const {
    videoTitle,
    targetPersona,
    survivalTrigger,
    catchCopy,
    predictionErrorElement,
    survivalElement,
    personalizationElement,
    scores,
  } = request;

  // スコア評価
  const evaluatedScores = evaluateThreeConditions(scores);

  // 改善提案
  const suggestions = getImprovementSuggestions(scores);

  // カラーパレット
  const colorPalette = getColorPaletteForTrigger(survivalTrigger);

  // ターゲット情報取得
  const personas = getTargetPersonas();
  const persona = personas.find((p) => p.id === targetPersona);
  const personaName = persona?.name || "一般視聴者";
  const personaDescription = persona?.description || "";

  // トリガー情報取得
  const triggers = getSurvivalTriggers();
  const trigger = triggers.find((t) => t.id === survivalTrigger);
  const triggerName = trigger?.japanese || "報酬";
  const triggerVisuals = trigger?.visual_cues.join("、") || "";

  // 表情の決定
  let expression = "驚いた";
  if (survivalTrigger === "threat") expression = "驚いた/恐怖の";
  else if (survivalTrigger === "reward") expression = "歓喜の/期待に満ちた";
  else if (survivalTrigger === "social_status") expression = "自信に満ちた/誇らしげな";
  else if (survivalTrigger === "sexual") expression = "魅力的な/自信のある";

  // テキスト色の決定
  let textColor = "白（黒縁取り）";
  if (survivalTrigger === "threat") textColor = "黄色または白（赤縁取り）";
  else if (survivalTrigger === "reward") textColor = "白（金縁取り）";

  // プロンプト生成
  const prompt = `# 指示書: 神経科学ベースで最適化されたYouTubeサムネイル
【役割】ニューロマーケティング専門のサムネイルデザイナー
【目的】脳科学の3条件を満たし、クリック率を最大化するサムネイル作成

## 動画情報
・タイトル: ${videoTitle}
・ターゲット: ${personaName}（${personaDescription}）

## 心理トリガー設計
・主要トリガー: ${triggerName}
・キャッチコピー: ${catchCopy || "（動画タイトルから抽出）"}

## 3条件を満たすデザイン
【①予測誤差】
${predictionErrorElement || "意外性のある構図・要素を使用"}
→ 見慣れたパターンを裏切り、「ん？」と注意を引く

【②生存回路】
${survivalElement || `${triggerName}を刺激するビジュアル（${triggerVisuals}）`}
→ 本能的な身体反応を引き出すビジュアル

【③自分ごと化】
${personalizationElement || `${personaName}が共感できる要素`}
→ ターゲットが「これは自分のことだ」と感じる要素

## デザイン仕様
・人物配置: 感情的な${expression}表情、画面の左右どちらかに大きく配置
  - 顔の面積: 画面の30%以上
  - 視線: カメラ目線または指差し
・テキスト配置:
  - メインコピー: 「${catchCopy || videoTitle.slice(0, 10)}」を極太フォントで配置
  - 文字数: 7-10文字以内（読める最小サイズ）
  - 色: ${textColor}
  - 縁取り: 太めの縁取りで視認性確保
・背景: 被写体と文字が映えるよう暗め処理またはぼかし
・装飾要素:
  - 集中線または矢印で注目ポイント強調
  - アクセントカラー（${colorPalette.accent}）の枠線やハイライト

## カラーパレット
・メイン: ${colorPalette.primary}
・サブ: ${colorPalette.secondary}
・アクセント: ${colorPalette.accent}

## 技術要件
・解像度: 1280x720（YouTubeサムネイル標準）
・アスペクト比: 16:9
・スタイル: 高コントラスト、彩度高め
・重要: スマホの小さい画面でも視認できるサイズ感

## 禁止事項
・細かい文字（スマホで読めない）
・顔が小さすぎる配置
・背景と溶け込むテキスト色
・情報の詰め込みすぎ`;

  return {
    prompt,
    scores: evaluatedScores,
    suggestions,
    colorPalette,
  };
}
