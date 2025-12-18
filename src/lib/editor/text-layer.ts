/**
 * テキストレイヤー管理
 * バナーエディター用のテキストレイヤー型定義とユーティリティ
 */

// =============================================================================
// 型定義
// =============================================================================

export interface TextLayerShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface TextLayerStroke {
  enabled: boolean;
  color: string;
  width: number;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  underline: boolean;
  shadow: TextLayerShadow;
  stroke: TextLayerStroke;
  visible: boolean;
  locked: boolean;
  rotation: number;
  opacity: number;
}

// =============================================================================
// デフォルト値
// =============================================================================

export const DEFAULT_SHADOW: TextLayerShadow = {
  enabled: false,
  color: "#000000",
  blur: 4,
  offsetX: 2,
  offsetY: 2,
};

export const DEFAULT_STROKE: TextLayerStroke = {
  enabled: false,
  color: "#000000",
  width: 2,
};

export const DEFAULT_TEXT_LAYER: Omit<TextLayer, "id"> = {
  text: "テキストを入力",
  x: 100,
  y: 100,
  fontSize: 36,
  fontFamily: "Noto Sans JP",
  color: "#ffffff",
  align: "left",
  bold: false,
  italic: false,
  underline: false,
  shadow: { ...DEFAULT_SHADOW },
  stroke: { ...DEFAULT_STROKE },
  visible: true,
  locked: false,
  rotation: 0,
  opacity: 1,
};

// =============================================================================
// フォント一覧（Google Fonts + ローカルフォント）
// =============================================================================

export type FontCategory = 
  | "gothic"      // ゴシック体
  | "mincho"      // 明朝体
  | "rounded"     // 丸ゴシック
  | "design"      // デザインフォント
  | "handwriting" // 手書き風
  | "brush"       // 筆文字
  | "pop"         // ポップ体
  | "english"     // 英語フォント
  | "system";     // システム

export type FontSource = "google" | "local";

export interface FontOption {
  id: string;
  name: string;
  family: string;
  category?: FontCategory;
  source?: FontSource;
  file?: string; // ローカルフォントのファイル名
}

// =============================================================================
// Google Fonts（Webフォント）
// =============================================================================
export const GOOGLE_FONTS: FontOption[] = [
  // ===== ゴシック体 =====
  { id: "noto-sans-jp", name: "Noto Sans JP", family: "Noto Sans JP", category: "gothic", source: "google" },
  { id: "m-plus-1p", name: "M PLUS 1p", family: "M PLUS 1p", category: "gothic", source: "google" },
  { id: "sawarabi-gothic", name: "Sawarabi Gothic", family: "Sawarabi Gothic", category: "gothic", source: "google" },
  { id: "zen-kaku-gothic-new", name: "Zen Kaku Gothic New", family: "Zen Kaku Gothic New", category: "gothic", source: "google" },
  { id: "zen-maru-gothic", name: "Zen Maru Gothic", family: "Zen Maru Gothic", category: "gothic", source: "google" },
  { id: "zen-kurenaido", name: "Zen Kurenaido", family: "Zen Kurenaido", category: "gothic", source: "google" },
  
  // ===== 明朝体 =====
  { id: "noto-serif-jp", name: "Noto Serif JP", family: "Noto Serif JP", category: "mincho", source: "google" },
  { id: "sawarabi-mincho", name: "Sawarabi Mincho", family: "Sawarabi Mincho", category: "mincho", source: "google" },
  { id: "zen-old-mincho", name: "Zen Old Mincho", family: "Zen Old Mincho", category: "mincho", source: "google" },
  { id: "zen-antique", name: "Zen Antique", family: "Zen Antique", category: "mincho", source: "google" },
  { id: "zen-antique-soft", name: "Zen Antique Soft", family: "Zen Antique Soft", category: "mincho", source: "google" },
  { id: "shippori-mincho", name: "Shippori Mincho", family: "Shippori Mincho", category: "mincho", source: "google" },
  { id: "shippori-antique", name: "Shippori Antique", family: "Shippori Antique", category: "mincho", source: "google" },
  { id: "shippori-antique-b1", name: "Shippori Antique B1", family: "Shippori Antique B1", category: "mincho", source: "google" },
  
  // ===== 丸ゴシック =====
  { id: "m-plus-rounded-1c", name: "M PLUS Rounded 1c", family: "M PLUS Rounded 1c", category: "rounded", source: "google" },
  { id: "kosugi-maru", name: "Kosugi Maru", family: "Kosugi Maru", category: "rounded", source: "google" },
  { id: "kosugi", name: "Kosugi", family: "Kosugi", category: "rounded", source: "google" },
  { id: "kiwi-maru", name: "Kiwi Maru", family: "Kiwi Maru", category: "rounded", source: "google" },
  
  // ===== デザインフォント =====
  { id: "yusei-magic", name: "Yusei Magic", family: "Yusei Magic", category: "design", source: "google" },
  { id: "reggae-one", name: "Reggae One", family: "Reggae One", category: "design", source: "google" },
  { id: "rocknroll-one", name: "RocknRoll One", family: "RocknRoll One", category: "design", source: "google" },
  { id: "mochiy-pop-one", name: "Mochiy Pop One", family: "Mochiy Pop One", category: "design", source: "google" },
  { id: "mochiy-pop-p-one", name: "Mochiy Pop P One", family: "Mochiy Pop P One", category: "design", source: "google" },
  { id: "dotgothic16", name: "DotGothic16", family: "DotGothic16", category: "design", source: "google" },
  { id: "stick", name: "Stick", family: "Stick", category: "design", source: "google" },
  { id: "train-one", name: "Train One", family: "Train One", category: "design", source: "google" },
  
  // ===== 手書き風 =====
  { id: "yuji-mai", name: "Yuji Mai", family: "Yuji Mai", category: "handwriting", source: "google" },
  { id: "yuji-syuku", name: "Yuji Syuku", family: "Yuji Syuku", category: "handwriting", source: "google" },
  { id: "new-tegomin", name: "New Tegomin", family: "New Tegomin", category: "handwriting", source: "google" },
];

