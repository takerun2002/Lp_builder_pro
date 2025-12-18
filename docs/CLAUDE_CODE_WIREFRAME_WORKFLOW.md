# Claude Code 指示書: ワイヤーフレーム＆段階的プロンプト生成機能

## 概要

デザインスクールで実績のあるLP制作ワークフローを取り入れ、
初心者でも精度高くスピーディにLPを制作できるツールに進化させる。

**⚠️ 重要設計方針: 自由度の確保**

このツールは以下の2種類のユーザーに対応する必要がある：

| ユーザータイプ | ニーズ | 対応方針 |
|--------------|--------|----------|
| **初心者** | ガイドに沿って進めたい | ステップバイステップのウィザード |
| **中上級者** | 自分のやり方で自由に | どこからでも開始、スキップ可能 |

### 設計原則

1. **モジュール化**: 各ステップは独立して機能する
2. **任意のエントリーポイント**: どのステップからでも開始可能
3. **スキップ可能**: 不要なステップは飛ばせる
4. **外部インポート対応**: クライアントから原稿が来ている場合など

## 参考: 実績あるワークフロー

```
01. LPの構成を作成（スキップ可能：すでに構成がある場合）
    ↓
02. ワイヤーを作成（スキップ可能：ラフがある場合）
    ↓
03. デザイン
    ↓
04. 実装
```

### セクション単位のプロンプト作成手法

1. **全体の共通ルールを設定**
2. **各コンテンツのテキストやデザインの指示**
3. **セクションごとに繰り返す**

---

## 実装要件

### 0. ワークフロー自由度の設計（最重要）

#### 0.1 エントリーポイントの柔軟性

ユーザーの状況に応じて、どこからでも開始できる：

```
┌─────────────────────────────────────────────────────────────┐
│ プロジェクト開始                                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 「何から始めますか？」                                       │
│                                                               │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ 🔍 リサーチ  │ │ 📝 原稿から  │ │ 📐 構成から  │          │
│ │   から       │ │              │ │              │          │
│ │              │ │ クライアント │ │ 構成・構想が │          │
│ │ ゼロから     │ │ から原稿を   │ │ すでにある   │          │
│ │ 調査したい   │ │ もらった     │ │              │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                               │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ 🖼️ ワイヤー │ │ ✏️ プロンプト│ │ 🎨 自由編集  │          │
│ │   から       │ │   から       │ │              │          │
│ │              │ │              │ │ ワークスペース│          │
│ │ ラフ・参考が │ │ プロンプトを │ │ で直接作業   │          │
│ │ すでにある   │ │ 直接書く     │ │              │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 0.2 各ステップの独立性

```typescript
// 各ステップは他のステップに依存しない
interface WorkflowStep {
  id: "research" | "manuscript" | "structure" | "wireframe" | "prompt" | "design";
  
  // 入力ソース（複数選択可能）
  inputSources: {
    fromPreviousStep?: boolean;    // 前のステップから
    fromImport?: boolean;          // 外部インポート
    fromScratch?: boolean;         // ゼロから作成
    fromTemplate?: boolean;        // テンプレートから
    fromSwipeFile?: boolean;       // スワイプファイルから
  };
  
  // このステップはスキップ可能か
  skippable: boolean;
  
  // 出力（次のステップへ渡すか、直接エクスポートか選択可能）
  outputOptions: {
    toNextStep: boolean;
    toExport: boolean;
    saveAsTemplate: boolean;
  };
}
```

#### 0.3 ユーザーモード切り替え

```typescript
type UserMode = "guided" | "expert";

// ガイドモード: 初心者向け、ステップバイステップ
// エキスパートモード: 全機能にアクセス可能、自由に操作
```

**UI設計**:
```
┌─────────────────────────────────────────────────────────────┐
│ [ガイドモード ○ ● エキスパートモード]                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ガイドモード時:                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ステップ 1/5: リサーチ                                │   │
│ │ [←戻る]  [スキップ→]  [次へ→]                        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ エキスパートモード時:                                        │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ [リサーチ] [原稿] [構成] [ワイヤー] [プロンプト] [生成] │   │
│ │                                                        │   │
│ │ ← どのタブにも自由にジャンプ可能                      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 0.4 外部インポート対応

