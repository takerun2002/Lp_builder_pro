# Claude Code 実装指示書: ワークスペースUX大改善

**作成日**: 2024-12-17
**優先度**: 🔴 最高

---

## 背景

現在のワークスペースには以下の問題がある：

1. **参照LP操作の不便さ**: LPを元に作業する機能がワークスペース内でできない
2. **スワイプファイル連携不足**: プロジェクト内でスワイプファイルを操作できない
3. **スクレーパー孤立**: ただのツールで、プロジェクトと連携していない
4. **原稿ワークフロー**: ワークスペースを開く前に原稿を入れる形式が使いにくい
5. **画像品質設定なし**: 1K/2K/4K選択でAPI料金を最適化できない

---

## 依頼1: 参照LPパネル（スワイプファイル統合）

### 目的
ワークスペース内でスワイプファイル・参照LPを並べて見ながら作業できるようにする。

### 実装要件

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← 一覧  テスト  [連結|ブロック]  [パレット] [参照LP] [AIチャット]  │
├────────────┬───────────────────────┬────────────┬───────────────────┤
│  パレット   │    セクション編集     │   参照LP    │   AIアシスタント   │
│            │                       │            │                   │
│  [生成画像] │   ┌─────────────┐    │ [スワイプ1] │   🤖 チャット     │
│            │   │  セクション1  │    │ [スワイプ2] │                   │
│            │   └─────────────┘    │ [LP取込]    │                   │
│            │   ┌─────────────┐    │            │                   │
│            │   │  セクション2  │    │ ── 原稿 ── │                   │
│            │   └─────────────┘    │ [原稿表示]  │                   │
│            │                       │            │                   │
└────────────┴───────────────────────┴────────────┴───────────────────┘
```

### 1.1 参照LPパネル追加

```typescript
// src/app/projects/[id]/workspace/page.tsx

// 新しい状態
const [showReference, setShowReference] = useState(true);
const [referenceWidth, setReferenceWidth] = useState(280);

// 参照LPパネルの内容
interface ReferenceItem {
  type: "swipe" | "scraped_lp" | "manuscript";
  id: string;
  name: string;
  thumbnailUrl?: string;
  content?: string;
}
```

### 1.2 参照LPパネルUI

```tsx
{showReference && (
  <div className="border-l bg-card flex flex-col" style={{ width: referenceWidth }}>
    {/* リサイズハンドル */}
    <div className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize" />
    
    {/* ヘッダー */}
    <div className="p-3 border-b">
      <h2 className="text-sm font-semibold">📋 参照LP / 原稿</h2>
      <Tabs defaultValue="swipe">
        <TabsList className="h-8">
          <TabsTrigger value="swipe" className="text-xs">スワイプ</TabsTrigger>
          <TabsTrigger value="scraped" className="text-xs">LP取込</TabsTrigger>
          <TabsTrigger value="manuscript" className="text-xs">原稿</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
    
    {/* スワイプファイル一覧 */}
    <TabsContent value="swipe">
      <div className="grid grid-cols-2 gap-2 p-2">
        {swipeFiles.map(sf => (
          <SwipeCard 
            key={sf.id}
            swipeFile={sf}
            onAddToPalette={() => addSwipeFileToPalette(sf)}
            onView={() => setViewingSwipe(sf)}
          />
        ))}
      </div>
      <Button onClick={() => router.push("/swipe-files")}>
        + スワイプ追加
      </Button>
    </TabsContent>
    
    {/* 取込LP一覧 */}
    <TabsContent value="scraped">
      <div className="space-y-2 p-2">
        {scrapedLPs.map(lp => (
          <ScrapedLPCard 
            key={lp.id}
            lp={lp}
            onImportSections={() => importScrapedSections(lp)}
          />
        ))}
      </div>
      <Button onClick={() => router.push(`/projects/${projectId}/scraper`)}>
        + LP取込
      </Button>
    </TabsContent>
    
    {/* 原稿 */}
    <TabsContent value="manuscript">
      <Textarea 
        value={manuscript}
        onChange={(e) => setManuscript(e.target.value)}
        placeholder="原稿を入力..."
        className="min-h-[300px]"
      />
      <Button onClick={saveManuscript}>保存</Button>
      <Button variant="outline" onClick={generateFromManuscript}>
        AIで分割
      </Button>
    </TabsContent>
  </div>
)}
```

### 1.3 スワイプファイル詳細モーダル

```tsx
// スワイプファイルをクリックで拡大表示
<Dialog open={!!viewingSwipe} onOpenChange={() => setViewingSwipe(null)}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
    <img src={getSwipeUrl(viewingSwipe)} className="w-full" />
    <div className="flex gap-2">
      <Button onClick={() => addSwipeFileToPalette(viewingSwipe)}>
        パレットに追加
      </Button>
      <Button onClick={() => copySwipeDesign(viewingSwipe)}>
        デザイン参考にする
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## 依頼2: 画像品質設定（1K/2K/4K）

