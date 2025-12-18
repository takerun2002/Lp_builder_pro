# LP Builder Pro - 最強Chrome拡張機能仕様書 🔌

## 🎯 コンセプト

**「競合LPを見るだけでリサーチが完了する」**

普段のWeb閲覧がそのまま競合分析・コンセプト発見作業になる。

---

## 🌟 使用イメージ

### シーン1: 競合LPを発見した瞬間

```
┌─────────────────────────────────────────────────────────────────┐
│ 🌐 競合LP: https://diet-supplement.com                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌───────────────────────────────────────────────────────┐   │
│    │                                                       │   │
│    │   たった30日で-10kg！                                │   │
│    │   科学的根拠に基づいた最新ダイエット                   │   │
│    │                                                       │   │
│    │   [今すぐ申し込む]                                    │   │
│    │                                                       │   │
│    └───────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────┐                            │
│    │ 📊 LP Builder Pro            │  ← フローティングボタン   │
│    │    ワンクリックで分析開始     │                            │
│    └──────────────────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### シーン2: ワンクリック後（Side Panel）

```
┌──────────────────────────────────────┬──────────────────────────┐
│ 🌐 競合LP (左半分)                   │ 📊 分析パネル (右半分)   │
├──────────────────────────────────────┼──────────────────────────┤
│                                      │                          │
│    たった30日で-10kg！               │ 🔍 分析中...             │
│    科学的根拠に基づいた              │                          │
│    最新ダイエット                    │ ✅ ヘッドコピー抽出      │
│                                      │    「たった30日で-10kg」 │
│    [今すぐ申し込む]                  │                          │
│                                      │ ✅ CTA検出: 5箇所        │
│    お客様の声...                     │    • 今すぐ申し込む      │
│                                      │    • 無料で試す          │
│    価格: ¥9,800                     │    • 詳細を見る...       │
│                                      │                          │
│                                      │ ✅ 価格: ¥9,800         │
│                                      │                          │
│                                      │ ✅ お客様の声: 12件      │
│                                      │                          │
│                                      │ 🎯 コンセプト候補:       │
│                                      │ 「30日で結果が出る       │
│                                      │   科学的ダイエット」     │
│                                      │                          │
│                                      │ [📥 リサーチに追加]      │
│                                      │ [📊 詳細分析]            │
│                                      │ [🔄 競合比較]            │
└──────────────────────────────────────┴──────────────────────────┘
```

### シーン3: Yahoo知恵袋を閲覧中

```
┌─────────────────────────────────────────────────────────────────┐
│ 🌐 Yahoo知恵袋: 「ダイエット つらい」検索結果                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Q: 産後太りが戻らなくて本当につらいです...                      │
│     3ヶ月経っても全然痩せません。どうすれば...                   │
│                                                                 │
│     ┌────────────────────────┐                                  │
│     │ 😢 悩みをリサーチに追加 │  ← ホバーで表示                 │
│     └────────────────────────┘                                  │
│                                                                 │
│  Q: 30代になってから何をしても痩せなくなりました...             │
│     食事制限しても運動しても...                                  │
│                                                                 │
│     ┌────────────────────────┐                                  │
│     │ 😢 悩みをリサーチに追加 │                                  │
│     └────────────────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### シーン4: Amazon書籍ページ