// =============================================================================
// ローカルフォント（オープンソース/フリーフォントのみ）
// ※ 商用利用・再配布可能なフォントのみを厳選
// =============================================================================
export const LOCAL_FONTS: FontOption[] = [
  // ===== Noto Serif CJK (Google, OFL) =====
  { id: "noto-serif-cjk-r", name: "Noto Serif CJK R", family: "NotoSerifCJKjp-Regular", category: "mincho", source: "local", file: "NotoSerifCJKjp-Regular.otf" },
  { id: "noto-serif-cjk-m", name: "Noto Serif CJK M", family: "NotoSerifCJKjp-Medium", category: "mincho", source: "local", file: "NotoSerifCJKjp-Medium.otf" },
  { id: "noto-serif-cjk-b", name: "Noto Serif CJK B", family: "NotoSerifCJKjp-Bold", category: "mincho", source: "local", file: "NotoSerifCJKjp-Bold.otf" },
  { id: "noto-serif-cjk-black", name: "Noto Serif CJK Black", family: "NotoSerifCJKjp-Black", category: "mincho", source: "local", file: "NotoSerifCJKjp-Black.otf" },
  
  // ===== 源暎ゴシック (OFL) =====
  { id: "genei-gothic-n-h", name: "源暎ゴシックN H", family: "GenEiGothicN-H-KL", category: "gothic", source: "local", file: "GenEiGothicN-H-KL.otf" },
  { id: "genei-gothic-n-u", name: "源暎ゴシックN U", family: "GenEiGothicN-U-KL", category: "gothic", source: "local", file: "GenEiGothicN-U-KL.otf" },
  { id: "genei-gothic-p-h", name: "源暎ゴシックP H", family: "GenEiGothicP-H-KL", category: "gothic", source: "local", file: "GenEiGothicP-H-KL.otf" },
  
  // ===== コーポレート・ロゴ (フリーフォント、商用可) =====
  { id: "corporate-logo-medium", name: "コーポレート・ロゴ M", family: "Corporate-Logo-Medium-ver3", category: "design", source: "local", file: "Corporate-Logo-Medium-ver3.otf" },
  { id: "corporate-logo-bold", name: "コーポレート・ロゴ B", family: "Corporate-Logo-Bold-ver3", category: "design", source: "local", file: "Corporate-Logo-Bold-ver3.otf" },
  
  // ===== 日本語フリーフォント (商用可) =====
  { id: "tetsubin-gothic", name: "鉄瓶ゴシック", family: "07TetsubinGothic", category: "design", source: "local", file: "07鉄瓶ゴシック.otf" },
  { id: "chikara-yowaku", name: "851チカラヨワク", family: "851CHIKARA-YOWAKU", category: "handwriting", source: "local", file: "851CHIKARA-YOWAKU.ttf" },
  { id: "tanuki-magic", name: "たぬき油性マジック", family: "TanukiMagic", category: "handwriting", source: "local", file: "TanukiMagic.ttf" },
  { id: "pixel-mplus-10", name: "PixelMplus10", family: "PixelMplus10-Regular", category: "design", source: "local", file: "PixelMplus10-Regular.ttf" },
  { id: "pixel-mplus-12", name: "PixelMplus12", family: "PixelMplus12-Regular", category: "design", source: "local", file: "PixelMplus12-Regular.ttf" },
  
  // ===== 英語フォント (Google Fonts / OFL) =====
  { id: "lobster", name: "Lobster", family: "Lobster", category: "english", source: "local", file: "Lobster_1.3.otf" },
  { id: "pacifico", name: "Pacifico", family: "Pacifico", category: "english", source: "local", file: "Pacifico.ttf" },
  { id: "permanent-marker", name: "Permanent Marker", family: "PermanentMarker", category: "english", source: "local", file: "PermanentMarker.ttf" },
  { id: "quicksand", name: "Quicksand", family: "Quicksand-Regular", category: "english", source: "local", file: "Quicksand-Regular.ttf" },
  { id: "comfortaa", name: "Comfortaa", family: "Comfortaa-Regular", category: "english", source: "local", file: "Comfortaa-Regular.ttf" },
  { id: "oswald", name: "Oswald", family: "Oswald-Regular", category: "english", source: "local", file: "Oswald-Regular.ttf" },
  { id: "oswald-bold", name: "Oswald Bold", family: "Oswald-Bold", category: "english", source: "local", file: "Oswald-Bold.ttf" },
  { id: "raleway", name: "Raleway", family: "Raleway-Regular", category: "english", source: "local", file: "Raleway-Regular.ttf" },
  { id: "lato", name: "Lato", family: "Lato-Regular", category: "english", source: "local", file: "Lato-Regular.ttf" },
  { id: "roboto", name: "Roboto", family: "Roboto-Regular", category: "english", source: "local", file: "Roboto-Regular.ttf" },
  { id: "cinzel", name: "Cinzel", family: "Cinzel-Bold", category: "english", source: "local", file: "Cinzel-Bold.ttf" },
  { id: "bungee", name: "Bungee", family: "Bungee-Regular", category: "english", source: "local", file: "Bungee-Regular.ttf" },
  { id: "orbitron", name: "Orbitron", family: "Orbitron-Regular", category: "english", source: "local", file: "Orbitron-Regular.ttf" },
];