```typescript
interface ImportCapability {
  // 原稿インポート
  manuscript: {
    formats: ["text", "markdown", "word", "googleDocs"];
    parsing: "auto" | "manual";  // 自動でセクション分割 or 手動
  };
  
  // 構成インポート
  structure: {
    formats: ["json", "yaml", "notion", "figma"];
    mapping: boolean;  // 既存構成へのマッピング
  };
  
  // ワイヤーフレームインポート
  wireframe: {
    formats: ["image", "figma", "xd", "sketch"];
    aiAnalysis: boolean;  // AIで要素を自動認識
  };
  
  // スワイプファイルから
  swipeFile: {
    selectSections: boolean;  // 特定セクションだけ参考に
    extractStyle: boolean;    // スタイルを抽出
  };
}
```

#### 0.5 ショートカット・クイックアクション

中上級者向けのショートカット：

```
┌─────────────────────────────────────────────────────────────┐
│ クイックアクション                                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [📋 原稿ペースト] → 自動でセクション分割＆構成生成           │
│                                                               │
│ [🖼️ 参考LP取り込み] → スタイル抽出＆構成テンプレート適用    │
│                                                               │
│ [✏️ プロンプト直接入力] → すぐに画像生成                    │
│                                                               │
│ [📁 スワイプから開始] → 選んだスワイプのスタイルで開始      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 1. ワイヤーフレーム作成機能（新規）

現在のフロー：
```
リサーチ → 原稿作成 → セクション分割 → 画像生成
```

改善後のフロー：
```
リサーチ → 原稿作成 → 構成作成 → ワイヤーフレーム作成 → デザイン生成 → 実装
```

#### 1.1 構成作成（Structure）

**入力**:
- 原稿テキスト
- ターゲット情報
- トンマナ設定

**出力**:
- セクション一覧（順番・役割）
- 各セクションの目的
- コンテンツ要素リスト

```typescript
interface LPStructure {
  sections: SectionPlan[];
  globalRules: GlobalDesignRules;
}

interface SectionPlan {
  id: string;
  name: string;           // "ファーストビュー", "悩み共感", "ベネフィット"等
  order: number;
  purpose: string;        // このセクションの目的
  elements: ContentElement[];
  estimatedHeight: "short" | "medium" | "long";
}

interface ContentElement {
  type: "headline" | "subheadline" | "body" | "cta" | "image" | "logo" | "badge" | "list" | "testimonial";
  content: string;        // テキスト内容
  style?: string;         // スタイル指示
  position?: string;      // 配置指示
}

interface GlobalDesignRules {
  aspectRatio: "2:3" | "16:9" | "1:1" | "custom";
  colorScheme: string[];
  fontStyle: "formal" | "casual" | "elegant" | "pop";
  backgroundStyle: string;
  overallMood: string;
}
```

#### 1.2 ワイヤーフレーム生成

**機能**:
- 構成からワイヤーフレームを自動生成
- SVG or Canvas でシンプルなレイアウト表示
- ドラッグ＆ドロップで要素の並び替え
- クリックで各要素の詳細編集

**UI設計**:
```
┌─────────────────────────────────────────────────┐
│ ワイヤーフレームエディター                        │
├─────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌───────────────────────────┐  │
│ │ セクション   │  │                           │  │
│ │ 一覧        │  │  ワイヤーフレーム         │  │
│ │             │  │  プレビュー               │  │
│ │ □ FV       │  │  ┌─────────────────────┐  │  │
│ │ □ 悩み共感  │  │  │ [ロゴ]              │  │  │
│ │ □ 解決策   │  │  │ ──────────────────  │  │  │
│ │ □ ベネフィ │  │  │ [メインタイトル]    │  │  │
│ │ □ 実績     │  │  │ [サブタイトル]      │  │  │
│ │ □ CTA     │  │  │ [バッジ] [バッジ]   │  │  │
│ │             │  │  │ [説明テキスト]      │  │  │
│ └─────────────┘  │  │ [画像エリア]        │  │  │
│                  │  └─────────────────────┘  │  │
│                  └───────────────────────────┘  │
│                                                   │
│ [← 構成に戻る]  [プロンプト生成 →]               │
└─────────────────────────────────────────────────┘
```

---

### 2. 段階的プロンプト生成システム

参考画像のプロンプト構造を分析：

```
# ルール（共通設定）
- 以下を画像にそのまま描画する
- サイズは2:3の縦長サイズ
- ファーストビューセクション
- 背景にはシルク素材のテクスチャを薄く敷く

