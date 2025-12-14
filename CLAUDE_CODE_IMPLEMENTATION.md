# LP Builder Pro - Claude Code 実装タスク

## 📋 分類整理

### ✅ 機能として実装（優先）

| # | 機能 | 状態 | ファイル |
|---|------|------|----------|
| 1 | **リサーチエージェント（内田式）** | 設計済 | `docs/research_agent_uchida_spec.md` |
| 2 | **Meta広告ライブラリ スクレイパー** | ✅ 実装済 | `src/lib/research/scrapers/meta-ads.ts` |
| 3 | **ナレッジ構築機能（YAML変換）** | 設計段階 | 新規作成 |
| 4 | **キラーワード ナレッジ** | ✅ 作成済 | `src/lib/knowledge/killer_words.yaml` |
| 5 | **ライティングテクニック ナレッジ** | ✅ 作成済 | `src/lib/knowledge/writing_techniques.yaml` |
| 6 | **マーケティング戦略 ナレッジ** | ✅ 作成済 | `src/lib/knowledge/marketing_strategy.yaml` |
| 7 | **消費行動・購買導線 ナレッジ** | ✅ 作成済 | `src/lib/knowledge/consumer_behavior.yaml` |
| 8 | **Infotopスクレイパー** | ✅ 実装済 | `src/lib/research/scrapers/infotop.ts` |
| 9 | **競合LP分析スクレイパー** | ✅ 実装済 | `src/lib/research/scrapers/competitor.ts` |
| 10 | **AI分析機能** | ✅ 実装済 | `src/lib/research/ai-analyzer.ts` |

### ⏸️ 特典として保留（プロダクト完成後）

| # | コンテンツ | ファイル |
|---|-----------|----------|
| 1 | TRIZプロンプト | `docs/premium_prompts/triz_master.md` |
| 2 | セールスレター・マスター | `docs/premium_prompts/salesletter_master.md` |
| 3 | ヒアリングシート | `docs/premium_prompts/client_hearing_sheet.md` |
| 4 | LP構成テンプレート | `docs/premium_prompts/lp_structure_template.md` |
| 5 | パッケージ説明 | `docs/premium_prompts/PREMIUM_PACK_README.md` |

---

## 🎯 実装タスク一覧

### Phase 1: リサーチエージェント完成（優先度: 高）

#### Task 1.1: Yahoo知恵袋スクレイパー
```
ファイル: src/lib/research/scrapers/yahoo-chiebukuro.ts

機能:
- キーワードで質問を検索
- 質問タイトル、本文、閲覧数、回答数を取得
- ベストアンサーを抽出
- 悩みの深さ×緊急性でスコアリング

出力:
interface ChiebukuroResult {
  id: string;
  title: string;
  content: string;
  views: number;
  answers: number;
  bestAnswer?: string;
  depthScore: number;    // 悩みの深さ
  urgencyScore: number;  // 緊急性
}
```

#### Task 1.2: Amazon書籍スクレイパー
```
ファイル: src/lib/research/scrapers/amazon-books.ts

機能:
- ジャンル×キーワードで書籍検索
- タイトル、サブタイトル、レビュー数、評価を取得
- レビュー内容から悩みキーワードを抽出

出力:
interface AmazonBookResult {
  title: string;
  subtitle?: string;
  reviewCount: number;
  rating: number;
  extractedKeywords: string[];
  pricePoint: number;
}
```

#### Task 1.3: YouTube動画スクレイパー
```
ファイル: src/lib/research/scrapers/youtube.ts

機能:
- キーワードで動画検索
- タイトル、再生数、チャンネル平均比を取得
- 「平均より伸びてる動画」を特定

出力:
interface YouTubeVideoResult {
  title: string;
  views: number;
  channelAverage: number;
  performanceRatio: number;  // 再生数 / チャンネル平均
  keywords: string[];
}
```

#### Task 1.4: リサーチオーケストレーター更新
```
ファイル: src/lib/research/orchestrator.ts

機能:
- 全スクレイパーを統合
- 内田式フレームワークで分析
- 悩みマトリックス生成
- キーワードバンク生成
- コンセプト候補生成
```

### Phase 2: ナレッジ構築機能（優先度: 中）

