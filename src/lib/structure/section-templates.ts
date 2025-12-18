/**
 * セクションテンプレート
 *
 * LPでよく使われるセクションパターンのテンプレート集
 */

import type {
  SectionTemplate,
  SectionType,
  ContentElement,
  SectionVariant,
} from "./types";

// Simple ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// ヘルパー関数
// ============================================================

function createElement(
  type: ContentElement["type"],
  content: string,
  options?: Partial<ContentElement>
): ContentElement {
  return {
    id: generateId(),
    type,
    content,
    ...options,
  };
}

// ============================================================
// ファーストビュー テンプレート
// ============================================================

const FIRSTVIEW_LUXURY_SALON: SectionVariant = {
  id: "firstview-luxury-salon",
  name: "高級サロン",
  description: "エステ・美容サロン向けの上品なファーストビュー",
  targetIndustry: ["beauty", "salon", "spa"],
  elements: [
    createElement("logo", "Beauty Salon SILK", {
      style: { emphasis: ["シンプルで上品"] },
    }),
    createElement("headline", "結果にこだわる、大人女性のためのエステサロン", {
      style: { fontSize: "xlarge", fontWeight: "bold" },
    }),
    createElement("subheadline", "口コミ評価★4.8／来店実績1,000名以上", {
      decorations: ["金色グラデーションの月桂樹", "数字にハイライト"],
    }),
    createElement(
      "body",
      "丁寧なカウンセリングと確かな技術で、肌も心も整う\"本物のケア\"をご提供します。"
    ),
    createElement(
      "image",
      "落ち着いた個室空間で施術を受けている女性と、寄り添うエステティシャン",
      {
        metadata: { mood: "美容系・上品・やわらかい雰囲気" },
      }
    ),
  ],
  style: {
    backgroundColor: "#faf8f5",
    backgroundPattern: "シルク素材のテクスチャを薄く敷く",
  },
};

const FIRSTVIEW_BUSINESS_COACH: SectionVariant = {
  id: "firstview-business-coach",
  name: "ビジネスコーチ",
  description: "起業・ビジネスコーチング向けの信頼感あるFV",
  targetIndustry: ["coaching", "consulting", "business"],
  elements: [
    createElement("badge", "累計3,000名以上が受講", {
      style: { backgroundColor: "#c9a227" },
    }),
    createElement("headline", "たった90日で月商100万円を達成する起業メソッド", {
      style: { fontSize: "xlarge", fontWeight: "extrabold" },
    }),
    createElement("subheadline", "元大手企業マネージャーが教える再現性の高い方法", {}),
    createElement(
      "body",
      "副業から始めて、本業の収入を超える。そんな未来を手に入れませんか？"
    ),
    createElement("cta", "無料セミナーに申し込む", {
      style: { backgroundColor: "#e74c3c" },
    }),
    createElement("image", "スーツを着た講師がセミナーで話している様子", {
      metadata: { mood: "ビジネス・プロフェッショナル・信頼感" },
    }),
  ],
  style: {
    backgroundColor: "#1a1a2e",
  },
};

const FIRSTVIEW_HEALTH_PRODUCT: SectionVariant = {
  id: "firstview-health-product",
  name: "健康食品",
  description: "サプリメント・健康食品向けのFV",
  targetIndustry: ["health", "supplement", "food"],
  elements: [
    createElement("badge", "楽天ランキング1位", {
      style: { backgroundColor: "#e74c3c" },
    }),
    createElement("headline", "医師も推奨！1日1粒で始める腸活習慣", {
      style: { fontSize: "xlarge", fontWeight: "bold" },
    }),
    createElement("subheadline", "乳酸菌1兆個配合・無添加・国内製造", {
      decorations: ["チェックマーク付き"],
    }),
    createElement("body", "40代からの体調管理に。毎日のスッキリをサポートします。"),
    createElement("cta", "初回限定 980円でお試し", {
      style: { backgroundColor: "#27ae60" },
    }),
    createElement("image", "白いサプリメントボトルと新鮮な野菜", {
      metadata: { mood: "清潔感・健康的・明るい" },
    }),
  ],
  style: {
    backgroundColor: "#f0fff0",
  },
};