# コンテンツ要素
| タイトル（見出し）：結果にこだわる、大人女性のためのエステサロン
| ロゴ：Beauty Salon SILK（シンプルで上品なロゴ）
| サブタイトル：口コミ評価★4.8／来店実績1,000名以上
  - テキストの左右に金色グラデーションの月桂樹を配置
  - 数字に蛍光色のハイライト
| 説明テキスト：丁寧なカウンセリングと確かな技術で...
| 写真：落ち着いた個室空間で施術を受けている女性と...
  - （美容系・上品・やわらかい雰囲気）
```

#### 2.1 プロンプト形式の選択（重要）

**ユーザーが選べる3つの形式:**

```typescript
type PromptFormat = "text" | "yaml" | "json";

interface PromptFormatOption {
  id: PromptFormat;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

const PROMPT_FORMATS: PromptFormatOption[] = [
  {
    id: "text",
    label: "テキスト形式",
    description: "自然言語で記述するシンプルな形式",
    pros: ["直感的", "初心者向け", "すぐに使える"],
    cons: ["構造が曖昧になりやすい", "再現性が低い"],
    recommended: false
  },
  {
    id: "yaml",
    label: "YAML形式",
    description: "構造化されたが読みやすい形式",
    pros: ["読みやすい", "コントロールしやすい", "バランス良い"],
    cons: ["インデントに注意が必要"],
    recommended: true  // ★推奨
  },
  {
    id: "json",
    label: "JSON形式",
    description: "完全に構造化された形式",
    pros: ["最も精密", "プログラムで処理しやすい", "再現性が高い"],
    cons: ["人間が読みにくい", "編集しにくい"],
    recommended: false
  }
];
```

**各形式の例:**

```
┌─ テキスト形式 ─────────────────────────────────────┐
│ #ルール                                             │
│ 以下を画像にそのまま描画する                        │
│ サイズは2:3の縦長サイズ                             │
│                                                     │
│ | タイトル：結果にこだわる、大人女性のための...     │
│ | ロゴ：Beauty Salon SILK                           │
└─────────────────────────────────────────────────────┘

┌─ YAML形式（推奨）───────────────────────────────────┐
│ section: ファーストビュー                           │
│ rules:                                              │
│   aspect_ratio: "2:3"                               │
│   background: シルク素材のテクスチャを薄く敷く      │
│                                                     │
│ elements:                                           │
│   - type: title                                     │
│     content: 結果にこだわる、大人女性のための...    │
│     style: 大きく堂々と、金色のグラデーション       │
│                                                     │
│   - type: logo                                      │
│     content: Beauty Salon SILK                      │
│     style: シンプルで上品                           │
└─────────────────────────────────────────────────────┘

┌─ JSON形式 ──────────────────────────────────────────┐
│ {                                                   │
│   "section": "ファーストビュー",                    │
│   "rules": {                                        │
│     "aspect_ratio": "2:3",                          │
│     "background": "シルク素材のテクスチャ"          │
│   },                                                │
│   "elements": [                                     │
│     { "type": "title", "content": "...", ... }      │
│   ]                                                 │
│ }                                                   │
└─────────────────────────────────────────────────────┘
```

#### 2.2 プロンプトカスタマイズの自由度

```typescript
interface PromptCustomizationLevel {
  // テンプレートを使う人向け
  template: {
    usePreset: boolean;       // テンプレートから選択
    modifyElements: boolean;  // 要素の内容だけ変更
  };
  
