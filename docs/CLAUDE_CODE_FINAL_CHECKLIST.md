# Claude Code 最終指示書: 未完了タスク完了チェックリスト

**ディレクター**: Cursor AI
**日付**: 2024年12月
**優先度**: 高

---

## 📋 概要

このドキュメントは、LP Builder Pro の未完了タスクを精密に特定し、Claude Code への最終指示としてまとめたものです。

### 確認済みドキュメント
1. `docs/CLAUDE_CODE_WIREFRAME_WORKFLOW.md`
2. `docs/CLAUDE_CODE_UX_IMPROVEMENTS.md`
3. `docs/CLAUDE_CODE_MAGIC_PEN_IMPROVEMENTS.md`
4. `docs/CLAUDE_CODE_CRAWL4AI_INTEGRATION.md`

---

## ✅ 完了済み（確認済み）

### Crawl4AI統合 ✅
- [x] `python-scripts/crawl4ai_server.py`
- [x] `python-scripts/requirements.txt`
- [x] `src/lib/scrapers/types.ts`
- [x] `src/lib/scrapers/crawl4ai-client.ts`
- [x] `src/app/api/scrape/lp-archive/route.ts`
- [x] `src/app/dev/design-research/page.tsx`
- [x] サイドバーに「デザイン収集」リンク追加

### マジックペン改善 ✅
- [x] `src/components/magic-pen/MagicPenEditorV2.tsx`
- [x] `src/components/magic-pen/RegionChatBox.tsx`
- [x] `src/components/magic-pen/RegionList.tsx`
- [x] `src/components/magic-pen/utils/region-detection.ts`
- [x] 番号付きマスク領域
- [x] インラインチャットボックス
- [x] 領域ごとの編集指示

### ワイヤーフレームワークフロー（大部分完了）
- [x] `src/lib/workflow/types.ts`
- [x] `src/lib/workflow/workflow-manager.ts`
- [x] `src/lib/workflow/import-handlers.ts`
- [x] `src/stores/workflow-store.ts`
- [x] `src/components/workflow/WorkflowModeToggle.tsx`
- [x] `src/components/workflow/WorkflowNav.tsx`
- [x] `src/components/workflow/EntryPointSelector.tsx`
- [x] `src/components/workflow/QuickActions.tsx`
- [x] `src/components/workflow/PromptFormatSelector.tsx`
- [x] `src/lib/structure/types.ts`
- [x] `src/lib/structure/section-templates.ts`
- [x] `src/lib/structure/templates.ts`
- [x] `src/components/structure/StructureEditor.tsx`
- [x] `src/components/structure/SectionPlanCard.tsx`
- [x] `src/components/structure/AIStructureGenerator.tsx`
- [x] `src/components/structure/CustomTemplateManager.tsx`
- [x] `src/components/structure/FigmaImporter.tsx`
- [x] `src/components/structure/GlobalRulesEditor.tsx`
- [x] `src/components/structure/TemplateLibrary.tsx`
- [x] `src/lib/wireframe/types.ts`
- [x] `src/lib/wireframe/wireframe-to-prompt.ts`
- [x] `src/components/wireframe/WireframeCanvas.tsx`
- [x] `src/components/wireframe/WireframeElement.tsx`
- [x] `src/components/wireframe/WireframeToolbar.tsx`
- [x] `src/lib/prompts/types.ts`
- [x] `src/lib/prompts/prompt-generator.ts`
- [x] `src/lib/prompts/prompt-converter.ts`
- [x] `src/lib/prompts/prompt-validator.ts`
- [x] `src/lib/prompts/history.ts`
- [x] `src/components/prompts/PromptBuilder.tsx`
- [x] `src/components/prompts/PromptEditor.tsx`
- [x] `src/components/prompts/SectionPromptCard.tsx`
- [x] `src/components/prompts/PromptImportExport.tsx`
- [x] `src/components/prompts/PromptHistory.tsx`
- [x] `src/app/projects/[id]/start/page.tsx`
- [x] `src/app/projects/[id]/structure/page.tsx`
- [x] `src/app/projects/[id]/wireframe/page.tsx`
- [x] `src/app/projects/[id]/prompts/page.tsx`

### UX改善（部分完了）
- [x] `src/components/settings/StorageQuickSettings.tsx`
- [x] `src/components/workspace/ReferenceLPSelector.tsx`
- [x] ワークスペースでの参考LP選択（selectedReferenceLP実装）
- [x] 画像生成APIへのrefSwipeIds渡し