const FIRSTVIEW_ONLINE_COURSE: SectionVariant = {
  id: "firstview-online-course",
  name: "オンライン講座",
  description: "オンラインスクール・講座向けのFV",
  targetIndustry: ["education", "online", "course"],
  elements: [
    createElement("badge", "満席続出！次回募集は○月", {
      style: { backgroundColor: "#9b59b6" },
    }),
    createElement("headline", "未経験から3ヶ月でWebデザイナーになれる実践講座", {
      style: { fontSize: "xlarge", fontWeight: "bold" },
    }),
    createElement("subheadline", "卒業生の転職成功率92％・案件紹介サポート付き", {}),
    createElement(
      "body",
      "現役デザイナーがマンツーマンで指導。あなたのペースで学べます。"
    ),
    createElement("cta", "無料カウンセリングを予約", {
      style: { backgroundColor: "#3498db" },
    }),
    createElement("image", "ノートパソコンでデザインを学ぶ女性", {
      metadata: { mood: "モダン・クリエイティブ・明るい" },
    }),
  ],
  style: {
    backgroundColor: "#f5f5f5",
  },
};

export const FIRSTVIEW_TEMPLATE: SectionTemplate = {
  id: "firstview",
  type: "firstview",
  name: "ファーストビュー",
  description: "LPの最初に表示される、最も重要なセクション",
  variants: [
    FIRSTVIEW_LUXURY_SALON,
    FIRSTVIEW_BUSINESS_COACH,
    FIRSTVIEW_HEALTH_PRODUCT,
    FIRSTVIEW_ONLINE_COURSE,
  ],
  requiredElements: ["headline", "image"],
  optionalElements: ["logo", "subheadline", "body", "cta", "badge"],
  defaultElements: FIRSTVIEW_LUXURY_SALON.elements,
};

// ============================================================
// 悩み・課題提起 テンプレート
// ============================================================

const PROBLEM_QUESTION_LIST: SectionVariant = {
  id: "problem-question-list",
  name: "質問リスト形式",
  description: "「こんなお悩みありませんか？」形式",
  elements: [
    createElement("headline", "こんなお悩みありませんか？", {
      style: { fontSize: "large", textAlign: "center" },
    }),
    createElement("list", "✓ 肌荒れが治らない\n✓ 毛穴が目立つ\n✓ くすみが気になる", {
      style: { fontSize: "medium" },
    }),
    createElement("image", "悩んでいる女性のイメージ", {
      metadata: { mood: "共感・やや暗め" },
    }),
  ],
  style: {
    backgroundColor: "#f5f5f5",
  },
};

const PROBLEM_STORY_BASED: SectionVariant = {
  id: "problem-story-based",
  name: "ストーリー形式",
  description: "共感を呼ぶストーリーテリング",
  elements: [
    createElement("headline", "私も昔は同じでした...", {
      style: { fontSize: "large" },
    }),
    createElement(
      "body",
      "高額なスキンケアを試しても効果なし。エステに通っても一時的。「もう何をしても無駄」と諦めかけていました。"
    ),
    createElement("image", "過去の自分を振り返るイメージ", {}),
  ],
  style: {
    backgroundColor: "#fff5f5",
  },
};

export const PROBLEM_TEMPLATE: SectionTemplate = {
  id: "problem",
  type: "problem",
  name: "悩み・課題提起",
  description: "ターゲットの悩みを明確化し共感を生むセクション",
  variants: [PROBLEM_QUESTION_LIST, PROBLEM_STORY_BASED],
  requiredElements: ["headline"],
  optionalElements: ["list", "body", "image"],
  defaultElements: PROBLEM_QUESTION_LIST.elements,
};

// ============================================================
// 解決策提示 テンプレート
// ============================================================

const SOLUTION_PRODUCT_SHOWCASE: SectionVariant = {
  id: "solution-product-showcase",
  name: "商品紹介",
  description: "商品・サービスを魅力的に紹介",
  elements: [
    createElement("headline", "そんなあなたに、○○をご紹介します", {
      style: { fontSize: "large", textAlign: "center" },
    }),
    createElement(
      "body",
      "独自開発の○○技術により、今までにない効果を実現しました。"
    ),
    createElement("image", "商品のメインビジュアル", {
      metadata: { mood: "明るい・希望" },
    }),
    createElement(
      "list",
      "• 特徴1：○○\n• 特徴2：○○\n• 特徴3：○○",
      {}
    ),
  ],
  style: {
    backgroundColor: "#ffffff",
  },
};