#### Task 2.1: ナレッジインポートUI
```
ファイル: src/app/dev/knowledge/page.tsx

機能:
- テキスト/PDF/URLからインポート
- インポート内容のプレビュー
- カテゴリ選択（悩み/ベネフィット/キーワード等）
```

#### Task 2.2: AI構造化処理
```
ファイル: src/lib/knowledge/converter.ts

機能:
- Gemini APIでテキストを分析
- 構造化（セクション分け）
- 分類（悩み/ベネフィット/証拠/CTA/ストーリー）
- パワーワード抽出
- YAML形式に変換
```

#### Task 2.3: Magic Pen連携
```
ファイル: src/lib/ai/magic-pen.ts（既存を更新）

機能:
- ナレッジファイルを参照
- コピー生成時にナレッジを活用
- キラーワードを自動適用
- ライティングテクニックを自動適用
```

### Phase 3: リサーチUI改善（優先度: 中）

#### Task 3.1: リサーチ画面のUI改善
```
ファイル: src/app/dev/research/page.tsx

機能:
- プログレスバー表示
- リサーチ結果のビジュアル化
- 悩みマトリックス表示（深さ×緊急性）
- キーワードバンク表示
- 結果のエクスポート（JSON/YAML）
```

#### Task 3.2: リサーチソース選択UI
```
追加機能:
- ソース選択（Infotop/Meta広告/知恵袋/Amazon/YouTube）
- 地域設定（日本/海外）
- ジャンル設定
```

---

## 📝 Claude Code 依頼プロンプト

以下をClaude Codeにコピペして依頼してください：

---

### 依頼1: Yahoo知恵袋スクレイパー

```
# タスク
Yahoo知恵袋スクレイパーを実装してください。

# ファイル
src/lib/research/scrapers/yahoo-chiebukuro.ts

# 参考ファイル
- src/lib/research/scrapers/meta-ads.ts（実装パターン）
- src/lib/research/firecrawl.ts（Firecrawl使用方法）
- docs/research_agent_uchida_spec.md（内田式リサーチ仕様）

# 機能要件
1. キーワードで質問を検索
2. 取得する情報:
   - 質問タイトル
   - 質問本文
   - 閲覧数
   - 回答数
   - ベストアンサー
3. 悩みの深さ×緊急性でスコアリング
4. Firecrawlを使用してスクレイピング

# 型定義
interface ChiebukuroResult {
  id: string;
  title: string;
  content: string;
  url: string;
  views: number;
  answers: number;
  bestAnswer?: string;
  depthScore: number;    // 1-5
  urgencyScore: number;  // 1-5
  scrapedAt: string;
}

# 注意点
- レート制限対策（リクエスト間隔を空ける）
- エラーハンドリング
- 日本語の文字化け対策
```

---

### 依頼2: Amazon書籍スクレイパー

```
# タスク
Amazon Japan 書籍スクレイパーを実装してください。

# ファイル
src/lib/research/scrapers/amazon-books.ts

# 参考ファイル
- src/lib/research/scrapers/meta-ads.ts
- src/lib/research/firecrawl.ts

# 機能要件
1. ジャンル×キーワードで書籍検索
2. 取得する情報:
   - 書籍タイトル
   - サブタイトル
   - 著者
   - レビュー数
   - 評価（★）
   - 価格
3. レビュー内容から悩みキーワードを抽出
4. 「売れてる本のタイトル = 刺さるコンセプト」の観点で分析

# 型定義
interface AmazonBookResult {
  asin: string;
  title: string;
  subtitle?: string;
  author: string;
  reviewCount: number;
  rating: number;
  price?: number;
  extractedKeywords: string[];
  url: string;
  scrapedAt: string;
}

# 注意点
- Amazon のロボット対策に注意
- Firecrawl経由でスクレイピング
- 日本のAmazon（amazon.co.jp）を対象
```

---

### 依頼3: ナレッジ構築機能

