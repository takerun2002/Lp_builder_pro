# ClaudeCode タスク指示書

## 🎯 プロジェクト概要

**LP Builder Pro - 内田式リサーチエージェント実装**

内田式コンセプト作成メソッドをAI自動化し、ターゲットの悩み収集→競合分析→売れるコンセプト提案を行うリサーチエージェントを実装します。

---

## 📋 タスク一覧（優先度順）

### ✅ 完了済み
- [x] 基本的なリサーチUI (`src/app/dev/research/page.tsx`)
- [x] 型定義 (`src/lib/research/types.ts`)
- [x] Firecrawl統合 (`src/lib/research/firecrawl.ts`)
- [x] Gemini Interactions API統合 (`src/lib/research/orchestrator.ts`)
- [x] Infotopスクレイパー基盤 (`src/lib/research/scrapers/infotop.ts`)

---

### 🔴 Phase 1: 競合発見・分析（最優先）

#### Task 1.1: Google検索で競合LP発見
```
ファイル: src/lib/research/scrapers/google.ts

機能:
- ターゲットが検索しそうなキーワードでGoogle検索
- 上位10件のURLを取得
- 広告出稿者のURLも取得（広告=うまくいっている証拠）

入力:
- keywords: string[] - 検索キーワード（例: ["元カノ 復縁", "彼女 作り方"]）
- region: 'japan' | 'us' など

出力:
interface GoogleSearchResult {
  organic: { url: string; title: string; snippet: string; position: number }[];
  ads: { url: string; title: string; description: string }[];
}

注意点:
- Firecrawlのsearch機能を使用
- 広告は特に重要（お金をかけている=利益が出ている）
```

#### Task 1.2: 競合セールスレター分析
```
ファイル: src/lib/research/analyzers/concept-extractor.ts

機能:
- 競合LPのセールスレターをスクレイピング（Firecrawl）
- Gemini APIでコンセプト・キーワードを抽出

入力:
- url: string - 競合LPのURL
- markdown: string - スクレイピング済みマークダウン

出力:
interface CompetitorAnalysis {
  url: string;
  concept: string;           // ヘッドコピー（コンセプト）
  targetPain: string;        // ターゲットの悩み
  benefit: string;           // 提示しているベネフィット
  sections: string[];        // セクション構成
  powerWords: string[];      // パワーワード一覧
  ctaTexts: string[];        // CTAボタンの文言
  pricePoint?: number;       // 価格
  testimonialCount?: number; // お客様の声の数
}

Geminiプロンプト例:
「このセールスレターを分析し、以下を抽出してください：
1. メインコンセプト（ヘッドコピー）
2. ターゲットの悩み
3. 提示しているベネフィット
4. 使われているパワーワード（興味を引く言葉）
5. CTA（行動喚起）の文言」
```

---

### 🔴 Phase 2: 悩み収集

#### Task 2.1: Yahoo知恵袋スクレイピング
```
ファイル: src/lib/research/scrapers/yahoo-chiebukuro.ts

機能:
- ジャンル関連キーワードで知恵袋検索
- 悩み投稿の本文を収集
- 深刻度キーワード（"つらい", "どうすれば", "助けて"）で分類

入力:
- keywords: string[] - 検索キーワード
- limit: number - 取得件数（デフォルト50）

出力:
interface ChiebukuroResult {
  question: string;      // 質問タイトル
  body: string;          // 質問本文
  answers: number;       // 回答数
  views: number;         // 閲覧数
  date: string;          // 投稿日
  severityKeywords: string[]; // 深刻度キーワード
  category: string;      // カテゴリ
}

注意点:
- Firecrawlでスクレイピング
- detail.chiebukuro.yahoo.co.jp のパース
- 閲覧数が多い=多くの人が同じ悩みを持っている
```