---

## ❌ 未完了タスク（要実装）

### Phase 1: インポートコンポーネント群（優先度: 高）

**要件**: `docs/CLAUDE_CODE_WIREFRAME_WORKFLOW.md` セクション 0.4

```
src/components/import/  ← ディレクトリが存在しない！
├── ManuscriptImporter.tsx    # 原稿インポート
├── StructureImporter.tsx     # 構成インポート  
├── WireframeImporter.tsx     # ワイヤーフレームインポート
├── SwipeFileSelector.tsx     # スワイプファイルから開始
└── index.ts
```

**ManuscriptImporter.tsx の要件**:
```typescript
interface ManuscriptImporterProps {
  onImport: (content: string, format: "text" | "markdown" | "word") => void;
}

// 機能:
// - テキスト/Markdown/Wordファイルのドラッグ&ドロップ
// - 自動セクション分割オプション
// - プレビュー表示
// - フォーマット自動検出
```

**StructureImporter.tsx の要件**:
```typescript
interface StructureImporterProps {
  onImport: (structure: LPStructure) => void;
}

// 機能:
// - JSON/YAML/Figma形式のインポート
// - 既存構成へのマッピング
// - バリデーション
```

**WireframeImporter.tsx の要件**:
```typescript
interface WireframeImporterProps {
  onImport: (wireframe: WireframeData) => void;
}

// 機能:
// - 画像/Figma/XDからのインポート
// - AIで要素を自動認識
// - プレビュー表示
```

**SwipeFileSelector.tsx の要件**:
```typescript
interface SwipeFileSelectorProps {
  swipeFiles: SwipeFile[];
  onSelect: (swipeFile: SwipeFile) => void;
}

// 機能:
// - スワイプファイル一覧表示
// - カテゴリ/トンマナでフィルタリング
// - プレビュー表示
// - 「このスワイプのスタイルで開始」ボタン
```

---

### Phase 2: プロンプトテンプレート（優先度: 高）

**要件**: `docs/CLAUDE_CODE_WIREFRAME_WORKFLOW.md` セクション 3

```
src/lib/prompts/templates/  ← ディレクトリが存在しない！
├── index.ts                  # テンプレート一覧エクスポート
├── firstview.yaml            # ファーストビュー
├── problem.yaml              # 悩み・課題
├── solution.yaml             # 解決策
├── benefit.yaml              # ベネフィット
├── proof.yaml                # 実績・信頼
├── cta.yaml                  # CTA
└── custom/                   # ユーザーカスタムテンプレート
    └── .gitkeep
```

**YAML テンプレート例 (firstview.yaml)**:
```yaml
id: firstview_luxury
name: "ファーストビュー - 高級サロン"
category: firstview
format: yaml

globalRulesTemplate: |
  #ルール
  以下を画像にそのまま描画する
  サイズは{{aspectRatio}}
  {{sectionName}}セクション
  背景には{{backgroundStyle}}

elementTemplates:
  headline:
    template: |
      | タイトル（見出し）：
      {{content}}
      {{#if style}}（{{style}}）{{/if}}
  logo:
    template: |
      | ロゴ：
      {{content}}（{{style}}）
  subheadline:
    template: |
      | サブタイトル：
      {{content}}
      {{#each decorations}}
      {{this}}
      {{/each}}

styleModifiers:
  luxury:
    - 金色のグラデーション
    - シルクのテクスチャ
    - 上品で洗練された雰囲気
  casual:
    - 明るくポップな色使い
    - 手書き風フォント
    - 親しみやすい雰囲気

customizableFields:
  - content
  - style
  - decorations
  - backgroundColor
```

**index.ts**:
```typescript
import firstviewLuxury from './firstview.yaml';
import problem from './problem.yaml';
// ... 他のテンプレート

export const PROMPT_TEMPLATES = {
  firstview: [firstviewLuxury, /* ... */],
  problem: [problem, /* ... */],
  // ...
};

export function getTemplateById(id: string): PromptTemplate | undefined {
  // ...
}

export function getTemplatesByCategory(category: string): PromptTemplate[] {
  // ...
}
```

---

### Phase 3: 追加prompts コンポーネント（優先度: 中）

**要件**: `docs/CLAUDE_CODE_WIREFRAME_WORKFLOW.md` ファイル構成

```
src/components/prompts/
├── PromptTemplateSelector.tsx   # テンプレート選択UI（未実装）
└── CustomTemplateManager.tsx    # カスタムテンプレート管理（未実装）
```