// =============================================================================
// システムフォント
// =============================================================================
export const SYSTEM_FONTS: FontOption[] = [
  { id: "sans-serif", name: "Sans Serif", family: "sans-serif", category: "system", source: "local" },
  { id: "serif", name: "Serif", family: "serif", category: "system", source: "local" },
  { id: "monospace", name: "Monospace", family: "monospace", category: "system", source: "local" },
];

// =============================================================================
// 全フォント統合
// =============================================================================
export const JAPANESE_FONTS: FontOption[] = [
  ...GOOGLE_FONTS,
  ...LOCAL_FONTS,
  ...SYSTEM_FONTS,
];

// =============================================================================
// フォントカテゴリ別取得
// =============================================================================

export const FONT_CATEGORIES = {
  gothic: "ゴシック体",
  mincho: "明朝体",
  rounded: "丸ゴシック",
  design: "デザインフォント",
  handwriting: "手書き風",
  brush: "筆文字",
  pop: "ポップ体",
  english: "英語フォント",
  system: "システム",
} as const;

export function getFontsByCategory(category: FontCategory): FontOption[] {
  return JAPANESE_FONTS.filter((font) => font.category === category);
}

export function getFontsBySource(source: FontSource): FontOption[] {
  return JAPANESE_FONTS.filter((font) => font.source === source);
}

export function getGoogleFonts(): FontOption[] {
  return GOOGLE_FONTS;
}