export const SOLUTION_TEMPLATE: SectionTemplate = {
  id: "solution",
  type: "solution",
  name: "解決策提示",
  description: "悩みに対する解決策を提示するセクション",
  variants: [SOLUTION_PRODUCT_SHOWCASE],
  requiredElements: ["headline", "body"],
  optionalElements: ["image", "list"],
  defaultElements: SOLUTION_PRODUCT_SHOWCASE.elements,
};

// ============================================================
// ベネフィット テンプレート
// ============================================================

const BENEFIT_THREE_POINTS: SectionVariant = {
  id: "benefit-three-points",
  name: "3つのメリット",
  description: "ベネフィットを3つに絞って紹介",
  elements: [
    createElement("headline", "選ばれる3つの理由", {
      style: { fontSize: "large", textAlign: "center" },
    }),
    createElement("number", "01", { style: { fontSize: "xlarge" } }),
    createElement("subheadline", "結果にコミットする技術力", {}),
    createElement("body", "10年以上の経験を持つスタッフが担当。", {}),
    createElement("number", "02", { style: { fontSize: "xlarge" } }),
    createElement("subheadline", "完全個室のプライベート空間", {}),
    createElement("body", "他のお客様を気にせずリラックスできます。", {}),
    createElement("number", "03", { style: { fontSize: "xlarge" } }),
    createElement("subheadline", "通いやすい価格設定", {}),
    createElement("body", "長く続けられる適正価格でご提供。", {}),
  ],
  style: {
    backgroundColor: "#f8f8f8",
  },
};

export const BENEFIT_TEMPLATE: SectionTemplate = {
  id: "benefit",
  type: "benefit",
  name: "ベネフィット",
  description: "商品・サービスのメリットを伝えるセクション",
  variants: [BENEFIT_THREE_POINTS],
  requiredElements: ["headline"],
  optionalElements: ["subheadline", "body", "number", "image", "list"],
  defaultElements: BENEFIT_THREE_POINTS.elements,
};

// ============================================================
// 実績・信頼 テンプレート
// ============================================================

const PROOF_TESTIMONIALS: SectionVariant = {
  id: "proof-testimonials",
  name: "お客様の声",
  description: "実際のお客様の声を掲載",
  elements: [
    createElement("headline", "お客様の声", {
      style: { fontSize: "large", textAlign: "center" },
    }),
    createElement(
      "testimonial",
      "「こんなに効果があるとは思いませんでした！」40代女性 A様",
      {}
    ),
    createElement(
      "testimonial",
      "「スタッフの対応がとても丁寧で安心しました」30代女性 B様",
      {}
    ),
    createElement(
      "testimonial",
      "「通い始めて3ヶ月で肌質が変わりました」50代女性 C様",
      {}
    ),
  ],
  style: {
    backgroundColor: "#fff8e7",
  },
};

const PROOF_NUMBERS: SectionVariant = {
  id: "proof-numbers",
  name: "数字で見る実績",
  description: "実績を数字で訴求",
  elements: [
    createElement("headline", "数字で見る実績", {
      style: { fontSize: "large", textAlign: "center" },
    }),
    createElement("number", "10,000+", {
      style: { fontSize: "xlarge" },
      metadata: { label: "来店実績" },
    }),
    createElement("number", "98%", {
      style: { fontSize: "xlarge" },
      metadata: { label: "満足度" },
    }),
    createElement("number", "15年", {
      style: { fontSize: "xlarge" },
      metadata: { label: "運営実績" },
    }),
  ],
  style: {
    backgroundColor: "#1a1a2e",
  },
};

export const PROOF_TEMPLATE: SectionTemplate = {
  id: "proof",
  type: "proof",
  name: "実績・信頼",
  description: "社会的証明で信頼を獲得するセクション",
  variants: [PROOF_TESTIMONIALS, PROOF_NUMBERS],
  requiredElements: ["headline"],
  optionalElements: ["testimonial", "number", "image", "badge"],
  defaultElements: PROOF_TESTIMONIALS.elements,
};

