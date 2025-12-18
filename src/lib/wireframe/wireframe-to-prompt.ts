/**
 * ワイヤーフレーム→プロンプト変換
 *
 * ワイヤーフレームデータからプロンプトを生成
 */

import type { Wireframe, WireframeSection, WireframeElement } from "./types";
import type { PromptFormat } from "@/lib/workflow/types";
import type { SectionPlan, ContentElement, GlobalDesignRules } from "@/lib/structure/types";
import { ELEMENT_TYPE_LABELS, DEFAULT_GLOBAL_RULES } from "@/lib/structure/types";
import { generateSectionPrompt, generateAllSectionPrompts } from "@/lib/prompts/prompt-generator";
import type { GeneratedPrompt } from "@/lib/prompts/types";

// ============================================================
// ワイヤーフレーム → 構成変換
// ============================================================

/**
 * ワイヤーフレームセクションをSectionPlanに変換
 */
export function wireframeSectionToSectionPlan(
  section: WireframeSection,
  index: number
): SectionPlan {
  // 要素をY座標でソート（上から順に）
  const sortedElements = [...section.elements].sort((a, b) => a.y - b.y);

  // 要素を変換
  const elements: ContentElement[] = sortedElements.map((el) =>
    wireframeElementToContentElement(el)
  );

  return {
    id: section.id,
    type: inferSectionType(section.name, elements),
    name: section.name,
    order: index,
    purpose: `${section.name}セクション`,
    elements,
    estimatedHeight: inferHeight(section.height),
    isRequired: index === 0, // 最初のセクションは必須
  };
}

/**
 * ワイヤーフレーム要素をContentElementに変換
 */
function wireframeElementToContentElement(element: WireframeElement): ContentElement {
  return {
    id: element.id,
    type: element.type,
    content: element.content || ELEMENT_TYPE_LABELS[element.type],
    style: {
      fontSize: inferFontSize(element.style.fontSize),
      fontWeight: element.style.fontWeight,
      textAlign: element.style.textAlign,
    },
    position: {
      alignment: inferAlignment(element.x, element.width),
    },
  };
}

/**
 * セクション名と要素からセクションタイプを推測
 */
function inferSectionType(
  name: string,
  elements: ContentElement[]
): SectionPlan["type"] {
  const nameLower = name.toLowerCase();

  if (nameLower.includes("ファーストビュー") || nameLower.includes("fv") || nameLower.includes("hero")) {
    return "firstview";
  }
  if (nameLower.includes("悩み") || nameLower.includes("問題")) {
    return "problem";
  }
  if (nameLower.includes("解決") || nameLower.includes("ソリューション")) {
    return "solution";
  }
  if (nameLower.includes("ベネフィット") || nameLower.includes("メリット")) {
    return "benefit";
  }
  if (nameLower.includes("実績") || nameLower.includes("証拠") || nameLower.includes("お客様")) {
    return "proof";
  }
  if (nameLower.includes("cta") || nameLower.includes("申し込み")) {
    return "cta";
  }
  if (nameLower.includes("faq") || nameLower.includes("質問")) {
    return "faq";
  }

  // 要素からも推測
  const hasTestimonial = elements.some((e) => e.type === "testimonial");
  if (hasTestimonial) return "testimonial";

  const hasCta = elements.some((e) => e.type === "cta");
  if (hasCta) return "cta";

  const hasFaq = elements.some((e) => e.type === "faq");
  if (hasFaq) return "faq";

  return "custom";
}

/**
 * 高さからestimatedHeightを推測
 */
function inferHeight(height: number): "short" | "medium" | "long" {
  if (height < 400) return "short";
  if (height < 800) return "medium";
  return "long";
}

/**
 * フォントサイズからsizeを推測
 */
function inferFontSize(
  size?: number
): "small" | "medium" | "large" | "xlarge" | undefined {
  if (!size) return undefined;
  if (size < 14) return "small";
  if (size < 18) return "medium";
  if (size < 24) return "large";
  return "xlarge";
}

