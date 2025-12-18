/**
 * Figma/XD インポートパーサー
 *
 * Figma/XDのエクスポートデータをLP構成に変換
 */

import type { SectionPlan, ContentElement, SectionType } from "@/lib/structure/types";

// Figmaノードの型定義
interface FigmaNode {
  id: string;
  name: string;
  type: "FRAME" | "GROUP" | "TEXT" | "RECTANGLE" | "ELLIPSE" | "IMAGE" | "COMPONENT" | "INSTANCE" | string;
  children?: FigmaNode[];
  characters?: string;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    imageRef?: string;
  }>;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    textAlign?: string;
  };
}

interface FigmaFile {
  name: string;
  document: {
    id: string;
    name: string;
    type: string;
    children: FigmaNode[];
  };
  components?: Record<string, { name: string; description?: string }>;
}

// インポート結果
interface ImportResult {
  success: boolean;
  sections: SectionPlan[];
  warnings: string[];
  errors: string[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// セクション名からタイプを推測
function inferSectionType(name: string): SectionType {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("hero") || lowerName.includes("first") || lowerName.includes("top") || lowerName.includes("ファースト") || lowerName.includes("メイン")) {
    return "firstview";
  }
  if (lowerName.includes("problem") || lowerName.includes("pain") || lowerName.includes("悩み") || lowerName.includes("課題")) {
    return "problem";
  }
  if (lowerName.includes("solution") || lowerName.includes("解決")) {
    return "solution";
  }
  if (lowerName.includes("benefit") || lowerName.includes("メリット") || lowerName.includes("特徴")) {
    return "benefit";
  }
  if (lowerName.includes("proof") || lowerName.includes("実績") || lowerName.includes("信頼")) {
    return "proof";
  }
  if (lowerName.includes("testimonial") || lowerName.includes("voice") || lowerName.includes("声") || lowerName.includes("レビュー")) {
    return "testimonial";
  }
  if (lowerName.includes("faq") || lowerName.includes("質問") || lowerName.includes("q&a")) {
    return "faq";
  }
  if (lowerName.includes("price") || lowerName.includes("料金") || lowerName.includes("価格")) {
    return "price";
  }
  if (lowerName.includes("cta") || lowerName.includes("action") || lowerName.includes("申込") || lowerName.includes("ボタン")) {
    return "cta";
  }

  return "custom";
}

// テキストノードから要素タイプを推測
function inferElementType(
  node: FigmaNode
): "headline" | "subheadline" | "body" | "cta" | "image" | "badge" | "list" | "testimonial" | "number" {
  const name = node.name.toLowerCase();

  // ノード名から推測
  if (name.includes("heading") || name.includes("title") || name.includes("見出し")) {
    if (name.includes("sub") || name.includes("サブ")) {
      return "subheadline";
    }
    return "headline";
  }
  if (name.includes("button") || name.includes("cta") || name.includes("ボタン")) {
    return "cta";
  }
  if (name.includes("badge") || name.includes("tag") || name.includes("バッジ")) {
    return "badge";
  }
  if (name.includes("image") || name.includes("photo") || name.includes("画像")) {
    return "image";
  }
  if (name.includes("list") || name.includes("リスト")) {
    return "list";
  }
  if (name.includes("testimonial") || name.includes("voice") || name.includes("声")) {
    return "testimonial";
  }
  if (name.includes("number") || name.includes("stat") || name.includes("数字")) {
    return "number";
  }

  // フォントサイズから推測
  if (node.style?.fontSize) {
    if (node.style.fontSize >= 32) {
      return "headline";
    }
    if (node.style.fontSize >= 20) {
      return "subheadline";
    }
  }

  return "body";
}

// Figmaノードを要素に変換
function nodeToElement(node: FigmaNode, index: number): ContentElement | null {
  if (node.type === "TEXT" && node.characters) {
    return {
      id: `element-${generateId()}-${index}`,
      type: inferElementType(node),
      content: node.characters,
    };
  }

  if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
    // 画像として扱う場合
    const hasFill = node.fills?.some((f) => f.type === "IMAGE" || f.imageRef);
    if (hasFill) {
      return {
        id: `element-${generateId()}-${index}`,
        type: "image",
        content: node.name || "画像",
      };
    }
  }

  if (node.type === "IMAGE") {
    return {
      id: `element-${generateId()}-${index}`,
      type: "image",
      content: node.name || "画像",
    };
  }

  return null;
}