**PromptTemplateSelector.tsx の要件**:
```typescript
interface PromptTemplateSelectorProps {
  category: string;  // "firstview", "problem", etc.
  onSelect: (template: PromptTemplate) => void;
  currentTemplateId?: string;
}

// 機能:
// - カテゴリ別テンプレート一覧
// - プレビュー表示
// - カスタムテンプレートも表示
// - 「このテンプレートを使用」ボタン
```

**CustomTemplateManager.tsx の要件**:
```typescript
interface CustomTemplateManagerProps {
  onSave: (template: PromptTemplate) => void;
  onDelete: (templateId: string) => void;
}

// 機能:
// - カスタムテンプレート一覧
// - 新規作成
// - 編集
// - 削除
// - インポート/エクスポート
```

---

### Phase 4: UX改善の残り（優先度: 中）

**要件**: `docs/CLAUDE_CODE_UX_IMPROVEMENTS.md`

#### 4.1 UsageGuide コンポーネント（未実装）

```
src/components/workspace/UsageGuide.tsx  ← 存在しない！
```

```typescript
interface UsageGuideProps {
  feature: "swipeFile" | "referenceLP" | "manuscript" | "scraper";
}

// 機能:
// - 「保存したらどうなるの？」を説明
// - 「次に何ができるの？」を表示
// - 使用例を表示
// - ツールチップとしても使用可能
```

**実装例**:
```tsx
export function UsageGuide({ feature }: UsageGuideProps) {
  const guides = {
    swipeFile: {
      title: "スワイプファイル保存後の使い方",
      items: [
        "✅ ワークスペースで参照LPとして表示",
        "✅ 画像生成時にトンマナの参考として使用",
        "✅ AIアシスタントで「このLPのトンマナで」と指示",
        "✅ マジックペンで「このLPに合わせて」と編集",
      ],
    },
    // ... 他の機能
  };

  return (
    <Card className="bg-muted/50 border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          {guides[feature].title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-xs space-y-1">
          {guides[feature].items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

#### 4.2 マジックペンへの参考LP選択追加（未実装）

**問題**: `MagicPenEditorV2.tsx` に ReferenceLPSelector がない

**修正箇所**: `src/components/magic-pen/MagicPenEditorV2.tsx`

```typescript
// 追加が必要なimport
import { ReferenceLPSelector } from "@/components/workspace";

// 追加が必要なstate
const [selectedReferenceLP, setSelectedReferenceLP] = useState<string | null>(null);
const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);

// 追加が必要なUI（右パネル内）
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">参考LP</CardTitle>
  </CardHeader>
  <CardContent>
    <ReferenceLPSelector
      swipeFiles={swipeFiles}
      selectedId={selectedReferenceLP}
      onSelect={setSelectedReferenceLP}
      compact={false}
    />
    <p className="text-xs text-muted-foreground mt-2">
      選択すると、このLPのトンマナに合わせて編集されます
    </p>
  </CardContent>
</Card>

// API呼び出し時にrefSwipeIdsを渡す
const handleGenerate = async (regionId: string) => {
  // ... 既存コード ...
  
  const res = await fetch("/api/dev/gemini/magic-pen", {
    method: "POST",
    body: JSON.stringify({
      prompt: region.prompt,
      imageDataUrl,
      maskDataUrl: region.maskDataUrl,
      refSwipeIds: selectedReferenceLP ? [selectedReferenceLP] : [],
    }),
  });
};
```

---

### Phase 5: style-modifiers.ts（優先度: 低）

**要件**: `docs/CLAUDE_CODE_WIREFRAME_WORKFLOW.md` ファイル構成

```
src/lib/prompts/style-modifiers.ts  ← 存在するか確認必要
```

```typescript
// スタイル修飾子の定義
export const STYLE_MODIFIERS = {
  luxury: {
    colors: ["#D4AF37", "#1A1A1A", "#FFFFFF"],
    fonts: ["serif", "elegant"],
    textures: ["silk", "gold-gradient"],
    descriptions: [
      "高級感のある上品なデザイン",
      "金色のアクセント",
      "洗練された雰囲気",
    ],
  },
  casual: {
    colors: ["#FF6B6B", "#4ECDC4", "#FFE66D"],
    fonts: ["sans-serif", "handwritten"],
    textures: ["paper", "watercolor"],
    descriptions: [
      "親しみやすいポップなデザイン",
      "明るい色使い",
      "カジュアルな雰囲気",
    ],
  },
  professional: {
    // ...
  },
  emotional: {
    // ...
  },
};

