# Claude Code 指示書: マジックペン改善 - 番号付きマスク領域 & インラインチャット

## 概要

Manus AI風のUXを実装し、マジックペンをより使いやすくします。

### 改善ポイント
1. **番号付きマスク領域**: 塗った順番に番号（1, 2, 3...）を表示
2. **領域ごとのインラインチャット**: 塗った場所にチャットボックスが出現
3. **領域ごとの編集指示**: 各領域に個別の編集指示を入力可能

---

## 1. 番号付きマスク領域

### 要件
- マジックペンで塗るたびに、新しい領域として認識
- 各領域に番号（①②③...）を表示
- 番号をクリックで領域を選択可能
- 選択中の領域はハイライト表示

### データ構造

```typescript
interface MaskRegion {
  id: string;
  number: number;
  // マスク領域のピクセルデータ（または境界ボックス）
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // マスク画像データ（この領域のみ白、それ以外は黒）
  maskDataUrl: string;
  // 編集指示
  prompt: string;
  // 生成状態
  status: "idle" | "generating" | "done" | "error";
  // 生成結果
  resultDataUrl?: string;
}
```

### 領域の検出方法

1. **mouseup イベント時に領域を確定**
   - 塗り終わったら、新しい領域として登録
   - 既存の領域と重なっている場合は統合

2. **Connected Components 分析**
   - マスクキャンバスから白いピクセルを検出
   - 連結成分（connected components）を分析して領域を分割
   - 各領域の重心に番号を表示

### 実装

```typescript
// 領域の重心を計算
function calculateCentroid(
  maskCanvas: HTMLCanvasElement,
  boundingBox: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  const ctx = maskCanvas.getContext("2d");
  if (!ctx) return { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 };

  const imageData = ctx.getImageData(
    boundingBox.x,
    boundingBox.y,
    boundingBox.width,
    boundingBox.height
  );
  
  let sumX = 0, sumY = 0, count = 0;
  
  for (let y = 0; y < boundingBox.height; y++) {
    for (let x = 0; x < boundingBox.width; x++) {
      const idx = (y * boundingBox.width + x) * 4;
      // 白いピクセル（R > 128）をカウント
      if (imageData.data[idx] > 128) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }
  
  if (count === 0) {
    return { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 };
  }
  
  return {
    x: boundingBox.x + sumX / count,
    y: boundingBox.y + sumY / count,
  };
}
```

---

## 2. インラインチャットボックス

### 要件
- 塗り終わったら、領域の近くにチャットボックスが出現
- チャットボックスで編集指示を入力
- 「生成」ボタンでその領域のみ生成
- 生成中はスピナー表示
- 生成完了後は結果をプレビュー

### UI設計

```
┌─ 領域 ① ────────────────────────────────────────────┐
│                                                       │
│ [塗った領域のプレビュー]                              │
│                                                       │
│ 編集指示:                                             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ この部分を青いボタンに変更                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [生成] [削除]                                         │
│                                                       │
│ ┌─ 生成結果 ─────────────────────────────────────┐  │
│ │ [生成された画像]                                │  │
│ │ [適用] [再生成]                                 │  │
│ └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 実装

```typescript
// チャットボックスコンポーネント
interface RegionChatBoxProps {
  region: MaskRegion;
  position: { x: number; y: number };
  scale: number;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onDelete: () => void;
  onApply: () => void;
}