/**
 * X座標とwidthからalignmentを推測
 */
function inferAlignment(
  x: number,
  width: number,
  canvasWidth: number = 375
): "left" | "center" | "right" {
  const center = canvasWidth / 2;
  const elementCenter = x + width / 2;

  if (Math.abs(elementCenter - center) < 20) return "center";
  if (elementCenter < center) return "left";
  return "right";
}

// ============================================================
// ワイヤーフレーム → プロンプト直接変換
// ============================================================

/**
 * ワイヤーフレーム全体をプロンプトに変換
 */
export function wireframeToPrompts(
  wireframe: Wireframe,
  globalRules: GlobalDesignRules = DEFAULT_GLOBAL_RULES,
  format: PromptFormat = "yaml"
): GeneratedPrompt[] {
  // ワイヤーフレームを構成に変換
  const sectionPlans = wireframe.sections.map((section, index) =>
    wireframeSectionToSectionPlan(section, index)
  );

  // 構成からプロンプトを生成
  return generateAllSectionPrompts(sectionPlans, globalRules, {
    format,
    includeRules: true,
    includeMetadata: false,
  });
}

/**
 * 単一セクションをプロンプトに変換
 */
export function wireframeSectionToPrompt(
  section: WireframeSection,
  globalRules: GlobalDesignRules = DEFAULT_GLOBAL_RULES,
  format: PromptFormat = "yaml"
): GeneratedPrompt {
  const sectionPlan = wireframeSectionToSectionPlan(section, 0);

  return generateSectionPrompt(sectionPlan, globalRules, {
    format,
    includeRules: true,
    includeMetadata: false,
  });
}

// ============================================================
// 構成 → ワイヤーフレーム変換（逆変換）
// ============================================================

/**
 * SectionPlanをワイヤーフレームセクションに変換
 */
export function sectionPlanToWireframeSection(
  plan: SectionPlan,
  canvasWidth: number = 375
): WireframeSection {
  let yPosition = 20;

  const elements: WireframeElement[] = plan.elements.map((element) => {
    const wireframeElement = contentElementToWireframeElement(
      element,
      plan.id,
      yPosition,
      canvasWidth
    );
    yPosition += wireframeElement.height + 10;
    return wireframeElement;
  });

  return {
    id: plan.id,
    name: plan.name,
    order: plan.order,
    width: canvasWidth,
    height: Math.max(600, yPosition + 40),
    elements,
    collapsed: false,
  };
}

/**
 * ContentElementをワイヤーフレーム要素に変換
 */
function contentElementToWireframeElement(
  element: ContentElement,
  sectionId: string,
  yPosition: number,
  canvasWidth: number
): WireframeElement {
  // デフォルトサイズ
  const defaultSizes: Record<string, { width: number; height: number }> = {
    headline: { width: 300, height: 60 },
    subheadline: { width: 280, height: 40 },
    body: { width: 335, height: 80 },
    image: { width: 335, height: 200 },
    logo: { width: 120, height: 40 },
    cta: { width: 200, height: 50 },
    badge: { width: 100, height: 30 },
    list: { width: 320, height: 100 },
    testimonial: { width: 320, height: 120 },
    number: { width: 100, height: 80 },
  };

  const size = defaultSizes[element.type] || { width: 200, height: 50 };
  const x = (canvasWidth - size.width) / 2; // 中央配置

  return {
    id: element.id,
    type: element.type,
    label: ELEMENT_TYPE_LABELS[element.type],
    content: element.content,
    x,
    y: yPosition,
    width: size.width,
    height: size.height,
    style: {
      backgroundColor: "#f0f0f0",
      borderColor: "#ccc",
      borderWidth: 1,
    },
    sectionId,
    locked: false,
    visible: true,
    zIndex: 0,
  };
}
