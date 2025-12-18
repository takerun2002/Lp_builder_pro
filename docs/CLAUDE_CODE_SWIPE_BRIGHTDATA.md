# Claude Code 実装指示書：LPデザイン収集＆Bright Data統合

## 概要

LP Builder Proに以下の機能を追加する：

1. **LPデザインスワイプファイルエージェント** - トンマナに合ったLPデザインを自動収集
2. **Bright Data API統合** - 高度なSNS・Webスクレイピング基盤
3. **マジックペン機能** - LPプレビュー上でAI編集

---

## 依頼1: LPデザインスワイプファイルエージェント

### 目的
初心者Webデザイナーがスワイプファイルを持っていない問題を解決。
AIがトンマナ・ジャンルに合ったLPデザインを自動で探して収集する。

### データソース
- **lp-web.com** - 日本語LP収集サイト（カテゴリ・色で分類済み）
- **LP Advance** - LP参考サイト
- **Parts Design** - LPパーツ別デザイン
- **Pinterest** - デザインインスピレーション（Bright Data経由）

### 実装要件

#### 1.1 スワイプファイル収集エージェント

```typescript
// src/lib/agents/swipe-file-agent.ts

interface SwipeFileSearchParams {
  // ジャンル指定
  category: SwipeCategory;
  // 色系統
  colorScheme?: string[];
  // トンマナキーワード
  keywords?: string[];
  // 収集枚数上限
  limit?: number;
  // 出力形式
  outputFormat: "gallery" | "pdf" | "zip";
}

type SwipeCategory = 
  | "beauty"      // 美容・化粧品
  | "health"      // 健康食品
  | "education"   // スクール・教育
  | "finance"     // 金融・保険
  | "saas"        // SaaS・BtoB
  | "ec"          // EC・物販
  | "service"     // サービス業
  | "recruit";    // 求人・採用

interface SwipeFileResult {
  id: string;
  sourceUrl: string;
  thumbnailUrl: string;
  screenshotPath?: string;
  category: SwipeCategory;
  colors: string[];         // 抽出した主要カラー
  industry: string;
  styleAnalysis: {
    layout: string;         // "Z型", "F型", "縦長スクロール"
    toneManner: string;     // "高級感", "ポップ", "信頼感"
    targetAudience: string; // "女性30代", "経営者"
    strengths: string[];    // デザインの強み
  };
  scrapedAt: Date;
}
```

#### 1.2 lp-web.comスクレイパー

```typescript
// src/lib/research/scrapers/lp-web-scraper.ts

export async function scrapeLpWebCom(params: {
  category?: string;
  color?: string;
  page?: number;
}): Promise<SwipeFileResult[]> {
  // lp-web.comのカテゴリマッピング
  const categoryMap = {
    beauty: "美容・化粧品",
    health: "健康食品・サプリメント",
    education: "スクール（専門学校・大学）・資格",
    finance: "金融・証券・保険・FP",
    saas: "BtoB",
    ec: "飲料・食品",
    service: "サービス",
    recruit: "求人・転職（人材系）",
  };
  
  const colorMap = {
    white: "白 [White]",
    pink: "桃 [Pink]",
    red: "赤 [Red]",
    orange: "橙 [Orange]",
    yellow: "黄 [Yellow]",
    green: "緑 [Green]",
    blue: "青 [Blue]",
    purple: "紫 [Purple]",
    black: "黒 [Black]",
  };
  
  // Firecrawl or Bright Data経由でスクレイピング
  // サムネイル画像とURLを収集
}
```

#### 1.3 AIスタイル分析

```typescript
// src/lib/agents/style-analyzer.ts

export async function analyzeLpStyle(
  screenshotUrl: string
): Promise<StyleAnalysis> {
  // Gemini Vision APIでLP画像を分析
  // - レイアウトパターン検出
  // - カラーパレット抽出
  // - トンマナ判定
  // - ターゲット層推定
}
```

#### 1.4 フロントエンドUI

```tsx
// src/app/dev/swipe-files/page.tsx

// 検索条件設定パネル
// - ジャンル選択（複数可）
// - 色系統選択
// - キーワード入力
// - 収集枚数

// 結果表示
// - グリッドギャラリー形式
// - サムネイルクリックで詳細モーダル
// - フィルタリング・並べ替え
// - PDF/ZIP一括エクスポート
```

---

## 依頼2: Bright Data API統合

### 目的
高度なWebスクレイピング・SNSデータ収集を実現。
既存のFirecrawlに加え、Bright Data Browser APIで動的コンテンツにも対応。