  // 自分で磨きたい人向け
  advanced: {
    editRawPrompt: boolean;   // 生のプロンプトを直接編集
    saveAsTemplate: boolean;  // カスタムテンプレートとして保存
    exportPrompt: boolean;    // プロンプトをエクスポート（.yaml, .json, .txt）
    importPrompt: boolean;    // 外部プロンプトをインポート
  };
}
```

**UI設計:**
```
┌─────────────────────────────────────────────────────────────┐
│ プロンプト編集                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 形式: [テキスト] [YAML ●] [JSON]                             │
│                                                               │
│ ┌─ モード選択 ───────────────────────────────────────────┐  │
│ │ ○ テンプレートから選ぶ（初心者向け）                   │  │
│ │ ● 自分でカスタマイズ（上級者向け）                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ テンプレート: [ファーストビュー - 高級サロン ▼]              │
│                                                               │
│ ┌─ プロンプトエディター ─────────────────────────────────┐  │
│ │ section: ファーストビュー                               │  │
│ │ rules:                                                  │  │
│ │   aspect_ratio: "2:3"                                   │  │
│ │   background: シルク素材のテクスチャを薄く敷く          │  │
│ │                                                         │  │
│ │ elements:                                               │  │
│ │   - type: title                                         │  │
│ │     content: |                                          │  │
│ │       結果にこだわる、                                  │  │
│ │       大人女性のためのエステサロン                      │  │
│ │     style:                                              │  │
│ │       - 大きく堂々と                                    │  │
│ │       - 金色のグラデーション                            │  │
│ │ ...                                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ [インポート] [エクスポート] [テンプレートとして保存]         │
│                                                               │
│ [← 構成に戻る]  [プレビュー]  [画像生成 →]                   │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3 プロンプトテンプレートエンジン

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  category: "firstview" | "problem" | "solution" | "benefit" | "proof" | "cta" | "faq" | "footer";
  format: PromptFormat;  // テンプレートのデフォルト形式
  
  // 共通ルール部分
  globalRulesTemplate: string;
  
  // 要素別テンプレート
  elementTemplates: {
    [key: string]: string;  // headline, subheadline, body, image等
  };
  
  // スタイル修飾子
  styleModifiers: {
    luxury: string[];
    casual: string[];
    professional: string[];
    emotional: string[];
  };
  
  // カスタマイズ可能なフィールド
  customizableFields: string[];
  
  // ユーザーによるカスタム版かどうか
  isUserCustom: boolean;
}
```

#### 2.2 自動プロンプト生成フロー

```typescript
async function generateSectionPrompt(
  section: SectionPlan,
  globalRules: GlobalDesignRules,
  stylePreset: string
): Promise<string> {
  const lines: string[] = [];
  
  // 1. 共通ルール
  lines.push(`#ルール`);
  lines.push(`以下を画像にそのまま描画する`);
  lines.push(`サイズは${globalRules.aspectRatio}の縦長サイズ`);
  lines.push(`${section.name}セクション`);
  lines.push(`背景には${getBackgroundStyle(globalRules.backgroundStyle)}`);
  lines.push(``);
  
  // 2. 各要素
  for (const element of section.elements) {
    const template = getElementTemplate(element.type, stylePreset);
    const prompt = formatElement(element, template);
    lines.push(prompt);
  }
  
  return lines.join('\n');
}
```

#### 2.3 プロンプト編集UI

```
┌─────────────────────────────────────────────────────┐
│ セクションプロンプト編集                             │
├─────────────────────────────────────────────────────┤
│ セクション: ファーストビュー                         │
│ ─────────────────────────────────────────────────── │
│                                                       │
│ 【共通ルール】                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ #ルール                                          │ │
│ │ 以下を画像にそのまま描画する                     │ │
│ │ サイズは2:3の縦長サイズ                          │ │
│ │ ファーストビューセクション                       │ │
│ │ 背景にはシルク素材のテクスチャを薄く敷く        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ 【コンテンツ要素】                                   │
│ ┌─ タイトル ─────────────────────────────────────┐ │
│ │ 結果にこだわる、大人女性のためのエステサロン    │ │
│ │ [スタイル: 大きく堂々と、金色のグラデーション]  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─ ロゴ ──────────────────────────────────────────┐ │
│ │ Beauty Salon SILK                                │ │
│ │ [スタイル: シンプルで上品なロゴ]                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─ サブタイトル ─────────────────────────────────┐ │
│ │ 口コミ評価★4.8／来店実績1,000名以上            │ │
│ │ [装飾: 左右に金色グラデーションの月桂樹]        │ │
│ │ [装飾: 数字に蛍光色のハイライト]                │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [+ 要素を追加]                                       │
│                                                       │
│ ─────────────────────────────────────────────────── │
│ 【生成プロンプトプレビュー】                         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ #ルール                                          │ │
│ │ 以下を画像にそのまま描画する                     │ │
│ │ サイズは2:3の縦長サイズ...                       │ │
│ │                                                  │ │
│ │ | タイトル（見出し）：結果にこだわる、大人女性... │ │
│ │ | ロゴ：Beauty Salon SILK（シンプルで上品なロゴ） │ │
│ │ | サブタイトル：口コミ評価★4.8／来店実績1,000... │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [コピー] [画像生成へ →]                              │
└─────────────────────────────────────────────────────┘
```

---

### 3. セクションテンプレートライブラリ

よく使うセクションパターンをテンプレート化：

```yaml
section_templates:
  firstview:
    name: "ファーストビュー"
    variants:
      - luxury_salon    # 高級サロン向け
      - business_coach  # ビジネスコーチ向け
      - health_product  # 健康食品向け
      - online_course   # オンライン講座向け
    elements:
      required:
        - logo
        - main_headline
        - sub_headline
        - main_image
      optional:
        - badge
        - trust_indicators
        - cta_button

  problem_agitation:
    name: "悩み・課題提起"
    variants:
      - question_list   # 質問形式
      - story_based     # ストーリー形式
      - statistics      # 統計データ形式
    elements:
      required:
        - section_headline
        - problem_statements
      optional:
        - empathy_image
        - checkmarks

  solution:
    name: "解決策提示"
    variants:
      - product_showcase
      - service_features
      - method_explanation
    elements:
      required:
        - solution_headline
        - solution_description
        - solution_image
      optional:
        - feature_list
        - comparison_table

  social_proof:
    name: "実績・信頼"
    variants:
      - testimonials
      - numbers_showcase
      - media_mentions
      - certifications
    elements:
      required:
        - proof_headline
        - proof_items
      optional:
        - logos
        - ratings