// ============================================================
// CTA テンプレート
// ============================================================

const CTA_SIMPLE: SectionVariant = {
  id: "cta-simple",
  name: "シンプルCTA",
  description: "シンプルで分かりやすいCTA",
  elements: [
    createElement("headline", "今すぐお申し込みください", {
      style: { fontSize: "large", textAlign: "center" },
    }),
    createElement("cta", "無料カウンセリングを予約する", {
      style: { backgroundColor: "#e74c3c", fontSize: "large" },
    }),
    createElement("body", "※ 24時間いつでもお申し込みいただけます", {
      style: { fontSize: "small", textAlign: "center" },
    }),
  ],
  style: {
    backgroundColor: "#ffffff",
  },
};

const CTA_URGENCY: SectionVariant = {
  id: "cta-urgency",
  name: "緊急性CTA",
  description: "緊急性・限定感を演出するCTA",
  elements: [
    createElement("badge", "期間限定！残り3名様", {
      style: { backgroundColor: "#e74c3c" },
    }),
    createElement("headline", "今だけの特別価格", {
      style: { fontSize: "large", textAlign: "center" },
    }),
    createElement("price", "通常価格 ¥30,000 → 特別価格 ¥9,800", {
      style: { fontSize: "xlarge" },
      decorations: ["取り消し線", "赤字強調"],
    }),
    createElement("cta", "今すぐ申し込む", {
      style: { backgroundColor: "#e74c3c", fontSize: "large" },
    }),
    createElement("countdown", "キャンペーン終了まで", {}),
  ],
  style: {
    backgroundColor: "#fff5f5",
  },
};

export const CTA_TEMPLATE: SectionTemplate = {
  id: "cta",
  type: "cta",
  name: "CTA",
  description: "行動を促すセクション",
  variants: [CTA_SIMPLE, CTA_URGENCY],
  requiredElements: ["cta"],
  optionalElements: ["headline", "body", "badge", "price", "countdown", "guarantee"],
  defaultElements: CTA_SIMPLE.elements,
};

// ============================================================
// FAQ テンプレート
// ============================================================

const FAQ_ACCORDION: SectionVariant = {
  id: "faq-accordion",
  name: "アコーディオン形式",
  description: "よくある質問をアコーディオンで表示",
  elements: [
    createElement("headline", "よくあるご質問", {
      style: { fontSize: "large", textAlign: "center" },
    }),
    createElement("faq", "Q. 予約は必要ですか？\nA. はい、完全予約制です。", {}),
    createElement("faq", "Q. 駐車場はありますか？\nA. 提携駐車場がございます。", {}),
    createElement("faq", "Q. キャンセル料はかかりますか？\nA. 前日までのご連絡で無料です。", {}),
  ],
  style: {
    backgroundColor: "#f8f8f8",
  },
};

export const FAQ_TEMPLATE: SectionTemplate = {
  id: "faq",
  type: "faq",
  name: "よくある質問",
  description: "FAQ形式で疑問を解消するセクション",
  variants: [FAQ_ACCORDION],
  requiredElements: ["headline", "faq"],
  optionalElements: [],
  defaultElements: FAQ_ACCORDION.elements,
};

// ============================================================
// テンプレート一覧
// ============================================================

export const SECTION_TEMPLATES: SectionTemplate[] = [
  FIRSTVIEW_TEMPLATE,
  PROBLEM_TEMPLATE,
  SOLUTION_TEMPLATE,
  BENEFIT_TEMPLATE,
  PROOF_TEMPLATE,
  CTA_TEMPLATE,
  FAQ_TEMPLATE,
];

// ============================================================
// ヘルパー関数
// ============================================================

export function getSectionTemplate(type: SectionType): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find((t) => t.type === type);
}

export function getVariant(
  templateId: string,
  variantId: string
): SectionVariant | undefined {
  const template = SECTION_TEMPLATES.find((t) => t.id === templateId);
  return template?.variants.find((v) => v.id === variantId);
}

export function getTemplatesByIndustry(industry: string): SectionTemplate[] {
  return SECTION_TEMPLATES.filter((template) =>
    template.variants.some((v) => v.targetIndustry?.includes(industry))
  );
}