// フレームをセクションに変換
function frameToSection(frame: FigmaNode, order: number): SectionPlan {
  const elements: ContentElement[] = [];

  // 子ノードを処理
  const processChildren = (children: FigmaNode[] | undefined, depth = 0) => {
    if (!children || depth > 5) return;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const element = nodeToElement(child, elements.length);
      if (element) {
        elements.push(element);
      }
      // 再帰的に子を処理
      if (child.children) {
        processChildren(child.children, depth + 1);
      }
    }
  };

  processChildren(frame.children);

  // 要素がない場合はデフォルト要素を追加
  if (elements.length === 0) {
    elements.push({
      id: `element-${generateId()}-0`,
      type: "headline",
      content: frame.name,
    });
  }

  // 高さを推測
  let estimatedHeight: "short" | "medium" | "long" = "medium";
  if (frame.absoluteBoundingBox) {
    const height = frame.absoluteBoundingBox.height;
    if (height < 400) estimatedHeight = "short";
    else if (height > 800) estimatedHeight = "long";
  }

  return {
    id: `section-${generateId()}`,
    type: inferSectionType(frame.name),
    name: frame.name,
    order,
    purpose: `${frame.name}セクション`,
    elements,
    estimatedHeight,
    isRequired: order === 0,
  };
}

// Figmaファイルをパース
export function parseFigmaFile(data: string | object): ImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const sections: SectionPlan[] = [];

  try {
    const figmaData: FigmaFile = typeof data === "string" ? JSON.parse(data) : data;

    if (!figmaData.document || !figmaData.document.children) {
      errors.push("Figmaファイルの形式が正しくありません");
      return { success: false, sections: [], warnings, errors };
    }

    // ドキュメントの最上位フレームを取得
    const topLevelFrames = figmaData.document.children.filter(
      (node) => node.type === "FRAME" || node.type === "COMPONENT"
    );

    if (topLevelFrames.length === 0) {
      // 子ノードを探索
      const findFrames = (nodes: FigmaNode[]): FigmaNode[] => {
        const frames: FigmaNode[] = [];
        for (const node of nodes) {
          if (node.type === "FRAME" || node.type === "COMPONENT") {
            frames.push(node);
          } else if (node.children) {
            frames.push(...findFrames(node.children));
          }
        }
        return frames;
      };
      topLevelFrames.push(...findFrames(figmaData.document.children));
    }

    if (topLevelFrames.length === 0) {
      warnings.push("フレームが見つかりませんでした。手動でセクションを追加してください。");
      return { success: true, sections: [], warnings, errors };
    }

    // Y座標でソート（上から下へ）
    topLevelFrames.sort((a, b) => {
      const aY = a.absoluteBoundingBox?.y || 0;
      const bY = b.absoluteBoundingBox?.y || 0;
      return aY - bY;
    });

    // セクションに変換
    for (let i = 0; i < topLevelFrames.length; i++) {
      const frame = topLevelFrames[i];
      const section = frameToSection(frame, i);
      sections.push(section);
    }

    if (sections.length > 0) {
      warnings.push(`${sections.length}個のセクションをインポートしました。内容を確認・調整してください。`);
    }

    return { success: true, sections, warnings, errors };
  } catch (error) {
    errors.push(`パースエラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    return { success: false, sections: [], warnings, errors };
  }
}

// シンプルなJSON形式をパース（カスタム形式対応）
export function parseSimpleJSON(data: string | object): ImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const sections: SectionPlan[] = [];

  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;

    // 配列形式
    if (Array.isArray(parsed)) {
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        sections.push({
          id: item.id || `section-${generateId()}`,
          type: item.type || inferSectionType(item.name || `セクション${i + 1}`),
          name: item.name || `セクション${i + 1}`,
          order: i,
          purpose: item.purpose || "",
          elements:
            item.elements?.map((e: { id?: string; type?: string; content?: string }, j: number) => ({
              id: e.id || `element-${generateId()}-${j}`,
              type: e.type || "body",
              content: e.content || "",
            })) || [],
          estimatedHeight: item.estimatedHeight || "medium",
          isRequired: item.isRequired ?? i === 0,
        });
      }
    }
    // オブジェクト形式（sections配列を含む）
    else if (parsed.sections && Array.isArray(parsed.sections)) {
      return parseSimpleJSON(parsed.sections);
    }
    else {
      errors.push("サポートされていないJSON形式です");
      return { success: false, sections: [], warnings, errors };
    }

    return { success: true, sections, warnings, errors };
  } catch (error) {
    errors.push(`パースエラー: ${error instanceof Error ? error.message : "不明なエラー"}`);
    return { success: false, sections: [], warnings, errors };
  }
}

// ファイルタイプを判定してパース
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseImportFile(content: string, filename: string): ImportResult {
  // Figma形式の特徴を検出
  try {
    const parsed = JSON.parse(content);
    if (parsed.document && parsed.document.children) {
      return parseFigmaFile(parsed);
    }
    // シンプルなJSON形式
    return parseSimpleJSON(parsed);
  } catch {
    return {
      success: false,
      sections: [],
      warnings: [],
      errors: ["JSONファイルのパースに失敗しました"],
    };
  }
}