```

---

### 4. ワークスペース統合

現在のワークスペースに新しいタブ/モードを追加：

```
┌─────────────────────────────────────────────────────────────┐
│ プロジェクト: エステサロンLP                                 │
├─────────────────────────────────────────────────────────────┤
│ [構成] [ワイヤー] [プロンプト] [デザイン] [プレビュー]       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  現在のモードに応じたコンテンツ                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ファイル構成

```
src/
├── app/
│   └── projects/
│       └── [id]/
│           ├── start/               # NEW: 開始画面（エントリーポイント選択）
│           │   └── page.tsx
│           ├── structure/           # NEW: 構成作成
│           │   └── page.tsx
│           ├── wireframe/           # NEW: ワイヤーフレーム
│           │   └── page.tsx
│           ├── prompts/             # NEW: プロンプト編集
│           │   └── page.tsx
│           └── workspace/           # 既存: デザイン生成
│               └── page.tsx
├── components/
│   ├── workflow/                    # NEW: ワークフロー共通
│   │   ├── WorkflowModeToggle.tsx   # ガイド/エキスパート切り替え
│   │   ├── WorkflowNav.tsx          # ステップナビゲーション
│   │   ├── StepSkipButton.tsx       # スキップボタン
│   │   ├── QuickActions.tsx         # クイックアクション
│   │   └── EntryPointSelector.tsx   # エントリーポイント選択
│   ├── import/                      # NEW: インポート機能
│   │   ├── ManuscriptImporter.tsx   # 原稿インポート
│   │   ├── StructureImporter.tsx    # 構成インポート
│   │   ├── WireframeImporter.tsx    # ワイヤーフレームインポート
│   │   └── SwipeFileSelector.tsx    # スワイプファイルから開始
│   ├── structure/                   # NEW
│   │   ├── StructureEditor.tsx
│   │   ├── SectionPlanCard.tsx
│   │   └── ElementEditor.tsx
│   ├── wireframe/                   # NEW
│   │   ├── WireframeCanvas.tsx
│   │   ├── WireframeElement.tsx
│   │   └── WireframeToolbar.tsx
│   └── prompts/                     # NEW
│       ├── PromptBuilder.tsx
│       ├── PromptFormatSelector.tsx   # 形式選択（text/yaml/json）
│       ├── PromptEditor.tsx           # 生プロンプト編集エリア
│       ├── PromptTemplateSelector.tsx # テンプレート選択
│       ├── SectionPromptEditor.tsx
│       ├── ElementPromptCard.tsx
│       ├── PromptPreview.tsx
│       ├── PromptImportExport.tsx     # インポート/エクスポート
│       └── CustomTemplateManager.tsx  # カスタムテンプレート管理
├── lib/
│   ├── workflow/                    # NEW: ワークフロー管理
│   │   ├── types.ts                 # WorkflowStep, UserMode等
│   │   ├── workflow-manager.ts      # ステップ管理ロジック
│   │   └── import-handlers.ts       # インポート処理
│   ├── structure/                   # NEW
│   │   ├── types.ts
│   │   ├── structure-generator.ts
│   │   └── section-templates.ts
│   ├── wireframe/                   # NEW
│   │   ├── types.ts
│   │   ├── wireframe-generator.ts
│   │   └── layout-engine.ts
│   └── prompts/                     # NEW
│       ├── types.ts
│       ├── prompt-generator.ts
│       ├── prompt-converter.ts        # 形式変換（text↔yaml↔json）
│       ├── prompt-validator.ts        # プロンプト検証
│       ├── templates/
│       │   ├── index.ts               # テンプレート一覧
│       │   ├── firstview.yaml         # ファーストビュー
│       │   ├── problem.yaml           # 悩み・課題
│       │   ├── solution.yaml          # 解決策
│       │   ├── benefit.yaml           # ベネフィット
│       │   ├── proof.yaml             # 実績・信頼
│       │   ├── cta.yaml               # CTA
│       │   └── custom/                # ユーザーカスタムテンプレート
│       │       └── .gitkeep
│       └── style-modifiers.ts
├── stores/                          # Zustand stores
│   └── workflow-store.ts            # NEW: ワークフロー状態管理
```