```
┌─────────────────────────────────────────────────────────────────┐
│ 🌐 Amazon: 「ダイエット」書籍検索結果                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📚 「5日間で一生太らない体を作る」                             │
│     ⭐⭐⭐⭐⭐ (1,234 reviews)                                      │
│     ┌──────────────────────────┐                                │
│     │ 📝 タイトルをKW追加      │  ← ホバーで表示               │
│     │ スコア: 高 (レビュー多)  │                                │
│     └──────────────────────────┘                                │
│                                                                 │
│  📚 「お医者さんが考えた痩せる朝ごはん」                        │
│     ⭐⭐⭐⭐ (567 reviews)                                          │
│     ┌──────────────────────────┐                                │
│     │ 📝 タイトルをKW追加      │                                │
│     │ スコア: 中               │                                │
│     └──────────────────────────┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 主要機能

### 機能1: LP自動検出 & ワンクリック分析

```typescript
// LP検出ロジック
const LP_INDICATORS = {
  elements: [
    'button[class*="cta"]',
    '[class*="hero"]',
    'form[class*="signup"]',
    '[class*="testimonial"]',
    '[class*="pricing"]',
  ],
  keywords: [
    '今すぐ', '申し込み', '無料', '限定',
    '実績', 'お客様の声', '特典',
  ],
  structure: {
    minCTAButtons: 2,
    hasTestimonials: true,
    hasPricing: true,
  }
};

// LP検出時に自動でボタン表示
if (detectLP(document)) {
  injectFloatingButton();
}
```

**抽出項目**:
- ヘッドコピー（h1, h2）
- CTAボタン（テキスト、色、位置）
- 価格情報
- お客様の声の数
- 特典・保証
- ページ構成（セクション順序）

---

### 機能2: 悩みスナイパー（知恵袋・口コミ特化）

```typescript
// 対応サイト
const PAIN_POINT_SITES = {
  'chiebukuro.yahoo.co.jp': {
    questionSelector: '.SearchBox_result__item',
    extractPain: (el) => ({
      title: el.querySelector('h3')?.textContent,
      body: el.querySelector('p')?.textContent,
      views: extractNumber(el, '.view-count'),
      answers: extractNumber(el, '.answer-count'),
    })
  },
  'amazon.co.jp': {
    reviewSelector: '[data-hook="review"]',
    extractPain: (el) => ({
      rating: extractStars(el),
      title: el.querySelector('[data-hook="review-title"]')?.textContent,
      body: el.querySelector('[data-hook="review-body"]')?.textContent,
      helpful: extractNumber(el, '.helpful-count'),
    })
  },
  'youtube.com': {
    commentSelector: '#content-text',
    extractPain: (el) => ({
      text: el.textContent,
      likes: extractNumber(el.closest('.comment'), '.like-count'),
    })
  }
};

// 深刻度キーワード
const SEVERITY_KEYWORDS = [
  'つらい', '助けて', 'どうすれば', '限界',
  '悩んでます', '困ってます', '本当に',
];
```

**使い方**:
1. 知恵袋で検索
2. 気になる悩み投稿にホバー
3. 「😢 悩みをリサーチに追加」をクリック
4. 自動で深刻度スコアリング

---

### 機能3: キーワードハンター（書籍・動画タイトル特化）

```typescript
// 対応サイト
const KEYWORD_SITES = {
  'amazon.co.jp': {
    bookSelector: '[data-component-type="s-search-result"]',
    extractKeyword: (el) => ({
      title: el.querySelector('h2')?.textContent,
      reviewCount: extractNumber(el, '.s-link-style .a-size-base'),
      rating: extractStars(el),
      // レビュー数が多い = 売れてる = タイトルが刺さってる
      score: calculateScore(reviewCount, rating),
    })
  },
  'youtube.com': {
    videoSelector: 'ytd-video-renderer',
    extractKeyword: (el) => ({
      title: el.querySelector('#video-title')?.textContent,
      views: extractViews(el),
      channelSubs: extractChannelSubs(el),
      // 平均より伸びてる = タイトルが刺さってる
      viewRatio: calculateViewRatio(views, channelAvg),
    })
  },
  'infotop.jp': {
    productSelector: '.ranking-item',
    extractKeyword: (el) => ({
      name: el.querySelector('.product-name')?.textContent,
      price: extractPrice(el),
      rank: extractRank(el),
    })
  }
};
```

**使い方**:
1. Amazon書籍検索
2. 売れてる本のタイトルにホバー
3. 「📝 タイトルをKW追加」をクリック
4. 自動でパワーワード抽出

---

### 機能4: 競合ウォッチャー（監視リスト）

```typescript
// 監視設定
interface WatchConfig {
  url: string;
  checkInterval: 'daily' | 'weekly';
  watchItems: ('headline' | 'price' | 'cta' | 'testimonials')[];
  notifyOn: 'change' | 'significant_change';
}