### 実装要件

#### 2.1 API設定（✅ 完了済み）
- 設定画面にBright Data APIキー入力欄を追加済み

#### 2.2 Bright Data クライアント

```typescript
// src/lib/scrapers/brightdata-client.ts

export interface BrightDataConfig {
  apiKey: string;
  zone?: string;        // データセンターゾーン
  country?: string;     // プロキシ国指定
}

export class BrightDataClient {
  constructor(config: BrightDataConfig) {}
  
  // Scraping Browser API
  async browseWithStealth(url: string, options: {
    waitFor?: string;    // セレクタ待機
    screenshot?: boolean;
    extractData?: (page: any) => Promise<any>;
  }): Promise<BrowseResult> {}
  
  // Web Unlocker API
  async unlockPage(url: string): Promise<string> {}
  
  // Scraper API (プリセット)
  async scrapeInstagram(query: {
    username?: string;
    hashtag?: string;
    limit?: number;
  }): Promise<InstagramPost[]> {}
  
  async scrapeTikTok(query: {
    username?: string;
    hashtag?: string;
    limit?: number;
  }): Promise<TikTokVideo[]> {}
  
  async scrapeX(query: {
    username?: string;
    keyword?: string;
    limit?: number;
  }): Promise<Tweet[]> {}
}
```

#### 2.3 SNSリサーチ統合

```typescript
// src/lib/research/scrapers/sns-scraper.ts

export async function researchSocialMedia(
  context: ResearchContext
): Promise<SnsResearchResult> {
  const brightdata = new BrightDataClient(getApiKey("brightdata"));
  
  // X (Twitter) トレンド分析
  const tweets = await brightdata.scrapeX({
    keyword: context.product.name,
    limit: 100,
  });
  
  // Instagram投稿分析
  const posts = await brightdata.scrapeInstagram({
    hashtag: context.product.category,
    limit: 50,
  });
  
  // TikTok動画分析
  const videos = await brightdata.scrapeTikTok({
    hashtag: context.product.name,
    limit: 30,
  });
  
  // AI分析して傾向を抽出
  return analyzeSnsTrends({ tweets, posts, videos });
}
```

#### 2.4 デザインスクレイピング統合

```typescript
// LP/バナーデザイン収集でBright Dataを活用
// - Pinterest検索結果の取得
// - Dribbble/Behanceからのインスピレーション
// - 競合LPのフルページスクリーンショット
```

---

## 依頼3: マジックペン機能（画像編集のみ・ワークスペース統合）

### 目的
**既に完成している**Toolsのマジックペン機能をワークスペースでも使えるようにする。
**テキスト編集は不要** - すべての編集はナノバナナプロ（Gemini画像生成）で行う。

### 現状

| 場所 | 状態 |
|------|------|
| `/projects/[id]/sections/[sectionId]/magic-pen/page.tsx` | **✅ 完成版** |
| `/projects/[id]/workspace/page.tsx` | 簡易版のみ |
| `/dev/magic-pen-lp/page.tsx` | テキスト編集パネル付き（**不要**）|

### 完成版の機能（移植対象）
- 矩形選択 / ブラシ選択 切り替え
- 参照画像スロット（最大6枚）
- Undo / Redo
- マスク表示 / 非表示
- 保護モード / 編集モード
- ズーム（Ctrl+ホイール）
- 合成処理（マスク領域のみ生成結果を適用）

### 実装要件

#### 3.1 マジックペンコンポーネントの抽出

```typescript
// src/components/magic-pen/MagicPenEditorFull.tsx
// 完成版マジックペンをコンポーネント化

interface MagicPenEditorFullProps {
  imageDataUrl: string;          // 編集対象画像
  projectId: string;             // スワイプファイル取得用
  onSave: (resultDataUrl: string) => Promise<void>;  // 保存コールバック
  onCancel: () => void;
}

// /projects/[id]/sections/[sectionId]/magic-pen/page.tsx から
// コア機能を抽出してコンポーネント化
```

#### 3.2 ワークスペースへの統合

```typescript
// /projects/[id]/workspace/page.tsx

// 既存の簡易版マジックペンを削除
// MagicPenEditorFull をモーダルまたはスライドオーバーで表示

const [showMagicPen, setShowMagicPen] = useState(false);
const [editingImage, setEditingImage] = useState<string | null>(null);

// セクションの「編集」ボタンクリック時
const handleEditSection = (section: Section) => {
  const imageUrl = getImageUrl(section.image_path);
  if (imageUrl) {
    setEditingImage(imageUrl);
    setShowMagicPen(true);
  }
};

// マジックペン保存時
const handleMagicPenSave = async (resultDataUrl: string) => {
  // セクション画像を更新
  await updateSectionImage(editingSection.id, resultDataUrl);
  setShowMagicPen(false);
};
```

