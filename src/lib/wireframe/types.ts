/**
 * ワイヤーフレーム 型定義
 *
 * ワイヤーフレームの要素、レイアウト、状態管理
 */

import type { ContentElementType } from "@/lib/structure/types";

// ============================================================
// ワイヤーフレーム要素
// ============================================================

export interface WireframeElement {
  id: string;
  type: ContentElementType;
  label: string;
  content: string;

  // 位置とサイズ
  x: number;
  y: number;
  width: number;
  height: number;

  // スタイル
  style: WireframeElementStyle;

  // 親セクション
  sectionId: string;

  // ロック状態
  locked: boolean;

  // 表示/非表示
  visible: boolean;

  // Zインデックス
  zIndex: number;
}

export interface WireframeElementStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  textAlign?: "left" | "center" | "right";
  opacity?: number;
}

// ============================================================
// ワイヤーフレームセクション
// ============================================================

export interface WireframeSection {
  id: string;
  name: string;
  order: number;

  // セクション全体のサイズ
  width: number;
  height: number;

  // 背景
  backgroundColor?: string;
  backgroundPattern?: WireframePattern;

  // 含まれる要素
  elements: WireframeElement[];

  // 折りたたみ状態
  collapsed: boolean;
}

export type WireframePattern =
  | "none"
  | "dots"
  | "lines"
  | "grid"
  | "diagonal";

// ============================================================
// ワイヤーフレーム全体
// ============================================================

export interface Wireframe {
  id: string;
  projectId: string;
  name: string;

  // キャンバスサイズ
  canvasWidth: number;
  canvasHeight: number;

  // セクション一覧
  sections: WireframeSection[];

  // グローバル設定
  settings: WireframeSettings;

  // メタデータ
  createdAt: Date;
  updatedAt: Date;
}

export interface WireframeSettings {
  // グリッド設定
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;

  // ガイド
  showGuides: boolean;
  guides: WireframeGuide[];

  // 表示設定
  zoom: number;
  showLabels: boolean;
  showBorders: boolean;
}

export interface WireframeGuide {
  id: string;
  type: "horizontal" | "vertical";
  position: number;
}

// ============================================================
// 要素テンプレート
// ============================================================

export interface WireframeElementTemplate {
  type: ContentElementType;
  label: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultStyle: WireframeElementStyle;
}

export const ELEMENT_TEMPLATES: WireframeElementTemplate[] = [
  {
    type: "headline",
    label: "見出し",
    icon: "H1",
    defaultWidth: 300,
    defaultHeight: 60,
    defaultStyle: {
      backgroundColor: "#e0e0e0",
      borderColor: "#999",
      borderWidth: 1,
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
    },
  },
  {
    type: "subheadline",
    label: "サブ見出し",
    icon: "H2",
    defaultWidth: 280,
    defaultHeight: 40,
    defaultStyle: {
      backgroundColor: "#e8e8e8",
      borderColor: "#aaa",
      borderWidth: 1,
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
    },
  },
  {
    type: "body",
    label: "本文",
    icon: "P",
    defaultWidth: 300,
    defaultHeight: 80,
    defaultStyle: {
      backgroundColor: "#f5f5f5",
      borderColor: "#ccc",
      borderWidth: 1,
      fontSize: 14,
      textAlign: "left",
    },
  },
  {
    type: "image",
    label: "画像",
    icon: "IMG",
    defaultWidth: 200,
    defaultHeight: 150,
    defaultStyle: {
      backgroundColor: "#ddd",
      borderColor: "#999",
      borderWidth: 2,
      borderRadius: 4,
    },
  },
  {
    type: "logo",
    label: "ロゴ",
    icon: "LOGO",
    defaultWidth: 120,
    defaultHeight: 40,
    defaultStyle: {
      backgroundColor: "#e0e0e0",
      borderColor: "#666",
      borderWidth: 1,
      borderRadius: 4,
    },
  },
  {
    type: "cta",
    label: "CTAボタン",
    icon: "BTN",
    defaultWidth: 200,
    defaultHeight: 50,
    defaultStyle: {
      backgroundColor: "#4a90d9",
      borderColor: "#2c5282",
      borderWidth: 2,
      borderRadius: 8,
      fontSize: 16,
      fontWeight: "bold",
      textAlign: "center",
    },
  },
  {
    type: "badge",
    label: "バッジ",
    icon: "TAG",
    defaultWidth: 100,
    defaultHeight: 30,
    defaultStyle: {
      backgroundColor: "#f6e05e",
      borderColor: "#d69e2e",
      borderWidth: 1,
      borderRadius: 4,
      fontSize: 12,
      fontWeight: "bold",
      textAlign: "center",
    },
  },
  {
    type: "list",
    label: "リスト",
    icon: "LIST",
    defaultWidth: 280,
    defaultHeight: 100,
    defaultStyle: {
      backgroundColor: "#f5f5f5",
      borderColor: "#ccc",
      borderWidth: 1,
      fontSize: 14,
      textAlign: "left",
    },
  },
  {
    type: "testimonial",
    label: "お客様の声",
    icon: "QUOTE",
    defaultWidth: 280,
    defaultHeight: 120,
    defaultStyle: {
      backgroundColor: "#fff8e7",
      borderColor: "#d69e2e",
      borderWidth: 1,
      borderRadius: 8,
      fontSize: 14,
      textAlign: "left",
    },
  },
  {
    type: "number",
    label: "数字・実績",
    icon: "123",
    defaultWidth: 100,
    defaultHeight: 80,
    defaultStyle: {
      backgroundColor: "#e0e0e0",
      borderColor: "#666",
      borderWidth: 1,
      fontSize: 32,
      fontWeight: "bold",
      textAlign: "center",
    },
  },
];

// ============================================================
// デフォルト値
// ============================================================

export const DEFAULT_WIREFRAME_SETTINGS: WireframeSettings = {
  showGrid: true,
  gridSize: 10,
  snapToGrid: true,
  showGuides: true,
  guides: [],
  zoom: 1,
  showLabels: true,
  showBorders: true,
};

export const DEFAULT_SECTION_HEIGHT = 600;
export const DEFAULT_CANVAS_WIDTH = 375; // モバイルファースト

// ============================================================
// ヘルパー関数
// ============================================================

export function getElementTemplate(type: ContentElementType): WireframeElementTemplate | undefined {
  return ELEMENT_TEMPLATES.find((t) => t.type === type);
}

export function createWireframeElement(
  type: ContentElementType,
  sectionId: string,
  position: { x: number; y: number }
): WireframeElement {
  const template = getElementTemplate(type);

  return {
    id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    label: template?.label || type,
    content: "",
    x: position.x,
    y: position.y,
    width: template?.defaultWidth || 200,
    height: template?.defaultHeight || 50,
    style: template?.defaultStyle || {},
    sectionId,
    locked: false,
    visible: true,
    zIndex: 0,
  };
}

export function createWireframeSection(
  name: string,
  order: number
): WireframeSection {
  return {
    id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    order,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_SECTION_HEIGHT,
    elements: [],
    collapsed: false,
  };
}