```
# タスク
ナレッジ構築機能（テキスト→YAML変換）を実装してください。

# 作成ファイル
1. src/lib/knowledge/converter.ts（変換処理）
2. src/app/dev/knowledge/page.tsx（UI）

# 参考ファイル
- src/lib/knowledge/killer_words.yaml（出力形式の参考）
- src/lib/knowledge/writing_techniques.yaml（出力形式の参考）
- src/lib/ai/gemini.ts（Gemini API使用方法）

# 機能要件

## converter.ts
1. テキストを入力として受け取る
2. Gemini APIで以下を分析:
   - 構造化（セクション分け）
   - 分類（悩み/ベネフィット/証拠/CTA/ストーリー）
   - パワーワード抽出
   - キーフレーズ抽出
3. YAML形式に変換して出力

## page.tsx
1. テキスト入力エリア
2. ファイルアップロード（txt/md）
3. URL入力（Firecrawlで取得）
4. 「変換」ボタン
5. 変換結果のプレビュー
6. ダウンロードボタン

# 型定義
interface KnowledgeInput {
  type: 'text' | 'file' | 'url';
  content: string;
  category?: string;
}

interface KnowledgeOutput {
  meta: {
    name: string;
    version: string;
    category: string;
    source: string;
  };
  sections: {
    name: string;
    content: string;
    type: 'pain' | 'benefit' | 'evidence' | 'cta' | 'story' | 'other';
  }[];
  powerWords: string[];
  keyPhrases: string[];
  yaml: string;  // YAML形式の文字列
}

# UI要件
- Shadcn UIコンポーネント使用
- レスポンシブ対応
- ローディング表示
- エラーハンドリング
```

---

### 依頼4: Magic Pen ナレッジ連携

```
# タスク
Magic Penがナレッジファイルを参照してコピー生成できるようにしてください。

# 更新ファイル
- src/lib/ai/magic-pen.ts（または該当ファイル）

# 参考ファイル
- src/lib/knowledge/killer_words.yaml        # 389個のAI指示キラーワード
- src/lib/knowledge/writing_techniques.yaml  # ライティング6テクニック
- src/lib/knowledge/marketing_strategy.yaml  # マーケティング戦略（オファー設計、ファネル）
- src/lib/knowledge/consumer_behavior.yaml   # 消費行動・心理トリガー50選

# 機能要件
1. ナレッジファイル（YAML）を読み込む
2. コピー生成時にナレッジを参照
3. キラーワードを適切に使用
4. ライティング6テクニックを適用:
   - 3回繰り返しルール
   - 「なぜ」への回答
   - 数字による具体性
   - 権威性の活用
   - 当たり前の事実からの展開
   - 自信ある姿勢の表現
5. 心理トリガーを適用（consumer_behavior.yaml参照）:
   - SCARCITY（希少性）
   - SOC_PROOF（社会的証明）
   - ANCHOR（アンカリング）
   - FOMO
   - LOSS_AVOID（損失回避）
   - AUTHORITY（権威バイアス）など
6. LP構成 × 心理トリガーマッピングを活用
   - 各LPセクションに適切なトリガーを適用

# 実装方法
1. YAMLファイルをパースするユーティリティ作成
2. Geminiプロンプトにナレッジを組み込む
3. 生成後のチェックリスト適用
4. LPセクション別の心理トリガー自動適用
```

---

### 依頼5: リサーチUI改善

```
# タスク
リサーチ画面のUI/UXを改善してください。

# 更新ファイル
src/app/dev/research/page.tsx

# 機能要件

## プログレス表示
- 各ステップの進捗をプログレスバーで表示
- 現在実行中のソースを表示
- 推定残り時間を表示

## 結果表示
- 悩みマトリックス（深さ×緊急性の2軸）をビジュアル化
- キーワードバンクをタグクラウド形式で表示
- コンセプト候補をカード形式で表示

## ソース選択
- チェックボックスでソースを選択
  □ Infotop
  □ Meta広告ライブラリ
  □ Yahoo知恵袋
  □ Amazon書籍
  □ YouTube
- 地域設定（日本/海外）
- ジャンル設定

## エクスポート
- JSON形式でダウンロード
- YAML形式でダウンロード
- クリップボードにコピー

# UI要件
- Shadcn UIコンポーネント使用
- タブで結果を切り替え（悩み/キーワード/コンセプト）
- レスポンシブ対応
```

---

---

### 依頼6: ナレッジ活用 - 心理トリガー自動適用

