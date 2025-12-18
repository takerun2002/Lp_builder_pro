/**
 * LP構成テンプレート
 *
 * 業種・目的別のLP構成テンプレート
 */

import type { SectionPlan, GlobalDesignRules } from "./types";
import { DEFAULT_GLOBAL_RULES } from "./types";

export interface StructureTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  industry?: string;
  sections: SectionPlan[];
  globalRules: GlobalDesignRules;
  thumbnail?: string;
  popularity?: number;
}

export type TemplateCategory =
  | "basic"      // 基本構成
  | "sales"      // セールス重視
  | "lead"       // リード獲得
  | "brand"      // ブランディング
  | "event"      // イベント・セミナー
  | "product";   // 商品紹介

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, string> = {
  basic: "基本構成",
  sales: "セールス重視",
  lead: "リード獲得",
  brand: "ブランディング",
  event: "イベント・セミナー",
  product: "商品紹介",
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 基本テンプレート: シンプル5セクション
const basicSimple: StructureTemplate = {
  id: "basic-simple",
  name: "シンプル5セクション",
  description: "最小限の構成でシンプルに訴求",
  category: "basic",
  popularity: 100,
  sections: [
    {
      id: generateId(),
      type: "firstview",
      name: "ファーストビュー",
      order: 0,
      purpose: "第一印象で興味を引く",
      elements: [
        { id: generateId(), type: "headline", content: "メインキャッチコピー" },
        { id: generateId(), type: "subheadline", content: "サブコピー" },
        { id: generateId(), type: "image", content: "メインビジュアル" },
        { id: generateId(), type: "cta", content: "今すぐ申し込む" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "problem",
      name: "悩み・課題",
      order: 1,
      purpose: "ターゲットの悩みに共感",
      elements: [
        { id: generateId(), type: "headline", content: "こんなお悩みありませんか？" },
        { id: generateId(), type: "list", content: "悩みリスト" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "solution",
      name: "解決策",
      order: 2,
      purpose: "解決方法を提示",
      elements: [
        { id: generateId(), type: "headline", content: "解決策の提示" },
        { id: generateId(), type: "body", content: "サービス説明" },
        { id: generateId(), type: "image", content: "商品画像" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "benefit",
      name: "ベネフィット",
      order: 3,
      purpose: "得られるメリット",
      elements: [
        { id: generateId(), type: "headline", content: "選ばれる3つの理由" },
        { id: generateId(), type: "list", content: "ベネフィットリスト" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "cta",
      name: "CTA",
      order: 4,
      purpose: "行動を促す",
      elements: [
        { id: generateId(), type: "headline", content: "今すぐお申し込みください" },
        { id: generateId(), type: "cta", content: "無料で始める" },
      ],
      estimatedHeight: "short",
      isRequired: true,
    },
  ],
  globalRules: DEFAULT_GLOBAL_RULES,
};

// セールス重視: PASONA法則
const salesPasona: StructureTemplate = {
  id: "sales-pasona",
  name: "PASONA法則",
  description: "Problem→Agitation→Solution→Offer→Narrowdown→Action",
  category: "sales",
  popularity: 95,
  sections: [
    {
      id: generateId(),
      type: "firstview",
      name: "ファーストビュー",
      order: 0,
      purpose: "強烈なフックで注目を集める",
      elements: [
        { id: generateId(), type: "headline", content: "衝撃的なキャッチコピー" },
        { id: generateId(), type: "image", content: "インパクトのあるビジュアル" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "problem",
      name: "Problem（問題提起）",
      order: 1,
      purpose: "ターゲットの問題を明確化",
      elements: [
        { id: generateId(), type: "headline", content: "あなたはこんな問題を抱えていませんか？" },
        { id: generateId(), type: "list", content: "問題リスト" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "agitation",
      name: "Agitation（煽り）",
      order: 2,
      purpose: "問題を放置するリスクを強調",
      elements: [
        { id: generateId(), type: "headline", content: "このまま放置すると..." },
        { id: generateId(), type: "body", content: "リスクの説明" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "solution",
      name: "Solution（解決策）",
      order: 3,
      purpose: "商品・サービスによる解決を提示",
      elements: [
        { id: generateId(), type: "headline", content: "そこで開発されたのが..." },
        { id: generateId(), type: "image", content: "商品画像" },
        { id: generateId(), type: "body", content: "解決策の説明" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "benefit",
      name: "Offer（オファー）",
      order: 4,
      purpose: "具体的なオファー内容",
      elements: [
        { id: generateId(), type: "headline", content: "今なら特別オファー" },
        { id: generateId(), type: "list", content: "オファー内容リスト" },
        { id: generateId(), type: "badge", content: "期間限定" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "proof",
      name: "Narrowdown（絞込み）",
      order: 5,
      purpose: "限定性・希少性で行動を促す",
      elements: [
        { id: generateId(), type: "headline", content: "なぜ今すぐ行動すべきなのか" },
        { id: generateId(), type: "number", content: "残り◯名" },
        { id: generateId(), type: "body", content: "締め切り説明" },
      ],
      estimatedHeight: "short",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "cta",
      name: "Action（行動）",
      order: 6,
      purpose: "最終的な行動喚起",
      elements: [
        { id: generateId(), type: "headline", content: "今すぐお申し込みください" },
        { id: generateId(), type: "cta", content: "今すぐ申し込む" },
        { id: generateId(), type: "body", content: "リスクリバーサル（返金保証など）" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
  ],
  globalRules: {
    ...DEFAULT_GLOBAL_RULES,
    colorScheme: { ...DEFAULT_GLOBAL_RULES.colorScheme, type: "vibrant" },
    overallMood: "緊急感・限定感",
  },
};

// リード獲得: 無料オファー型
const leadFreeOffer: StructureTemplate = {
  id: "lead-free-offer",
  name: "無料オファー型",
  description: "無料コンテンツでリードを獲得",
  category: "lead",
  popularity: 90,
  sections: [
    {
      id: generateId(),
      type: "firstview",
      name: "ファーストビュー",
      order: 0,
      purpose: "無料オファーの価値を訴求",
      elements: [
        { id: generateId(), type: "badge", content: "完全無料" },
        { id: generateId(), type: "headline", content: "〇〇が手に入る無料レポート" },
        { id: generateId(), type: "image", content: "レポート画像" },
        { id: generateId(), type: "cta", content: "無料でダウンロード" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "benefit",
      name: "得られること",
      order: 1,
      purpose: "無料オファーの内容を説明",
      elements: [
        { id: generateId(), type: "headline", content: "このレポートで分かること" },
        { id: generateId(), type: "list", content: "内容リスト" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "proof",
      name: "実績・信頼",
      order: 2,
      purpose: "提供者の信頼性を示す",
      elements: [
        { id: generateId(), type: "headline", content: "なぜ私たちが提供するのか" },
        { id: generateId(), type: "number", content: "実績数字" },
        { id: generateId(), type: "body", content: "提供者プロフィール" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "testimonial",
      name: "お客様の声",
      order: 3,
      purpose: "社会的証明",
      elements: [
        { id: generateId(), type: "headline", content: "受け取った方の声" },
        { id: generateId(), type: "testimonial", content: "お客様の声" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "cta",
      name: "フォーム",
      order: 4,
      purpose: "メールアドレス取得",
      elements: [
        { id: generateId(), type: "headline", content: "今すぐ無料で受け取る" },
        { id: generateId(), type: "body", content: "メールアドレスを入力してください" },
        { id: generateId(), type: "cta", content: "無料でダウンロード" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
  ],
  globalRules: {
    ...DEFAULT_GLOBAL_RULES,
    colorScheme: { ...DEFAULT_GLOBAL_RULES.colorScheme, type: "corporate" },
    overallMood: "信頼感・専門性",
  },
};

// イベント・セミナー
const eventSeminar: StructureTemplate = {
  id: "event-seminar",
  name: "セミナー集客",
  description: "セミナー・ウェビナーへの集客LP",
  category: "event",
  industry: "教育・講座",
  popularity: 85,
  sections: [
    {
      id: generateId(),
      type: "firstview",
      name: "ファーストビュー",
      order: 0,
      purpose: "セミナーの価値を訴求",
      elements: [
        { id: generateId(), type: "badge", content: "参加無料" },
        { id: generateId(), type: "headline", content: "セミナータイトル" },
        { id: generateId(), type: "subheadline", content: "開催日時・場所" },
        { id: generateId(), type: "cta", content: "今すぐ席を確保する" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "problem",
      name: "こんな方におすすめ",
      order: 1,
      purpose: "ターゲットを明確化",
      elements: [
        { id: generateId(), type: "headline", content: "こんな方におすすめです" },
        { id: generateId(), type: "list", content: "対象者リスト" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "benefit",
      name: "セミナー内容",
      order: 2,
      purpose: "セミナーで得られることを説明",
      elements: [
        { id: generateId(), type: "headline", content: "セミナーで学べること" },
        { id: generateId(), type: "list", content: "内容リスト" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "proof",
      name: "講師紹介",
      order: 3,
      purpose: "講師の信頼性を示す",
      elements: [
        { id: generateId(), type: "headline", content: "講師紹介" },
        { id: generateId(), type: "image", content: "講師写真" },
        { id: generateId(), type: "body", content: "講師プロフィール" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "testimonial",
      name: "参加者の声",
      order: 4,
      purpose: "過去参加者の声",
      elements: [
        { id: generateId(), type: "headline", content: "参加者の声" },
        { id: generateId(), type: "testimonial", content: "参加者の声" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "faq",
      name: "よくある質問",
      order: 5,
      purpose: "疑問を解消",
      elements: [
        { id: generateId(), type: "headline", content: "よくある質問" },
        { id: generateId(), type: "list", content: "FAQ" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "cta",
      name: "申込フォーム",
      order: 6,
      purpose: "申込を促す",
      elements: [
        { id: generateId(), type: "headline", content: "今すぐお申し込みください" },
        { id: generateId(), type: "body", content: "開催概要" },
        { id: generateId(), type: "cta", content: "参加を申し込む" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
  ],
  globalRules: {
    ...DEFAULT_GLOBAL_RULES,
    colorScheme: { ...DEFAULT_GLOBAL_RULES.colorScheme, type: "corporate" },
    overallMood: "信頼感・学びの期待",
  },
};

// 商品紹介: EC向け
const productEC: StructureTemplate = {
  id: "product-ec",
  name: "EC商品紹介",
  description: "物販・EC向けの商品紹介LP",
  category: "product",
  popularity: 88,
  sections: [
    {
      id: generateId(),
      type: "firstview",
      name: "ファーストビュー",
      order: 0,
      purpose: "商品の魅力を一目で伝える",
      elements: [
        { id: generateId(), type: "image", content: "商品画像" },
        { id: generateId(), type: "headline", content: "商品名・キャッチコピー" },
        { id: generateId(), type: "badge", content: "人気No.1" },
        { id: generateId(), type: "cta", content: "今すぐ購入" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "benefit",
      name: "商品の特徴",
      order: 1,
      purpose: "商品の魅力を説明",
      elements: [
        { id: generateId(), type: "headline", content: "3つの特徴" },
        { id: generateId(), type: "list", content: "特徴リスト" },
        { id: generateId(), type: "image", content: "詳細画像" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "proof",
      name: "実績・受賞歴",
      order: 2,
      purpose: "信頼性を証明",
      elements: [
        { id: generateId(), type: "headline", content: "多くの方に選ばれています" },
        { id: generateId(), type: "number", content: "販売実績" },
        { id: generateId(), type: "badge", content: "受賞歴" },
      ],
      estimatedHeight: "short",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "testimonial",
      name: "お客様レビュー",
      order: 3,
      purpose: "購入者の声",
      elements: [
        { id: generateId(), type: "headline", content: "お客様の声" },
        { id: generateId(), type: "testimonial", content: "レビュー" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "solution",
      name: "使い方",
      order: 4,
      purpose: "使用方法を説明",
      elements: [
        { id: generateId(), type: "headline", content: "使い方は簡単" },
        { id: generateId(), type: "list", content: "使用手順" },
        { id: generateId(), type: "image", content: "使用イメージ" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "price",
      name: "価格・購入",
      order: 5,
      purpose: "価格と購入ボタン",
      elements: [
        { id: generateId(), type: "headline", content: "価格" },
        { id: generateId(), type: "number", content: "価格表示" },
        { id: generateId(), type: "badge", content: "送料無料" },
        { id: generateId(), type: "cta", content: "カートに入れる" },
      ],
      estimatedHeight: "medium",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "faq",
      name: "よくある質問",
      order: 6,
      purpose: "購入前の疑問解消",
      elements: [
        { id: generateId(), type: "headline", content: "よくある質問" },
        { id: generateId(), type: "list", content: "FAQ" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
  ],
  globalRules: {
    ...DEFAULT_GLOBAL_RULES,
    colorScheme: { ...DEFAULT_GLOBAL_RULES.colorScheme, type: "warm" },
    overallMood: "親しみやすさ・信頼感",
  },
};

// ブランディング: 高級感
const brandLuxury: StructureTemplate = {
  id: "brand-luxury",
  name: "高級ブランド",
  description: "高級感・プレミアム感を演出",
  category: "brand",
  popularity: 75,
  sections: [
    {
      id: generateId(),
      type: "firstview",
      name: "ファーストビュー",
      order: 0,
      purpose: "高級感のある第一印象",
      elements: [
        { id: generateId(), type: "image", content: "フルスクリーンビジュアル" },
        { id: generateId(), type: "headline", content: "ブランドメッセージ" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "benefit",
      name: "ブランドストーリー",
      order: 1,
      purpose: "ブランドの世界観を伝える",
      elements: [
        { id: generateId(), type: "headline", content: "ブランドストーリー" },
        { id: generateId(), type: "body", content: "歴史・哲学" },
        { id: generateId(), type: "image", content: "イメージ画像" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "solution",
      name: "コレクション",
      order: 2,
      purpose: "商品ラインナップ",
      elements: [
        { id: generateId(), type: "headline", content: "コレクション" },
        { id: generateId(), type: "image", content: "商品ギャラリー" },
      ],
      estimatedHeight: "long",
      isRequired: true,
    },
    {
      id: generateId(),
      type: "proof",
      name: "クラフトマンシップ",
      order: 3,
      purpose: "品質・こだわりを伝える",
      elements: [
        { id: generateId(), type: "headline", content: "クラフトマンシップ" },
        { id: generateId(), type: "body", content: "製造工程・こだわり" },
        { id: generateId(), type: "image", content: "製造イメージ" },
      ],
      estimatedHeight: "medium",
      isRequired: false,
    },
    {
      id: generateId(),
      type: "cta",
      name: "コンタクト",
      order: 4,
      purpose: "お問い合わせへ誘導",
      elements: [
        { id: generateId(), type: "headline", content: "お問い合わせ" },
        { id: generateId(), type: "cta", content: "コンタクト" },
      ],
      estimatedHeight: "short",
      isRequired: true,
    },
  ],
  globalRules: {
    ...DEFAULT_GLOBAL_RULES,
    colorScheme: { ...DEFAULT_GLOBAL_RULES.colorScheme, type: "luxury" },
    overallMood: "高級感・上質",
  },
};

// 全テンプレート
export const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  basicSimple,
  salesPasona,
  leadFreeOffer,
  eventSeminar,
  productEC,
  brandLuxury,
];

// カテゴリ別取得
export function getTemplatesByCategory(category: TemplateCategory): StructureTemplate[] {
  return STRUCTURE_TEMPLATES.filter((t) => t.category === category);
}

// ID検索
export function getTemplateById(id: string): StructureTemplate | undefined {
  return STRUCTURE_TEMPLATES.find((t) => t.id === id);
}

// 人気順取得
export function getPopularTemplates(limit = 3): StructureTemplate[] {
  return [...STRUCTURE_TEMPLATES]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, limit);
}
