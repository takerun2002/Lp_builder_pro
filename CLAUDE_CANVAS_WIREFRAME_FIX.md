# Canvas / Wireframe / Magic Pen UX改善指示

## 状況整理（ユーザーフィードバック）

### Canvas（キャンバス）の問題
1. **ズームの奥行きが短すぎる**：近づける/離す時の範囲が狭い（現在は 0.1〜5 倍）
2. **グリッド（点々）がない**：白紙すぎて何も見えない
3. **プロパティ/素材生成パネルが閉じられない/縮小できない**：右パネルが常に表示され、作業領域が狭い

### Wireframe（ワイヤーフレーム）の問題
1. **「フレーム1」「フレーム2」が何なのかわからない**：命名が不明瞭
2. **下スクロールしても「クイックプリセット」が半分消えて見えない**：レイアウト問題（スクロール領域の高さ計算ミス）
3. **「手動で追加」は不要**：Figmaでできるので削除

### Magic Pen
- プロジェクトのセクション一覧/プレビュー/原稿から呼び出せるようにしたい（既に実装されているが使いづらい）

---

## A) Canvas改善

### A-1) ズーム範囲を拡大（0.01〜20倍）
**ファイル**: `src/app/projects/[id]/canvas/page.tsx`

**変更箇所**:
- 行366: `zoom = Math.min(Math.max(0.1, zoom), 5);` → `zoom = Math.min(Math.max(0.01, zoom), 20);`
- 行802-803: `let zoom = canvas.getZoom() * 1.2; zoom = Math.min(zoom, 5);` → `let zoom = canvas.getZoom() * 1.2; zoom = Math.min(zoom, 20);`
- 行812-813: `let zoom = canvas.getZoom() / 1.2; zoom = Math.max(zoom, 0.1);` → `let zoom = canvas.getZoom() / 1.2; zoom = Math.max(zoom, 0.01);`

### A-2) グリッド描画を追加
**ファイル**: `src/app/projects/[id]/canvas/page.tsx`

**実装方針**:
- Fabric.jsの`before:render`イベントで、グリッドを描画するカスタムレイヤーを追加
- グリッド間隔: 20px（ズームレベルに応じて調整）
- グリッド色: `#e5e7eb`（薄いグレー）
- グリッドの表示/非表示は右上のズームコントロールにトグルボタンを追加（初期値: 表示）

**実装例**:
```typescript
// グリッド表示状態
const [showGrid, setShowGrid] = useState(true);
const GRID_SIZE = 20;

// Canvas初期化後に追加
useEffect(() => {
  if (!fabricRef.current) return;
  const canvas = fabricRef.current;
  
  const drawGrid = () => {
    if (!showGrid) return;
    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform;
    if (!vpt) return;
    
    const ctx = canvas.getContext();
    const gridSize = GRID_SIZE * zoom;
    
    // グリッド描画ロジック
    // ...
  };
  
  canvas.on('before:render', drawGrid);
  
  return () => {
    canvas.off('before:render', drawGrid);
  };
}, [showGrid]);
```

### A-3) 右パネルを閉じる/縮小できるようにする
**ファイル**: `src/app/projects/[id]/canvas/page.tsx`

**実装方針**:
- 右パネルのヘッダーに「閉じる/開く」ボタン（`<` / `>`）を追加
- 閉じた時は幅を `w-0` に、開いた時は `w-72` に
- 閉じた状態でも、キャンバス上のオブジェクト選択時は自動で開く（オプション）

**実装例**:
```typescript
const [rightPanelOpen, setRightPanelOpen] = useState(true);

// JSX内
<div className={`${rightPanelOpen ? 'w-72' : 'w-0'} border-l bg-card flex flex-col shrink-0 overflow-hidden transition-all duration-200`}>
  {rightPanelOpen && (
    <div className="flex items-center justify-between px-2 py-1 border-b">
      <span className="text-xs font-medium">パネル</span>
      <Button variant="ghost" size="sm" onClick={() => setRightPanelOpen(false)}>
        &lt;
      </Button>
    </div>
  )}
  {!rightPanelOpen && (
    <Button variant="ghost" size="sm" onClick={() => setRightPanelOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2">
      &gt;
    </Button>
  )}
  {/* 既存のTabs */}
</div>
```