function RegionChatBox({
  region,
  position,
  scale,
  onPromptChange,
  onGenerate,
  onDelete,
  onApply,
}: RegionChatBoxProps) {
  return (
    <div
      className="absolute bg-card border rounded-lg shadow-lg p-3 w-64"
      style={{
        left: position.x * scale + 20,
        top: position.y * scale - 50,
        zIndex: 10,
      }}
    >
      {/* 番号バッジ */}
      <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
        {region.number}
      </div>

      {/* プロンプト入力 */}
      <textarea
        value={region.prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="この部分をどう変更しますか？"
        className="w-full h-16 p-2 text-xs border rounded resize-none"
      />

      {/* アクションボタン */}
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={onGenerate}
          disabled={region.status === "generating" || !region.prompt.trim()}
        >
          {region.status === "generating" ? "生成中..." : "生成"}
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete}>
          削除
        </Button>
      </div>

      {/* 生成結果 */}
      {region.resultDataUrl && (
        <div className="mt-2 space-y-2">
          <img
            src={region.resultDataUrl}
            alt="Generated"
            className="w-full rounded"
          />
          <Button size="sm" className="w-full" onClick={onApply}>
            この結果を適用
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## 3. 全体の状態管理

### 状態

```typescript
const [regions, setRegions] = useState<MaskRegion[]>([]);
const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

// 新しい領域を追加
const addRegion = useCallback((boundingBox: BoundingBox, maskDataUrl: string) => {
  const newRegion: MaskRegion = {
    id: generateId(),
    number: regions.length + 1,
    boundingBox,
    maskDataUrl,
    prompt: "",
    status: "idle",
  };
  setRegions((prev) => [...prev, newRegion]);
  setActiveRegionId(newRegion.id);
}, [regions.length]);

// 領域のプロンプトを更新
const updateRegionPrompt = useCallback((id: string, prompt: string) => {
  setRegions((prev) =>
    prev.map((r) => (r.id === id ? { ...r, prompt } : r))
  );
}, []);

// 領域を生成
const generateRegion = useCallback(async (id: string) => {
  const region = regions.find((r) => r.id === id);
  if (!region) return;

  setRegions((prev) =>
    prev.map((r) => (r.id === id ? { ...r, status: "generating" } : r))
  );

  try {
    const res = await fetch("/api/dev/gemini/magic-pen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: region.prompt,
        imageDataUrl: initialImageDataUrl,
        maskDataUrl: region.maskDataUrl,
        refImages: [],
      }),
    });

    const data = await res.json();
    if (data.ok) {
      setRegions((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "done", resultDataUrl: data.imageDataUrl } : r
        )
      );
    } else {
      setRegions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "error" } : r))
      );
    }
  } catch (err) {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "error" } : r))
    );
  }
}, [regions, initialImageDataUrl]);

// 領域を削除
const deleteRegion = useCallback((id: string) => {
  setRegions((prev) => prev.filter((r) => r.id !== id));
  if (activeRegionId === id) {
    setActiveRegionId(null);
  }
}, [activeRegionId]);
```

---

## 4. 番号表示のオーバーレイ

### 実装

```typescript
// 番号オーバーレイを描画
const drawRegionNumbers = useCallback(() => {
  const canvas = overlayCanvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  regions.forEach((region) => {
    const centroid = calculateCentroid(maskCanvasRef.current!, region.boundingBox);
    
    // 番号バッジを描画
    const radius = 12;
    const x = centroid.x;
    const y = centroid.y;

    // 円形背景
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = region.id === activeRegionId ? "#3b82f6" : "#6b7280";
    ctx.fill();

    // 番号テキスト
    ctx.fillStyle = "white";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(region.number.toString(), x, y);

    // 選択中の領域はハイライト
    if (region.id === activeRegionId) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        region.boundingBox.x,
        region.boundingBox.y,
        region.boundingBox.width,
        region.boundingBox.height
      );
      ctx.setLineDash([]);
    }
  });
}, [regions, activeRegionId]);
```

---

## 5. UI全体の統合

### メインコンポーネントの更新

```typescript
return (
  <div className="flex h-full">
    {/* Main Canvas Area */}
    <div ref={containerRef} className="flex-1 flex flex-col p-4 overflow-hidden relative">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        {/* ... existing toolbar ... */}
      </div>

      {/* Canvas Container */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden relative">
        <div style={{ position: "relative" }}>
          <canvas ref={canvasRef} style={{ transform: `scale(${scale})` }} />
          <canvas ref={maskCanvasRef} style={{ ... }} />
          <canvas ref={overlayCanvasRef} style={{ ... }} />
        </div>

        {/* Region Chat Boxes */}
        {regions.map((region) => (
          <RegionChatBox
            key={region.id}
            region={region}
            position={calculateCentroid(maskCanvasRef.current!, region.boundingBox)}
            scale={scale}
            onPromptChange={(prompt) => updateRegionPrompt(region.id, prompt)}
            onGenerate={() => generateRegion(region.id)}
            onDelete={() => deleteRegion(region.id)}
            onApply={() => applyRegionResult(region.id)}
          />
        ))}
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground mt-2 text-center">
        編集したい領域をブラシで塗ってください。塗り終わると編集ボックスが表示されます。
      </p>
    </div>

    {/* Right Panel - 領域リスト */}
    <div className="w-80 border-l bg-card flex flex-col p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">編集領域（{regions.length}）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {regions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              領域を塗ってください
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className={`p-2 rounded border cursor-pointer ${
                    region.id === activeRegionId ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setActiveRegionId(region.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {region.number}
                    </span>
                    <span className="text-xs truncate flex-1">
                      {region.prompt || "（未入力）"}
                    </span>
                    <span className="text-xs">
                      {region.status === "generating" && "⏳"}
                      {region.status === "done" && "✅"}
                      {region.status === "error" && "❌"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 全体生成ボタン */}
      <Button
        onClick={generateAllRegions}
        disabled={regions.length === 0 || regions.some((r) => r.status === "generating")}
        className="w-full"
      >
        全領域を一括生成
      </Button>

      {/* Actions */}
      <div className="mt-auto pt-4">
        <Button variant="outline" onClick={onCancel} className="w-full">
          キャンセル
        </Button>
      </div>
    </div>
  </div>
);
```

---

## 実装優先順位

### Phase 1: 基本機能
1. [ ] 複数マスク領域の管理（`MaskRegion[]` 状態）
2. [ ] 領域の境界ボックス検出
3. [ ] 領域ごとの番号表示（オーバーレイキャンバス）

### Phase 2: インラインチャット
4. [ ] RegionChatBox コンポーネント作成
5. [ ] 領域の重心にチャットボックス配置
6. [ ] 領域ごとの編集指示入力

### Phase 3: 生成・適用
7. [ ] 領域ごとの生成APIコール
8. [ ] 生成結果のプレビュー表示
9. [ ] 結果の適用（合成）機能

### Phase 4: UX改善
10. [ ] 領域選択時のハイライト
11. [ ] 右パネルの領域リスト
12. [ ] 全領域一括生成

---

## 完了条件

1. [ ] マジックペンで塗った領域に番号（①②③...）が表示される
2. [ ] 塗り終わると、領域の近くにチャットボックスが出現する
3. [ ] 各領域に個別の編集指示を入力できる
4. [ ] 「生成」ボタンでその領域のみ生成できる
5. [ ] 生成結果をプレビューして「適用」できる
6. [ ] 右パネルに領域リストが表示される
7. [ ] 全領域を一括生成できる

---

## ファイル構成

```
src/
├── components/
│   └── magic-pen/
│       ├── MagicPenEditor.tsx           # 簡易版（既存）
│       ├── MagicPenEditorFull.tsx       # フル機能版（既存）
│       ├── MagicPenEditorV2.tsx         # NEW: 番号付きマスク版
│       ├── RegionChatBox.tsx            # NEW: インラインチャット
│       ├── RegionList.tsx               # NEW: 右パネル領域リスト
│       └── utils/
│           └── region-detection.ts      # NEW: 領域検出ユーティリティ
```

---

**バージョン**: 1.0
**ステータス**: 実装待ち
**優先度**: 高（UX改善）
**参考**: Manus AI のマジックペン機能
