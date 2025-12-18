/**
 * Image Size Presets
 * LP、SNS、広告、印刷用のサイズプリセット定義
 */

// =============================================================================
// Types
// =============================================================================

export interface SizePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  category: PresetCategory;
  description?: string;
}

export type PresetCategory = "lp" | "sns" | "ad" | "print" | "custom";

export interface PresetCategoryInfo {
  id: PresetCategory;
  name: string;
  description: string;
}

// =============================================================================
// Category Definitions
// =============================================================================

export const PRESET_CATEGORIES: PresetCategoryInfo[] = [
  {
    id: "lp",
    name: "LP・Webサイト",
    description: "ランディングページ用の画像サイズ",
  },
  {
    id: "sns",
    name: "SNS",
    description: "各種SNS投稿・サムネイル用",
  },
  {
    id: "ad",
    name: "広告",
    description: "Web広告バナー用",
  },
  {
    id: "print",
    name: "印刷",
    description: "印刷物用（高解像度）",
  },
  {
    id: "custom",
    name: "カスタム",
    description: "任意のサイズを指定",
  },
];

// =============================================================================
// Size Presets
// =============================================================================

export const SIZE_PRESETS: SizePreset[] = [
  // LP・Webサイト
  {
    id: "lp-hero-pc",
    name: "LPヒーロー（PC）",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    category: "lp",
    description: "PCブラウザ向けファーストビュー",
  },
  {
    id: "lp-hero-mobile",
    name: "LPヒーロー（モバイル）",
    width: 750,
    height: 1334,
    aspectRatio: "9:16",
    category: "lp",
    description: "スマホ向けファーストビュー",
  },
  {
    id: "lp-section",
    name: "LPセクション",
    width: 1200,
    height: 800,
    aspectRatio: "3:2",
    category: "lp",
    description: "LP中間セクション用",
  },
  {
    id: "ogp",
    name: "OGP画像",
    width: 1200,
    height: 630,
    aspectRatio: "約2:1",
    category: "lp",
    description: "SNSシェア時のプレビュー画像",
  },

  // SNS
  {
    id: "youtube-thumbnail",
    name: "YouTubeサムネイル",
    width: 1280,
    height: 720,
    aspectRatio: "16:9",
    category: "sns",
    description: "YouTube動画サムネイル",
  },
  {
    id: "instagram-feed",
    name: "Instagramフィード",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    category: "sns",
    description: "Instagram正方形投稿",
  },
  {
    id: "instagram-story",
    name: "Instagramストーリー",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    category: "sns",
    description: "Instagram/TikTokストーリー",
  },
  {
    id: "twitter-header",
    name: "Twitterヘッダー",
    width: 1500,
    height: 500,
    aspectRatio: "3:1",
    category: "sns",
    description: "Xプロフィールヘッダー",
  },
  {
    id: "twitter-post",
    name: "Twitter投稿",
    width: 1200,
    height: 675,
    aspectRatio: "16:9",
    category: "sns",
    description: "X投稿用画像",
  },

  // 広告
  {
    id: "facebook-ad",
    name: "Facebook広告",
    width: 1200,
    height: 628,
    aspectRatio: "約2:1",
    category: "ad",
    description: "Facebook/Instagram広告",
  },
  {
    id: "google-display-medium",
    name: "Googleディスプレイ（中）",
    width: 300,
    height: 250,
    aspectRatio: "-",
    category: "ad",
    description: "Googleディスプレイ標準サイズ",
  },
  {
    id: "google-display-large",
    name: "Googleディスプレイ（大）",
    width: 336,
    height: 280,
    aspectRatio: "-",
    category: "ad",
    description: "Googleディスプレイ大きめ",
  },
  {
    id: "vertical-banner",
    name: "縦長バナー",
    width: 300,
    height: 600,
    aspectRatio: "1:2",
    category: "ad",
    description: "サイドバー縦長広告",
  },
  {
    id: "leaderboard",
    name: "リーダーボード",
    width: 728,
    height: 90,
    aspectRatio: "-",
    category: "ad",
    description: "横長バナー広告",
  },

  // 印刷
  {
    id: "a4-portrait",
    name: "A4縦",
    width: 2480,
    height: 3508,
    aspectRatio: "約1:1.4",
    category: "print",
    description: "A4サイズ縦向き（300dpi）",
  },
  {
    id: "a4-landscape",
    name: "A4横",
    width: 3508,
    height: 2480,
    aspectRatio: "約1.4:1",
    category: "print",
    description: "A4サイズ横向き（300dpi）",
  },
  {
    id: "business-card",
    name: "名刺",
    width: 1050,
    height: 600,
    aspectRatio: "約7:4",
    category: "print",
    description: "日本標準名刺サイズ（300dpi）",
  },
  {
    id: "postcard",
    name: "はがき",
    width: 1181,
    height: 1748,
    aspectRatio: "約2:3",
    category: "print",
    description: "はがきサイズ（300dpi）",
  },
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get preset by ID
 */
export function getPresetById(id: string): SizePreset | undefined {
  return SIZE_PRESETS.find((p) => p.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): SizePreset[] {
  return SIZE_PRESETS.filter((p) => p.category === category);
}

/**
 * Get all presets grouped by category
 */
export function getPresetsGroupedByCategory(): Record<PresetCategory, SizePreset[]> {
  return SIZE_PRESETS.reduce(
    (acc, preset) => {
      if (!acc[preset.category]) {
        acc[preset.category] = [];
      }
      acc[preset.category].push(preset);
      return acc;
    },
    {} as Record<PresetCategory, SizePreset[]>
  );
}

/**
 * Calculate aspect ratio string from width and height
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;

  // Simplify common ratios
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.01) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.01) return "9:16";
  if (Math.abs(ratio - 1) < 0.01) return "1:1";
  if (Math.abs(ratio - 4 / 3) < 0.01) return "4:3";
  if (Math.abs(ratio - 3 / 2) < 0.01) return "3:2";
  if (Math.abs(ratio - 2 / 1) < 0.01) return "2:1";

  // Return simplified ratio or approximate
  if (ratioW <= 20 && ratioH <= 20) {
    return `${ratioW}:${ratioH}`;
  }
  return `約${(width / height).toFixed(1)}:1`;
}

/**
 * Create custom preset
 */
export function createCustomPreset(
  width: number,
  height: number,
  name?: string
): SizePreset {
  return {
    id: `custom-${width}x${height}`,
    name: name || `カスタム ${width}x${height}`,
    width,
    height,
    aspectRatio: calculateAspectRatio(width, height),
    category: "custom",
  };
}

/**
 * Validate size (must be within reasonable bounds)
 */
export function validateSize(width: number, height: number): {
  valid: boolean;
  error?: string;
} {
  const MIN_SIZE = 64;
  const MAX_SIZE = 8192;
  const MAX_PIXELS = 4096 * 4096; // ~16MP

  if (width < MIN_SIZE || height < MIN_SIZE) {
    return { valid: false, error: `サイズは${MIN_SIZE}px以上にしてください` };
  }

  if (width > MAX_SIZE || height > MAX_SIZE) {
    return { valid: false, error: `サイズは${MAX_SIZE}px以下にしてください` };
  }

  if (width * height > MAX_PIXELS) {
    return { valid: false, error: "画像が大きすぎます（最大約16メガピクセル）" };
  }

  return { valid: true };
}

/**
 * Get recommended preset for a use case
 */
export function getRecommendedPreset(useCase: string): SizePreset | undefined {
  const useCaseMap: Record<string, string> = {
    hero: "lp-hero-pc",
    "hero-mobile": "lp-hero-mobile",
    youtube: "youtube-thumbnail",
    instagram: "instagram-feed",
    story: "instagram-story",
    twitter: "twitter-post",
    facebook: "facebook-ad",
    ogp: "ogp",
    banner: "vertical-banner",
    a4: "a4-portrait",
  };

  const presetId = useCaseMap[useCase.toLowerCase()];
  return presetId ? getPresetById(presetId) : undefined;
}