---

## B) Wireframe改善

### B-1) フレーム命名を改善
**ファイル**: `src/app/projects/[id]/wireframe/page.tsx`

**変更箇所**:
- 行448: `name: name || `フレーム ${frames.length + 1}`,` → `name: name || `ワイヤーフレーム ${frames.length + 1}`,`
- 左パネルのフレーム一覧に、説明テキストを追加（例: "LPセクションの下書き"）

### B-2) クイックプリセットのスクロール問題を修正
**ファイル**: `src/app/projects/[id]/wireframe/page.tsx`

**問題**: `TabsContent` の `flex-1 overflow-y-auto` が正しく機能していない可能性

**修正方針**:
- `TabsContent` に `max-h-[calc(100vh-200px)]` を追加して、スクロール領域の高さを明示的に制限
- または、親の `flex flex-col` 構造を見直し、`overflow-hidden` を適切に配置

**実装例**:
```tsx
<TabsContent value="ai" className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[calc(100vh-200px)]">
  {/* 既存のコンテンツ */}
</TabsContent>
```

### B-3) 「手動で追加」セクションを削除
**ファイル**: `src/app/projects/[id]/wireframe/page.tsx`

**変更箇所**:
- 行1483-1502: 「手動で追加」のCard全体を削除
- `addRectangle`, `addText`, `addButton`, `addImagePlaceholder` 関数は残す（テンプレートから呼ばれる可能性があるため）

---

## C) Magic Pen呼び出し改善

### C-1) プロジェクト詳細ページでのMagic Pen呼び出しを改善
**ファイル**: `src/app/projects/[id]/page.tsx`

**現状**: 既に `openMagicPen` 関数と `MagicPenDialog` が実装されているが、UI/UXが使いづらい

**改善方針**:
- セクション一覧の各セクションに「🪄 Magic Pen」ボタンを常時表示（hover時ではなく）
- 連結プレビューの各セクションにも「🪄 Magic Pen」ボタンを常時表示
- 原稿タブには「セクションを選択してMagic Penで編集」という説明を追加

**実装例**:
```tsx
// セクション一覧
{sections.map((section) => (
  <div key={section.id} className="relative group">
    {/* 既存の画像表示 */}
    <Button
      variant="outline"
      size="sm"
      className="absolute top-2 right-2"
      onClick={() => openMagicPen(section)}
    >
      🪄 Magic Pen
    </Button>
  </div>
))}
```

---

## 受け入れ基準

- [ ] Canvasでズームが0.01〜20倍の範囲で動作する
- [ ] Canvasにグリッドが表示され、トグルでON/OFFできる
- [ ] Canvasの右パネルが閉じる/開くボタンで制御できる
- [ ] Wireframeのフレーム名が「ワイヤーフレーム 1」など、意味が分かる名前に変更されている
- [ ] Wireframeの「クイックプリセット」がスクロールしても完全に表示される
- [ ] Wireframeの「手動で追加」セクションが削除されている
- [ ] プロジェクト詳細ページのセクション一覧/プレビューからMagic Penが呼び出しやすい
- [ ] `npm run lint` エラー0
- [ ] 認証/OAuth追加なし

---

## 実装順序

1. Canvas: ズーム範囲拡大（A-1）
2. Canvas: グリッド追加（A-2）
3. Canvas: 右パネル閉じる機能（A-3）
4. Wireframe: フレーム命名改善（B-1）
5. Wireframe: スクロール問題修正（B-2）
6. Wireframe: 「手動で追加」削除（B-3）
7. Magic Pen: 呼び出し改善（C-1）