// 変更検出
async function detectChanges(config: WatchConfig) {
  const previous = await getLastSnapshot(config.url);
  const current = await crawlLP(config.url);
  
  const changes = compareSnapshots(previous, current, config.watchItems);
  
  if (changes.length > 0) {
    // Chrome通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '⚠️ 競合LP変更検出',
      message: `${config.url} のヘッドコピーが変更されました`,
    });
    
    // Slack通知（設定されている場合）
    if (config.slackWebhook) {
      await notifySlack(config.slackWebhook, changes);
    }
  }
}
```

**使い方**:
1. 競合LPで「👁️ 監視リストに追加」
2. 監視項目を選択（ヘッドコピー、価格など）
3. 変更があったらプッシュ通知

---

### 機能5: AIシンキング表示（Open Researcher風）

```typescript
// リアルタイム思考表示
interface ThinkingStep {
  step: number;
  status: 'pending' | 'running' | 'completed';
  title: string;
  detail?: string;
  result?: any;
}

const ANALYSIS_STEPS: ThinkingStep[] = [
  { step: 1, title: 'ページ構造を解析中...' },
  { step: 2, title: 'ヘッドコピーを抽出中...' },
  { step: 3, title: 'CTAボタンを検出中...' },
  { step: 4, title: '価格情報を取得中...' },
  { step: 5, title: 'お客様の声をカウント中...' },
  { step: 6, title: 'AIがコンセプトを分析中...' },
  { step: 7, title: 'スコアを計算中...' },
];

// Side Panel UI
function ThinkingPanel({ steps }) {
  return (
    <div className="thinking-panel">
      {steps.map(step => (
        <div key={step.step} className={`step ${step.status}`}>
          {step.status === 'running' && <Spinner />}
          {step.status === 'completed' && <CheckIcon />}
          <span>{step.title}</span>
          {step.result && <span className="result">{step.result}</span>}
        </div>
      ))}
    </div>
  );
}
```

---

## 📐 UI/UX設計

### Side Panel レイアウト

```
┌────────────────────────────────────────────────────────────┐
│ 📊 LP Builder Pro                               [⚙️] [×]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📍 現在のページ                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ https://diet-supplement.com                            ││
│ │ タイプ: ランディングページ ✅                          ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                            │
│ 🔍 クイック分析                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ ヘッドコピー                                           ││
│ │ 「たった30日で-10kg！科学的根拠に基づいた...」         ││
│ │ 文字数: 28文字                                         ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ CTA: 5箇所  │  価格: ¥9,800  │  証言: 12件            ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                            │
│ 🎯 コンセプト候補 (AI生成)                                 │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 1. 「30日で結果が出る科学的ダイエット」  スコア: 85    ││
│ │ 2. 「科学が証明した-10kgメソッド」      スコア: 82    ││
│ │ 3. 「30日で人生が変わるダイエット」     スコア: 78    ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                            │
│ ┌──────────────────┐  ┌──────────────────┐                │
│ │ 📥 リサーチに追加 │  │ 📊 詳細分析     │                │
│ └──────────────────┘  └──────────────────┘                │
│                                                            │
│ ┌──────────────────┐  ┌──────────────────┐                │
│ │ 👁️ 監視リスト追加│  │ 🔄 競合と比較   │                │
│ └──────────────────┘  └──────────────────┘                │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ 📋 最近のリサーチ (3件)                                    │
│ • diet-supplement.com (1分前)                              │
│ • beauty-lp.jp (昨日)                                      │
│ • health-product.co.jp (3日前)                             │
│                                                     [もっと見る] │
└────────────────────────────────────────────────────────────┘
```

### Popup メニュー

```
┌──────────────────────────────────────┐
│ 📊 LP Builder Pro           v1.0.0  │
├──────────────────────────────────────┤
│                                      │
│ 🔍 このページを分析                  │
│ 📥 リサーチに追加                    │
│ 👁️ 監視リストに追加                 │
│                                      │
├──────────────────────────────────────┤
│                                      │
│ 📋 ダッシュボード                    │
│ 📊 リサーチ一覧                      │
│ 🔑 キーワードバンク                  │
│ 👁️ 監視リスト                       │
│                                      │
├──────────────────────────────────────┤
│                                      │
│ ⚙️ 設定                              │
│    • API Key 設定                    │
│    • Google連携                      │
│    • 通知設定                        │
│                                      │
├──────────────────────────────────────┤
│                                      │
│ 📤 Google Sheetsに同期               │
│    最終同期: 5分前                   │
│                                      │
└──────────────────────────────────────┘
```

---

## 🛠️ 技術スタック

### Plasmo フレームワーク

```bash
# プロジェクト作成
npm create plasmo@latest lp-builder-extension