### 目的
生成画像の解像度を選択でき、API料金を最適化できるようにする。

### 2.1 品質設定の追加

```typescript
type ImageQuality = "1k" | "2k" | "4k";

interface GenerateOptions {
  style: MangaStyle;
  aspectRatio: AspectRatio;
  colorMode: "fullcolor" | "monochrome";
  quality: ImageQuality; // 追加
}

const QUALITY_CONFIG = {
  "1k": { 
    width: 1024, 
    height: 1024, 
    label: "1K (標準)", 
    cost: "低",
    description: "軽量・高速"
  },
  "2k": { 
    width: 2048, 
    height: 2048, 
    label: "2K (高品質)", 
    cost: "中",
    description: "バランス型"
  },
  "4k": { 
    width: 4096, 
    height: 4096, 
    label: "4K (最高品質)", 
    cost: "高",
    description: "印刷向け"
  },
};
```

### 2.2 設定UIに品質選択を追加

```tsx
// 生成オプションダイアログに追加
<div className="space-y-2">
  <label className="text-xs font-medium">画像品質</label>
  <Select value={genOptions.quality} onValueChange={setQuality}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="1k">
        <div className="flex items-center gap-2">
          <span>1K (1024px)</span>
          <Badge variant="secondary">低コスト</Badge>
        </div>
      </SelectItem>
      <SelectItem value="2k">
        <div className="flex items-center gap-2">
          <span>2K (2048px)</span>
          <Badge variant="secondary">推奨</Badge>
        </div>
      </SelectItem>
      <SelectItem value="4k">
        <div className="flex items-center gap-2">
          <span>4K (4096px)</span>
          <Badge variant="destructive">高コスト</Badge>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
  <p className="text-[10px] text-muted-foreground">
    高解像度ほどAPI料金が増加します
  </p>
</div>
```

### 2.3 API呼び出し時に解像度を反映

```typescript
// handleChatSubmit内
const qualityConfig = QUALITY_CONFIG[genOptions.quality];
const res = await fetch("/api/dev/gemini/generate", {
  method: "POST",
  body: JSON.stringify({
    prompt: buildPrompt(promptText, detectedStyle, detectedAspect),
    width: qualityConfig.width,
    height: qualityConfig.height,
    // ...
  }),
});
```

---

## 依頼3: スクレーパー統合（プロジェクト連携）

### 目的
スクレーパーで取り込んだLPをプロジェクトに直接連携できるようにする。

### 3.1 プロジェクト専用スクレーパー

現在: `/projects/[id]/scraper` → 取り込んでも使いにくい

改善: ワークスペース内で取り込み結果を直接操作

```typescript
// スクレーパー結果をプロジェクトに保存
interface ScrapedLP {
  id: string;
  project_id: string;
  source_url: string;
  sections: ScrapedSection[];
  scraped_at: string;
}

interface ScrapedSection {
  id: string;
  image_path: string;
  order_index: number;
  extracted_text?: string;
}
```

### 3.2 取り込みLPからセクション作成

```tsx
const importScrapedSections = async (scrapedLP: ScrapedLP) => {
  // 取り込んだLPのセクションをプロジェクトに追加
  for (const section of scrapedLP.sections) {
    await fetch(`/api/projects/${projectId}/sections`, {
      method: "POST",
      body: JSON.stringify({
        name: `取込 ${section.order_index + 1}`,
        image_path: section.image_path,
        source_scraped_lp_id: scrapedLP.id,
      }),
    });
  }
  // 再読み込み
  fetchProjectData();
};
```