---

## 実装優先順位

### Phase 0: 自由度の設計基盤（最優先・必須）
0. [ ] ワークフローモード切り替え（ガイド/エキスパート）
1. [ ] エントリーポイント選択UI
2. [ ] 各ステップのスキップ機能
3. [ ] 外部インポート機能（原稿、構成、ワイヤー）
4. [ ] クイックアクション（ショートカット）

### Phase 1: 基盤（必須）
5. [ ] 構成データ型定義（`lib/structure/types.ts`）
6. [ ] セクションテンプレート（`lib/structure/section-templates.ts`）
7. [ ] プロンプトテンプレートエンジン（`lib/prompts/prompt-generator.ts`）

### Phase 2: UI（必須）
8. [ ] 構成エディターUI（`components/structure/`）
9. [ ] プロンプトビルダーUI（`components/prompts/`）
10. [ ] ワークスペースへの統合（タブ追加）
11. [ ] タブ間自由移動（エキスパートモード）

### Phase 3: ワイヤーフレーム（推奨）
12. [ ] ワイヤーフレームCanvas（`components/wireframe/`）
13. [ ] ドラッグ＆ドロップ編集
14. [ ] ワイヤーフレーム→プロンプト変換
15. [ ] 画像からのワイヤーフレーム自動認識（AI）

### Phase 4: 高度機能（将来）
16. [ ] AIによる構成自動提案
17. [ ] テンプレートライブラリUI
18. [ ] プロンプト履歴・バージョン管理
19. [ ] Figma/XDインポート対応

---

## プロンプト生成例

### 入力（構成データ）

```json
{
  "section": {
    "name": "ファーストビュー",
    "elements": [
      { "type": "logo", "content": "Beauty Salon SILK", "style": "シンプルで上品" },
      { "type": "headline", "content": "結果にこだわる、大人女性のためのエステサロン" },
      { "type": "subheadline", "content": "口コミ評価★4.8／来店実績1,000名以上", "decorations": ["月桂樹", "数字ハイライト"] },
      { "type": "body", "content": "丁寧なカウンセリングと確かな技術で、肌も心も整う\"本物のケア\"をご提供します。" },
      { "type": "image", "description": "落ち着いた個室空間で施術を受けている女性と、寄り添うエステティシャン", "mood": "美容系・上品・やわらかい雰囲気" }
    ]
  },
  "globalRules": {
    "aspectRatio": "2:3",
    "backgroundStyle": "シルク素材のテクスチャを薄く敷く"
  }
}
```

### 出力（生成プロンプト）

