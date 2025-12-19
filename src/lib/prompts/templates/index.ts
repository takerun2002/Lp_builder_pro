/**
 * プロンプトテンプレートモジュール
 *
 * セクション別のプロンプトテンプレートを管理
 * YAML形式で定義されたテンプレートを読み込み・提供
 */

import yaml from "js-yaml";

/**
 * プロンプトテンプレート型定義
 */
export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  format: "text" | "yaml" | "json";
  globalRulesTemplate: string;
  elementTemplates: Record<string, { template: string }>;
  styleModifiers: Record<string, string[]>;
  customizableFields?: string[];
}

/**
 * テンプレートカテゴリ
 */
export type TemplateCategory =
  | "firstview"
  | "problem"
  | "solution"
  | "benefit"
  | "proof"
  | "cta";

/**
 * 組み込みテンプレート定義
 * Note: Next.js環境ではYAMLファイルの動的読み込みが制限されるため、
 * テンプレートはハードコードとして定義
 */
const BUILTIN_TEMPLATES: PromptTemplate[] = [
  {
    id: "firstview_standard",
    name: "ファーストビュー - スタンダード",
    category: "firstview",
    format: "yaml",
    globalRulesTemplate: `#ルール
以下を画像にそのまま描画する
サイズは{{aspectRatio}}
{{sectionName}}セクション
背景には{{backgroundStyle}}
全体のトーンは{{tone}}`,
    elementTemplates: {
      headline: {
        template: `| タイトル（メインキャッチ）：
{{content}}
フォント: {{fontSize}}px、{{fontWeight}}、{{fontColor}}`,
      },
      subheadline: {
        template: `| サブタイトル：
{{content}}
フォント: {{fontSize}}px`,
      },
      logo: {
        template: `| ロゴ：
{{content}}
配置: {{position}}`,
      },
      heroImage: {
        template: `| メイン画像：
{{content}}
サイズ: {{width}} x {{height}}`,
      },
      cta: {
        template: `| CTAボタン：
{{content}}
色: {{buttonColor}}、形状: {{buttonShape}}`,
      },
    },
    styleModifiers: {
      luxury: [
        "金色のグラデーション",
        "シルクのテクスチャ",
        "上品で洗練された雰囲気",
        "セリフ体フォント",
      ],
      casual: [
        "明るくポップな色使い",
        "手書き風フォント",
        "親しみやすい雰囲気",
      ],
      professional: [
        "クリーンなレイアウト",
        "ビジネスブルー基調",
        "信頼感のあるデザイン",
      ],
    },
  },
  {
    id: "problem_standard",
    name: "悩み・課題 - スタンダード",
    category: "problem",
    format: "yaml",
    globalRulesTemplate: `#ルール
以下を画像にそのまま描画する
サイズは{{aspectRatio}}
{{sectionName}}セクション（悩み・課題提起）
背景は{{backgroundStyle}}
読者の共感を得るデザイン`,
    elementTemplates: {
      sectionTitle: {
        template: `| セクションタイトル：
{{content}}
強調デザイン、フォント: {{fontSize}}px`,
      },
      painPoint: {
        template: `| 悩みポイント：
{{content}}
アイコン: {{icon}}
レイアウト: {{layout}}`,
      },
      illustration: {
        template: `| イラスト/画像：
{{content}}
悩んでいる表情、感情を表現`,
      },
      empathyText: {
        template: `| 共感テキスト：
{{content}}
読者に寄り添う表現`,
      },
    },
    styleModifiers: {
      dramatic: [
        "ダークな背景",
        "赤やオレンジのアクセント",
        "感情に訴えかけるビジュアル",
      ],
      gentle: ["柔らかい色調", "やさしいイラスト", "寄り添う雰囲気"],
      realistic: [
        "実際の写真ベース",
        "リアルな表現",
        "具体的なシチュエーション",
      ],
    },
  },
  {
    id: "solution_standard",
    name: "解決策 - スタンダード",
    category: "solution",
    format: "yaml",
    globalRulesTemplate: `#ルール
以下を画像にそのまま描画する
サイズは{{aspectRatio}}
{{sectionName}}セクション（解決策の提示）
背景は{{backgroundStyle}}
希望を感じさせるデザイン`,
    elementTemplates: {
      sectionTitle: {
        template: `| セクションタイトル：
{{content}}
期待感を持たせるデザイン`,
      },
      productImage: {
        template: `| 商品/サービス画像：
{{content}}
魅力的に見える角度、ライティング`,
      },
      featureList: {
        template: `| 特徴リスト：
{{features}}
チェックマークアイコン付き`,
      },
      transitionText: {
        template: `| 転換テキスト：
{{content}}
「でも、そんなあなたに朗報です」的な表現`,
      },
    },
    styleModifiers: {
      bright: ["明るく希望に満ちた色使い", "光のエフェクト", "ポジティブな印象"],
      trustworthy: [
        "落ち着いた色調",
        "信頼感のあるデザイン",
        "プロフェッショナルな印象",
      ],
      innovative: ["先進的なデザイン", "テクノロジー感", "モダンな表現"],
    },
  },
  {
    id: "benefit_standard",
    name: "ベネフィット - スタンダード",
    category: "benefit",
    format: "yaml",
    globalRulesTemplate: `#ルール
以下を画像にそのまま描画する
サイズは{{aspectRatio}}
{{sectionName}}セクション（メリット・ベネフィット）
背景は{{backgroundStyle}}
得られる未来をビジュアル化`,
    elementTemplates: {
      sectionTitle: {
        template: `| セクションタイトル：
{{content}}
「あなたが得られる3つのメリット」的な表現`,
      },
      benefitCard: {
        template: `| ベネフィットカード：
番号: {{number}}
タイトル: {{title}}
説明: {{description}}
アイコン: {{icon}}`,
      },
      beforeAfter: {
        template: `| ビフォーアフター：
Before: {{before}}
After: {{after}}
矢印でつなぐ`,
      },
      futureImage: {
        template: `| 未来のイメージ：
{{content}}
理想の状態を視覚的に表現`,
      },
    },
    styleModifiers: {
      aspirational: ["理想の未来を表現", "輝く表情", "成功イメージ"],
      practical: ["具体的な数値", "グラフやチャート", "実用的な印象"],
      emotional: ["感情に訴える", "幸せな家族や笑顔", "心温まるビジュアル"],
    },
  },
  {
    id: "proof_standard",
    name: "実績・信頼 - スタンダード",
    category: "proof",
    format: "yaml",
    globalRulesTemplate: `#ルール
以下を画像にそのまま描画する
サイズは{{aspectRatio}}
{{sectionName}}セクション（社会的証明・実績）
背景は{{backgroundStyle}}
信頼性を高めるデザイン`,
    elementTemplates: {
      sectionTitle: {
        template: `| セクションタイトル：
{{content}}
「選ばれる理由」「お客様の声」的な表現`,
      },
      testimonial: {
        template: `| お客様の声：
名前: {{name}}（{{age}}歳・{{occupation}}）
コメント: {{comment}}
評価: {{rating}}つ星
写真: {{photo}}`,
      },
      statistics: {
        template: `| 実績数値：
{{number}}{{unit}}
ラベル: {{label}}
大きく目立つ数字`,
      },
      mediaLogos: {
        template: `| メディア掲載：
「〇〇で紹介されました」
ロゴ一覧: {{logos}}`,
      },
      certification: {
        template: `| 認証・資格：
{{content}}
バッジやシール形式`,
      },
    },
    styleModifiers: {
      authoritative: ["権威的なデザイン", "実績を強調", "信頼性重視"],
      friendly: [
        "親しみやすい口コミ風",
        "リアルな写真",
        "共感しやすいデザイン",
      ],
      "data-driven": ["数値を前面に", "グラフやチャート", "客観的なデータ"],
    },
  },
  {
    id: "cta_standard",
    name: "CTA - スタンダード",
    category: "cta",
    format: "yaml",
    globalRulesTemplate: `#ルール
以下を画像にそのまま描画する
サイズは{{aspectRatio}}
{{sectionName}}セクション（行動喚起・CTA）
背景は{{backgroundStyle}}
今すぐ行動したくなるデザイン`,
    elementTemplates: {
      headline: {
        template: `| CTAヘッドライン：
{{content}}
緊急性や限定感を表現`,
      },
      offerBox: {
        template: `| オファーボックス：
価格: {{price}}円
定価: {{originalPrice}}円（{{discount}}%OFF）
特典: {{bonuses}}
枠で囲む、目立つデザイン`,
      },
      ctaButton: {
        template: `| CTAボタン：
テキスト: {{buttonText}}
色: {{buttonColor}}
サイズ: 大きく目立つ
アニメーション示唆: {{animation}}`,
      },
      urgency: {
        template: `| 緊急性要素：
{{content}}
カウントダウン、残数表示など`,
      },
      guarantee: {
        template: `| 保証バッジ：
{{content}}
返金保証、安心マーク`,
      },
    },
    styleModifiers: {
      urgent: [
        "赤やオレンジの強調色",
        "カウントダウン風",
        "「今すぐ」感を演出",
      ],
      premium: ["高級感のあるデザイン", "ゴールドアクセント", "VIP感の演出"],
      safe: ["安心感を重視", "保証マーク強調", "信頼できる印象"],
    },
  },
];