# ディレクトリ構成
lp-builder-extension/
├── src/
│   ├── contents/
│   │   ├── lp-detector.tsx      # LP検出 & フローティングボタン
│   │   ├── pain-sniper.tsx      # 悩み収集（知恵袋等）
│   │   └── keyword-hunter.tsx   # キーワード収集（Amazon等）
│   ├── sidepanel/
│   │   ├── index.tsx            # メインパネル
│   │   ├── components/
│   │   │   ├── AnalysisResult.tsx
│   │   │   ├── ConceptList.tsx
│   │   │   ├── ThinkingProcess.tsx
│   │   │   └── QuickActions.tsx
│   │   └── hooks/
│   │       ├── useAnalysis.ts
│   │       └── useStorage.ts
│   ├── popup/
│   │   └── index.tsx            # Popup メニュー
│   ├── background.ts            # Service Worker
│   └── lib/
│       ├── api.ts               # Backend通信
│       ├── storage.ts           # Chrome Storage
│       └── extractors/
│           ├── lp.ts
│           ├── chiebukuro.ts
│           ├── amazon.ts
│           └── youtube.ts
├── assets/
│   ├── icon.png
│   └── styles.css
├── package.json
└── tsconfig.json
```

### 必要なパーミッション

```json
{
  "manifest_version": 3,
  "name": "LP Builder Pro",
  "version": "1.0.0",
  "description": "競合LP分析 & たけるん式リサーチ自動化",
  
  "permissions": [
    "storage",           // ローカルデータ保存
    "tabs",              // タブ情報取得
    "activeTab",         // 現在のタブ操作
    "scripting",         // スクリプト注入
    "sidePanel",         // Side Panel
    "notifications",     // プッシュ通知
    "alarms"             // 定期実行（監視用）
  ],
  
  "host_permissions": [
    "<all_urls>"         // 全サイトでContent Script
  ],
  
  "background": {
    "service_worker": "background.ts"
  },
  
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": "assets/icon.png"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contents/lp-detector.tsx"]
    },
    {
      "matches": ["*://chiebukuro.yahoo.co.jp/*"],
      "js": ["contents/pain-sniper.tsx"]
    },
    {
      "matches": ["*://www.amazon.co.jp/*"],
      "js": ["contents/keyword-hunter.tsx"]
    }
  ]
}
```

---

## 🔄 データフロー

```
┌──────────────────────────────────────────────────────────────────┐
│                      Chrome Extension                             │
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐                      │
│  │ Content Script  │───▶│ Background      │                      │
│  │ (各サイト)      │    │ Service Worker  │                      │
│  └─────────────────┘    └────────┬────────┘                      │
│                                  │                                │
│                    ┌─────────────┼─────────────┐                 │
│                    │             │             │                 │
│                    ▼             ▼             ▼                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Chrome Storage  │  │ Side Panel UI   │  │ Backend API     │  │
│  │ (ローカル)      │  │ (リアルタイム)   │  │ (LP Builder)    │  │
│  └─────────────────┘  └─────────────────┘  └────────┬────────┘  │
└──────────────────────────────────────────────────────│───────────┘
                                                       │
                                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    LP Builder Pro Backend                         │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Crawl4AI        │  │ AI Crew         │  │ Google Sheets   │  │
