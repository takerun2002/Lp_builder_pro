# Claude Code 次回実装指示

## 🎯 今すぐ実装すべきタスク

詳細仕様は `docs/CLAUDE_CODE_FINAL_CHECKLIST.md` を必ず参照してください。

---

## タスク 1: インポートコンポーネント群の作成（優先度: 最高）

### 作成するファイル

```
src/components/import/
├── index.ts
├── ManuscriptImporter.tsx
├── StructureImporter.tsx  
├── WireframeImporter.tsx
└── SwipeFileSelector.tsx
```

### 要件

**ManuscriptImporter.tsx**:
- テキスト/Markdown/Wordファイルのドラッグ&ドロップ
- 自動セクション分割オプション（AIで分割）
- プレビュー表示
- `onImport: (content: string, format: string) => void`

**StructureImporter.tsx**:
- JSON/YAML形式のインポート
- バリデーション
- `onImport: (structure: LPStructure) => void`

**WireframeImporter.tsx**:
- 画像ファイルのインポート
- AIで要素を自動認識（オプション）
- `onImport: (wireframe: WireframeData) => void`

**SwipeFileSelector.tsx**:
- プロジェクトのスワイプファイル一覧
- カテゴリ/トンマナでフィルタリング
- プレビュー表示
- `onSelect: (swipeFile: SwipeFile) => void`

---

## タスク 2: プロンプトテンプレートの作成（優先度: 高）

### 作成するファイル

```
src/lib/prompts/templates/
├── index.ts
├── firstview.yaml
├── problem.yaml
├── solution.yaml
├── benefit.yaml
├── proof.yaml
├── cta.yaml
└── custom/
    └── .gitkeep
```

### YAMLテンプレートの形式

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
  logo:
    template: |
      | ロゴ：
      {{content}}（{{style}}）

styleModifiers:
  luxury:
    - 金色のグラデーション
    - 上品で洗練された雰囲気
```

### index.ts の実装

```typescript
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  format: 'text' | 'yaml' | 'json';
  globalRulesTemplate: string;
  elementTemplates: Record<string, { template: string }>;
  styleModifiers: Record<string, string[]>;
}

export function getTemplatesByCategory(category: string): PromptTemplate[] {
  // YAMLファイルを読み込んでパース
}

export function getTemplateById(id: string): PromptTemplate | undefined {
  // IDでテンプレートを検索
}
```

---

## タスク 3: 追加 prompts コンポーネント（優先度: 中）

### 作成するファイル

```
src/components/prompts/
├── PromptTemplateSelector.tsx  # 新規
└── CustomTemplateManager.tsx   # 新規（既存のstructure版とは別）
```

### PromptTemplateSelector.tsx

```typescript
interface PromptTemplateSelectorProps {
  category: string;
  onSelect: (template: PromptTemplate) => void;
  currentTemplateId?: string;
}

// 機能:
// - カテゴリ別テンプレート一覧（カード形式）
// - 各テンプレートのプレビュー
// - 「このテンプレートを使用」ボタン
```

### CustomTemplateManager.tsx（prompts用）

```typescript
// 機能:
// - ユーザーが保存したカスタムプロンプトテンプレートの管理
// - 新規作成・編集・削除
// - インポート/エクスポート
```

---

## タスク 4: UXガイドコンポーネント（優先度: 中）

### 作成するファイル

```
src/components/workspace/UsageGuide.tsx
```

### 実装

```typescript
interface UsageGuideProps {
  feature: "swipeFile" | "referenceLP" | "manuscript" | "scraper";
}