#### 3.3 不要ファイルの削除/非表示

```
以下は削除または非表示にする：
- /dev/magic-pen-lp/page.tsx（テキスト編集デモ）
- src/components/editor/MagicEditPanel.tsx（テキスト編集パネル）
- src/lib/ai/magic-edit.ts（テキスト編集ロジック）
- src/app/api/magic-edit/route.ts（テキスト編集API）
```

#### 3.4 ワークフロー

```
1. 原稿作成（別機能）
2. 原稿を元にセクション画像を生成
3. 調整が必要な場合：
   a. ワークスペースでセクションを選択
   b. マジックペンで編集したい範囲をブラシ/矩形で選択
   c. プロンプト入力（例：「このボタンの文言を『今すぐ申し込む』に変えて」）
   d. Gemini画像生成で編集
   e. 結果をセクションに保存
```

---

## 依頼4: AIモデル使い分け（ワークスペースチャット）

### 目的
コスト最適化のため、用途に応じてAIモデルを使い分ける。

### 実装要件

```typescript
// src/app/projects/[id]/workspace/page.tsx の handleChatSubmit を修正

// 1. 壁打ち（テキストのみ）→ 無料のNVIDIA Nemotron（OpenRouter経由）
// 2. 画像生成 → Gemini API

const handleChatSubmit = async () => {
  const wantsImage = /生成|作って|作成|描いて|画像|イラスト|バナー|素材|漫画|マンガ|コマ/.test(promptText);
  
  if (wantsImage) {
    // Gemini APIで画像生成（現状通り）
  } else {
    // OpenRouter経由でNVIDIA Nemotron（無料）を使用
    const response = await fetch("/api/chat/openrouter", {
      method: "POST",
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano", // 無料モデル
        messages: [{ role: "user", content: promptText }],
      }),
    });
  }
};
```

### 新規API
- `/api/chat/openrouter/route.ts` - OpenRouter経由でチャット

---

## 実装優先度

| 優先度 | 機能 | 工数目安 |
|--------|------|----------|
| 🔴 高 | Bright Data クライアント | 4h |
| 🔴 高 | lp-web.comスクレイパー | 3h |
| 🔴 高 | **マジックペン移植**（完成版→ワークスペース）| 3h |
| 🟡 中 | **AIモデル使い分け**（Nemotron/Gemini）| 2h |
| 🟡 中 | スワイプファイルUI | 4h |
| 🟡 中 | SNSリサーチ統合 | 4h |
| 🟢 低 | 不要ファイル削除 | 1h |

---

## 法的考慮事項

### スクレイピングについて
- **本ツールはローカル実行・買い切り販売**
- SaaS形式での月額課金ではない
- 個人の学習・参考目的での収集
- robots.txtを尊重
- 収集データの再配布は行わない

### Bright Data利用規約
- ユーザー自身がAPIキーを取得・設定
- Bright Dataの利用規約に従う
- 収集データの利用はユーザーの責任

---

## ファイル構成（新規作成）

```
src/
├── lib/
│   ├── agents/
│   │   ├── swipe-file-agent.ts      # NEW
│   │   └── style-analyzer.ts        # NEW
│   ├── scrapers/
│   │   ├── brightdata-client.ts     # NEW
│   │   └── lp-web-scraper.ts        # NEW
│   └── ai/
│       └── magic-edit.ts            # NEW
├── components/
│   └── magic-pen/
│       ├── MagicPenEditorFull.tsx   # NEW（完成版を抽出）
│       ├── MagicPenEditor.tsx       # 既存（簡易版・残す）
│       └── MagicPenDialog.tsx       # 既存
└── app/
    ├── projects/
    │   └── [id]/
    │       └── workspace/
    │           └── page.tsx         # UPDATE（マジックペン統合）
    └── dev/
        └── swipe-files/
            └── page.tsx             # NEW
```

---

## 確認チェックリスト

- [ ] Bright Data クライアント実装
- [ ] lp-web.comスクレイパー実装
- [ ] スワイプファイル収集UI
- [ ] AIスタイル分析機能
- [ ] SNSリサーチ統合
- [ ] **マジックペン移植**（Tools版→ワークスペース）
- [ ] 不要ファイル削除（テキスト編集関連）