```
エステLP

#ルール
以下を画像にそのまま描画する
サイズは2:3の縦長サイズ
ファーストビューセクション
背景にはシルク素材のテクスチャを薄く敷く

| タイトル（見出し）：
結果にこだわる、大人女性のためのエステサロン

| ロゴ：
Beauty Salon SILK（シンプルで上品なロゴ）

| サブタイトル：
口コミ評価★4.8／来店実績1,000名以上
テキストの左右に金色グラデーションの月桂樹を配置。
数字に蛍光色のハイライト

| 説明テキスト：
丁寧なカウンセリングと確かな技術で、
肌も心も整う"本物のケア"をご提供します。

| 写真：
落ち着いた個室空間で施術を受けている女性と、
寄り添うエステティシャンの様子
（美容系・上品・やわらかい雰囲気）
```

---

## 完了条件

### 自由度・柔軟性（最重要）
1. [ ] ガイドモード/エキスパートモードの切り替えが動作
2. [ ] どのステップからでも開始可能
3. [ ] 各ステップをスキップ可能
4. [ ] 外部からの原稿インポートが動作
5. [ ] クイックアクションでショートカット可能

### プロンプト機能（重要）
6. [ ] プロンプト形式選択（テキスト/YAML/JSON）が動作
7. [ ] 形式間の変換が正しく動作
8. [ ] テンプレートから選択できる
9. [ ] 生プロンプトを直接編集できる
10. [ ] カスタムテンプレートとして保存できる
11. [ ] プロンプトのインポート/エクスポートが動作

### 機能面
12. [ ] 構成データ型定義が完成
13. [ ] セクションテンプレートが5種類以上
14. [ ] プロンプト自動生成が動作
15. [ ] 構成→プロンプトのフローがUIで完結
16. [ ] ワイヤーフレームのプレビュー表示
17. [ ] 既存ワークスペースとの統合

### ユーザビリティ
18. [ ] 初心者がテンプレートを選んで完成できる
19. [ ] 中上級者が自分でプロンプトを磨ける
20. [ ] 途中から開始しても破綻しない
21. [ ] Cursorで管理しやすい形式でエクスポートできる

---

## AIモデル使用ガイドライン（2024年12月更新）

### Gemini 3 Flash の導入

**Gemini 3 Flash** が2024年12月17日にリリースされ、LP Builder Proの主力モデルとして採用。

| 特性 | 詳細 |
|------|------|
| **価格** | $0.50/1M入力 + $3.00/1M出力 |
| **速度** | 2.5 Proより**3倍高速** |
| **コスト** | 2.5 Proより**69%安価** |
| **推論** | GPQA Diamond 90.4%（Proに匹敵） |
| **特徴** | マルチモーダル対応、エージェント型ワークフロー最適化 |

### ワークフロー別モデル推奨

```yaml
ワークフロー推奨:
  リサーチ:
    model: gemini-3-flash-preview
    理由: 高速・安価で推論能力が高く、大量データ処理に最適

  構成作成:
    model: gemini-3-flash-preview
    理由: Proグレード推論×Flash速度、反復作業に最適

  プロンプト生成:
    model: gemini-3-flash-preview
    理由: マルチモーダル対応、エージェント型ワークフローに最適化

  コピーライティング:
    model: gemini-3-pro-preview
    理由: 最高品質が必要な最終成果物にはProを推奨

  画像生成:
    model: gemini-3-pro-image-preview (Nano Banana Pro)
    理由: 最高品質の画像生成

  チャット・壁打ち:
    model: nvidia-nemotron-3-nano
    理由: 無料で十分な性能、コスト0

  OCR・文字認識:
    model: gemini-3-flash-preview
    理由: マルチモーダル対応、高速処理
```

### 実装時の注意

1. **新しいワークフロー機能**: `structure_creation`, `prompt_generation`, `wireframe_analysis` タスクを追加済み
2. **モデル切り替え**: `selectModelForTask()` を使用してタスクに応じた最適モデルを自動選択
3. **コスト表示**: ユーザーに各ステップの推定コストを表示

---

## 関連ドキュメント

- `docs/CLAUDE_CODE_WORKSPACE_UX.md` - ワークスペースUX
- `docs/CLAUDE_CODE_UI_IMPROVEMENT.md` - UI改善
- `src/lib/knowledge/design_prompts.yaml` - デザインプロンプトナレッジ
- `src/lib/ai/models.json` - モデル設定（v1.2.0 - Gemini 3 Flash対応）

---

**バージョン**: 1.1
**ステータス**: 実装待ち
**優先度**: 高（ユーザー体験に直結）
**最終更新**: 2024年12月18日（Gemini 3 Flash対応追加）