export function getLocalFonts(): FontOption[] {
  return LOCAL_FONTS;
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * 新しいテキストレイヤーを作成
 */
export function createTextLayer(
  overrides?: Partial<Omit<TextLayer, "id">>
): TextLayer {
  return {
    id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    ...DEFAULT_TEXT_LAYER,
    ...overrides,
    shadow: {
      ...DEFAULT_SHADOW,
      ...overrides?.shadow,
    },
    stroke: {
      ...DEFAULT_STROKE,
      ...overrides?.stroke,
    },
  };
}

/**
 * テキストレイヤーを複製
 */
export function duplicateTextLayer(layer: TextLayer): TextLayer {
  return {
    ...layer,
    id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    x: layer.x + 20,
    y: layer.y + 20,
    shadow: { ...layer.shadow },
    stroke: { ...layer.stroke },
  };
}

/**
 * テキストレイヤーを更新
 */
export function updateTextLayer(
  layer: TextLayer,
  updates: Partial<TextLayer>
): TextLayer {
  return {
    ...layer,
    ...updates,
    shadow: updates.shadow
      ? { ...layer.shadow, ...updates.shadow }
      : layer.shadow,
    stroke: updates.stroke
      ? { ...layer.stroke, ...updates.stroke }
      : layer.stroke,
  };
}

/**
 * レイヤーの境界ボックスを計算（簡易版）
 */
export function getLayerBounds(
  layer: TextLayer,
  ctx: CanvasRenderingContext2D
): { x: number; y: number; width: number; height: number } {
  const fontStyle = `${layer.italic ? "italic " : ""}${
    layer.bold ? "bold " : ""
  }${layer.fontSize}px ${layer.fontFamily}`;
  ctx.font = fontStyle;

  const lines = layer.text.split("\n");
  const lineHeight = layer.fontSize * 1.2;
  const maxWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line).width)
  );
  const totalHeight = lines.length * lineHeight;

  let offsetX = 0;
  if (layer.align === "center") {
    offsetX = -maxWidth / 2;
  } else if (layer.align === "right") {
    offsetX = -maxWidth;
  }

  return {
    x: layer.x + offsetX,
    y: layer.y - layer.fontSize,
    width: maxWidth,
    height: totalHeight,
  };
}

/**
 * 点がレイヤーの境界内にあるかチェック
 */
export function isPointInLayer(
  layer: TextLayer,
  x: number,
  y: number,
  ctx: CanvasRenderingContext2D
): boolean {
  const bounds = getLayerBounds(layer, ctx);
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

/**
 * レイヤー配列を上に移動
 */
export function moveLayerUp(layers: TextLayer[], layerId: string): TextLayer[] {
  const index = layers.findIndex((l) => l.id === layerId);
  if (index <= 0) return layers;

  const newLayers = [...layers];
  [newLayers[index - 1], newLayers[index]] = [
    newLayers[index],
    newLayers[index - 1],
  ];
  return newLayers;
}

/**
 * レイヤー配列を下に移動
 */
export function moveLayerDown(
  layers: TextLayer[],
  layerId: string
): TextLayer[] {
  const index = layers.findIndex((l) => l.id === layerId);
  if (index < 0 || index >= layers.length - 1) return layers;

  const newLayers = [...layers];
  [newLayers[index], newLayers[index + 1]] = [
    newLayers[index + 1],
    newLayers[index],
  ];
  return newLayers;
}

/**
 * フォントをプリロード
 */
export async function preloadFont(fontFamily: string): Promise<void> {
  if (typeof document === "undefined") return;

  const font = JAPANESE_FONTS.find((f) => f.family === fontFamily);
  // システムフォントはプリロード不要
  if (!font || font.category === "system") {
    return;
  }

  try {
    const styleId = `font-${font.id}`;
    
    if (font.source === "local" && font.file) {
      // ローカルフォントの場合: @font-face を動的に追加
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        // APIルート経由でフォントを読み込み
        style.textContent = `
          @font-face {
            font-family: "${font.family}";
            src: url("/api/fonts/${encodeURIComponent(font.file)}") format("${getFontFormat(font.file)}");
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
    } else if (font.source === "google") {
      // Google Fontsの場合: リンクを動的に追加
      if (!document.getElementById(styleId)) {
        const link = document.createElement("link");
        link.id = styleId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
          font.family
        )}:wght@400;700&display=swap`;
        document.head.appendChild(link);
      }
    }

    // フォントのロードを待機
    await document.fonts.load(`16px "${fontFamily}"`);
  } catch (error) {
    console.warn(`Failed to preload font: ${fontFamily}`, error);
  }
}

/**
 * フォントファイルの拡張子からフォーマットを取得
 */
function getFontFormat(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "otf":
      return "opentype";
    case "ttf":
      return "truetype";
    case "woff":
      return "woff";
    case "woff2":
      return "woff2";
    case "ttc":
      return "truetype"; // TrueType Collection
    default:
      return "truetype";
  }
}

/**
 * 複数のフォントを一括プリロード
 */
export async function preloadFonts(fontFamilies: string[]): Promise<void> {
  await Promise.all(fontFamilies.map(preloadFont));
}

/**
 * カテゴリ別にフォントを一括プリロード
 */
export async function preloadFontsByCategory(category: FontCategory): Promise<void> {
  const fonts = getFontsByCategory(category);
  await preloadFonts(fonts.map((f) => f.family));
}