```
# タスク
LP生成時に心理トリガーを自動適用する機能を実装してください。

# 作成ファイル
- src/lib/knowledge/trigger-applicator.ts

# 参考ファイル
- src/lib/knowledge/consumer_behavior.yaml（心理トリガー50選）
- src/lib/knowledge/marketing_strategy.yaml（DRMファネル）

# 機能要件
1. LPセクション × 心理トリガーのマッピングを実装
2. 各セクションに適切なトリガーを自動選択
3. トリガーに基づいたコピー生成指示を作成

# 型定義
interface TriggerApplication {
  sectionType: string;  // 'headline' | 'story' | 'offer' など
  recommendedTriggers: string[];  // ['SCARCITY', 'FOMO'] など
  copyGuidelines: string[];  // トリガー適用のガイドライン
}

# マッピング例（consumer_behavior.yaml より）
ヘッドコピー → PRIMING, STORY, VIVIDNESS
オファー → SCARCITY, FOMO, ANCHOR, DECOY
保証 → CERTAINTY, ENDOWMENT, RECIPROC
```

---

### 依頼7: ナレッジ活用 - オファー設計アシスタント

```
# タスク
マーケティング戦略ナレッジを使ったオファー設計機能を実装してください。

# 作成ファイル
- src/lib/knowledge/offer-designer.ts
- src/app/dev/offer-design/page.tsx

# 参考ファイル
- src/lib/knowledge/marketing_strategy.yaml

# 機能要件
1. 商品セット設計（フロント/ミドル/バック/ダウンセル/オーダーバンプ）
2. DRMファネル7ステップの自動設計
3. LTV最大化施策の提案
4. 価格設定の根拠生成

# UI要件
- ジャンル選択
- ペルソナ入力
- オファー自動生成
- 結果のYAMLエクスポート
```

---

## 📊 優先順位

```
優先度: 高（今すぐ）
├── Task 1.1: Yahoo知恵袋スクレイパー
├── Task 1.2: Amazon書籍スクレイパー
├── Task 1.4: リサーチオーケストレーター更新
└── Task 2.3: Magic Pen ナレッジ連携 ⭐ NEW

優先度: 中（次のスプリント）
├── Task 2.1: ナレッジインポートUI
├── Task 2.2: AI構造化処理
├── Task 3.1: リサーチUI改善
├── Task 6: 心理トリガー自動適用 ⭐ NEW
└── Task 7: オファー設計アシスタント ⭐ NEW

優先度: 低（将来）
├── Task 1.3: YouTubeスクレイパー
├── Chrome拡張
└── Google Workspace連携
```

---

## 📁 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/research_agent_uchida_spec.md` | 内田式リサーチ仕様 |
| `docs/RESEARCH_SOURCES.md` | リサーチソース一覧 |
| `docs/ultimate_features_spec.md` | 機能仕様 |
| `CLAUDE_CODE_TASKS.md` | 既存タスク一覧 |

---

## 📚 ナレッジファイル一覧

| ファイル | 内容 | 用途 |
|----------|------|------|
| `killer_words.yaml` | 389個のAI指示キラーワード | プロンプト精度UP |
| `writing_techniques.yaml` | ライティング6テクニック | コピー品質UP |
| `marketing_strategy.yaml` | マーケティング戦略4-Step | オファー/ファネル設計 |
| `consumer_behavior.yaml` | 心理トリガー50選 + MOL/MOA | ターゲット分析/LP設計 |

### ナレッジ活用マップ

```
┌─────────────────────────────────────────────────────────────┐
│                   ナレッジ活用フロー                        │
└─────────────────────────────────────────────────────────────┘

リサーチ時:
├── consumer_behavior.yaml → ターゲット分析、心理ステージ特定
└── marketing_strategy.yaml → 競合分析、ペルソナ設計

LP構成設計時:
├── consumer_behavior.yaml → LP構成×心理トリガーマッピング
└── marketing_strategy.yaml → オファー設計、ファネル構築

コピー生成時:
├── killer_words.yaml → AI指示の精度向上
├── writing_techniques.yaml → 6テクニック自動適用
└── consumer_behavior.yaml → 心理トリガー自動適用
```

---

**作成日**: 2025-12-15  
**更新日**: 2025-12-15  
**ステータス**: ナレッジ追加、Claude Code依頼準備完了