export function applyStyleModifier(
  basePrompt: string,
  style: keyof typeof STYLE_MODIFIERS
): string {
  const modifier = STYLE_MODIFIERS[style];
  // プロンプトにスタイル修飾を適用
  return `${basePrompt}\n\n【スタイル】\n${modifier.descriptions.join("\n")}`;
}
```

---

## 📝 実装手順

### ステップ 1: インポートコンポーネント作成
```bash
# ディレクトリ作成
mkdir -p src/components/import

# ファイル作成
touch src/components/import/index.ts
touch src/components/import/ManuscriptImporter.tsx
touch src/components/import/StructureImporter.tsx
touch src/components/import/WireframeImporter.tsx
touch src/components/import/SwipeFileSelector.tsx
```

### ステップ 2: プロンプトテンプレート作成
```bash
# ディレクトリ作成
mkdir -p src/lib/prompts/templates/custom

# YAMLファイル作成
touch src/lib/prompts/templates/index.ts
touch src/lib/prompts/templates/firstview.yaml
touch src/lib/prompts/templates/problem.yaml
touch src/lib/prompts/templates/solution.yaml
touch src/lib/prompts/templates/benefit.yaml
touch src/lib/prompts/templates/proof.yaml
touch src/lib/prompts/templates/cta.yaml
touch src/lib/prompts/templates/custom/.gitkeep
```

### ステップ 3: 追加コンポーネント作成
```bash
touch src/components/prompts/PromptTemplateSelector.tsx
touch src/components/prompts/CustomTemplateManager.tsx
touch src/components/workspace/UsageGuide.tsx
```

### ステップ 4: MagicPenEditorV2 修正
- ReferenceLPSelector を追加
- swipeFiles state を追加
- API呼び出しに refSwipeIds を追加

### ステップ 5: style-modifiers.ts 確認・作成
```bash
# 存在確認
ls src/lib/prompts/style-modifiers.ts

# なければ作成
touch src/lib/prompts/style-modifiers.ts
```

---

## 🎯 完了条件チェックリスト

### インポート機能
- [ ] ManuscriptImporter が動作する
- [ ] StructureImporter が動作する
- [ ] WireframeImporter が動作する
- [ ] SwipeFileSelector が動作する
- [ ] エントリーポイント選択画面からインポートが呼び出せる

### プロンプトテンプレート
- [ ] 6種類以上のYAMLテンプレートが存在する
- [ ] テンプレート一覧APIが動作する
- [ ] PromptTemplateSelector でテンプレートが選択できる
- [ ] CustomTemplateManager でカスタムテンプレートが管理できる

### UX改善
- [ ] UsageGuide がスワイプファイル保存時に表示される
- [ ] UsageGuide がLP取り込み時に表示される
- [ ] MagicPenEditorV2 で参考LPが選択できる
- [ ] マジックペン編集時に参考LPのトンマナが反映される

### 統合テスト
- [ ] ワークフロー全体（リサーチ→原稿→構成→ワイヤー→プロンプト→生成）が動作
- [ ] どのステップからでも開始可能
- [ ] スキップ機能が動作
- [ ] エキスパートモードで自由にタブ移動可能

---

## 🔧 技術的注意点

1. **YAMLパース**: `js-yaml` ライブラリを使用（既にインストール済みか確認）
2. **ファイルアップロード**: react-dropzone または HTML5 File API を使用
3. **Figmaインポート**: Figma API キーが必要（オプション機能として実装）
4. **型安全性**: すべてのインポート/エクスポート関数にバリデーションを追加
5. **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージを表示

---

## 📊 優先度まとめ

| 優先度 | タスク | 工数見積もり |
|--------|--------|-------------|
| 🔴 高 | インポートコンポーネント群 | 4-6時間 |
| 🔴 高 | プロンプトテンプレート | 2-3時間 |
| 🟡 中 | PromptTemplateSelector | 2時間 |
| 🟡 中 | CustomTemplateManager | 2時間 |
| 🟡 中 | UsageGuide | 1時間 |
| 🟡 中 | MagicPen参考LP追加 | 1時間 |
| 🟢 低 | style-modifiers.ts | 1時間 |

**合計見積もり**: 13-16時間

---

**バージョン**: 1.0
**作成者**: Cursor AI（ディレクター）
**ステータス**: Claude Code 実装待ち