│  │ (詳細分析)      │  │ (コンセプト生成) │  │ (永続化)        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📅 実装ロードマップ

### Phase 1: 基盤構築（Week 1）

| タスク | 詳細 |
|--------|------|
| Plasmo セットアップ | プロジェクト作成、TypeScript設定 |
| Side Panel 基本UI | レイアウト、コンポーネント |
| Chrome Storage | データ保存・読み込み |
| Backend API連携 | 認証、エンドポイント接続 |

### Phase 2: LP分析機能（Week 2）

| タスク | 詳細 |
|--------|------|
| LP自動検出 | インジケーターベースの検出 |
| フローティングボタン | ワンクリック分析開始 |
| ヘッドコピー抽出 | h1, h2 解析 |
| CTA検出 | ボタン、リンク解析 |
| 価格情報抽出 | パターンマッチング |

### Phase 3: 悩み・キーワード収集（Week 3）

| タスク | 詳細 |
|--------|------|
| 知恵袋対応 | Content Script、抽出ロジック |
| Amazon対応 | 書籍タイトル、レビュー |
| YouTube対応 | 動画タイトル、コメント |
| Infotop対応 | ランキング商品 |

### Phase 4: AI統合 & 仕上げ（Week 4）

| タスク | 詳細 |
|--------|------|
| ThinkingProcess表示 | リアルタイム進捗 |
| コンセプト生成 | AI分析結果表示 |
| 監視機能 | アラーム、通知 |
| Google Sheets同期 | ワンクリック同期 |

---

## 💡 差別化ポイント

### 既存ツールとの比較

| 機能 | LP Builder Pro | 既存ツールA | 既存ツールB |
|------|---------------|------------|------------|
| LP自動検出 | ✅ | ❌ | ❌ |
| ワンクリック分析 | ✅ | ❌ | △ |
| 悩み収集 | ✅ | ❌ | ❌ |
| キーワード収集 | ✅ | ❌ | ❌ |
| AI コンセプト生成 | ✅ | ❌ | ❌ |
| たけるん式対応 | ✅ | ❌ | ❌ |
| Google Sheets連携 | ✅ | △ | ❌ |
| 競合監視 | ✅ | △ | △ |
| 思考過程可視化 | ✅ | ❌ | ❌ |

### ユニークな価値

1. **「見るだけリサーチ」** - 普段のブラウジングがリサーチ作業に
2. **たけるん式フレームワーク内蔵** - お金を払うレベルの悩みを自動判定
3. **AIシンキング表示** - 分析過程が見える安心感
4. **ワンクリック同期** - Google Sheetsで即座にチーム共有

---

## 🎯 まとめ

この Chrome 拡張があれば：

- 🔍 **競合LPを見るだけ**で自動分析
- 😢 **知恵袋を見るだけ**で悩み収集
- 📚 **Amazon書籍を見るだけ**でキーワード収集
- 🎯 **AIが自動で**コンセプト提案
- 📊 **ワンクリックで**Google Sheets同期
- ⚠️ **競合が変わったら**即座に通知

**「日常のWeb閲覧 = リサーチ作業」** が実現します！

---

**作成日**: 2025-12-15  
**バージョン**: 1.0  
**ステータス**: 仕様確定・実装待ち