#### Task 2.2: 悩み分類（深さ×緊急性マトリックス）
```
ファイル: src/lib/research/analyzers/pain-classifier.ts

機能:
- 収集した悩みをGemini APIで分析
- 深さ（1-5）と緊急性（1-5）をスコアリング
- 4象限に分類

入力:
- painPoints: string[] - 収集した悩みテキスト

出力:
interface ClassifiedPainPoint {
  original: string;
  summary: string;       // 要約（1行）
  depth: 1 | 2 | 3 | 4 | 5;
  urgency: 1 | 2 | 3 | 4 | 5;
  quadrant: 'priority' | 'important' | 'consider' | 'ignore';
  keywords: string[];    // 悩みに含まれるキーワード
}

Geminiプロンプト例:
「以下の悩みを分析し、深刻度と緊急性をそれぞれ1-5でスコアリングしてください。
深刻度: お金を払ってでも解決したいレベルか
緊急性: 今すぐ解決したいか、後回しでも良いか」
```

---

### 🔴 Phase 3: キーワード収集

#### Task 3.1: Amazon書籍タイトル収集
```
ファイル: src/lib/research/scrapers/amazon.ts

機能:
- ジャンルキーワードでAmazon書籍検索
- タイトル、サブタイトル、口コミ数を取得
- 売れてそうなタイトルの切り口を抽出

入力:
- keyword: string - 検索キーワード（例: "ダイエット"）
- limit: number - 取得件数（デフォルト30）

出力:
interface AmazonBookResult {
  title: string;
  subtitle?: string;
  author: string;
  reviewCount: number;
  rating: number;
  url: string;
  extractedConcepts: string[]; // タイトルから抽出した切り口
}

注意点:
- Firecrawlでamazon.co.jp/s?k=キーワード&i=stripbooks をスクレイピング
- 口コミ数が多い=売れている=コンセプトが刺さっている
```

#### Task 3.2: YouTube動画タイトル収集
```
ファイル: src/lib/research/scrapers/youtube.ts

機能:
- ジャンルキーワードでYouTube動画検索
- タイトル、再生数、チャンネル登録者数を取得
- チャンネル平均より伸びている動画を特定

入力:
- keyword: string - 検索キーワード
- limit: number - 取得件数（デフォルト30）

出力:
interface YouTubeVideoResult {
  title: string;
  viewCount: number;
  channelName: string;
  channelSubscribers: number;
  channelAvgViews?: number;  // チャンネル平均再生数
  viewRatio?: number;        // 平均比（1.0以上=伸びている）
  url: string;
  extractedKeywords: string[];
}

注意点:
- YouTube Data APIまたはFirecrawlでスクレイピング
- 平均再生数より伸びている動画=そのタイトルが刺さっている
- 内田式ポイント: 「平均5万のチャンネルで49万再生=刺さっている」
```

---

### 🔴 Phase 4: コンセプト生成

#### Task 4.1: 内田式コンセプトジェネレーター
```
ファイル: src/lib/research/concept-generator.ts

機能:
- 収集したデータを統合
- 内田式6ステップに基づきコンセプト生成
- 競合コンセプト + 収集キーワード → 新コンセプト

入力:
interface ConceptGeneratorInput {
  competitors: CompetitorAnalysis[];
  painPoints: ClassifiedPainPoint[];
  keywords: {
    amazon: string[];
    youtube: string[];
    infotop: string[];
  };
  target: {
    age: string;
    gender: string;
    situation: string;
  };
}

出力:
interface ConceptCandidate {
  headline: string;      // コンセプト（21文字以内理想）
  headlineLong?: string; // 長いバージョン
  targetPain: string;
  benefit: string;
  benefitConcrete: string; // 具体的表現
  usedKeywords: string[];
  referenceCompetitor?: string;
  scores: {
    benefitClarity: number;  // ベネフィット明確度
    specificity: number;     // 具体性
    impact: number;          // インパクト
    overall: number;
  };
  rationale: string;     // なぜこのコンセプトを提案したか
}

Geminiプロンプト構成:
1. 悩みマトリックスの優先象限を提示
2. 競合コンセプトを参考として提示
3. 収集キーワードを素材として提示
4. 「ベネフィット + 悩み + 具体的表現」の組み合わせでコンセプト生成を指示
5. 21文字以内版と長文版の両方を生成
```

---

### 🟡 Phase 5: UI改善