---

## 依頼4: 原稿ワークフロー改善

### 目的
ワークスペース内で原稿を編集し、セクションごとに紐付けできるようにする。

### 4.1 セクションごとの原稿

```typescript
interface Section {
  id: string;
  name: string;
  order_index: number;
  image_path: string | null;
  manuscript_part?: string; // セクション用原稿
  text_only?: boolean; // テキストのみ出力フラグ
}
```

### 4.2 原稿分割機能

```tsx
// AIで原稿をセクションごとに分割
const splitManuscriptByAI = async () => {
  const res = await fetch("/api/ai/split-manuscript", {
    method: "POST",
    body: JSON.stringify({
      manuscript: project.manuscript,
      sectionCount: sections.length,
    }),
  });
  
  const data = await res.json();
  // 各セクションに原稿パートを割り当て
  for (let i = 0; i < data.parts.length; i++) {
    await updateSection(sections[i].id, {
      manuscript_part: data.parts[i],
    });
  }
};
```

### 4.3 セクション編集時の原稿表示

```tsx
// セクションをクリックした時
<Dialog open={!!editingSection}>
  <DialogContent>
    <div className="grid grid-cols-2 gap-4">
      {/* 左: 画像 */}
      <div>
        <img src={getSectionImage(editingSection)} />
        <Button onClick={() => openMagicPen(editingSection)}>
          Magic Penで編集
        </Button>
      </div>
      
      {/* 右: 原稿 */}
      <div>
        <h3>このセクションの原稿</h3>
        <Textarea 
          value={editingSection.manuscript_part}
          onChange={updateManuscriptPart}
        />
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={editingSection.text_only}
            onCheckedChange={setTextOnly}
          />
          <label>テキストのみ出力</label>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## 依頼5: ツールバー改善

### 5.1 新しいヘッダーレイアウト

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← 一覧  プロジェクト名                                               │
├─────────────────────────────────────────────────────────────────────┤
│ [連結|ブロック] │ [パレット] [参照LP] [AIチャット] │ 品質:[2K▼] │ + │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 クイック品質切り替え

```tsx
<Select value={genOptions.quality} onValueChange={setQuality}>
  <SelectTrigger className="w-20 h-8">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1k">1K 💨</SelectItem>
    <SelectItem value="2k">2K ⭐</SelectItem>
    <SelectItem value="4k">4K 💎</SelectItem>
  </SelectContent>
</Select>
```

---

## 実装優先度

| 優先度 | 機能 | 工数目安 | 効果 |
|--------|------|----------|------|
| 🔴 高 | 参照LPパネル | 4h | ワークフロー劇的改善 |
| 🔴 高 | 画像品質設定 | 2h | コスト最適化 |
| 🟡 中 | スクレーパー統合 | 3h | LP取込の活用 |
| 🟡 中 | 原稿ワークフロー | 4h | セクション管理改善 |
| 🟢 低 | ツールバー改善 | 1h | UX向上 |

---

## ファイル構成

```
src/app/projects/[id]/workspace/
├── page.tsx               # メインワークスペース（大幅修正）
├── components/
│   ├── ReferencePanel.tsx # 参照LPパネル（新規）
│   ├── QualitySelector.tsx # 品質選択（新規）
│   ├── ManuscriptEditor.tsx # 原稿エディタ（新規）
│   └── SectionEditor.tsx  # セクション編集（新規）
```

---

## 確認チェックリスト

- [ ] 参照LPパネルが表示され、スワイプファイルを閲覧できる
- [ ] 取り込んだLPをセクションとしてインポートできる
- [ ] 原稿をワークスペース内で編集できる
- [ ] 画像品質（1K/2K/4K）を選択できる
- [ ] セクションごとに原稿パートを紐付けられる
- [ ] パネル幅をドラッグで調整できる
- [ ] 全パネルの表示/非表示を切り替えられる

---

## 関連ドキュメント

- `docs/CLAUDE_CODE_SWIPE_BRIGHTDATA.md` - スワイプファイル・Bright Data
- `docs/CLAUDE_CODE_IMPLEMENTATION.md` - 全体実装ガイド
