/**
 * スタイル修飾子 (Style Modifiers)
 *
 * プロンプトにスタイル要素を追加するためのヘルパー
 * デザインのトーン＆マナーを統一的に適用
 */

export interface StyleModifier {
  colors: string[];
  fonts: string[];
  textures?: string[];
  descriptions: string[];
}

/**
 * 利用可能なスタイル修飾子
 */
export const STYLE_MODIFIERS: Record<string, StyleModifier> = {
  luxury: {
    colors: ["#D4AF37", "#1A1A1A", "#FFFFFF", "#8B7355"],
    fonts: ["serif", "elegant", "didot", "bodoni"],
    textures: ["silk", "gold-gradient", "marble", "velvet"],
    descriptions: [
      "高級感のある上品なデザイン",
      "金色のアクセント",
      "洗練された雰囲気",
      "シルクのようななめらかさ",
      "高級ホテルやブランドを連想させる",
    ],
  },
  casual: {
    colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF"],
    fonts: ["sans-serif", "handwritten", "rounded", "comic"],
    textures: ["paper", "watercolor", "crayon", "doodle"],
    descriptions: [
      "親しみやすいポップなデザイン",
      "明るい色使い",
      "カジュアルな雰囲気",
      "手書き風の温かみ",
      "友達に話しかけるような親近感",
    ],
  },
  professional: {
    colors: ["#2C3E50", "#3498DB", "#FFFFFF", "#ECF0F1"],
    fonts: ["sans-serif", "modern", "helvetica", "gotham"],
    textures: ["clean", "grid", "minimal"],
    descriptions: [
      "信頼感のあるビジネスデザイン",
      "クリーンなレイアウト",
      "プロフェッショナルな印象",
      "企業サイトのような信頼性",
      "データや実績を重視した表現",
    ],
  },
  emotional: {
    colors: ["#E74C3C", "#9B59B6", "#F1C40F", "#E91E63"],
    fonts: ["display", "script", "impact", "bold"],
    textures: ["gradient", "dramatic-lighting", "cinematic"],
    descriptions: [
      "感情に訴えかけるデザイン",
      "ドラマチックな演出",
      "心を動かすビジュアル",
      "物語性のある表現",
      "共感を呼ぶ情感的なトーン",
    ],
  },
  natural: {
    colors: ["#27AE60", "#8BC34A", "#795548", "#F5F5DC"],
    fonts: ["organic", "handwritten", "natural"],
    textures: ["wood", "leaf", "cotton", "linen"],
    descriptions: [
      "自然派・オーガニックなデザイン",
      "アースカラーの落ち着いた配色",
      "ナチュラルで健康的なイメージ",
      "エコフレンドリーな印象",
      "心地よい自然の温もり",
    ],
  },
  minimal: {
    colors: ["#000000", "#FFFFFF", "#F5F5F5", "#333333"],
    fonts: ["thin", "light", "geometric", "swiss"],
    textures: ["flat", "clean", "whitespace"],
    descriptions: [
      "シンプル・ミニマルなデザイン",
      "余白を活かした洗練されたレイアウト",
      "必要最小限の要素",
      "モダンでスタイリッシュ",
      "北欧デザインのような美しさ",
    ],
  },
  tech: {
    colors: ["#00D4FF", "#7B68EE", "#1A1A2E", "#0F3460"],
    fonts: ["monospace", "futuristic", "geometric"],
    textures: ["gradient", "glow", "circuit", "holographic"],
    descriptions: [
      "テクノロジー・先進的なデザイン",
      "サイバーパンク風のグラデーション",
      "未来的でイノベーティブ",
      "デジタル感のある演出",
      "スタートアップや最新技術を連想",
    ],
  },
  warm: {
    colors: ["#FF9800", "#FFC107", "#FFEB3B", "#FF5722"],
    fonts: ["rounded", "friendly", "warm"],
    textures: ["sunset", "warm-gradient", "cozy"],
    descriptions: [
      "温かみのある優しいデザイン",
      "サンセットカラーの暖色系",
      "ホーム感のある居心地の良さ",
      "家族や愛情を連想させる",
      "心が温まるビジュアル",
    ],
  },
};

/**
 * スタイル名の一覧を取得
 */
export function getStyleNames(): string[] {
  return Object.keys(STYLE_MODIFIERS);
}

/**
 * スタイル修飾子を取得
 */
export function getStyleModifier(
  style: keyof typeof STYLE_MODIFIERS
): StyleModifier | undefined {
  return STYLE_MODIFIERS[style];
}

/**
 * プロンプトにスタイル修飾を適用
 */
export function applyStyleModifier(
  basePrompt: string,
  style: keyof typeof STYLE_MODIFIERS
): string {
  const modifier = STYLE_MODIFIERS[style];
  if (!modifier) return basePrompt;

  const styleSection = `

【スタイル】
${modifier.descriptions.join("\n")}

【カラーパレット】
${modifier.colors.join(", ")}

【フォントスタイル】
${modifier.fonts.join(", ")}`;

  return basePrompt + styleSection;
}

/**
 * スタイルのカラーパレットを取得
 */
export function getStyleColors(
  style: keyof typeof STYLE_MODIFIERS
): string[] {
  return STYLE_MODIFIERS[style]?.colors || [];
}

/**
 * スタイルの説明を取得
 */
export function getStyleDescriptions(
  style: keyof typeof STYLE_MODIFIERS
): string[] {
  return STYLE_MODIFIERS[style]?.descriptions || [];
}

/**
 * スタイルをランダムに選択
 */
export function getRandomStyle(): keyof typeof STYLE_MODIFIERS {
  const styles = getStyleNames();
  return styles[Math.floor(Math.random() * styles.length)] as keyof typeof STYLE_MODIFIERS;
}

/**
 * 複数のスタイルをブレンド
 */
export function blendStyles(
  styles: (keyof typeof STYLE_MODIFIERS)[]
): StyleModifier {
  const colors: string[] = [];
  const fonts: string[] = [];
  const textures: string[] = [];
  const descriptions: string[] = [];

  for (const style of styles) {
    const modifier = STYLE_MODIFIERS[style];
    if (modifier) {
      colors.push(...modifier.colors);
      fonts.push(...modifier.fonts);
      if (modifier.textures) textures.push(...modifier.textures);
      descriptions.push(...modifier.descriptions.slice(0, 2));
    }
  }

  return {
    colors: Array.from(new Set(colors)),
    fonts: Array.from(new Set(fonts)),
    textures: Array.from(new Set(textures)),
    descriptions: Array.from(new Set(descriptions)),
  };
}

/**
 * スタイル選択肢（UI用）
 */
export const STYLE_OPTIONS = Object.entries(STYLE_MODIFIERS).map(
  ([key, value]) => ({
    value: key,
    label: getStyleLabel(key),
    description: value.descriptions[0],
    colors: value.colors.slice(0, 3),
  })
);

/**
 * スタイル名を日本語ラベルに変換
 */
function getStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    luxury: "高級・セレブ",
    casual: "カジュアル",
    professional: "プロフェッショナル",
    emotional: "感情訴求",
    natural: "ナチュラル",
    minimal: "シンプル・ミニマル",
    tech: "テック・先進",
    warm: "温かみ・優しさ",
  };
  return labels[style] || style;
}