#### Task 5.1: リサーチウィザードUI
```
ファイル: src/app/dev/research/page.tsx の更新

機能:
- ステップウィザード形式に変更
- 各ステップで進捗表示
- 結果をタブで整理

ステップ構成:
1. ターゲット設定（ジャンル、ターゲット像）
2. 競合発見（自動実行、結果表示）
3. 悩み収集（自動実行、マトリックス表示）
4. キーワード収集（自動実行、バンク表示）
5. コンセプト生成（候補カード表示）
6. 結果サマリー（エクスポート可能）
```

#### Task 5.2: コンポーネント追加
```
新規ファイル:
- src/components/research/PainPointMatrix.tsx  # 悩みマトリックス可視化
- src/components/research/KeywordBank.tsx      # キーワードバンク
- src/components/research/ConceptCard.tsx      # コンセプト候補カード
- src/components/research/CompetitorCard.tsx   # 競合分析カード
```

---

## 📁 ファイル構成（最終形）

```
src/
├── app/
│   ├── api/research/
│   │   ├── route.ts                    # 統合エンドポイント（既存）
│   │   ├── competitors/route.ts        # 競合発見
│   │   ├── pain-points/route.ts        # 悩み収集
│   │   ├── keywords/
│   │   │   ├── amazon/route.ts
│   │   │   ├── youtube/route.ts
│   │   │   └── infotop/route.ts
│   │   └── concept/route.ts            # コンセプト生成
│   │
│   └── dev/research/
│       └── page.tsx                    # UIページ（更新）
│
├── lib/research/
│   ├── types.ts                        # 型定義（更新）
│   ├── orchestrator.ts                 # オーケストレーター（更新）
│   ├── concept-generator.ts            # コンセプト生成（新規）
│   ├── firecrawl.ts                    # Firecrawl統合（既存）
│   │
│   ├── scrapers/
│   │   ├── google.ts                   # Google検索（新規）
│   │   ├── amazon.ts                   # Amazon書籍（新規）
│   │   ├── youtube.ts                  # YouTube（新規）
│   │   ├── yahoo-chiebukuro.ts         # 知恵袋（新規）
│   │   ├── infotop.ts                  # Infotop（既存）
│   │   └── competitor.ts               # 競合LP（既存）
│   │
│   └── analyzers/
│       ├── concept-extractor.ts        # コンセプト抽出（新規）
│       ├── pain-classifier.ts          # 悩み分類（新規）
│       └── keyword-ranker.ts           # キーワードランキング（新規）
│
└── components/research/
    ├── ResearchWizard.tsx              # ウィザード（新規）
    ├── PainPointMatrix.tsx             # マトリックス（新規）
    ├── KeywordBank.tsx                 # キーワードバンク（新規）
    ├── ConceptCard.tsx                 # コンセプトカード（新規）
    └── CompetitorCard.tsx              # 競合カード（新規）
```

---

## ⚠️ 重要な実装ポイント

### 1. 競合分析が最重要
> 「競合のセールスレターはリサーチの集大成」（内田式）

競合のセールスレターを徹底的に分析し、コンセプトを抽出することを最優先してください。

### 2. 「点」を大量に集める
> 「頭の中にないものは出てこない」（内田式）

- 悩み: 50個以上
- キーワード: 30個以上
- 競合: 5社以上

### 3. 21文字以内のコンセプト
> 「3秒で理解できるもの」（内田式）

長いコンセプトは短縮版も必ず提案。

### 4. 具体的なベネフィット
> 「美肌」ではなく「娘と姉妹に間違えられるほどのキメ細かい肌」

抽象的なベネフィットは必ず具体化。

### 5. 深さ×緊急性マトリックス
優先象限（深い×緊急）の悩みを解決するコンセプトが売れる。

---

## 🔗 参考ドキュメント

- `docs/research_agent_design.md` - 全体設計書
- `docs/research_agent_uchida_spec.md` - 内田式対応仕様書
- `docs/research_agent_implementation.md` - 実装ガイド
- `/Users/okajima/Downloads/内田式売れるコンセプト作成.txt` - 内田式メソッド原文
- `/Users/okajima/Downloads/内田式リサーチ方法.txt` - リサーチ方法原文

---

## 🚀 開始コマンド

```bash
# 開発サーバー起動
cd /Users/okajima/Lp_builder_pro
npm run dev

# リサーチページにアクセス
open http://localhost:3000/dev/research
```

**実装開始してください！🔥**