const GUIDES = {
  swipeFile: {
    title: "スワイプファイル保存後の使い方",
    items: [
      "✅ ワークスペースで参照LPとして表示",
      "✅ 画像生成時にトンマナの参考として使用",
      "✅ AIアシスタントで「このLPのトンマナで」と指示",
      "✅ マジックペンで「このLPに合わせて」と編集",
    ],
  },
  // ... 他のガイド
};
```

### 使用箇所
- `src/app/projects/[id]/scraper/page.tsx` - LP取り込み後
- `src/app/projects/[id]/swipe-lp/page.tsx` - スワイプ保存後
- ワークスペースの原稿タブ

---

## タスク 5: MagicPenEditorV2 への参考LP追加（優先度: 中）

### 修正ファイル

```
src/components/magic-pen/MagicPenEditorV2.tsx
```

### 追加内容

1. **import追加**:
```typescript
import { ReferenceLPSelector } from "@/components/workspace";
```

2. **state追加**:
```typescript
const [selectedReferenceLP, setSelectedReferenceLP] = useState<string | null>(null);
const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);
```

3. **useEffect追加** (swipeFiles取得):
```typescript
useEffect(() => {
  // プロジェクトのスワイプファイルを取得
  fetch(`/api/projects/${projectId}/swipe-files`)
    .then(res => res.json())
    .then(data => setSwipeFiles(data.swipeFiles || []));
}, [projectId]);
```

4. **右パネルにUI追加**:
```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm">参考LP</CardTitle>
  </CardHeader>
  <CardContent>
    <ReferenceLPSelector
      swipeFiles={swipeFiles}
      selectedId={selectedReferenceLP}
      onSelect={setSelectedReferenceLP}
    />
    <p className="text-xs text-muted-foreground mt-2">
      選択すると、このLPのトンマナに合わせて編集されます
    </p>
  </CardContent>
</Card>
```

5. **API呼び出し修正**:
```typescript
const res = await fetch("/api/dev/gemini/magic-pen", {
  method: "POST",
  body: JSON.stringify({
    prompt: region.prompt,
    imageDataUrl,
    maskDataUrl: region.maskDataUrl,
    refSwipeIds: selectedReferenceLP ? [selectedReferenceLP] : [],
  }),
});
```

---

## タスク 6: style-modifiers.ts の作成（優先度: 低）

### 作成ファイル

```
src/lib/prompts/style-modifiers.ts
```

### 実装

```typescript
export const STYLE_MODIFIERS = {
  luxury: {
    colors: ["#D4AF37", "#1A1A1A", "#FFFFFF"],
    fonts: ["serif", "elegant"],
    descriptions: [
      "高級感のある上品なデザイン",
      "金色のアクセント",
      "洗練された雰囲気",
    ],
  },
  casual: {
    colors: ["#FF6B6B", "#4ECDC4", "#FFE66D"],
    fonts: ["sans-serif", "handwritten"],
    descriptions: [
      "親しみやすいポップなデザイン",
      "明るい色使い",
      "カジュアルな雰囲気",
    ],
  },
  professional: {
    colors: ["#2C3E50", "#3498DB", "#FFFFFF"],
    fonts: ["sans-serif", "modern"],
    descriptions: [
      "信頼感のあるビジネスデザイン",
      "クリーンなレイアウト",
      "プロフェッショナルな印象",
    ],
  },
  emotional: {
    colors: ["#E74C3C", "#9B59B6", "#F1C40F"],
    fonts: ["display", "script"],
    descriptions: [
      "感情に訴えかけるデザイン",
      "ドラマチックな演出",
      "心を動かすビジュアル",
    ],
  },
};

export function applyStyleModifier(
  basePrompt: string,
  style: keyof typeof STYLE_MODIFIERS
): string {
  const modifier = STYLE_MODIFIERS[style];
  return `${basePrompt}\n\n【スタイル】\n${modifier.descriptions.join("\n")}`;
}

export function getStyleColors(style: keyof typeof STYLE_MODIFIERS): string[] {
  return STYLE_MODIFIERS[style].colors;
}
```

---

## 実装順序

1. **タスク 1**: インポートコンポーネント（4-6時間）
2. **タスク 2**: プロンプトテンプレート（2-3時間）
3. **タスク 3**: PromptTemplateSelector/CustomTemplateManager（2-3時間）
4. **タスク 4**: UsageGuide（1時間）
5. **タスク 5**: MagicPen参考LP（1時間）
6. **タスク 6**: style-modifiers（1時間）

---

## 完了確認

実装完了後、以下を確認してください：

```bash
# ファイル存在確認
ls src/components/import/
ls src/lib/prompts/templates/
ls src/components/prompts/PromptTemplateSelector.tsx
ls src/components/prompts/CustomTemplateManager.tsx
ls src/components/workspace/UsageGuide.tsx
ls src/lib/prompts/style-modifiers.ts

# Lint確認
npm run lint

# ビルド確認
npm run build
```

---

**この指示に従って実装を開始してください。**

詳細な仕様が必要な場合は `docs/CLAUDE_CODE_FINAL_CHECKLIST.md` を参照してください。