/**
 * カスタムテンプレートのストレージキー
 */
const CUSTOM_TEMPLATES_KEY = "lp-builder-custom-templates";

/**
 * カスタムテンプレートを取得
 */
export function getCustomTemplates(): PromptTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * カスタムテンプレートを保存
 */
export function saveCustomTemplate(template: PromptTemplate): void {
  if (typeof window === "undefined") return;

  const templates = getCustomTemplates();
  const existingIndex = templates.findIndex((t) => t.id === template.id);

  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
  }

  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

/**
 * カスタムテンプレートを削除
 */
export function deleteCustomTemplate(templateId: string): void {
  if (typeof window === "undefined") return;

  const templates = getCustomTemplates().filter((t) => t.id !== templateId);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

/**
 * 全テンプレートを取得（組み込み + カスタム）
 */
export function getAllTemplates(): PromptTemplate[] {
  return [...BUILTIN_TEMPLATES, ...getCustomTemplates()];
}

/**
 * カテゴリ別テンプレートを取得
 */
export function getTemplatesByCategory(
  category: TemplateCategory
): PromptTemplate[] {
  return getAllTemplates().filter((t) => t.category === category);
}

/**
 * IDでテンプレートを取得
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return getAllTemplates().find((t) => t.id === id);
}

/**
 * テンプレート変数を置換
 */
export function applyTemplateVariables(
  template: string,
  variables: Record<string, string | string[]>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;

    if (Array.isArray(value)) {
      result = result.replace(placeholder, value.join("\n"));
    } else {
      result = result.replace(new RegExp(placeholder, "g"), value);
    }
  }

  return result;
}

/**
 * YAMLからテンプレートをパース
 */
export function parseTemplateYaml(yamlContent: string): PromptTemplate {
  const parsed = yaml.load(yamlContent) as PromptTemplate;

  if (!parsed.id || !parsed.name || !parsed.category) {
    throw new Error("Invalid template: missing required fields");
  }

  return parsed;
}

/**
 * テンプレートをYAMLにエクスポート
 */
export function exportTemplateToYaml(template: PromptTemplate): string {
  return yaml.dump(template, {
    lineWidth: -1,
    noRefs: true,
  });
}

export { BUILTIN_TEMPLATES };
