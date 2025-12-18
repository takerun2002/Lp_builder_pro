# LP Builder Pro - Claude Code 実装タスク

## 📋 分類整理

### ✅ 機能として実装（優先）

| # | 機能 | 状態 | ファイル |
|---|------|------|----------|
| 1 | **リサーチエージェント（たけるん式）** | 設計済 | `docs/research_agent_uchida_spec.md` |
| 2 | **Meta広告ライブラリ スクレイパー** | ✅ 実装済 | `src/lib/research/scrapers/meta-ads.ts` |
| 3 | **ナレッジ構築機能（YAML変換）** | 設計段階 | 新規作成 |
| 4 | **キラーワード ナレッジ** | ✅ 作成済 | `src/lib/knowledge/killer_words.yaml` |
| 5 | **ライティングテクニック ナレッジ** | ✅ 作成済 | `src/lib/knowledge/writing_techniques.yaml` |
| 6 | **マーケティング戦略 ナレッジ** | ✅ 作成済 | `src/lib/knowledge/marketing_strategy.yaml` |
| 7 | **消費行動・購買導線 ナレッジ** | ✅ 作成済 | `src/lib/knowledge/consumer_behavior.yaml` |
| 8 | **Infotopスクレイパー** | ✅ 実装済 | `src/lib/research/scrapers/infotop.ts` |
| 9 | **競合LP分析スクレイパー** | ✅ 実装済 | `src/lib/research/scrapers/competitor.ts` |
| 10 | **AI分析機能** | ✅ 実装済 | `src/lib/research/ai-analyzer.ts` |
| 11 | **デザインプロンプト ナレッジ** | ✅ 作成済 | `src/lib/knowledge/design_prompts.yaml` |
| 12 | **ハイブリッドストレージ** | 設計段階 | 新規作成（ローカルDB + Google Workspace） |
| 13 | **動的モデル選択システム** | 設計段階 | easy_banana参考、Gemini 3.0 Pro対応 |
| 14 | **Gemini File Search Tool（RAG）** | 設計段階 | ナレッジベースのベクトル検索 |
| 15 | **Novasphere型リサーチエンジン** | 設計段階 | 三位一体AI（ビッグデータ×学術×リアルタイム） |
| 16 | **ワンクリック背景除去（withoutBG）** | 設計段階 | Magic Pen統合、ローカル完結の背景除去AI |
| 17 | **コピー診断AI** | 設計段階 | ファン化哲学ナレッジでLP/原稿を自動診断 |
| 18 | **N1ファースト設計** | 設計段階 | ペルソナvsN1の明確化、事実ベースのターゲット分析 |
| 19 | **クライアントヒアリングシート生成** | 設計段階 | PDF/Googleフォーム出力、N1引き出しテンプレ |
| 20 | **提案書/報告書自動生成** | 設計段階 | Googleドキュメント一括変換、Manus AI参考 |
| 21 | **ヘッドライン大量生成** | 設計段階 | N1×心理トリガーで50-100案一括生成 |
| 22 | **Google Workspace連携強化** | 設計段階 | スプシ蓄積、GASテンプレ、自動同期 |
| 23 | **デザインツール連携** | 設計段階 | Canva/Figma/Adobe Export |
| 24 | **画像サイズプリセット＆白紙キャンバス** | 設計段階 | 16:9/9:16等、白紙参考画像で精度UP |
| 25 | **LPセクションビルダー** | 設計段階 | 採用/没/保留、連結プレビュー、入稿機能 |
| 26 | **RAG + CAG ハイブリッドナレッジ** | 設計段階 | 静的CAG+動的RAG、コスト30-50%削減 |
| 27 | **PDF処理機能（文字起こし・画像化）** | 設計段階 | PDF→テキスト/PNG、Googleドライブ連携 |
| 28 | **バナーエディター（Novasphere型）** | 設計段階 | テキスト編集/フォント/色/揃え/PNG出力 ⭐NEW |
| 29 | **リサーチ言語化支援（マルチエージェント壁打ち）** | 設計段階 | 言語入力が決まらない時の対話支援 ⭐NEW |
| 30 | **リサーチプロンプト・スキル提供機能** | 設計段階 | Cursor/Claude用プロンプト・スキル生成 ⭐NEW |
| 31 | **高度な動的スクレイピング統合** | 設計段階 | Crawlee/Crawljax統合、動的コンテンツ対応 ⭐NEW |

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
- たけるん式フレームワークで分析
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
- docs/research_agent_uchida_spec.md（たけるん式リサーチ仕様）

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

### 依頼8: デザインプロンプトジェネレーター

```
# タスク
デザインプロンプトテンプレートを使った画像生成プロンプト作成機能を実装してください。
YouTubeサムネイル選択時は、神経科学ベースの心理フレームワークを適用します。

# 作成ファイル
- src/lib/knowledge/design-prompt-generator.ts
- src/app/dev/design-prompt/page.tsx

# 参考ファイル
- src/lib/knowledge/design_prompts.yaml
- src/lib/knowledge/youtube_thumbnail_psychology.yaml ⭐NEW

# 機能要件
1. 60+カテゴリから目的に合ったテンプレート選択
2. 変数（[商品]、[テーマ]など）を自動入力フォームで置換
3. LP構成セクション × 推奨テンプレートのマッチング
4. 生成したプロンプトをクリップボードにコピー
5. 生成AIへの直接送信（API連携）
6. ⭐NEW: YouTubeサムネイル選択時は心理学フレームワークを自動適用

# カテゴリ
- マーケティング資料（インフォグラフィック、バナー、KV、SNS）
- 商品画像（ライフスタイル、モックアップ、POP）
- Web制作（LPヒーロー、LPセクション）
- エンタメ（ストーリーボード、キャラデザ）
- データ可視化（ダッシュボード、SWOT）
- ⭐YouTubeサムネイル（心理学フレームワーク付き）

# YouTubeサムネイル専用機能（心理学フレームワーク）

## 神経科学ベースの3条件チェック
①予測誤差: 「見たことない」と思わせる意外な構図・表現
②生存回路: 脅威/報酬/地位/性のいずれかを刺激
③自分ごと化: ターゲットの具体的な状況・目標に接続

## 生存回路トリガー選択
├── 脅威（損失・危険）→ 「○○しないと損する」「知らないとヤバい」
├── 報酬（利得・快楽）→ 「○○で月100万」「爆発的に伸びる」
├── 社会的地位（排除・承認）→ 「周りと差がつく」「99%が知らない」
└── 性的シグナル → 「モテる○○」「異性ウケ」

## サムネ生成時のUI
1. 動画タイトル入力
2. ターゲット選択（誰に向けた動画か）
3. 生存回路トリガー選択（脅威/報酬/地位/性）
4. 3条件チェックリスト表示
5. 心理最適化されたプロンプト生成

# 型定義
interface DesignPromptRequest {
  category: string;
  template: string;
  variables: Record<string, string>;
  lpSection?: string;  // ヘッドライン、ストーリー、証拠、オファーなど
  
  // YouTubeサムネイル専用
  youtubeOptions?: {
    videoTitle: string;
    targetAudience: string;
    survivalTrigger: 'threat' | 'reward' | 'status' | 'sexual';
    predictionBreaker?: string;  // 予測を裏切る要素
  };
}

interface GeneratedPrompt {
  prompt: string;
  suggestedTool: 'gemini' | 'dalle' | 'midjourney';
  aspectRatio: string;
  resolution: string;
  
  // YouTubeサムネイル専用
  psychologyCheck?: {
    predictionError: boolean;   // 予測誤差OK？
    survivalCircuit: boolean;   // 生存回路OK？
    selfRelevance: boolean;     // 自分ごと化OK？
    overallScore: number;       // 総合スコア（0-100）
  };
}
```

---

### 依頼9: ハイブリッドストレージ（ローカルDB + Google Workspace）

```
# タスク
個人利用（ローカル）とチーム利用（Google Workspace）の両方に対応する
ハイブリッドストレージ基盤を実装してください。

# 作成ファイル
- src/lib/storage/types.ts                    # 共通型定義
- src/lib/storage/local-adapter.ts            # ローカルDB（SQLite + better-sqlite3）
- src/lib/storage/google-sheets-adapter.ts    # Google Sheets連携
- src/lib/storage/google-drive-adapter.ts     # Google Drive連携
- src/lib/storage/hybrid-storage.ts           # ハイブリッド統合
- src/app/dev/storage-settings/page.tsx       # 設定UI

# 参考ライブラリ
- better-sqlite3（Node.js用SQLite）
- googleapis（Google API）

# ストレージインターフェース
interface StorageAdapter {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  sync?(): Promise<SyncResult>;
}

# データ種別ごとの保存先
| データ種別       | ローカル     | Google Sheets | Google Drive |
|-----------------|-------------|---------------|--------------|
| ユーザー設定     | ✅ マスター  | -             | -            |
| リサーチ結果     | キャッシュ   | ✅ マスター   | -            |
| コンセプト案     | 下書き       | ✅ 共有版     | -            |
| 競合LP分析       | キャッシュ   | ✅ マスター   | -            |
| 生成画像         | キャッシュ   | -             | ✅           |
| LP HTMLエクスポート | -          | -             | ✅           |
| ナレッジYAML     | ✅ ローカル  | -             | ✅ 共有      |
| プロジェクト進捗 | -            | ✅            | -            |

# ローカルDBスキーマ（SQLite）
interface Project {
  id: string;
  name: string;
  genre: string;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  googleSheetId?: string;
}

interface ResearchCache {
  id: string;
  projectId: string;
  source: string;  // infotop, chiebukuro, amazon等
  data: string;    // JSON
  cachedAt: Date;
  expiresAt: Date;
}

interface Draft {
  id: string;
  projectId: string;
  type: 'concept' | 'copy' | 'design';
  content: string;
  version: number;
  savedAt: Date;
}

# Google Sheets構造
プロジェクトフォルダ: LP_Builder_Pro/
├── [プロジェクト名]/
│   ├── リサーチ結果.gsheet     # 自動記録
│   ├── コンセプト案.gsheet     # 共有編集可
│   ├── 競合分析.gsheet         # 分析結果
│   └── 進捗管理.gsheet         # タスク管理

# 同期機能
- 自動同期（設定可能な間隔: 1分〜30分）
- 手動同期ボタン
- コンフリクト検出（タイムスタンプ比較）
- オフラインキュー（ネット復帰時に自動同期）

# 設定UI要件
- ストレージモード選択（ローカル/クラウド/ハイブリッド）
- Google OAuth認証フロー
- 同期設定（自動/手動、間隔）
- プロジェクト別シート生成
- 同期状態インジケーター
```

---

### 依頼10: 動的モデル選択システム（ユーザー選択型）

```
# タスク
用途に応じてAIモデルを柔軟に切り替えられる動的モデル選択システムを実装してください。
**ユーザーが手動でモデルを選択できる**UIを提供し、コスパ最適化の推奨も表示します。
OpenRouter経由でClaude Sonnetなども利用可能にします。

# 参考ファイル
- /Users/okajima/Downloads/easy_banana/models.json
- /Users/okajima/Downloads/easy_banana/sidepanel.js

# 作成ファイル
- src/lib/ai/models.json                     # モデル定義（Gemini + OpenRouter）
- src/lib/ai/model-selector.ts               # モデル選択ロジック（推奨表示）
- src/lib/ai/openrouter.ts                   # OpenRouter API統合
- src/components/ui/model-dropdown.tsx       # モデル選択UIコンポーネント
- src/components/ui/model-recommendation.tsx # コスパ推奨表示コンポーネント
- src/app/dev/settings/page.tsx              # APIキー設定画面

# 🎯 コスパ最適化モデル選定戦略（2025年12月時点）

## テキスト生成（LLM）- 利用可能モデル

### Gemini API（直接）
| モデルID | 用途 | 入力コスト | 出力コスト | 文脈長 | 推奨度 |
|----------|------|-----------|-----------|--------|--------|
| `gemini-2.0-flash` | 大量データ分析・長文生成 | **$0.10** | **$0.40** | 100万 | ⭐⭐⭐⭐⭐ |
| `gemini-2.5-flash` | 複雑な推論が必要な分析 | $0.30 | $2.50 | 104万 | ⭐⭐⭐ |
| `gemini-2.5-pro` | 最高精度が必要な分析 | $1.25-2.50 | $10.00 | 20万 | ⭐⭐ |

### OpenRouter経由（推奨）
| モデルID | 用途 | 入力コスト | 出力コスト | 文脈長 | 推奨度 |
|----------|------|-----------|-----------|--------|--------|
| **`nvidia/nemotron-3-nano`** | **🆓 無料・高性能MoEモデル** | **無料** | **無料** | 128K+ | ⭐⭐⭐⭐⭐ |
| `anthropic/claude-sonnet-4-20250514` | 壁打ち・対話型・コピー | OpenRouter | OpenRouter | 200K | ⭐⭐⭐⭐ |

**重要**: NVIDIA Nemotron 3 Nanoは**完全無料で高性能**なオープンソースMoEモデルです。エージェント型AIシステム向けに最適化されており、基本機能では**Nemotron 3 Nanoを優先的に使用**することを強く推奨します。

## 画像生成
| モデル | 用途 | コスト | 備考 |
|--------|------|--------|------|
| Gemini 3 Pro Image | 本番画像生成 | 高 | 最高品質 |
| Gemini 2.5 Image | テスト・下書き | 低 | 安価 |

## 画像生成
| モデル | 用途 | コスト | 備考 |
|--------|------|--------|------|
| Nano Banana Pro (Gemini 3.0 Image) | 本番画像生成 | 高 | 最高品質 |
| Nano Banana (Gemini 2.5 Image) | テスト・下書き | 低 | 安価 |
| Seedream v4.5 | 代替（fal-ai） | 中 | t2i/i2i対応 |
| Reve | リミックス | 中 | 参照画像合成 |

## RAG/Embedding
| モデル | 用途 | コスト | 備考 |
|--------|------|--------|------|
| gemini-embedding-001 | File Search Tool | 固定 | インデックス作成 |

# models.json 構造
interface ModelConfig {
  id: string;
  label: string;
  provider: 'gemini' | 'openrouter' | 'fal';
  model: string;
  endpoint: string;
  category: 'llm' | 'image' | 'embedding' | 'video';
  capabilities: {
    text_to_image?: boolean;
    image_to_image?: boolean;
    text_generation?: boolean;
    reasoning?: boolean;
    rag?: boolean;
  };
  timeoutSec: number;
  costTier: 'low' | 'medium' | 'high';
  default?: boolean;
  aspectRatios?: string[];
  systemPrompt?: string;
}

# 🎯 機能要件

## 1. ユーザー選択型モデル選択UI

### UI設計
各機能画面にモデル選択ドロップダウンを配置：
```
┌─────────────────────────────────────────┐
│ AIモデルを選択                          │
├─────────────────────────────────────────┤
│ [▼] gemini-2.0-flash                   │
│                                         │
│ 💡 推奨: このタスクには2.0 Flashが最適  │
│    コスト: $0.10/100万トークン（入力）  │
│                                         │
│ 利用可能モデル:                         │
│ ○ Nemotron 3 Nano（🆓 無料）⭐最優先   │
│ ○ Gemini 2.5 Flash                    │
│ ○ Gemini 3.0 Pro                      │
│ ○ Claude Sonnet（OpenRouter経由）      │
└─────────────────────────────────────────┘
```

### コスパ推奨表示
タスク種別に応じて推奨モデルを表示：
- **大量リサーチデータ分析**: NVIDIA Nemotron 3 Nano（🆓 無料）⭐最優先
- **長文コンテンツ生成**: NVIDIA Nemotron 3 Nano（🆓 無料）⭐最優先
- **シンプルな分析・要約**: NVIDIA Nemotron 3 Nano（🆓 無料）⭐最優先
- **コピーライティング**: Gemini 3.0 Pro（推論能力が必要）
- **壁打ち・対話型**: Claude Sonnet（推論能力 + 共感力）
- **複雑な分析**: Gemini 3.0 Pro（必要に応じて）

**Nemotron優先戦略**: OpenRouter APIキーが設定されている場合、基本機能では**NVIDIA Nemotron 3 Nanoを最優先**で使用します。完全無料で高性能なため、コスト削減に最適です。

### モデル選択ロジック（推奨表示用）
```typescript
function getRecommendedModel(task: TaskType, contextLength: number): {
  modelId: string;
  reason: string;
  estimatedCost: number | null;
} {
  // 推奨モデルを返す（ユーザーは選択可能）
  switch (task) {
    case 'bulk_research_analysis':
    case 'long_content_generation':
    case 'simple_summary':
      // OpenRouter APIキーがある場合はNemotron 3 Nanoを優先
      if (hasOpenRouterApiKey) {
        return {
          modelId: 'nvidia/nemotron-3-nano',
          reason: '🆓 NVIDIA Nemotron 3 Nano（無料・高性能MoE）を推奨',
          estimatedCost: 0, // 無料
        };
      }
      return {
        modelId: 'gemini-2.5-flash',
        reason: 'Gemini 2.5 Flashを推奨（OpenRouter未設定時）',
        estimatedCost: 0.15,
      };
    
    case 'copywriting':
    case 'headline_generation':
      return {
        modelId: 'gemini-3-pro-preview',
        reason: 'コピーライティングには推論能力が必要なためGemini 3.0 Proを推奨',
        estimatedCost: null,
      };
    
    default:
      // デフォルトはNemotron 3 Nano
      if (hasOpenRouterApiKey) {
        return {
          modelId: 'nvidia/nemotron-3-nano',
          reason: '🆓 無料モデルを推奨',
          estimatedCost: 0,
        };
      }
      return {
        modelId: 'gemini-2.5-flash',
        reason: 'Gemini 2.5 Flashを推奨',
        estimatedCost: 0.15,
      };
  }
}
```

## 2. APIキー管理（複数対応）
設定画面で複数のAPIキーを設定可能：

```
┌─────────────────────────────────────────┐
│ APIキー設定                             │
├─────────────────────────────────────────┤
│ Gemini API Key                          │
│ [●●●●●●●●●●●●●●] [保存]              │
│                                         │
│ OpenRouter API Key                      │
│ [●●●●●●●●●●●●●●] [保存]              │
│                                         │
│ Anthropic API Key（直接利用の場合）     │
│ [●●●●●●●●●●●●●●] [保存]              │
│                                         │
│ OpenAI API Key（直接利用の場合）       │
│ [●●●●●●●●●●●●●●] [保存]              │
└─────────────────────────────────────────┘
```

### APIキー優先順位
1. **OpenRouter API**: NVIDIA Nemotron 3 Nano（🆓 無料）等の統一インターフェース（最優先推奨）⭐
2. **Gemini API**: Geminiモデル用（必須推奨）
3. **Anthropic API**: Claude直接利用（オプション）

**重要**: OpenRouter APIキーを設定すると、**NVIDIA Nemotron 3 Nano**という**完全無料で高性能**なモデルが利用可能になります。
基本機能では**Nemotron 3 Nanoを最優先**で使用することを強く推奨します。

## 3. OpenRouter統合
OpenRouter経由でClaude/GPT等を利用可能に：

```typescript
// src/lib/ai/openrouter.ts

interface OpenRouterModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  contextLength: number;
  pricing?: {
    prompt: string;  // "$0.003 / 1K tokens"
    completion: string;
  };
}

export async function generateWithOpenRouter(
  modelId: string,
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || '',
      'X-Title': 'LP Builder Pro',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 1.0,
      max_tokens: options?.maxTokens,
    }),
  });
  
  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

// Nemotron 3 Nano優先のヘルパー関数（🆓 無料）
export async function generateWithNemotron(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  // NVIDIA Nemotron 3 Nanoを優先的に使用（無料）
  return generateWithOpenRouter('nvidia/nemotron-3-nano', prompt, options);
}
```

## 4. コスト予測機能
実行前にコストを表示：

```
┌─────────────────────────────────────────┐
│ 実行前のコスト予測                      │
├─────────────────────────────────────────┤
│ 選択モデル: gemini-2.0-flash           │
│ 推定入力トークン: 50,000               │
│ 推定出力トークン: 10,000               │
│                                         │
│ 推定コスト: $0.009                     │
│   - 入力: $0.005                       │
│   - 出力: $0.004                       │
│                                         │
│ [実行] [キャンセル]                    │
└─────────────────────────────────────────┘
```

## 3. 実装例：コスパ最適化モデル選択

```typescript
// src/lib/ai/model-selector.ts

import { MODEL_COSTS } from './models.json';

type TaskType = 
  | 'bulk_research_analysis'      // 大量リサーチデータ分析
  | 'long_content_generation'     // 長文コンテンツ生成（セールスレター等）
  | 'copywriting'                 // コピーライティング（ヘッドライン・コピー）
  | 'headline_generation'         // ヘッドライン生成
  | 'conversational_assistance'   // 壁打ち・対話型支援
  | 'deep_reasoning'              // 複雑な推論が必要な分析
  | 'complex_analysis'            // 複雑な分析
  | 'simple_summary'              // シンプルな要約
  | 'image_generation';            // 画像生成

interface ModelSelectionOptions {
  taskType: TaskType;
  contextLength: number;
  estimatedOutputTokens?: number;
  costLimit?: number;
  userPlan?: 'free' | 'premium';
  hasOpenRouterApiKey?: boolean;  // OpenRouter APIキーが設定されているか
}

export function selectOptimalModel(options: ModelSelectionOptions): {
  modelId: string;
  estimatedCost: number;
  reason: string;
} {
  const { taskType, contextLength, estimatedOutputTokens = 0, costLimit, userPlan = 'free', hasOpenRouterApiKey = false } = options;
  
  // コスパ優先の選択ロジック
  let selectedModel: string;
  let reason: string;
  
  switch (taskType) {
    case 'bulk_research_analysis':
    case 'long_content_generation':
      // 大量データ分析・長文生成は2.0 Flashが最安価
      selectedModel = 'gemini-2.0-flash';
      reason = '大量データ分析・長文生成には2.0 Flashが最適（$0.10/100万トークン）';
      break;
    
    case 'copywriting':
    case 'headline_generation':
      // コピーライティングは推論能力が必要
      if (userPlan === 'premium') {
        selectedModel = 'claude-sonnet';
        reason = 'コピーライティングには推論能力が必要なためClaude Sonnetを使用';
      } else {
        // 無料プランは2.5 Flashで妥協
        selectedModel = 'gemini-2.5-flash';
        reason = '無料プランでは2.5 Flashを使用（有料プランでClaude Sonnet利用可能）';
      }
      break;
    
    case 'conversational_assistance':
    case 'deep_reasoning':
      // 壁打ち・対話型はClaude Sonnet（有料プランのみ）
      if (userPlan === 'premium') {
        selectedModel = 'claude-sonnet';
        reason = '対話型支援にはClaude Sonnetが最適（推論能力 + 共感力）';
      } else {
        // 無料プランは2.0 Flashで妥協
        selectedModel = 'gemini-2.0-flash';
        reason = '無料プランでは2.0 Flashを使用（有料プランでClaude Sonnet利用可能）';
      }
      break;
    
    case 'complex_analysis':
      // 複雑な分析は文脈長で判断
      if (contextLength > 200000) {
        selectedModel = 'gemini-2.5-flash';
        reason = '長文脈が必要なため2.5 Flashを使用（104万トークン対応）';
      } else if (userPlan === 'premium') {
        selectedModel = 'gemini-2.5-pro';
        reason = '最高精度が必要なため2.5 Proを使用（有料プラン）';
      } else {
        selectedModel = 'gemini-2.0-flash';
        reason = '無料プランでは2.0 Flashを使用（有料プランで2.5 Pro利用可能）';
      }
      break;
    
    case 'simple_summary':
    default:
      // OpenRouter APIキーがある場合はNemotron 3 Nanoを優先
      if (hasOpenRouterApiKey) {
        selectedModel = 'nvidia/nemotron-3-nano';
        reason = '🆓 NVIDIA Nemotron 3 Nano（無料・高性能）を推奨';
      } else {
        selectedModel = 'gemini-2.5-flash';
        reason = 'Gemini 2.5 Flashを推奨';
      }
      break;
  }
  
  // コスト計算
  const cost = MODEL_COSTS[selectedModel]?.estimatedCost(
    contextLength,
    estimatedOutputTokens
  ) ?? 0;
  
  // コスト上限チェック
  if (costLimit && cost > costLimit) {
    // 上限超過時は自動ダウングレード
    const downgradedModel = 'gemini-2.0-flash';
    const downgradedCost = MODEL_COSTS[downgradedModel]?.estimatedCost(
      contextLength,
      estimatedOutputTokens
    ) ?? 0;
    
    return {
      modelId: downgradedModel,
      estimatedCost: downgradedCost,
      reason: `コスト上限超過のため、${downgradedModel}に自動ダウングレード`,
    };
  }
  
  return {
    modelId: selectedModel,
    estimatedCost: cost,
    reason,
  };
}

// 使用例
const selection = selectOptimalModel({
  taskType: 'bulk_research_analysis',
  contextLength: 500000,  // 50万トークン
  estimatedOutputTokens: 10000,
  userPlan: 'free',
});

console.log(selection);
// {
//   modelId: 'gemini-2.0-flash',
//   estimatedCost: 0.054,  // $0.05 + $0.004
//   reason: '大量データ分析には2.0 Flashが最適（$0.10/100万トークン）'
// }
```

## 4. 各機能でのモデル選定例

### リサーチ統合分析
```typescript
// 100件のLP + Yahoo知恵袋 + X投稿を一括分析
const model = selectOptimalModel({
  taskType: 'bulk_research_analysis',
  contextLength: 800000,  // 80万トークン
  estimatedOutputTokens: 50000,
  hasOpenRouterApiKey: true, // OpenRouter APIキーが設定されている場合
});
// → nvidia/nemotron-3-nano（🆓 無料・高性能）⭐最優先
// OpenRouter APIキー未設定時: gemini-2.5-flash
```

### 10万文字セールスレター生成
```typescript
// 長文コンテンツ生成（セールスレター等の長文）
const model = selectOptimalModel({
  taskType: 'long_content_generation',
  contextLength: 100000,  // 10万トークン（プロンプト）
  estimatedOutputTokens: 250000,  // 25万トークン（出力）
  hasOpenRouterApiKey: true, // OpenRouter APIキーが設定されている場合
});
// → nvidia/nemotron-3-nano（🆓 無料・高性能）⭐最優先
// OpenRouter APIキー未設定時: gemini-2.5-flash
// 長文生成も無料モデルで対応可能
```

### ヘッドライン・コピー生成
```typescript
// コピーライティング（推論能力が必要）
const model = selectOptimalModel({
  taskType: 'copywriting',
  contextLength: 50000,
  estimatedOutputTokens: 2000,
});
// → gemini-3-pro-preview（推論能力が必要なため）
// コピーは推論させた方が強い
```

### 壁打ち・対話型支援
```typescript
// リサーチ設定の言語化支援
const model = selectOptimalModel({
  taskType: 'conversational_assistance',
  contextLength: 50000,
  estimatedOutputTokens: 5000,
  userPlan: 'premium',
});
// → claude-sonnet（推論能力 + 共感力が必要）
```

### 複雑な競合分析
```typescript
// 競合LPの深い戦略分析
const model = selectOptimalModel({
  taskType: 'complex_analysis',
  contextLength: 150000,  // 15万トークン
  estimatedOutputTokens: 20000,
  userPlan: 'premium',
});
// → gemini-2.5-pro（最高精度が必要）
```

## 5. UI要件（詳細）
- **各画面にモデル選択ドロップダウン**（必須）
- **コスト表示**（$0.10/100万トークンなど、リアルタイム計算）
- **推奨モデル表示**（「このタスクには2.0 Flashが最適」）
- **モデル説明**（各モデルの特徴・用途を表示）
- **グローバルデフォルト設定**（ユーザーが設定可能）
- **タスク別デフォルト設定**（各機能ごとに記憶）
- **APIキー設定画面**（複数APIキー対応）

## 6. コスト比較表（実用例）

### 10万文字のセールスレター生成（約25万トークン出力）

| モデル | 入力コスト | 出力コスト | **合計** | 推奨度 |
|--------|-----------|-----------|---------|--------|
| **Gemini 2.0 Flash** | $0.01 | **$0.10** | **$0.11** | ⭐⭐⭐⭐⭐ |
| Gemini 2.5 Flash | $0.03 | $0.625 | $0.655 | ⭐⭐⭐ |
| Gemini 2.5 Pro | $0.031 | $2.50 | $2.531 | ⭐ |

### 大量リサーチデータ分析（80万トークン入力、5万トークン出力）

| モデル | 入力コスト | 出力コスト | **合計** | 推奨度 |
|--------|-----------|-----------|---------|--------|
| **Gemini 2.0 Flash** | **$0.08** | **$0.02** | **$0.10** | ⭐⭐⭐⭐⭐ |
| Gemini 2.5 Flash | $0.24 | $0.125 | $0.365 | ⭐⭐⭐ |
| Gemini 2.5 Pro | $1.00 | $0.50 | $1.50 | ⭐ |

### 壁打ち・対話型支援（5万トークン入力、5千トークン出力）

| モデル | 入力コスト | 出力コスト | **合計** | 推奨度 |
|--------|-----------|-----------|---------|--------|
| Claude Sonnet | API経由 | API経由 | **推論能力重視** | ⭐⭐⭐⭐ |
| Gemini 2.0 Flash | $0.005 | $0.002 | $0.007 | ⭐⭐（品質低） |
| Gemini 2.5 Flash | $0.015 | $0.0125 | $0.0275 | ⭐⭐⭐（品質中） |

**結論**: 
- **基本機能（リサーチ・長文生成）**: **NVIDIA Nemotron 3 Nano（🆓 無料）が最優先** ⭐最重要
- **基本機能（OpenRouter未設定時）**: Gemini 2.5 Flashを使用
- **コピーライティング（ヘッドライン・コピー）**: Gemini 3.0 Pro（推論能力が必要）⭐重要
- **壁打ち・対話型**: Claude Sonnetが最適（推論能力が必要）
- **複雑な分析**: Gemini 3.0 Pro（必要に応じて）

**重要な使い分け**:
- **基本機能全般**: **NVIDIA Nemotron 3 Nano（🆓 無料）を最優先**
- **長文生成（セールスレター等）**: Nemotron 3 Nano（無料）
- **コピーライティング（ヘッドライン・コピー）**: Gemini 3.0 Pro（推論能力が必要）

# 期待効果
├── **Nemotron優先戦略**: OpenRouter経由で🆓無料のNemotron 3 Nanoを最優先使用 ⭐最重要
├── **ユーザー選択の柔軟性**: 用途に応じて最適なモデルを選択可能
├── **コスパ推奨表示**: ユーザーが迷わず最適なモデルを選択できる
├── **複数API対応**: OpenRouter経由でNemotron/Claude等も利用可能
├── **コスト予測機能**: 実行前にコストを確認可能
├── **APIキー管理**: 複数のAPIキーを一元管理
└── **スケーラビリティ**: 大量利用でも**完全無料**（Nemotron 3 Nano利用時）

# 型定義
interface ModelPreset {
  research: string;           // リサーチ・分析用（デフォルト: gemini-2.0-flash）
  copywriting: string;        // コピー生成用（デフォルト: claude-sonnet）⭐推論能力が必要
  longContent: string;        // 長文生成用（デフォルト: gemini-2.0-flash）⭐安価で十分
  conversational: string;     // 壁打ち・対話型（デフォルト: claude-sonnet）
  image: string;              // 画像生成用（デフォルト: gemini-3-pro-image）
  test: string;               // テスト用（デフォルト: gemini-2.0-flash）
  embedding: string;         // RAG用（デフォルト: gemini-embedding-001）
}

interface UserModelSettings {
  presets: ModelPreset;
  costLimit: {
    monthly: number;          // 月間コスト上限（ドル）
    perRequest: number;      // 1リクエストあたりの上限（ドル）
  };
  showRecommendations: boolean; // 推奨モデルを表示するか
  apiKeys: {
    gemini?: string;           // Gemini API（必須推奨）
    openrouter?: string;       // OpenRouter API（Claude/GPT用、推奨）
    anthropic?: string;        // Anthropic API（直接利用、オプション）
    openai?: string;           // OpenAI API（直接利用、オプション）
    fal?: string;              // fal.ai API（画像生成用）
  };
}

interface ModelOption {
  id: string;
  name: string;
  provider: 'gemini' | 'openrouter' | 'anthropic' | 'openai';
  category: 'llm' | 'image';
  costTier: 'low' | 'medium' | 'high';
  contextLength: number;
  description: string;
  recommendedFor?: TaskType[];  // 推奨用途
  requiresApiKey: string;        // 必要なAPIキー
}

interface ModelCost {
  modelId: string;
  inputCostPerMillion: number;   // 100万トークンあたりの入力コスト
  outputCostPerMillion: number;  // 100万トークンあたりの出力コスト
  contextLength: number;          // 最大文脈長
  estimatedCost: (inputTokens: number, outputTokens: number) => number;
}

# コスト計算例
const MODEL_COSTS: Record<string, ModelCost> = {
  'gemini-2.0-flash': {
    modelId: 'gemini-2.0-flash',
    inputCostPerMillion: 0.10,
    outputCostPerMillion: 0.40,
    contextLength: 1000000,
    estimatedCost: (input, output) => 
      (input / 1000000) * 0.10 + (output / 1000000) * 0.40,
  },
  'gemini-2.5-flash': {
    modelId: 'gemini-2.5-flash',
    inputCostPerMillion: 0.30,
    outputCostPerMillion: 2.50,
    contextLength: 1040000,
    estimatedCost: (input, output) => 
      (input / 1000000) * 0.30 + (output / 1000000) * 2.50,
  },
  'gemini-2.5-pro': {
    modelId: 'gemini-2.5-pro',
    inputCostPerMillion: 1.25,  // 200K以下
    outputCostPerMillion: 10.00,
    contextLength: 200000,
    estimatedCost: (input, output) => {
      const inputCost = input <= 200000 
        ? (input / 1000000) * 1.25
        : (200000 / 1000000) * 1.25 + ((input - 200000) / 1000000) * 2.50;
      return inputCost + (output / 1000000) * 10.00;
    },
  },
};
```

---

### 依頼11: Gemini File Search Tool（RAG）統合

```
# タスク
Gemini APIのFile Search Toolを使用して、ナレッジベースの
ベクトル検索・RAG機能を実装してください。

# 参考URL
https://blog.google/technology/developers/file-search-gemini-api/

# 作成ファイル
- src/lib/ai/file-search.ts                  # File Search Tool API
- src/lib/ai/knowledge-rag.ts                # ナレッジRAG統合
- src/app/api/dev/rag/route.ts               # RAG API エンドポイント

# File Search Tool の仕組み
1. インデックス作成（1回のみ）
   - ナレッジファイルをアップロード
   - gemini-embedding-001でベクトル化
   - コスト: $0.15/100万トークン

2. クエリ時（毎回無料）
   - クエリをベクトル化
   - 類似チャンク検索
   - LLMに注入して回答生成

# インデックス対象ファイル
- src/lib/knowledge/killer_words.yaml
- src/lib/knowledge/writing_techniques.yaml
- src/lib/knowledge/marketing_strategy.yaml
- src/lib/knowledge/consumer_behavior.yaml
- src/lib/knowledge/design_prompts.yaml

# 機能要件
1. ナレッジインデックス管理
   - ファイルアップロード
   - インデックス作成・更新
   - インデックス状態表示

2. クエリ時のモデル選択
   - シンプルな検索: Gemini Flash（コスパ）
   - 複雑な分析: Gemini 3.0 Pro（精度）
   - 動的モデル選択との連携

3. 自動引用機能
   - 回答に使用したソースを表示
   - ナレッジファイル名・セクション表示

# 型定義
interface FileSearchConfig {
  indexedFiles: IndexedFile[];
  queryModel: string;  // flash or pro
  autoSelectModel: boolean;
}

interface IndexedFile {
  id: string;
  filename: string;
  tokenCount: number;
  indexedAt: Date;
  status: 'indexing' | 'ready' | 'error';
}

interface RAGQuery {
  query: string;
  model?: string;        // 未指定なら自動選択
  maxResults?: number;   // 取得チャンク数
}

interface RAGResult {
  answer: string;
  citations: Citation[];
  model: string;
  tokensUsed: number;
}

interface Citation {
  source: string;        // ファイル名
  section: string;       // セクション名
  content: string;       // 該当テキスト
  relevance: number;     // 関連度スコア
}
```

---

### 依頼12: Novasphere型リサーチエンジン（三位一体AI）

```
# タスク
Novasphereを参考に、「ビッグデータ」「学術知見」「リアルタイム情報」を
統合したリサーチエンジンを実装してください。

# 参考URL
- https://www.novasphere.jp/
- https://qiita.com/te_yama/items/d9f74ba19b762155bfb2 (Google ADK × BigQuery)

# 作成ファイル
- src/lib/research/engines/bigdata-engine.ts      # ビッグデータ解析
- src/lib/research/engines/academic-engine.ts     # 学術知見エンジン
- src/lib/research/engines/realtime-engine.ts     # リアルタイム情報
- src/lib/research/engines/persona-agent.ts       # 統合ペルソナAI
- src/lib/research/research-orchestrator-v2.ts    # 統合オーケストレーター

# 三位一体アーキテクチャ

┌─────────────────────────────────────────────────────────────┐
│              Novasphere型 三位一体リサーチ                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ ビッグデータ │  │  学術知見   │  │リアルタイム │         │
│  │   解析      │  │  エンジン   │  │   情報      │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │               │               │                  │
│         └───────────────┼───────────────┘                  │
│                         ▼                                  │
│              ┌─────────────────────┐                       │
│              │   ペルソナAI統合    │                       │
│              │  「なぜ人が動くか」 │                       │
│              └─────────────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

# 1. ビッグデータ解析エンジン

データソース:
├── Infotopランキング         # 売れ筋商品・LP
├── Meta広告ライブラリ        # 競合広告クリエイティブ
├── 競合LP分析                # 構成・コピー・CTA
├── Amazonベストセラー        # 市場トレンド
└── Google Trends API         # 検索トレンド

分析機能:
├── 売れてるLP構成パターン抽出
├── 勝ちクリエイティブ要素分析
├── 価格帯・オファー傾向
└── ジャンル別成功パターン

# 2. 学術知見エンジン

ナレッジベース:
├── consumer_behavior.yaml    # 心理トリガー50選
├── marketing_strategy.yaml   # DRMファネル・LTV
├── writing_techniques.yaml   # 説得力テクニック
└── 行動経済学論文DB（将来）  # 学術論文RAG

適用機能:
├── LP構成×心理トリガーマッピング
├── ペルソナ別効果的訴求抽出
├── 購買ステージ別メッセージ設計
└── 感情トリガー自動適用

# 3. リアルタイム情報エンジン

データソース:
├── Twitter/X Search API     # SNS生の声
├── Google News API          # 最新ニュース
├── Yahoo知恵袋              # 悩み・ペインポイント
├── Amazonレビュー           # 購入者の本音
└── YouTube コメント         # 動画への反応

分析機能:
├── トレンドキーワード抽出
├── ペインポイント自動分類
├── 感情分析（ポジ/ネガ）
└── 話題の切り口発見

# 4. ペルソナAI統合

interface PersonaAgentInput {
  genre: string;              // ジャンル
  product: string;            // 商品・サービス
  targetAudience?: string;    // ターゲット層
  competitors?: string[];     // 競合URL
}

interface PersonaAgentOutput {
  // ビッグデータ分析結果
  marketInsights: {
    topPatterns: LPPattern[];
    winningCreatives: Creative[];
    priceRange: { min: number; max: number; sweet: number };
    trendKeywords: string[];
  };
  
  // 学術知見適用結果
  psychologyInsights: {
    effectiveTriggers: PsychTrigger[];
    emotionalHooks: string[];
    persuasionFramework: string;
    stageMapping: Record<string, string[]>;
  };
  
  // リアルタイム情報
  realtimeInsights: {
    currentTrends: Trend[];
    painPoints: PainPoint[];
    userVoices: UserVoice[];
    newsContext: NewsItem[];
  };
  
  // 統合ペルソナ
  synthesizedPersona: {
    name: string;
    demographics: Demographics;
    psychographics: Psychographics;
    buyingJourney: BuyingStage[];
    decisionTriggers: string[];
    objections: string[];
    idealMessage: string;
  };
  
  // 推奨アクション
  recommendations: {
    lpStructure: LPSection[];
    headlines: string[];
    ctaCopy: string[];
    creativeDirection: string;
    offerSuggestions: Offer[];
  };
}

# 実装優先順位
1. ビッグデータ（既存スクレイパー統合）
2. 学術知見（既存YAML活用）
3. リアルタイム（新規API連携）
4. ペルソナAI統合（Gemini 3.0 Pro）

# Deep Research API連携
- Gemini Interactions APIでバックグラウンド調査
- 複数ソースの自動クロス検証
- 信頼度スコア付き情報提供
```

---

### 依頼13: ワンクリック背景除去（withoutBG統合）

```
# タスク
withoutBGを統合し、Magic Penにワンクリック背景除去機能を追加してください。

# 参考URL
- https://qiita.com/ijma34/items/b95485706fb54c89951c
- withoutBG GitHub: https://github.com/withoutbg/withoutbg

# 作成ファイル
- src/lib/image/background-remover.ts         # 背景除去ロジック
- src/app/api/dev/image/remove-bg/route.ts    # APIエンドポイント
- src/components/magic-pen/RemoveBgButton.tsx # UI統合

# 技術スタック（選択肢）
Option A: Python側（より高精度）
  - FastAPI + withoutBG（Focus モデル、約320MB）
Option B: Next.js純正（セットアップ簡単）
  - @imgly/background-removal（WebAssembly版）

# 機能要件
1. Magic Penに「背景除去」ボタン追加
2. ワンクリックで背景透過処理
3. 処理後の画像を編集対象として継続可能
4. ローカル完結（外部API不要）
5. 処理時間: 5-10秒目標

# UI/UX
- ボタン配置: ツールバーに「🔲 背景を削除」ボタン
- 処理中: スピナー + 「処理中...」表示
- 処理後: 透過画像をキャンバスに反映

# 型定義
interface RemoveBgRequest {
  imageDataUrl: string;
  outputFormat?: 'png' | 'webp';
}

interface RemoveBgResponse {
  success: boolean;
  resultDataUrl?: string;
  processingTime?: number;
  error?: string;
}
```

---

### 依頼14: コピー診断AI（ファン化哲学フレームワーク）

```
# タスク
ファン化哲学ナレッジを活用した、LP/原稿の自動診断機能を実装してください。

# ナレッジファイル
- src/lib/knowledge/fanification_philosophy.md （21レッスン分）

# 作成ファイル
- src/lib/copywriting/copy-analyzer.ts      # 診断ロジック
- src/lib/copywriting/frameworks.ts         # フレームワーク定義
- src/app/dev/copy-analyzer/page.tsx        # 診断UI

# ファン化哲学フレームワーク（診断基準）

## 1. 説得技術チェック（レッスン1-3）
├── 信念移転プロセス
│   └── 商品ではなく「変化」を売っているか？
├── AIDAモデル適用
│   └── 注意→関心→欲求→行動の流れがあるか？
└── 「考えさせない」原則
    └── 明快さ・単純さ・娯楽性を満たしているか？

## 2. 心理抵抗回避チェック（レッスン4-5）
├── 説得の透明性を隠しているか？
├── 選択の自由を強調しているか？
├── 徹底的な顧客肯定があるか？
├── ラベリング効果を活用しているか？
└── 優越感を戦略的に活用しているか？

## 3. 救世主ストーリー（レッスン6）
├── 特別な知識・苦難の克服・使命感
├── 犠牲・確信・選ばれた感覚
└── 受難の物語（同情と信頼の構築）

## 4. ムーブメント7要素チェック（レッスン7-13）
├── アトラクティブキャラクター
├── ビジョン（どこに連れていくか）
├── ムーブメント（なぜ今必要か）
├── マニフェスト（私たちは何者か）
├── 共通の敵（何と戦うか）
├── スローガン（呼びかけの言葉）
└── ストーリー（物語）

## 5. ストーリー型チェック（レッスン14-21）
├── 最後のピース型（欠けていたもの）
├── 未来予測型（過去→現在→未来）
├── 原点回帰型（本来あるべき姿）
├── 業界の闇型（禁断の真実）
├── ミステリー型（謎解き構造）
├── 伝道者型（権威者からの学び）
└── ヒーローズジャーニー型（英雄の旅）

# 型定義
interface CopyAnalysisRequest {
  text: string;                    // 分析対象テキスト
  type: 'lp' | 'sales_letter' | 'ad_copy' | 'email';
  targetAudience?: string;
  genre?: string;
}

interface CopyAnalysisResult {
  overallScore: number;            // 総合スコア（0-100）
  
  // カテゴリ別スコア
  persuasionScore: number;         // 説得力
  psychologyScore: number;         // 心理テクニック
  storyScore: number;              // ストーリー構造
  movementScore: number;           // ムーブメント要素
  
  // 診断詳細
  checklist: ChecklistItem[];
  
  // 改善提案
  improvements: Improvement[];
  
  // 検出されたフレームワーク
  detectedFrameworks: string[];
  
  // 心理トリガー使用状況
  usedTriggers: string[];
  missingTriggers: string[];
  
  // ストーリー型診断
  storyType?: string;
  storyTypeScore?: number;
}

interface ChecklistItem {
  category: string;
  item: string;
  passed: boolean;
  score: number;
  feedback: string;
  lessonRef?: number;             // 参照レッスン番号
}

interface Improvement {
  priority: 'high' | 'medium' | 'low';
  section: string;
  currentText?: string;
  suggestion: string;
  framework: string;              // 適用フレームワーク
  expectedImpact: string;
  lessonRef?: number;
}

# UI要件
1. テキスト入力エリア（原稿ペースト）
2. 分析タイプ選択（LP/セールスレター/広告/メール）
3. 分析結果ダッシュボード
   - 総合スコア（円グラフ）
   - カテゴリ別スコア（レーダーチャート）
   - チェックリスト一覧
   - 改善提案リスト（優先度順）
4. 改善提案の1クリック適用機能
5. レッスン参照リンク（学習用）
6. 「この箇所をAIで改善」ボタン

# AIモデル選択
- 簡易診断: Gemini Flash（コスパ）
- 詳細診断: Gemini 3.0 Pro（精度）
```

---

### 依頼15: N1ファースト設計（ペルソナ vs N1の明確化）

```
# タスク
N1（実在顧客）とペルソナ（架空）を明確に区別し、
N1データを中心としたターゲット分析システムを実装してください。

# 背景
- ペルソナは架空の人物なので効果が薄い（ダイレクト出版事例：数千万円かけて効果なし）
- N1（たった一人の実在顧客を深く理解）の方が普遍的な洞察が得られる
- 事実と仮説を明確に区別することが重要

# 作成ファイル
- src/lib/research/n1-manager.ts              # N1データ管理
- src/lib/research/persona-generator.ts       # N1ベースペルソナ生成
- src/components/research/N1InputForm.tsx     # N1入力フォーム
- src/components/research/N1vsPersonaView.tsx # 事実vs仮説の可視化

# データ階層（ラベリング）

🟢 レベル1: N1データ（FACT - 事実）
├── インタビュー記録
├── 顧客の生の声（購入理由、躊躇点、決め手）
├── 実際の購入履歴・行動データ
└── 「なぜ買ったのか」の本当の理由

🟡 レベル2: N1ベースペルソナ（N1-BASED - 高確度仮説）
├── N1データを元に拡張した推定
├── 類似顧客パターンの抽出
└── 複数N1の共通点分析

🔴 レベル3: AIペルソナ（HYPOTHESIS - 仮説）
├── リサーチデータからの推定
├── AIによる生成
└── ※参考程度に使用

# N1入力テンプレート

interface N1Data {
  // 基本情報（事実）
  basic: {
    name: string;           // 仮名OK
    age: number;
    occupation: string;
    familyStructure: string;
    purchasedProduct: string;
    purchaseDate: string;
    purchaseAmount: number;
    discoveryChannel: string; // どこで知ったか
  };
  
  // 購入前の状態（生の声）
  beforePurchase: {
    painPoint: string;       // 何に困っていたか
    painDuration: string;    // いつから悩んでいたか
    triedSolutions: string[]; // 他に試したこと
    whyNotWorked: string;    // なぜ解決しなかったか
  };
  
  // 購入の決め手（核心）
  decisionPoint: {
    triggerMoment: string;   // 「これだ」と思った瞬間
    hesitation: string;      // 迷った瞬間
    finalPush: string;       // 最後の一押し
    pricePerception: string; // 価格への感覚
  };
  
  // 購入後の変化（結果）
  afterPurchase: {
    transformation: string;  // どう変わったか
    recommendation: string;  // 人に勧めるなら何と言う
    wouldRepurchase: boolean;
  };
  
  // メタ情報
  meta: {
    interviewDate: string;
    interviewer: string;
    rawTranscript?: string;  // インタビュー全文
  };
}

# UI要件

1. N1データ入力フォーム
   - インタビューテンプレート付き
   - 音声入力対応（Whisper API連携）
   - PDFダウンロード（クライアントに渡せる質問シート）

2. N1 vs ペルソナ可視化
   - 🟢🟡🔴 のラベルで事実/仮説を明確化
   - N1データがない場合の警告表示

3. N1未入力時の警告
   ┌─────────────────────────────────────────────────────────┐
   │ ⚠️ N1データなしでのLP生成は非推奨です                   │
   ├─────────────────────────────────────────────────────────┤
   │ 架空のペルソナだけでLPを作ると、                        │
   │ 誰にも刺さらないLPになるリスクがあります。              │
   │                                                         │
   │ 💡 推奨:                                                 │
   │ ・既存顧客1-3名にインタビュー（20分程度）               │
   │ ・「なぜ買ったのか」「何が決め手だったか」を聞く        │
   │                                                         │
   │ [N1インタビューガイドを見る] [それでも続ける（非推奨）] │
   └─────────────────────────────────────────────────────────┘
```

---

### 依頼16: クライアントヒアリングシート生成

```
# タスク
クライアントに渡せるヒアリングシートを自動生成する機能を実装してください。

# 作成ファイル
- src/lib/documents/hearing-sheet-generator.ts
- src/app/dev/hearing-sheet/page.tsx

# 出力形式
├── PDF（印刷用）
├── Googleフォーム（回答収集用）
├── Notion（共同編集用）
└── Markdown（汎用）

# シート内容

## LP制作ヒアリングシート

### 1. 基本情報
- 御社名/担当者名
- 商品/サービス名
- LP制作の目的
- 希望納期
- 予算感

### 2. ターゲット顧客
- 誰に売りたいですか？
- その人はどんな悩みを持っていますか？
- なぜその悩みを解決したいのですか？

### 3. N1顧客情報（最重要）
- 実際に購入した顧客を1名教えてください
  - なぜ購入しましたか？
  - 何が決め手でしたか？
  - 購入前に迷ったことは？
  - 購入後どう変わりましたか？

### 4. 競合情報
- 競合となる商品/サービスは？
- 競合と比べた御社の強みは？
- 競合と比べた御社の弱みは？

### 5. オファー情報
- 価格
- 提供内容
- 特典
- 保証

### 6. 既存素材
- 既存LP/サイトURL
- ロゴ/ブランドカラー
- 使用したい写真/動画

# 機能要件
1. ジャンル選択でテンプレート切り替え
2. 回答をそのままN1データとしてインポート
3. Googleフォーム自動生成（GAS連携）
4. 回答通知（メール/Slack）
```

---

### 依頼17: 提案書/報告書自動生成（Googleドキュメント変換）

```
# タスク
リサーチ結果を提案書/報告書形式で自動生成し、
Googleドキュメントに一括変換する機能を実装してください。

# 参考
- Manus AIの報告書出力機能

# 作成ファイル
- src/lib/documents/proposal-generator.ts
- src/lib/google/docs-exporter.ts
- src/app/dev/proposal/page.tsx

# 出力形式
├── Googleドキュメント（直接作成）
├── Googleスライド（プレゼン用）
├── Markdown
├── PDF
└── Word（.docx）

# 提案書テンプレート

## LP企画提案書

### 1. エグゼクティブサマリー
- 目的
- 推奨アプローチ
- 期待される成果

### 2. 市場リサーチ結果
- 競合分析サマリー
- 市場トレンド
- 成功パターン

### 3. ターゲット分析
- N1データサマリー
- 共通ペインポイント
- 購買決定要因

### 4. 提案LP構成
- 10セクション構成
- 各セクションの役割
- 心理トリガー適用ポイント

### 5. クリエイティブ方向性
- ビジュアルイメージ
- トーン＆マナー
- 参考デザイン

### 6. ABテスト案
- テスト項目
- 仮説

### 7. スケジュール
- マイルストーン
- 納品物

# 機能要件
1. リサーチ結果から自動生成
2. Googleドキュメントに直接エクスポート
3. ブランディング設定（ロゴ、カラー）
4. テンプレート選択（シンプル/詳細/プレゼン）
```

---

### 依頼18: ヘッドライン大量生成

```
# タスク
N1データと心理トリガーを元に、ヘッドライン/キャッチコピーを
一括大量生成する機能を実装してください。

# 作成ファイル
- src/lib/copywriting/headline-generator.ts
- src/app/dev/headlines/page.tsx

# 生成パターン

## セクション別
├── ファーストビュー（メインキャッチ）
├── ベネフィット見出し
├── CTA（行動喚起）
├── FAQ見出し
└── 追伸

## 心理トリガー別
├── 希少性（残り◯名）
├── 社会的証明（◯人が実践）
├── 権威（専門家推薦）
├── 損失回避（このままでは...）
├── 好奇心（なぜ◯◯は...）
└── 共感（◯◯で悩んでいませんか？）

## トンマナ別
├── フォーマル
├── カジュアル
├── 緊急
├── 共感重視
└── データ重視

# UI要件

┌─────────────────────────────────────────────────────────┐
│ ヘッドライン生成器                                      │
├─────────────────────────────────────────────────────────┤
│ N1データ: 山田花子さん（38歳主婦）                      │
│ 商品: 子育てストレス解消講座                            │
│                                                         │
│ [セクション: ファーストビュー ▼]                        │
│ [心理トリガー: □希少性 ☑損失回避 ☑共感 □権威]          │
│ [トンマナ: カジュアル ▼]                                │
│ [生成数: 50 ▼]                                          │
│                                                         │
│ [生成する]                                              │
├─────────────────────────────────────────────────────────┤
│ 生成結果 (50案):                                        │
│                                                         │
│ ⭐⭐⭐ 1. 怒鳴る自分が嫌いだった。でも... [採用]        │
│ ⭐⭐  2. 1,200人のママが取り戻した「笑顔」 [保留]       │
│ ⭐    3. このままでは子どもに嫌われる [没]              │
│       4. 今日も「ごめんね」で終わる夜... [未評価]       │
│ ...                                                     │
│                                                         │
│ [採用したものをエクスポート]                            │
└─────────────────────────────────────────────────────────┘

# 機能要件
1. 50-100案を一括生成
2. お気に入り/採用/保留/没のステータス管理
3. 生成結果をスプレッドシートにエクスポート
4. ABテスト用にペアで出力
```

---

### 依頼19: Google Workspace連携強化

```
# タスク
リサーチ結果をスプレッドシートに蓄積し、
GASテンプレートで自動処理する機能を実装してください。

# 作成ファイル
- src/lib/google/sheets-manager.ts
- src/lib/google/gas-templates.ts
- src/app/dev/google-sync/page.tsx

# スプレッドシート構造

## リサーチ結果シート
| 日時 | ジャンル | N1データ | 競合URL | LP構成パターン | 心理トリガー | メモ |

## N1データベースシート
| 顧客名 | 年齢 | 職業 | 購入商品 | 購入理由 | 決め手 | 躊躇点 | 変化 |

## ヘッドラインストックシート
| 日時 | ジャンル | セクション | トリガー | コピー | スコア | ステータス |

## 競合分析シート
| URL | ジャンル | LP構成 | 強み | 弱み | 心理トリガー | スコア |

# GASテンプレート

1. リサーチ結果自動蓄積
   - API叩くたびに自動でシートに追記
   - 重複チェック

2. 週次レポート自動生成
   - 蓄積したデータからサマリー作成
   - Slack/メール通知

3. N1データ分析
   - 共通パターン抽出
   - ピボット集計

# 機能要件
1. 初回セットアップウィザード
2. スプレッドシートテンプレート自動作成
3. GASスクリプト自動デプロイ
4. リアルタイム同期
5. 蓄積データからの学習（将来）
```

---

### 依頼20: デザインツール連携（Canva/Figma/Adobe）

```
# タスク
LP構成やワイヤーフレームをデザインツールに直接エクスポートする
機能を実装してください。

# 作成ファイル
- src/lib/design/canva-exporter.ts
- src/lib/design/figma-exporter.ts
- src/lib/design/adobe-exporter.ts
- src/app/dev/design-export/page.tsx

# 対応ツール

## Canva
- Canva API連携
- テンプレート作成
- テキスト/画像配置

## Figma
- Figma Plugin / REST API
- コンポーネント配置
- Auto Layout対応

## Adobe
- Adobe Express API
- Photoshop（画像編集）
- Illustrator（ベクター）
- ChatGPT Connector活用

# エクスポート内容

1. LPワイヤーフレーム
   - セクション構成
   - 各セクションの役割説明
   - テキストプレースホルダー

2. バナー/サムネイル
   - 生成した画像をそのまま配置
   - テキストオーバーレイ

3. SNS素材
   - Instagram/Twitter/YouTube用サイズ
   - ブランドカラー適用

# 機能要件
1. ワンクリックエクスポート
2. サイズプリセット選択
3. ブランディング設定の引き継ぎ
4. 編集用リンク生成
```

---

### 依頼21: 画像サイズプリセット＆白紙キャンバス

```
# タスク
画像生成時のサイズプリセットと、白紙キャンバス生成機能を実装してください。

# 参考
- easy_banana の白紙キャンバス機能
- 白紙を参考画像にしてマージすると出力精度UP

# 作成ファイル
- src/lib/image/size-presets.ts
- src/lib/image/blank-canvas-generator.ts
- src/components/magic-pen/SizePresetSelector.tsx

# サイズプリセット

## LPセクション
| 名前 | サイズ | アスペクト比 |
|------|--------|------------|
| LPヒーロー（PC） | 1920x1080 | 16:9 |
| LPヒーロー（モバイル） | 750x1334 | 9:16 |
| LPセクション | 1200x800 | 3:2 |

## SNS
| 名前 | サイズ | アスペクト比 |
|------|--------|------------|
| YouTubeサムネイル | 1280x720 | 16:9 |
| Instagramフィード | 1080x1080 | 1:1 |
| Instagramストーリー | 1080x1920 | 9:16 |
| Twitterヘッダー | 1500x500 | 3:1 |
| OGP画像 | 1200x630 | 約2:1 |

## 広告
| 名前 | サイズ | アスペクト比 |
|------|--------|------------|
| Facebook広告 | 1200x628 | 約2:1 |
| Googleディスプレイ | 300x250 | - |
| 縦長バナー | 300x600 | 1:2 |

## 印刷
| 名前 | サイズ | アスペクト比 |
|------|--------|------------|
| A4縦 | 2480x3508 | 約1:1.4 |
| 名刺 | 1050x600 | 約7:4 |

# 白紙キャンバス機能

## 用途
- 参考画像として使用 → 出力精度UP
- 特に漫画/イラスト系で効果的
- LP画像にも適用可能

## 実装
1. サイズ選択
2. 白紙PNG自動生成
3. 参考画像スロットに自動配置
4. マージ生成実行

# UI要件

┌─────────────────────────────────────────────────────────┐
│ サイズプリセット                                        │
├─────────────────────────────────────────────────────────┤
│ [カテゴリ: LP ▼]                                        │
│                                                         │
│ ○ LPヒーロー（PC）   1920x1080  16:9                    │
│ ● LPヒーロー（モバイル） 750x1334  9:16  ← 選択中       │
│ ○ LPセクション      1200x800   3:2                     │
│                                                         │
│ [カスタム: 幅 [    ] x 高さ [    ] ]                    │
│                                                         │
│ ☑ 白紙キャンバスを参考画像に設定（推奨）                │
│                                                         │
│ [適用]                                                  │
└─────────────────────────────────────────────────────────┘
```

---

### 依頼22: LPセクションビルダー（採用/没/保留/連結プレビュー）

```
# タスク
LPをセクション単位で生成・管理し、採用/没/保留のステータスで
パーツを組み立てて連結プレビューできるシステムを実装してください。

# 作成ファイル
- src/lib/lp-builder/section-manager.ts
- src/lib/lp-builder/lp-assembler.ts
- src/components/lp-builder/SectionCard.tsx
- src/components/lp-builder/LPPreview.tsx
- src/app/dev/lp-builder/page.tsx

# セクション定義

enum LPSection {
  HERO = 'hero',                    // ファーストビュー
  PROBLEM = 'problem',              // 問題提起
  AGITATION = 'agitation',          // 問題の深掘り
  SOLUTION = 'solution',            // 解決策提示
  BENEFITS = 'benefits',            // ベネフィット
  FEATURES = 'features',            // 特徴・機能
  TESTIMONIALS = 'testimonials',    // お客様の声
  PRICING = 'pricing',              // 価格・オファー
  FAQ = 'faq',                      // よくある質問
  CTA = 'cta',                      // 行動喚起
  GUARANTEE = 'guarantee',          // 保証
  PROFILE = 'profile',              // 運営者プロフィール
  PS = 'ps',                        // 追伸
}

# セクションステータス

enum SectionStatus {
  DRAFT = 'draft',        // 下書き
  PENDING = 'pending',    // 保留
  APPROVED = 'approved',  // 採用
  REJECTED = 'rejected',  // 没
}

# 型定義

interface LPSectionItem {
  id: string;
  type: LPSection;
  version: number;        // バージョン管理
  status: SectionStatus;
  content: {
    headline: string;
    subheadline?: string;
    body: string;
    image?: string;       // 生成画像
    cta?: string;
  };
  generatedAt: string;
  approvedAt?: string;
  order?: number;         // 連結時の順番
}

interface LPProject {
  id: string;
  name: string;
  sections: LPSectionItem[];
  approvedSections: string[];  // 採用済みセクションID順
  createdAt: string;
  updatedAt: string;
}

# UI要件

## 1. セクション生成パネル
┌─────────────────────────────────────────────────────────┐
│ セクション生成                                          │
├─────────────────────────────────────────────────────────┤
│ [セクション: ファーストビュー ▼]                        │
│ [生成する]                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│ │ Ver.1   │  │ Ver.2   │  │ Ver.3   │                  │
│ │ [画像]  │  │ [画像]  │  │ [画像]  │                  │
│ │ ヘッド  │  │ ヘッド  │  │ ヘッド  │                  │
│ │ コピー  │  │ コピー  │  │ コピー  │                  │
│ │         │  │         │  │         │                  │
│ │ [採用]  │  │ [保留]  │  │ [没]    │                  │
│ └─────────┘  └─────────┘  └─────────┘                  │
│                                                         │
└─────────────────────────────────────────────────────────┘

## 2. 採用セクション管理
┌─────────────────────────────────────────────────────────┐
│ 採用済みセクション                           [プレビュー]│
├─────────────────────────────────────────────────────────┤
│ ≡ 1. ファーストビュー (Ver.1)                [編集] [×] │
│ ≡ 2. 問題提起 (Ver.2)                        [編集] [×] │
│ ≡ 3. 解決策 (Ver.1)                          [編集] [×] │
│ ≡ 4. ベネフィット (Ver.3)                    [編集] [×] │
│ ≡ 5. お客様の声 (Ver.1)                      [編集] [×] │
│ ...                                                     │
│                                                         │
│ ⚠️ 未生成: FAQ, 保証                                    │
│ [不足セクションを生成]                                  │
└─────────────────────────────────────────────────────────┘

## 3. 連結プレビュー
┌─────────────────────────────────────────────────────────┐
│ LPプレビュー                              [モバイル/PC]  │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │              ファーストビュー                       │ │
│ │              [採用した画像]                         │ │
│ │              採用したヘッドコピー                   │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │              問題提起                               │ │
│ │              ...                                    │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │              解決策                                 │ │
│ │              ...                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [HTMLエクスポート] [Figmaエクスポート] [Canvaエクスポート]│
└─────────────────────────────────────────────────────────┘

# 機能要件
1. セクション単位で複数バージョン生成
2. 採用/没/保留のドラッグ&ドロップ
3. 採用セクションの順番入れ替え
4. 連結プレビュー（PC/モバイル切り替え）
5. エクスポート（HTML/Figma/Canva）
6. 生成済み画像の再編集対応（Magic Penに戻す）
7. バージョン履歴管理
```

---

### 依頼23: RAG + CAG ハイブリッドナレッジシステム

```
# タスク
静的ナレッジはContext Cache（CAG）でキャッシュし、
動的データはRAGで検索するハイブリッドシステムを実装してください。
これによりAPI呼び出しコスト削減（30-50%）と精度向上を実現します。

# 参考
- OpenAI Prompt Caching: https://platform.openai.com/docs/guides/prompt-caching
- Gemini Context Caching: https://ai.google.dev/gemini-api/docs/caching

# 背景
RAGは毎回ベクトル検索が必要 → コスト高、遅延あり
CAGは静的データをKVメモリにキャッシュ → 高速、低コスト
両者を組み合わせることで最適なパフォーマンスを実現

# データ分類

## 🧊 COLD（静的・CAGでキャッシュ）
├── killer_words.yaml              # 389個のキラーワード
├── writing_techniques.yaml        # 6テクニック
├── marketing_strategy.yaml        # DRMファネル、オファー設計
├── consumer_behavior.yaml         # 心理トリガー50選
├── design_prompts.yaml            # 60+デザインプロンプト
├── fanification_philosophy.md     # 21レッスン
└── youtube_thumbnail_psychology.yaml # サムネ心理学 ⭐NEW
↓
📦 一度キャッシュ → 毎回の検索不要 → 高速・低コスト

## 🔥 HOT（動的・RAGで検索）
├── リサーチ結果（競合LP、広告）
├── N1データ（顧客インタビュー）
├── プロジェクト固有の情報
├── 最新トレンド情報
└── ユーザーがアップロードした資料
↓
🔍 都度検索 → 最新情報を取得

# 作成ファイル
- src/lib/ai/context-cache.ts       # Gemini Context Cache管理
- src/lib/ai/rag-retriever.ts       # 動的データRAG検索
- src/lib/ai/hybrid-knowledge.ts    # CAG+RAG統合レイヤー
- src/lib/knowledge/loader.ts       # 静的ナレッジ読み込み
- src/lib/knowledge/cache-manager.ts # キャッシュ有効期限管理

# 型定義

interface KnowledgeCache {
  cacheId: string;
  model: string;
  createdAt: string;
  expiresAt: string;
  tokenCount: number;
  files: string[];
}

interface HybridQuery {
  prompt: string;
  dynamicContext?: string;    // RAGで取得した動的データ
  useCache: boolean;          // CAGキャッシュを使用するか
  cacheId?: string;
}

interface HybridResponse {
  text: string;
  sources: {
    cached: string[];         // CAGから使用したファイル
    retrieved: string[];      // RAGから取得したデータ
  };
  tokensUsed: {
    cached: number;           // キャッシュからの読み込み（低コスト）
    generated: number;        # 新規生成
  };
  costSavings: number;        // 推定コスト削減額
}

# 実装例

// キャッシュ作成（起動時に1回）
const cache = await createKnowledgeCache({
  files: [
    'killer_words.yaml',
    'writing_techniques.yaml',
    'marketing_strategy.yaml',
    'consumer_behavior.yaml',
    'design_prompts.yaml',
    'fanification_philosophy.md'
  ],
  ttlSeconds: 3600 // 1時間有効
});

// ハイブリッドクエリ実行
const result = await hybridGenerate({
  prompt: 'このLPのヘッドコピーを診断して改善案を出して',
  dynamicContext: lpContent,  // ユーザーのLPコンテンツ
  useCache: true,
  cacheId: cache.id
});

// 結果
// - 静的ナレッジ（心理トリガー50選等）はキャッシュから高速取得
// - LPコンテンツは動的データとして処理
// - コスト削減: 推定40%

# 機能要件
1. 静的ナレッジの自動キャッシュ（起動時）
2. キャッシュ有効期限管理（TTL: 1-24時間）
3. 動的データのRAG検索（必要時のみ）
4. キャッシュヒット率のモニタリング
5. コスト削減効果の可視化（ダッシュボード）

# UI要件
- 設定画面にキャッシュ状態表示
- キャッシュ手動更新ボタン
- コスト削減レポート（月次）

# 期待効果
├── API呼び出しコスト削減: 30-50%
├── レスポンス速度向上: 2-3倍
├── ナレッジ活用の一貫性向上
└── 検索漏れリスクの低減
```

---

### 依頼25: PDF処理機能（文字起こし・画像化）

```
# タスク
PDFファイルをアップロードして、テキスト抽出（文字起こし）と
画像化（PNG変換）を行う機能を実装してください。
GoogleドライブからPDFを読み込む機能も含みます。

# 背景
- ユーザーがPDFで資料をアップロードするケースがある
- GoogleドライブにPDFがある場合の処理が必要
- PDFを画像化してMagic Penで編集可能にする
- PDFからテキストを抽出してリサーチやコピー生成に活用

# 作成ファイル
- src/lib/pdf/pdf-processor.ts          # PDF処理ロジック
- src/lib/pdf/text-extractor.ts         # テキスト抽出
- src/lib/pdf/image-converter.ts        # PDF→PNG変換
- src/lib/pdf/google-drive-loader.ts    # Googleドライブ連携
- src/app/api/pdf/process/route.ts     # APIエンドポイント
- src/app/api/pdf/extract-text/route.ts # テキスト抽出API
- src/app/api/pdf/to-images/route.ts   # 画像化API
- src/components/pdf/PDFUploader.tsx   # PDFアップロードUI
- src/components/pdf/PDFViewer.tsx     # PDFプレビューUI
- src/app/dev/pdf-processor/page.tsx   # PDF処理画面

# 機能要件

## 1. PDFアップロード
- ドラッグ&ドロップ対応
- ファイル選択ダイアログ
- Googleドライブから選択
- 複数ファイル対応

## 2. テキスト抽出（文字起こし）
- PDFから全テキストを抽出
- ページ単位で分割
- テキストファイルとしてダウンロード
- クリップボードにコピー
- Gemini 2.5 FlashでOCR（画像PDFの場合）

## 3. PDF画像化（PNG変換）
- PDFの各ページをPNG画像に変換
- DPI設定（150/300/600）
- 画像品質設定
- ZIPで一括ダウンロード
- Magic Penに直接ドロップ可能

## 4. Googleドライブ連携
- GoogleドライブからPDFを選択
- 共有リンクからPDFを読み込み
- 自動認証（OAuth2）

# 型定義

interface PDFProcessRequest {
  file: File | string;  // File object or Google Drive file ID
  operations: ('extract-text' | 'to-images')[];
  options?: {
    dpi?: number;           // 画像化時のDPI（150/300/600）
    quality?: number;        // 画像品質（0-100）
    ocrEnabled?: boolean;    // OCR有効化（画像PDF用）
  };
}

interface PDFProcessResponse {
  success: boolean;
  text?: string;            // 抽出されたテキスト
  images?: string[];         // Base64エンコードされた画像配列
  pageCount?: number;
  processingTime?: number;
  error?: string;
}

interface PDFTextExtractResult {
  text: string;
  pages: {
    pageNumber: number;
    text: string;
  }[];
  metadata: {
    title?: string;
    author?: string;
    pageCount: number;
  };
}

interface PDFImageConvertResult {
  images: {
    pageNumber: number;
    dataUrl: string;         // Base64 data URL
    width: number;
    height: number;
  }[];
  zipUrl?: string;           // ZIPダウンロード用URL
}

# 技術スタック

## バックエンド（Python推奨）
Option A: Python + pdf2image + PyPDF2
```python
# pdf-processor.py
from pdf2image import convert_from_path
import PyPDF2
from PIL import Image

def extract_text(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text

def pdf_to_images(pdf_path, dpi=300):
    images = convert_from_path(pdf_path, dpi=dpi)
    return [img for img in images]
```

Option B: Next.js純正（pdfjs-dist）
```typescript
import * as pdfjsLib from 'pdfjs-dist';

// テキスト抽出
const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
const page = await pdf.getPage(1);
const textContent = await page.getTextContent();
```

## OCR（画像PDF用）
- Gemini 2.5 Flash Vision API
- Tesseract.js（クライアント側）
- Google Cloud Vision API（高精度）

# UI要件

## PDF処理画面
┌─────────────────────────────────────────────────────────┐
│ PDF処理ツール                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [📁 ファイルを選択] [☁️ Googleドライブから選択]         │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ PDFプレビュー                                       │ │
│ │ [ページ1] [ページ2] [ページ3] ...                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 処理オプション:                                         │
│ ☑ テキスト抽出（文字起こし）                            │
│ ☑ PDFを画像化（PNG）                                    │
│   DPI: [300 ▼] 品質: [90%]                             │
│                                                         │
│ [処理開始]                                              │
│                                                         │
│ 結果:                                                   │
│ ├── 📄 テキスト: [ダウンロード] [コピー]               │
│ └── 🖼️ 画像: [ZIPダウンロード] [Magic Penに送る]       │
│                                                         │
└─────────────────────────────────────────────────────────┘

# 実装例

// PDF処理API
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const operations = formData.get('operations')?.split(',') || [];
  
  // PDFをバッファに変換
  const buffer = Buffer.from(await file.arrayBuffer());
  
  const results: PDFProcessResponse = {
    success: true,
    pageCount: 0,
  };
  
  // テキスト抽出
  if (operations.includes('extract-text')) {
    const text = await extractTextFromPDF(buffer);
    results.text = text;
  }
  
  // 画像化
  if (operations.includes('to-images')) {
    const images = await convertPDFToImages(buffer, { dpi: 300 });
    results.images = images.map(img => img.dataUrl);
    results.pageCount = images.length;
  }
  
  return Response.json(results);
}

# 機能要件（詳細）

1. PDFアップロード
   - 最大ファイルサイズ: 50MB
   - 対応形式: PDF（.pdf）
   - ドラッグ&ドロップ対応
   - 進捗バー表示

2. テキスト抽出
   - 全ページからテキスト抽出
   - ページ番号付きで出力
   - メタデータ（タイトル、著者等）も抽出
   - OCR対応（画像PDFの場合）

3. PDF画像化
   - 各ページをPNG画像に変換
   - DPI選択（150/300/600）
   - 画像品質設定
   - ZIPで一括ダウンロード
   - Magic Penに直接ドロップ可能

4. Googleドライブ連携
   - OAuth2認証
   - ファイル選択UI
   - 共有リンクから読み込み
   - 自動ダウンロード

# 期待効果
├── PDF資料の活用性向上
├── Magic Penでの編集が可能に
├── リサーチ効率向上（テキスト抽出）
└── ユーザー満足度向上
```

---

### 依頼26: バナーエディター（Novasphere型）

```
# タスク
AI生成画像をその場で微調整できるバナーエディター機能を実装してください。
Novasphereのエディター機能を参考にします。

# 背景
- AI生成画像はそのままでは広告に使うにはクオリティが足りない
- 「結局必要な微調整」をその場でできる機能が必要
- テキストの変更、フォント調整、配置変更をGUIで行いたい
- 完成品としてPNG出力できるようにする

# 参考: Novasphere のエディター機能
- Canvas上のテキストをクリックして選択・編集
- 編集ツールパネル（右サイド）
  - フォントサイズ（スライダー）
  - テキスト色（カラーピッカー）
  - 揃え（左/中央/右）
- PNG画像として保存
- 閉じるボタン

# 作成ファイル
- src/lib/editor/banner-editor.ts          # エディターロジック
- src/lib/editor/text-layer.ts             # テキストレイヤー管理
- src/lib/editor/canvas-renderer.ts        # Canvas描画
- src/components/editor/BannerEditor.tsx   # メインエディターUI
- src/components/editor/EditToolPanel.tsx  # 編集ツールパネル
- src/components/editor/TextLayerItem.tsx  # テキストレイヤーアイテム
- src/components/editor/CanvasArea.tsx     # Canvas描画エリア
- src/app/dev/banner-editor/page.tsx       # 開発画面

# 機能要件

## 1. Canvas編集機能
- AI生成画像を背景として読み込み
- テキストレイヤーの追加
- テキストレイヤーのクリック選択
- ドラッグで位置移動
- ダブルクリックでテキスト編集モード

## 2. 編集ツールパネル（右サイド）
- フォントサイズ調整（スライダー: 12px〜120px）
- テキスト色（カラーピッカー）
- フォントファミリー選択（日本語フォント対応）
- フォントスタイル（太字/イタリック/下線）
- 揃え（左/中央/右）
- シャドウ設定（有無、色、ぼかし、オフセット）
- ストローク（縁取り）設定

## 3. レイヤー管理
- 複数テキストレイヤー対応
- レイヤー順序変更（上下移動）
- レイヤー表示/非表示
- レイヤー削除
- レイヤー複製

## 4. 出力機能
- PNG画像として保存（高画質）
- JPEG保存（品質調整可能）
- クリップボードにコピー
- 指定サイズでリサイズ出力

## 5. Magic Pen連携
- 生成した画像をそのままバナーエディターで開く
- 編集後の画像をMagic Penの「参考画像」として使用
- ドラッグ&ドロップでMagic Penに渡す

# 型定義

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  shadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  stroke?: {
    enabled: boolean;
    color: string;
    width: number;
  };
  visible: boolean;
  locked: boolean;
}

interface BannerEditorState {
  backgroundImage: string | null;       // Base64 or URL
  layers: TextLayer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
}

interface EditToolPanelProps {
  selectedLayer: TextLayer | null;
  onUpdateLayer: (id: string, updates: Partial<TextLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
}

interface ExportOptions {
  format: 'png' | 'jpeg';
  quality?: number;             // JPEG品質（0-100）
  width?: number;               // リサイズ幅
  height?: number;              // リサイズ高さ
  scale?: number;               // 拡大率
}

# UI設計

## レイアウト
┌──────────────────────────────────────────────────────────────┐
│ バナーエディター                              [閉じる]       │
├───────────────────────────────────────┬──────────────────────┤
│                                       │ 編集ツール           │
│                                       ├──────────────────────┤
│                                       │ フォントサイズ       │
│   ┌───────────────────────────────┐   │ ──●──────── 36px    │
│   │                               │   ├──────────────────────┤
│   │  [AI生成画像 + テキスト]      │   │ テキスト色           │
│   │                               │   │ ■ #f5f5f5           │
│   │   キレイ、もっと輝く私へ✨     │   ├──────────────────────┤
│   │                               │   │ 揃え                 │
│   │   毎日頑張るあなたへ♡        │   │ [左] [中央] [右]     │
│   │                               │   ├──────────────────────┤
│   └───────────────────────────────┘   │ フォント             │
│                                       │ [Noto Sans JP ▼]     │
│                                       ├──────────────────────┤
├───────────────────────────────────────┤ シャドウ ☑          │
│ [テキスト追加] [レイヤー▼] [画像読込] │ 色: ■ ぼかし: 4px   │
├───────────────────────────────────────┼──────────────────────┤
│ レイヤー一覧:                         │                      │
│ ├ レイヤー1: キレイ、もっと輝く...   │ [PNG画像として保存]  │
│ └ レイヤー2: 毎日頑張るあなたへ...   │ [閉じる]             │
└───────────────────────────────────────┴──────────────────────┘

# 実装例

const useBannerEditor = () => {
  const [state, setState] = useState<BannerEditorState>({
    backgroundImage: null,
    layers: [],
    selectedLayerId: null,
    canvasWidth: 1200,
    canvasHeight: 628,
    zoom: 1,
  });

  const addTextLayer = (text: string) => {
    const newLayer: TextLayer = {
      id: generateId(),
      text,
      x: state.canvasWidth / 2,
      y: state.canvasHeight / 2,
      fontSize: 36,
      fontFamily: 'Noto Sans JP',
      color: '#ffffff',
      align: 'center',
      bold: false,
      italic: false,
      underline: false,
      visible: true,
      locked: false,
    };
    setState(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      selectedLayerId: newLayer.id,
    }));
  };

  const exportAsImage = async (options: ExportOptions) => {
    const canvas = document.getElementById('banner-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    
    // 背景画像を描画
    if (state.backgroundImage) {
      const img = new Image();
      img.src = state.backgroundImage;
      await new Promise(resolve => img.onload = resolve);
      ctx.drawImage(img, 0, 0);
    }
    
    // テキストレイヤーを描画
    for (const layer of state.layers) {
      if (!layer.visible) continue;
      
      ctx.font = `${layer.bold ? 'bold' : ''} ${layer.fontSize}px ${layer.fontFamily}`;
      ctx.fillStyle = layer.color;
      ctx.textAlign = layer.align;
      
      if (layer.shadow?.enabled) {
        ctx.shadowColor = layer.shadow.color;
        ctx.shadowBlur = layer.shadow.blur;
        ctx.shadowOffsetX = layer.shadow.offsetX;
        ctx.shadowOffsetY = layer.shadow.offsetY;
      }
      
      ctx.fillText(layer.text, layer.x, layer.y);
    }
    
    // 出力
    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = options.quality ? options.quality / 100 : 1;
    return canvas.toDataURL(mimeType, quality);
  };

  return {
    state,
    addTextLayer,
    updateLayer,
    deleteLayer,
    selectLayer,
    exportAsImage,
    loadBackgroundImage,
  };
};

# 技術スタック
- HTML5 Canvas API
- React useRef / useState
- Fabric.js（オプション - より高機能なCanvas操作が必要な場合）
- react-colorful（カラーピッカー）
- Zustand（状態管理）

# 日本語フォント対応
- Google Fonts からロード
- Noto Sans JP
- M PLUS Rounded 1c
- Zen Kaku Gothic New
- Kosugi Maru

# 期待効果
├── AI生成画像の「あと一歩」を埋める
├── デザイナーでなくても完成品が作れる
├── 外部ツール（Canva/Figma）への移動が不要に
├── LP/広告制作のスピードアップ
└── ユーザー満足度向上（Novasphereの強み再現）
```

---

### 依頼27: リサーチ言語化支援（マルチエージェント壁打ち）

```
# タスク
リサーチ設定画面を見た瞬間「手が進まない」問題を解決するため、
最初から対話型で進められるUXを実装してください。
マルチエージェントと対話しながら、段階的にリサーチ設定を完成させます。

# 背景
- リサーチ設定画面を見た瞬間に「手が進まない」と感じる ⭐最重要
- フォーム入力は心理的ハードルが高い
- 対話型だと進めやすい（ユーザー実感）
- 「悩み・課題」「理想の状態」などの言語入力が難しい
- ユーザーが「なんとなく分かるけど言葉にできない」状態を解決したい
- AIエージェントと対話しながら言語化を進められるようにする

# UX設計の核心
「フォーム入力」ではなく「AIと対話しながら設定を進める」
→ ユーザーがしんどくならない、自然に進められる

# 作成ファイル
- src/lib/research/language-assistant.ts        # 言語化支援ロジック
- src/lib/research/multi-agent-chat.ts          # マルチエージェント対話
- src/components/research/LanguageChat.tsx      # チャットUI
- src/components/research/ResearchInputHelper.tsx # 入力支援コンポーネント
- src/components/research/ConversationalSetup.tsx ⭐NEW 対話型セットアップ
- src/app/api/research/language-assist/route.ts # APIエンドポイント

# 機能要件

## 1. 対話型モード（推奨・デフォルト）
- リサーチ設定画面を開いた瞬間、AIが挨拶して質問開始
- 段階的に情報を集める（ジャンル → ターゲット → 悩み → 理想）
- マルチエージェントが適切な質問を投げかける
- 対話が完了したら設定を自動反映
- 「フォームを確認」ボタンで従来のフォーム表示も可能

## 2. フォーム型モード（上級者向け）
- 従来のフォーム入力UI
- 各フィールドに「？対話で入力」ボタン追加
- クリックでチャットパネルを開く
- 対話が完了したら「フィールドに反映」ボタンで自動入力

## 3. マルチエージェント構成
- **質問エージェント**: ユーザーに質問を投げかける
- **整理エージェント**: ユーザーの回答を整理・構造化
- **提案エージェント**: 具体的なキーワード・フレーズを提案
- **検証エージェント**: 生成された言語が適切か検証

## 4. UI設計（対話型モード）

```
┌─────────────────────────────────────────────────────────┐
│ リサーチエージェント - 対話型セットアップ              │
│                                    [対話型 / フォーム型] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🤖: こんにちは！リサーチを始めましょう。              │
│      まず、どんな商品・サービスについて調べますか？    │
│                                                         │
│  👤: [美容系の化粧品について...]                       │
│                                                         │
│  🤖: 美容系の化粧品ですね。具体的にはどのような        │
│      商品ですか？（例：スキンケア、メイク、サプリ等）   │
│                                                         │
│  👤: [スキンケア商品]                                  │
│                                                         │
│  🤖: スキンケア商品ですね。ターゲットはどのような      │
│      方ですか？年齢や性別を教えてください。            │
│                                                         │
│  👤: [30代の女性]                                      │
│                                                         │
│  🤖: 30代女性向けのスキンケア商品ですね。              │
│      ターゲットの悩みや課題は何ですか？                │
│                                                         │
│  👤: [朝起きたら肌が荒れてる...]                       │
│                                                         │
│  🤖: 肌荒れの悩みですね。具体的には？                  │
│                                                         │
│  👤: [ニキビとかシミ]                                  │
│                                                         │
│  🤖: 『30代から増えるシミに悩む女性』で合っていますか？│
│                                                         │
│  👤: はい                                              │
│                                                         │
│  ✅ 設定が完了しました！                               │
│     [リサーチ開始] ボタンで次のステップへ              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 5. モード切り替え
- 画面右上に「対話型 / フォーム型」切り替えボタン
- デフォルトは「対話型」（UX改善のため）

## 6. エージェント役割定義

### 質問エージェント（Question Agent）
- 役割: ユーザーから情報を引き出す
- プロンプト: 「5W1Hで質問を投げかける」
- 例: 「いつ」「どこで」「誰が」「何を」「なぜ」「どのように」

### 整理エージェント（Organizer Agent）
- 役割: 断片的な回答を構造化
- プロンプト: 「ユーザーの回答を整理し、構造化された言語に変換」
- 例: 「朝起きたら肌が荒れてる」→「朝起きた時の肌荒れに悩む」

### 提案エージェント（Suggestion Agent）
- 役割: 具体的なキーワード・フレーズを提案
- プロンプト: 「リサーチに使える具体的なキーワードを3-5個提案」
- ナレッジ連携: killer_words.yaml, consumer_behavior.yaml

### 検証エージェント（Validation Agent）
- 役割: 生成された言語が適切か検証
- プロンプト: 「生成された言語がリサーチに使えるか検証し、改善提案」
- チェック項目:
  - 具体性（抽象的すぎないか）
  - ターゲット明確性（誰の悩みか）
  - リサーチ可能性（検索できるキーワードか）

## 7. 型定義

interface LanguageAssistRequest {
  field?: "problems" | "desires" | "subGenre" | "freeText" | "all";  // "all"は対話型モード
  currentValue?: string;
  context: Partial<ResearchContext>;
  conversationHistory?: ChatMessage[];
  mode: "conversational" | "form";  // 対話型 or フォーム型
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  agent?: "question" | "organizer" | "suggestion" | "validation";
  content: string;
  timestamp: number;
  suggestions?: string[];  // 提案エージェント用
}

interface LanguageAssistResponse {
  message: ChatMessage;
  suggestions?: string[];
  extractedPhrases?: string[];
  confidence?: number;  // 言語化の確信度
  shouldContinue?: boolean;  // 続けて質問すべきか
  completedFields?: Partial<ResearchContext>;  // 対話型モードで完了したフィールド
}

## 8. 実装パターン

### エージェント選択ロジック
```typescript
function selectAgent(conversationHistory: ChatMessage[]): AgentType {
  const lastMessage = conversationHistory[conversationHistory.length - 1];
  
  // 会話が始まったばかり → 質問エージェント
  if (conversationHistory.length <= 1) {
    return "question";
  }
  
  // ユーザーが断片的な回答 → 整理エージェント
  if (lastMessage.role === "user" && lastMessage.content.length < 50) {
    return "organizer";
  }
  
  // 整理済み → 提案エージェント
  if (conversationHistory.some(m => m.agent === "organizer")) {
    return "suggestion";
  }
  
  // 提案後 → 検証エージェント
  if (conversationHistory.some(m => m.agent === "suggestion")) {
    return "validation";
  }
  
  return "question";
}
```

## 9. ナレッジ連携
- killer_words.yaml → 提案エージェントがキーワード提案
- consumer_behavior.yaml → 心理トリガーに基づく質問
- marketing_strategy.yaml → リサーチ観点での検証

# 期待効果
├── 「手が進まない」問題の根本解決 ⭐最重要
├── リサーチ設定画面を見た瞬間の心理的ハードルを下げる
├── 対話型で自然に進められる（ユーザーがしんどくならない）
├── 言語入力のハードルが下がる
├── リサーチ設定の精度向上
├── ユーザーの「なんとなく」を言語化できる
└── リサーチ開始率の向上（離脱率の大幅削減）
```

---

### 依頼30: リサーチプロンプト・スキル提供機能

```
# タスク
リサーチ結果をCursorやClaudeで使える形式でエクスポートする機能を実装してください。
リサーチのフォーマットに合わせたClaude Skillsやプロンプトテンプレートを
プレゼントとして提供します。

# 背景
- ユーザーがリサーチ結果をCursorやClaudeで直接活用したい
- リサーチフォーマットに合わせたプロンプト・スキルを提供したい
- ユーザーが自分でもリサーチを進められるようにしたい
- ボーナスコンテンツとしての価値を提供したい

# 作成ファイル
- src/lib/research/prompt-generator.ts          # プロンプト生成ロジック
- src/lib/research/skill-generator.ts           # Claude Skills生成
- src/components/research/PromptExporter.tsx    # エクスポートUI
- src/app/api/research/export-prompt/route.ts  # プロンプトエクスポートAPI
- src/app/api/research/export-skill/route.ts   # スキルエクスポートAPI

# 機能要件

## 1. プロンプトテンプレート生成
リサーチ結果に基づいて、以下の形式のプロンプトを生成：

### A. Cursor用プロンプト（リサーチ結果を活用したLP作成）
```
# LP作成タスク: {projectName}

## リサーチ結果サマリー
- ジャンル: {genre}
- ターゲット: {target}
- 主要な悩み: {topPainPoints}
- 競合分析: {competitorSummary}
- キーワード: {topKeywords}

## 作成指示
上記のリサーチ結果を基に、以下のLPセクションを作成してください：
1. ヒーローセクション（ヘッドライン + サブヘッドライン）
2. 課題提起セクション
3. 解決策セクション
4. ベネフィットセクション
5. CTAセクション

## 要件
- キーワードを自然に組み込む
- ターゲットの悩みに刺さる表現を使う
- 競合との差別化ポイントを強調
- トンマナ: {toneManner}
```

### B. Claude用プロンプト（リサーチ結果を基にしたコピーライティング）
```
あなたはLP制作の専門コピーライターです。
以下のリサーチ結果を基に、売れるLPコピーを作成してください。

【リサーチ結果】
ジャンル: {genre}
ターゲット: {target}
主要な悩み: {painPoints}
理想の状態: {desires}
競合分析: {competitors}
キーワード: {keywords}

【作成依頼】
上記のリサーチ結果を活用して、以下のセクションのコピーを作成してください：
- ヘッドライン（3案）
- サブヘッドライン（3案）
- 課題提起のコピー
- ベネフィットのコピー
- CTAコピー

【トンマナ】
{toneManner}
```

## 2. Claude Skills生成
`.claude/skills/` 形式のスキルファイルを生成：

### A. リサーチ結果活用スキル
```markdown
# Research-Based LP Creation Skill

## Description
Guidelines for creating landing pages based on research results from LP Builder Pro.

## Research Context
- Genre: {genre}
- Target: {target}
- Pain Points: {painPoints}
- Competitors: {competitorSummary}
- Keywords: {topKeywords}

## Key Concepts
- Use research insights to create compelling copy
- Address target pain points directly
- Differentiate from competitors
- Incorporate keywords naturally

## Prompt Template
Based on the research results:
1. Create headlines that address: {topPainPoint}
2. Use keywords: {topKeywords}
3. Differentiate from competitors: {competitorDifferentiation}
4. Tone & Manner: {toneManner}

## Implementation Steps
1. Review research results
2. Identify key pain points
3. Create headlines addressing pain points
4. Develop benefit-focused copy
5. Add differentiation points
6. Incorporate keywords naturally
```

### B. たけるん式リサーチスキル
```markdown
# たけるん式リサーチメソッド Skill

## Description
たけるん式リサーチメソッドに基づいたコンセプト作成のガイドライン。

## 核心の2つの問い
1. 誰のどんな悩みを解決する商品なのか？
2. 競合とどう差別化するのか？

## リサーチ結果
{researchResults}

## コンセプト生成手順
1. 収集した悩みをマトリックス分類（深度×緊急性）
2. 優先度の高い悩み → ベネフィット変換
3. 競合コンセプト + 収集キーワード → 新コンセプト
4. 差別化ポイントを明確化

## プロンプトテンプレート
上記のリサーチ結果を基に、売れるコンセプトを3-5案生成してください。
各コンセプトには以下を含めてください：
- ターゲットの明確化
- 悩みの具体化
- ベネフィットの明確化
- 競合との差別化ポイント
```

## 3. エクスポート形式

### 形式A: Cursor用プロンプト（.md）
- リサーチ結果を構造化したプロンプト
- Cursorのチャットに直接貼り付け可能
- ファイルとして保存可能

### 形式B: Claude Skills（.md）
- `.claude/skills/` 形式のスキルファイル
- Cursorのスキルディレクトリに配置可能
- 再利用可能なスキルとして保存

### 形式C: プロンプトテンプレート集（.yaml）
- 複数のプロンプトテンプレートをYAML形式で提供
- リサーチ結果ごとにカスタマイズされたテンプレート

## 4. UI設計

### エクスポートボタン（リサーチ完了画面）
```
┌─────────────────────────────────────────┐
│ リサーチ完了                             │
├─────────────────────────────────────────┤
│ ... (リサーチ結果) ...                  │
│                                         │
│ [JSONエクスポート] [YAMLエクスポート]    │
│ [Cursor用プロンプト] [Claude Skills]    │ ← 追加
└─────────────────────────────────────────┘
```

### エクスポートオプション
```
┌─────────────────────────────────────────┐
│ エクスポート形式を選択                   │
├─────────────────────────────────────────┤
│ ○ Cursor用プロンプト（.md）             │
│   → リサーチ結果を基にしたLP作成プロンプト│
│                                         │
│ ○ Claude Skills（.md）                 │
│   → .claude/skills/ 形式のスキルファイル│
│                                         │
│ ○ プロンプトテンプレート集（.yaml）     │
│   → 複数テンプレートをYAML形式で        │
│                                         │
│ [エクスポート] [プレビュー]              │
└─────────────────────────────────────────┘
```

## 5. 型定義

interface PromptExportOptions {
  format: "cursor-prompt" | "claude-skill" | "prompt-templates";
  includeResearchData: boolean;  // リサーチデータを含めるか
  includeExamples: boolean;       // 使用例を含めるか
  customInstructions?: string;   // カスタム指示
}

interface PromptExportResult {
  content: string;
  filename: string;
  format: string;
  mimeType: string;
}

## 6. 実装例

### プロンプト生成ロジック
```typescript
function generateCursorPrompt(researchData: ResearchData): string {
  return `# LP作成タスク: ${researchData.context.projectName}

## リサーチ結果サマリー
- ジャンル: ${researchData.context.genre}
- ターゲット: ${researchData.context.target.ageGroups.join(", ")} ${researchData.context.target.gender}
- 主要な悩み: ${researchData.painPoints.slice(0, 3).map(p => p.text).join(", ")}
- 競合分析: ${researchData.competitors.length}件の競合LPを分析
- キーワード: ${researchData.keywords?.topKeywords.forHeadline.slice(0, 10).join(", ")}

## 作成指示
上記のリサーチ結果を基に、以下のLPセクションを作成してください：
...`;
}
```

### スキル生成ロジック
```typescript
function generateClaudeSkill(researchData: ResearchData): string {
  return `# Research-Based LP Creation Skill

## Description
Guidelines for creating landing pages based on research results from LP Builder Pro.

## Research Context
- Genre: ${researchData.context.genre}
- Target: ${researchData.context.target.ageGroups.join(", ")} ${researchData.context.target.gender}
- Pain Points: ${researchData.painPoints.map(p => p.text).join(", ")}
- Competitors: ${researchData.competitors.length} competitors analyzed
- Keywords: ${researchData.keywords?.topKeywords.forHeadline.join(", ")}

...`;
}
```

## 7. ナレッジ連携
- killer_words.yaml → プロンプトにキーワードを組み込む
- consumer_behavior.yaml → 心理トリガーをプロンプトに追加
- marketing_strategy.yaml → DRMファネルをプロンプトに組み込む
- fanification_philosophy.md → ファン化哲学をプロンプトに追加

## 8. プレゼント機能
- リサーチ完了時に自動的に「プロンプト・スキルをダウンロード」ボタンを表示
- ボーナスコンテンツとしての価値を提供
- ユーザーがCursor/Claudeで直接活用できる

# 期待効果
├── リサーチ結果の活用率向上
├── Cursor/Claudeでの作業効率化
├── ユーザーが自分でもリサーチを進められる
├── ボーナスコンテンツとしての価値提供
└── ユーザー満足度向上
```

---

### 依頼31: 高度な動的スクレイピング統合（オープンソース活用）

```
# タスク
GitHubで公開されているオープンソースの動的スクレイピングツールを統合して、
既存のPlaywrightベースのスクレイパーを強化してください。
Manus AI以外にも、より高度な動的リサーチが可能になるようにします。

# 背景
- 既存のPlaywrightベーススクレイパーでは限界がある
- Manus AIを無理やり入れたが、他の方法も検討したい
- GitHubで公開されているオープンソースツールを活用したい
- 動的コンテンツ（JavaScript/Ajax）の取得精度を向上させたい
- より高度なブラウザ操作が可能なツールを統合したい

# 作成ファイル
- src/lib/research/scrapers/crawlee-integration.ts    # Crawlee統合（最優先）
- src/lib/research/scrapers/crawljax-integration.ts   # Crawljax統合（Ajax対応）
- src/lib/research/scrapers/dynamic-scraper.ts        # 動的スクレイパー統合ラッパー
- src/lib/research/manus-ai.ts                        # Manus AI API統合（オプション）
- src/components/research/DynamicResearchPanel.tsx    # 動的リサーチUI
- src/app/api/research/dynamic/route.ts               # 動的リサーチAPI
- src/app/dev/settings/page.tsx                       # APIキー設定（追加）

# 推奨オープンソースツール

## 1. Crawlee（最優先推奨）⭐⭐⭐⭐⭐
- **GitHub**: https://github.com/apify/crawlee
- **Stars**: 20,735+（2025年12月時点）
- **特徴**:
  - Node.js向けの包括的なWebスクレイピングライブラリ
  - Playwright/Puppeteer統合済み（既存コードと互換性高い）
  - 動的コンテンツ対応（JavaScript実行）
  - プロキシローテーション、セッション管理内蔵
  - 永続キュー、プラガブルストレージ
  - HTTPとヘッドレスブラウザの統一インターフェース

### 統合メリット
- **既存Playwrightコードとの互換性**: 段階的に移行可能
- **動的コンテンツ対応**: JavaScriptで生成されるコンテンツも取得可能
- **信頼性**: プロキシローテーション、リトライ機能内蔵
- **スケーラビリティ**: 大量のURLを効率的に処理

## 2. Crawljax（Ajax対応）⭐⭐⭐⭐
- **GitHub**: https://github.com/crawljax/crawljax
- **特徴**:
  - Ajaxベースの動的Webアプリケーション専用
  - イベント駆動型の動的クローリングエンジン
  - DOM状態のフローグラフ生成
  - プラグインアーキテクチャで拡張可能

### 統合メリット
- **Ajax対応**: 動的に読み込まれるコンテンツを自動検出
- **状態遷移の可視化**: DOM状態の変化を追跡
- **SPA対応**: シングルページアプリケーションにも対応

## 3. LiteWebAgent（VLMベース）⭐⭐⭐
- **GitHub**: https://github.com/PathOnAIOrg/LiteWebAgent
- **特徴**:
  - Vision-Language Model（VLM）ベースのWebエージェント
  - 自然言語でWeb操作を制御
  - NAACL 2025で発表された研究ベース

### 統合メリット
- **自然言語制御**: 「このボタンをクリックして」などの指示が可能
- **視覚的理解**: スクリーンショットベースで操作
- **AI駆動**: LLMで操作を理解・実行

## 4. Manus AI（API経由）⭐⭐⭐
- **特徴**:
  - API経由でブラウザ操作を実行
  - ユーザーがAPIキーを発行できる
  - 既存のManus AIユーザー向け

### 統合メリット
- **API経由**: サーバー側でブラウザを管理する必要がない
- **ユーザー主導**: Manus AIアカウントがあれば利用可能

# 機能要件

## 1. Crawlee統合（最優先）

### インストール
```bash
npm install crawlee playwright
```

### 実装例
```typescript
// src/lib/research/scrapers/crawlee-integration.ts

import { PlaywrightCrawler, Dataset } from 'crawlee';
import { PlaywrightLaunchOptions } from 'crawlee';

interface CrawleeScrapeOptions {
  urls: string[];
  selectors?: {
    title?: string;
    content?: string;
    links?: string;
  };
  waitForSelector?: string;
  maxConcurrency?: number;
  proxyConfiguration?: {
    proxyUrls: string[];
  };
}

export async function scrapeWithCrawlee(
  options: CrawleeScrapeOptions
): Promise<any[]> {
  const crawler = new PlaywrightCrawler({
    // リクエストハンドラー
    async requestHandler({ page, request, enqueueLinks }) {
      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');
      
      // 動的コンテンツが表示されるまで待機
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }
      
      // データ抽出
      const data = await page.evaluate((selectors) => {
        return {
          url: window.location.href,
          title: selectors.title 
            ? document.querySelector(selectors.title)?.textContent?.trim()
            : document.title,
          content: selectors.content
            ? document.querySelector(selectors.content)?.textContent?.trim()
            : document.body.innerText,
          links: selectors.links
            ? Array.from(document.querySelectorAll(selectors.links))
                .map(el => (el as HTMLAnchorElement).href)
            : [],
        };
      }, options.selectors);
      
      // データセットに保存
      await Dataset.pushData({
        ...data,
        scrapedAt: new Date().toISOString(),
      });
      
      // リンクをキューに追加（クローリング）
      await enqueueLinks({
        selector: 'a[href]',
        label: 'detail',
      });
    },
    
    // 起動オプション
    launchContext: {
      launchOptions: {
        headless: true,
        args: ['--no-sandbox'],
      },
    },
    
    // 最大同時実行数
    maxConcurrency: options.maxConcurrency || 5,
    
    // リトライ設定
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,
  });
  
  // クローリング開始
  await crawler.addRequests(options.urls.map(url => ({ url })));
  await crawler.run();
  
  // データセットから取得
  const dataset = await Dataset.open();
  return await dataset.getData();
}
```

### Yahoo知恵袋用Crawlee実装
```typescript
export async function scrapeYahooChiebukuroWithCrawlee(
  keyword: string,
  limit: number = 50
): Promise<ChiebukuroResult[]> {
  const searchUrl = `https://chiebukuro.yahoo.co.jp/search?q=${encodeURIComponent(keyword)}`;
  
  return scrapeWithCrawlee({
    urls: [searchUrl],
    selectors: {
      title: '.qa-title',
      content: '.qa-content',
      links: '.qa-list-item a',
    },
    waitForSelector: '.qa-list-item',
    maxConcurrency: 3,
  }).then(results => {
    // 結果をChiebukuroResult形式に変換
    return results.slice(0, limit).map((item, index) => ({
      id: `chiebukuro-${index}`,
      title: item.title || '',
      content: item.content || '',
      url: item.url,
      views: 0, // Crawleeで取得
      answers: 0, // Crawleeで取得
      depthScore: 0,
      urgencyScore: 0,
      quadrant: 'consider' as PainPointQuadrant,
      severityKeywords: [],
      scrapedAt: new Date().toISOString(),
    }));
  });
}
```

## 2. Crawljax統合（Ajax対応）

### インストール
```bash
npm install crawljax
```

### 実装例
```typescript
// src/lib/research/scrapers/crawljax-integration.ts

import Crawljax from 'crawljax';

interface CrawljaxOptions {
  url: string;
  maxDepth?: number;
  maxStates?: number;
  waitAfterEvent?: number;
  waitAfterReload?: number;
}

export async function crawlWithCrawljax(
  options: CrawljaxOptions
): Promise<any> {
  return new Promise((resolve, reject) => {
    Crawljax({
      url: options.url,
      maxDepth: options.maxDepth || 2,
      maxStates: options.maxStates || 10,
      waitAfterEvent: options.waitAfterEvent || 1000,
      waitAfterReload: options.waitAfterReload || 1000,
      onStateCrawled: (state) => {
        console.log(`State crawled: ${state.url}`);
      },
      onAllStatesCrawled: (states) => {
        resolve(states);
      },
      onError: (error) => {
        reject(error);
      },
    });
  });
}
```

## 3. 動的スクレイパー統合ラッパー

### 統一インターフェース
```typescript
// src/lib/research/scrapers/dynamic-scraper.ts

type ScraperType = 'crawlee' | 'crawljax' | 'manus-ai' | 'playwright';

interface DynamicScrapeOptions {
  type: ScraperType;
  urls: string[];
  selectors?: Record<string, string>;
  waitFor?: string;
  maxConcurrency?: number;
}

export async function scrapeDynamically(
  options: DynamicScrapeOptions
): Promise<any[]> {
  switch (options.type) {
    case 'crawlee':
      return scrapeWithCrawlee({
        urls: options.urls,
        selectors: options.selectors,
        waitForSelector: options.waitFor,
        maxConcurrency: options.maxConcurrency,
      });
    
    case 'crawljax':
      // Ajax対応が必要な場合
      return Promise.all(
        options.urls.map(url => crawlWithCrawljax({ url }))
      );
    
    case 'manus-ai':
      // Manus AI API経由
      return scrapeWithManusAI(options);
    
    case 'playwright':
    default:
      // 既存のPlaywright実装
      return scrapeWithPlaywright(options);
  }
}
```

## 4. Manus AI API連携（オプション）

### APIキー設定
設定画面でManus AI APIキーを設定可能：

```
┌─────────────────────────────────────────┐
│ Manus AI API Key                        │
│ [●●●●●●●●●●●●●●] [保存]              │
│                                         │
│ 💡 Manus AIアカウントでAPIキーを発行    │
│    して設定してください                 │
└─────────────────────────────────────────┘
```

### Manus AI API統合
```typescript
// src/lib/research/manus-ai.ts

interface ManusAIConfig {
  apiKey: string;
  baseUrl?: string;  // デフォルト: https://api.manus.ai
}

interface ManusAITask {
  id: string;
  type: 'browser_research' | 'data_extraction' | 'form_filling';
  instructions: string;
  targetUrl?: string;
  dataToExtract?: {
    selectors?: string[];
    textPatterns?: string[];
    screenshots?: boolean;
  };
}

interface ManusAIResponse {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: {
    extractedData?: Record<string, any>;
    screenshots?: string[];  // base64 or URLs
    textContent?: string;
    metadata?: {
      url: string;
      timestamp: string;
      executionTime: number;
    };
  };
  error?: string;
}

export async function createManusAITask(
  config: ManusAIConfig,
  task: ManusAITask
): Promise<ManusAIResponse> {
  const response = await fetch(`${config.baseUrl || 'https://api.manus.ai'}/v1/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });
  
  if (!response.ok) {
    throw new Error(`Manus AI API error: ${response.statusText}`);
  }
  
  return await response.json();
}

export async function getManusAITaskStatus(
  config: ManusAIConfig,
  taskId: string
): Promise<ManusAIResponse> {
  const response = await fetch(`${config.baseUrl || 'https://api.manus.ai'}/v1/tasks/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Manus AI API error: ${response.statusText}`);
  }
  
  return await response.json();
}
```

## 2. ブラウザ操作リサーチ機能

### リサーチタスク例

#### A. Yahoo知恵袋の質問収集
```typescript
const task: ManusAITask = {
  type: 'browser_research',
  instructions: `
    1. Yahoo知恵袋で「${keyword}」を検索
    2. 検索結果から質問タイトルと本文を抽出
    3. 各質問の閲覧数と回答数を取得
    4. ベストアンサーがあれば抽出
    5. 結果をJSON形式で返す
  `,
  targetUrl: 'https://chiebukuro.yahoo.co.jp',
  dataToExtract: {
    selectors: [
      '.qa-list-item',
      '.qa-title',
      '.qa-content',
      '.qa-view-count',
      '.qa-answer-count',
      '.best-answer',
    ],
    screenshots: true,
  },
};
```

#### B. Amazonレビュー収集
```typescript
const task: ManusAITask = {
  type: 'browser_research',
  instructions: `
    1. Amazonで「${keyword}」を検索
    2. 上位5商品のレビューを開く
    3. 各レビューから悩みキーワードを抽出
    4. 評価とレビュー数を取得
    5. 結果をJSON形式で返す
  `,
  targetUrl: 'https://www.amazon.co.jp',
  dataToExtract: {
    selectors: [
      '.review-text',
      '.review-rating',
      '.review-date',
    ],
    textPatterns: [
      'つらい',
      '困っている',
      '悩み',
      '問題',
      '改善したい',
    ],
  },
};
```

#### C. X（Twitter）投稿収集
```typescript
const task: ManusAITask = {
  type: 'browser_research',
  instructions: `
    1. X（Twitter）で「${keyword}」を検索
    2. 最新の投稿100件を取得
    3. 各投稿のテキスト、いいね数、リツイート数を抽出
    4. 悩みや課題に関連する投稿をフィルタリング
    5. 結果をJSON形式で返す
  `,
  targetUrl: 'https://twitter.com',
  dataToExtract: {
    selectors: [
      '[data-testid="tweet"]',
      '[data-testid="tweetText"]',
      '[data-testid="like"]',
      '[data-testid="retweet"]',
    ],
  },
};
```

#### D. 競合LP分析
```typescript
const task: ManusAITask = {
  type: 'browser_research',
  instructions: `
    1. ${competitorUrl} にアクセス
    2. ページ全体をスクロールして読み込む
    3. ヘッドライン、サブヘッドライン、CTAテキストを抽出
    4. 使用されているキーワードを抽出
    5. セクション構成を分析
    6. スクリーンショットを取得
    7. 結果をJSON形式で返す
  `,
  targetUrl: competitorUrl,
  dataToExtract: {
    selectors: [
      'h1',
      'h2',
      '.headline',
      '.subheadline',
      '.cta-button',
      '.section',
    ],
    screenshots: true,
  },
};
```

## 5. UI設計

### 動的リサーチパネル（統合UI）
```
┌─────────────────────────────────────────┐
│ 動的リサーチ（高度なスクレイピング）     │
├─────────────────────────────────────────┤
│                                         │
│ スクレイパーを選択:                     │
│ ○ Crawlee（推奨・最優先）              │
│   → Playwright統合、動的コンテンツ対応  │
│                                         │
│ ○ Crawljax（Ajax対応）                │
│   → Ajax/SPA専用、状態遷移追跡         │
│                                         │
│ ○ Manus AI（API経由）                 │
│   → APIキー設定が必要                  │
│                                         │
│ ○ Playwright（既存・フォールバック）   │
│                                         │
│ リサーチタイプ:                         │
│ ○ Yahoo知恵袋質問収集                  │
│ ○ Amazonレビュー収集                  │
│ ○ X（Twitter）投稿収集                │
│ ○ 競合LP分析                          │
│ ○ カスタムリサーチ                    │
│                                         │
│ キーワード/URL:                        │
│ [________________________]              │
│                                         │
│ 実行オプション:                         │
│ ☑ スクリーンショット取得               │
│ ☑ 詳細データ抽出                       │
│ ☑ Ajax対応（Crawljax使用）            │
│                                         │
│ [動的リサーチ実行]                     │
│                                         │
│ 💡 Crawleeが最優先推奨（オープンソース）│
└─────────────────────────────────────────┘
```

### リサーチ実行中の状態表示
```
┌─────────────────────────────────────────┐
│ Manus AIリサーチ実行中...               │
├─────────────────────────────────────────┤
│                                         │
│ ⏳ ブラウザ操作を実行中                  │
│                                         │
│ 進捗:                                   │
│ ████████░░░░░░░░░░ 40%                 │
│                                         │
│ 現在の操作:                             │
│ Yahoo知恵袋で「ダイエット」を検索中... │
│                                         │
│ [キャンセル]                            │
└─────────────────────────────────────────┘
```

## 6. データ統合

### 既存リサーチデータとの統合
動的スクレイパーで取得したデータを既存のリサーチデータと統合：

```typescript
interface IntegratedResearchData {
  // 既存のスクレイパーデータ
  scrapedData: {
    yahooChiebukuro?: ChiebukuroResult[];
    amazonBooks?: AmazonBookResult[];
    metaAds?: MetaAdResult[];
  };
  
  // 動的スクレイパーで取得したデータ
  dynamicData: {
    crawlee?: any[];              // Crawleeで取得したデータ
    crawljax?: any[];             // Crawljaxで取得したデータ
    manusAI?: ManusAIResponse[];  // Manus AIで取得したデータ
    extractedData?: Record<string, any>;
    screenshots?: string[];
  };
  
  // 統合分析結果
  analysis: {
    painPoints: PainPoint[];
    keywords: Keyword[];
    competitors: Competitor[];
  };
}
```

## 7. エラーハンドリング

### スクレイパー選択のフォールバック
```typescript
async function scrapeWithFallback(options: DynamicScrapeOptions) {
  const scrapers: ScraperType[] = ['crawlee', 'crawljax', 'playwright'];
  
  for (const scraper of scrapers) {
    try {
      return await scrapeDynamically({ ...options, type: scraper });
    } catch (error) {
      console.warn(`[scraper] ${scraper} failed, trying next...`, error);
      continue;
    }
  }
  
  throw new Error('All scrapers failed');
}
```

### Manus AI APIキー未設定時の処理
```typescript
if (options.type === 'manus-ai' && !manusApiKey) {
  // Crawleeにフォールバック
  return scrapeDynamically({ ...options, type: 'crawlee' });
}
```

## 8. コスト管理

### オープンソースツール（Crawlee/Crawljax）
- **無料**: オープンソースのため追加コストなし
- **サーバーリソース**: 自前のサーバーで実行するため、リソースコストのみ

### Manus AI API（オプション）
- Manus AIのAPIコストはユーザーのManus AIアカウントに請求
- LP Builder Pro側ではコストを管理しない
- ユーザーにManus AIの利用料金を明示

# 期待効果
├── **Crawlee統合**: 既存Playwrightコードとの互換性 + 動的コンテンツ対応 ⭐最重要
├── **Crawljax統合**: Ajax/SPA対応で、より高度な動的コンテンツ取得
├── **オープンソース活用**: GitHubで公開されている実績のあるツールを統合
├── **コスト削減**: オープンソースツールは無料（サーバーリソースのみ）
├── **リサーチ精度向上**: 動的コンテンツの取得精度が大幅に向上
├── **スケーラビリティ**: Crawleeの永続キューで大量URLを効率的に処理
└── **柔軟性**: 用途に応じて最適なスクレイパーを選択可能
```

---

## 📊 優先順位

```
優先度: 高（今すぐ）
├── Task 12: Novasphere型リサーチエンジン ⭐ 最優先
│   ├── ビッグデータ（既存スクレイパー統合）
│   ├── 学術知見（既存YAML活用）
│   └── リアルタイム情報（SNS/ニュース）
├── Task 15: N1ファースト設計 ⭐ 根幹思想
├── Task 22: LPセクションビルダー ⭐ UX革命
├── Task 26: バナーエディター ⭐NEW Novasphere型微調整
├── Task 27: リサーチ言語化支援 ⭐NEW マルチエージェント壁打ち
├── Task 30: リサーチプロンプト・スキル提供 ⭐NEW Cursor/Claude用
├── Task 31: 高度な動的スクレイピング統合 ⭐NEW Crawlee/Crawljax統合
├── Task 2.3: Magic Pen ナレッジ連携
└── Task 8: デザインプロンプトジェネレーター

優先度: 中（次のスプリント）
├── Task 23: RAG + CAG ハイブリッドナレッジ ⭐ コスト削減＆精度UP
├── Task 25: PDF処理機能（文字起こし・画像化） ⭐ ユーザー満足度UP
├── Task 16: クライアントヒアリングシート生成
├── Task 17: 提案書/報告書自動生成（Googleドキュメント変換）
├── Task 18: ヘッドライン大量生成
├── Task 19: Google Workspace連携強化（スプシ蓄積、GAS）
├── Task 21: 画像サイズプリセット＆白紙キャンバス
├── Task 13: ワンクリック背景除去（withoutBG）
├── Task 14: コピー診断AI（ファン化哲学）
└── Task 10: 動的モデル選択システム（コスパ最適化版）⭐ コスト削減

優先度: 低（将来）
├── Task 20: デザインツール連携（Canva/Figma/Adobe）
├── Task 6: 心理トリガー自動適用
├── Task 7: オファー設計アシスタント
├── Task 9: ハイブリッドストレージ
└── Task 1.3: YouTubeスクレイパー

※ Task 11: Gemini File Search Tool（RAG）→ Task 23に統合
```

---

## 📁 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/research_agent_uchida_spec.md` | たけるん式リサーチ仕様 |
| `docs/RESEARCH_SOURCES.md` | リサーチソース一覧 |
| `docs/ultimate_features_spec.md` | 機能仕様 |
| `CLAUDE_CODE_TASKS.md` | 既存タスク一覧 |
| `docs/references/easy_banana/` | 🆕 モデル選択システム参考（Chrome拡張） |
| `docs/references/easy_banana/models.json` | モデル定義サンプル |
| `docs/references/easy_banana/sidepanel.js` | モデル選択UI実装例 |

---

## 📚 ナレッジファイル一覧

| ファイル | 内容 | 用途 |
|----------|------|------|
| `killer_words.yaml` | 389個のAI指示キラーワード | プロンプト精度UP |
| `writing_techniques.yaml` | ライティング6テクニック | コピー品質UP |
| `marketing_strategy.yaml` | マーケティング戦略4-Step | オファー/ファネル設計 |
| `consumer_behavior.yaml` | 心理トリガー50選 + MOL/MOA | ターゲット分析/LP設計 |
| `design_prompts.yaml` | 60+デザインプロンプト | LP画像/バナー/SNS素材生成 |
| `fanification_philosophy.md` | ファン化哲学21レッスン | コピー診断/セールスレター/扇動術 |
| `youtube_thumbnail_psychology.yaml` | YouTubeサムネ心理学 ⭐NEW | サムネ設計/3条件チェック |

### ナレッジ活用マップ

```
┌─────────────────────────────────────────────────────────────┐
│                   ナレッジ活用フロー                        │
└─────────────────────────────────────────────────────────────┘

RAG + CAG ハイブリッドシステム: ⭐NEW コスト30-50%削減
├── 🧊 COLD（CAGでキャッシュ - 高速・低コスト）
│   ├── killer_words.yaml → 389個のキラーワード
│   ├── writing_techniques.yaml → 6テクニック
│   ├── marketing_strategy.yaml → DRMファネル
│   ├── consumer_behavior.yaml → 心理トリガー50選
│   ├── design_prompts.yaml → 60+プロンプト
│   ├── fanification_philosophy.md → 21レッスン
│   └── youtube_thumbnail_psychology.yaml → サムネ心理学 ⭐NEW
└── 🔥 HOT（RAGで検索 - 最新情報取得）
    ├── リサーチ結果 → 競合LP、広告
    ├── N1データ → 顧客インタビュー
    └── トレンド → SNS、ニュース

リサーチ時: ⭐ Novasphere型三位一体
├── 【ビッグデータ】
│   ├── Infotop → 売れ筋LP構成
│   ├── Meta広告 → 勝ちクリエイティブ
│   └── 競合LP → 成功パターン抽出
├── 【学術知見】
│   ├── consumer_behavior.yaml → 心理トリガー50選
│   ├── marketing_strategy.yaml → DRMファネル
│   └── writing_techniques.yaml → 説得テクニック
└── 【リアルタイム】
    ├── Yahoo知恵袋 → ペインポイント
    ├── Amazon → 購入者の本音
    ├── SNS → トレンド・生の声
    └── ニュース → 最新コンテキスト

LP構成設計時:
├── consumer_behavior.yaml → LP構成×心理トリガーマッピング
└── marketing_strategy.yaml → オファー設計、ファネル構築

コピー生成時:
├── killer_words.yaml → AI指示の精度向上
├── writing_techniques.yaml → 6テクニック自動適用
└── consumer_behavior.yaml → 心理トリガー自動適用

コピー診断時:
├── fanification_philosophy.md → 21レッスン分の診断基準
│   ├── 説得技術チェック（レッスン1-3）
│   ├── 心理抵抗回避チェック（レッスン4-5）
│   ├── 救世主ストーリー（レッスン6）
│   ├── ムーブメント7要素（レッスン7-13）
│   └── 7つのストーリー型（レッスン14-21）
├── consumer_behavior.yaml → 心理トリガー50選との照合
└── 改善提案 → Gemini 3.0 Proで具体的リライト生成

LPセクションビルダー: ⭐NEW
├── セクション単位で生成・管理
│   ├── ファーストビュー
│   ├── 問題提起
│   ├── 解決策
│   ├── ベネフィット
│   └── ...（10セクション）
├── ステータス管理
│   ├── 🟢 採用
│   ├── 🟡 保留
│   └── 🔴 没
├── 連結プレビュー（PC/モバイル）
└── エクスポート（HTML/Figma/Canva）

N1ファースト設計: ⭐NEW
├── 🟢 N1データ（事実）
│   └── インタビュー記録、生の声、購入理由
├── 🟡 N1ベースペルソナ（高確度仮説）
│   └── N1から拡張した推定
├── 🔴 AIペルソナ（仮説）
│   └── ※参考程度に使用
└── N1未入力時の警告表示

クライアントワークフロー: ⭐NEW
├── ヒアリングシート生成
│   └── PDF/Googleフォーム出力
├── N1データインポート
│   └── 回答をそのまま取り込み
├── 提案書自動生成
│   └── Googleドキュメント/スライド
└── スプレッドシート蓄積
    └── GASで自動処理

デザイン生成時:
├── design_prompts.yaml → 60+テンプレートから選択
│   ├── マーケティング資料（インフォグラフィック、バナー、KV）
│   ├── 商品画像（ライフスタイル、モックアップ、POP）
│   ├── Web制作（LPヒーロー、LPセクション）
│   ├── SNS（YouTube、Instagram、Twitter）
│   └── 特殊効果（JOJO風、ホワイトボード風）
├── LP構成セクション別推奨テンプレート自動選択
└── YouTubeサムネイル生成時: ⭐NEW
    └── youtube_thumbnail_psychology.yaml → 神経科学ベース
        ├── ①予測誤差（見たことない感）
        ├── ②生存回路（脅威/報酬/地位/性）
        └── ③自分ごと化（ターゲット接続）

データ保存時: ⭐NEW
├── ローカルDB（SQLite）
│   ├── ユーザー設定
│   ├── リサーチキャッシュ
│   └── 下書き・作業履歴
├── Google Sheets
│   ├── リサーチ結果（共有）
│   ├── コンセプト案（共有編集）
│   └── プロジェクト進捗
└── Google Drive
    ├── 生成画像
    ├── LPエクスポート
    └── ナレッジファイル共有
```

---

## 🚀 Claude Code 実装依頼（まとめ）

以下をClaude Codeにコピー＆ペーストして実行してください。

---

### 📋 Sprint 1: 基盤機能（最優先）

```
@CLAUDE_CODE_IMPLEMENTATION.md を読んで、以下の順番で実装してください。

## Phase 1: N1ファースト設計（依頼15）
優先度: ⭐⭐⭐ 最優先

このツールの根幹となる思想です。
- N1データ入力フォーム（実在顧客のインタビュー情報）
- N1 vs ペルソナの可視化（🟢事実 / 🟡高確度仮説 / 🔴仮説）
- N1未入力時の警告モーダル
- N1インタビューテンプレート（PDF出力）

作成ファイル:
- src/lib/research/n1-manager.ts
- src/lib/research/persona-generator.ts
- src/components/research/N1InputForm.tsx
- src/components/research/N1vsPersonaView.tsx
- src/components/research/N1WarningModal.tsx

## Phase 2: LPセクションビルダー（依頼22）
優先度: ⭐⭐⭐ UX革命

LP制作のワークフローを劇的に改善する機能です。
- セクション単位で生成（ファーストビュー、問題提起、解決策...）
- 複数バージョン生成 → 採用/没/保留のステータス管理
- 採用セクションの順番入れ替え（ドラッグ&ドロップ）
- 連結プレビュー（PC/モバイル切り替え）
- HTMLエクスポート

作成ファイル:
- src/lib/lp-builder/section-manager.ts
- src/lib/lp-builder/lp-assembler.ts
- src/components/lp-builder/SectionCard.tsx
- src/components/lp-builder/SectionStatusBadge.tsx
- src/components/lp-builder/LPPreview.tsx
- src/app/dev/lp-builder/page.tsx

## Phase 3: 画像サイズプリセット＆白紙キャンバス（依頼21）
優先度: ⭐⭐ Magic Pen強化

- サイズプリセット（16:9, 9:16, 1:1, YouTubeサムネ等）
- 白紙キャンバス自動生成（参考画像として使用 → 精度UP）
- easy_banana の白紙キャンバス機能を参考に

作成ファイル:
- src/lib/image/size-presets.ts
- src/lib/image/blank-canvas-generator.ts
- src/components/magic-pen/SizePresetSelector.tsx

参考: docs/references/easy_banana/

## Phase 3.5: デザインプロンプトジェネレーター強化（依頼8）
優先度: ⭐⭐ YouTubeサムネイル心理学

- 60+テンプレートからプロンプト生成
- ⭐NEW: YouTubeサムネイル選択時は心理学フレームワーク自動適用
- 3条件チェック（予測誤差/生存回路/自分ごと化）
- 生存回路トリガー選択UI

参考ファイル:
- src/lib/knowledge/design_prompts.yaml
- src/lib/knowledge/youtube_thumbnail_psychology.yaml ⭐NEW

作成ファイル:
- src/lib/knowledge/design-prompt-generator.ts
- src/app/dev/design-prompt/page.tsx

YouTubeサムネ専用UI:
1. 動画タイトル入力
2. ターゲット選択
3. 生存回路トリガー選択（脅威/報酬/地位/性）
4. 3条件チェックリスト表示
5. 心理最適化されたプロンプト生成

## Phase 3.6: リサーチ言語化支援（依頼27）⭐NEW
優先度: ⭐⭐⭐ UX改善 - 「手が進まない」問題の根本解決

- **最初から対話型で進められるUX** ⭐最重要
- 「フォーム入力」ではなく「AIと対話しながら設定」
- マルチエージェント壁打ち（4エージェント構成）
- チャットUIで段階的に情報を集める
- ナレッジ連携（killer_words.yaml等）

作成ファイル:
- src/lib/research/language-assistant.ts
- src/lib/research/multi-agent-chat.ts
- src/components/research/LanguageChat.tsx
- src/components/research/ResearchInputHelper.tsx
- src/components/research/ConversationalSetup.tsx ⭐NEW 対話型セットアップ
- src/app/api/research/language-assist/route.ts

機能:
1. **対話型モード（推奨）**: 最初からAIと対話して設定
   - リサーチ設定画面を開いた瞬間、AIが挨拶して質問開始
   - 段階的に情報を集める（ジャンル → ターゲット → 悩み → 理想）
   - マルチエージェントが適切な質問を投げかける
   - 対話が完了したら設定を自動反映
2. **フォーム型モード**: 従来のフォーム入力（上級者向け）
   - 各フィールドに「？対話で入力」ボタン
   - クリックでチャットパネルを開く
3. モード切り替え: 画面右上に「対話型 / フォーム型」切り替え
4. 会話履歴保存（セッション内で再利用）

UX改善のポイント:
- ユーザーが「手が進まない」問題を根本解決
- フォームを見る必要がない（心理的ハードル削減）
- AIが質問してくれるので迷わない
- 自然な会話で進められる（しんどくならない）

## Phase 4: バナーエディター（依頼26）✅ 完了
優先度: ⭐⭐ Novasphere型 - AI画像の「あと一歩」を埋める

- ✅ AI生成画像をその場で微調整
- ✅ テキストレイヤー追加・編集
- ✅ フォントサイズ/色/揃え調整
- ✅ PNG/JPEG出力
- ✅ サイズプリセット（YouTube, Instagram, Twitter等）

作成ファイル:
- ✅ src/lib/editor/text-layer.ts - テキストレイヤー型定義・日本語フォント40+種（ゴシック/明朝/丸ゴシック/デザイン/手書き）
- ✅ src/lib/editor/banner-editor.ts - Zustand状態管理（Undo/Redo対応）
- ✅ src/lib/editor/canvas-renderer.ts - Canvas描画・エクスポート
- ✅ src/components/editor/CanvasArea.tsx - キャンバス操作（ドラッグ・選択）
- ✅ src/components/editor/EditToolPanel.tsx - 編集ツールパネル
- ✅ src/components/editor/BannerEditor.tsx - メインエディター
- ✅ src/app/dev/banner-editor/page.tsx - 開発ページ

編集ツールパネル機能:
1. ✅ フォントサイズ（スライダー: 12px〜200px）
2. ✅ テキスト色（カラーピッカー）
3. ✅ フォントファミリー（日本語フォント40+種対応・カテゴリ別選択可能）
4. ✅ 揃え（左/中央/右）
5. ✅ シャドウ・ストローク（縁取り）設定
6. ✅ 不透明度調整
7. ✅ PNG/JPEG保存・クリップボードコピー
8. ✅ レイヤー操作（複製・削除・前後移動）
9. ✅ キーボードショートカット（Ctrl+Z/Y, 矢印キー）
```

---

### 📋 Sprint 2: クライアントワーク支援

```
@CLAUDE_CODE_IMPLEMENTATION.md を読んで、以下を実装してください。

## Phase 4: クライアントヒアリングシート生成（依頼16）

- LP制作用ヒアリングシートテンプレート
- PDF出力
- Googleフォーム連携（GAS）
- 回答をN1データとして自動インポート

作成ファイル:
- src/lib/documents/hearing-sheet-generator.ts
- src/lib/documents/templates/lp-hearing.ts
- src/app/dev/hearing-sheet/page.tsx

## Phase 5: ヘッドライン大量生成（依頼18）

- N1データ × 心理トリガー → 50-100案一括生成
- セクション別（ファーストビュー、CTA、FAQ等）
- 採用/保留/没のステータス管理
- スプレッドシートエクスポート

作成ファイル:
- src/lib/copywriting/headline-generator.ts
- src/components/copywriting/HeadlineGenerator.tsx
- src/app/dev/headlines/page.tsx

## Phase 6: Google Workspace連携強化（依頼19）

- リサーチ結果をスプレッドシートに自動蓄積
- GASテンプレート自動デプロイ
- 報告書をGoogleドキュメントに一括変換

作成ファイル:
- src/lib/google/sheets-manager.ts
- src/lib/google/docs-exporter.ts
- src/lib/google/gas-templates.ts
- src/app/dev/google-sync/page.tsx

## Phase 6.5: RAG + CAG ハイブリッドナレッジ（依頼23）⭐ コスト削減

- 静的ナレッジをContext Cache（CAG）でキャッシュ
- 動的データのみRAGで検索
- コスト30-50%削減、速度2-3倍向上

参考:
- OpenAI: https://platform.openai.com/docs/guides/prompt-caching
- Gemini: https://ai.google.dev/gemini-api/docs/caching

静的データ（CAG）:
├── killer_words.yaml
├── writing_techniques.yaml
├── marketing_strategy.yaml
├── consumer_behavior.yaml
├── design_prompts.yaml
└── fanification_philosophy.md

動的データ（RAG）:
├── リサーチ結果
├── N1データ
└── プロジェクト固有情報

作成ファイル:
- src/lib/ai/context-cache.ts
- src/lib/ai/rag-retriever.ts
- src/lib/ai/hybrid-knowledge.ts
- src/lib/knowledge/loader.ts
- src/lib/knowledge/cache-manager.ts

## Phase 6.6: PDF処理機能（依頼25）⭐ ユーザー満足度UP

- PDFからテキスト抽出（文字起こし）
- PDFをPNG画像に変換（Magic Penで編集可能に）
- GoogleドライブからPDFを読み込み
- OCR対応（画像PDFの場合）

技術選択:
- Option A: Python + pdf2image + PyPDF2（高精度）
- Option B: Next.js純正（pdfjs-dist）（セットアップ簡単）

作成ファイル:
- src/lib/pdf/pdf-processor.ts
- src/lib/pdf/text-extractor.ts
- src/lib/pdf/image-converter.ts
- src/lib/pdf/google-drive-loader.ts
- src/app/api/pdf/process/route.ts
- src/app/api/pdf/extract-text/route.ts
- src/app/api/pdf/to-images/route.ts
- src/components/pdf/PDFUploader.tsx
- src/components/pdf/PDFViewer.tsx
- src/app/dev/pdf-processor/page.tsx

## Phase 6.7: リサーチプロンプト・スキル提供（依頼30）⭐NEW
優先度: ⭐⭐ ボーナスコンテンツ - Cursor/Claude活用支援

## Phase 6.8: 高度な動的スクレイピング統合（依頼31）⭐NEW
優先度: ⭐⭐⭐ 動的リサーチ強化 - オープンソース活用

- **Crawlee統合**（最優先）: 20,735+ stars、Playwright統合、動的コンテンツ対応
- **Crawljax統合**: Ajax/SPA対応、状態遷移追跡
- **Manus AI統合**（オプション）: API経由でブラウザ操作
- 既存Playwrightコードとの互換性を保ちながら段階的に移行

作成ファイル:
- src/lib/research/scrapers/crawlee-integration.ts（最優先）
- src/lib/research/scrapers/crawljax-integration.ts
- src/lib/research/scrapers/dynamic-scraper.ts（統合ラッパー）
- src/lib/research/manus-ai.ts（オプション）
- src/components/research/DynamicResearchPanel.tsx
- src/app/api/research/dynamic/route.ts

機能:
1. **Crawlee統合**（最優先）
   - Playwright統合済み（既存コードと互換性高い）
   - 動的コンテンツ対応（JavaScript実行）
   - プロキシローテーション、セッション管理
   - 永続キュー、プラガブルストレージ

2. **Crawljax統合**（Ajax対応）
   - Ajaxベースの動的Webアプリケーション専用
   - イベント駆動型の動的クローリング
   - DOM状態のフローグラフ生成

3. **Manus AI統合**（オプション）
   - API経由でブラウザ操作
   - Manus AI APIキー設定で利用可能

4. **統一インターフェース**
   - 用途に応じて最適なスクレイパーを自動選択
   - フォールバック機能（失敗時に別のスクレイパーに切り替え）

5. **既存スクレイパーの強化**
   - Yahoo知恵袋、Amazon、X（Twitter）など
   - 動的コンテンツの取得精度向上

注意事項:
- **Crawlee/Crawljax**: オープンソースのため無料（サーバーリソースのみ）
- **Manus AI**: APIコストはユーザーのManus AIアカウントに請求
- 既存のPlaywrightコードとの互換性を保ちながら段階的に移行

- リサーチ結果をCursor/Claude用プロンプト・スキルとしてエクスポート
- Cursor用プロンプト（.md）: リサーチ結果を基にしたLP作成プロンプト
- Claude Skills（.md）: .claude/skills/ 形式のスキルファイル
- プロンプトテンプレート集（.yaml）: 複数テンプレートをYAML形式で

作成ファイル:
- src/lib/research/prompt-generator.ts
- src/lib/research/skill-generator.ts
- src/components/research/PromptExporter.tsx
- src/app/api/research/export-prompt/route.ts
- src/app/api/research/export-skill/route.ts

機能:
1. リサーチ完了画面に「プロンプト・スキルをダウンロード」ボタン追加
2. Cursor用プロンプト生成（リサーチ結果を基にしたLP作成指示）
3. Claude Skills生成（.claude/skills/ 形式）
4. プロンプトテンプレート集生成（YAML形式）
5. プレビュー機能（エクスポート前に確認可能）

エクスポート形式:
- Cursor用プロンプト: リサーチ結果を構造化したプロンプト（.md）
- Claude Skills: 再利用可能なスキルファイル（.md）
- プロンプトテンプレート集: 複数テンプレートをYAML形式（.yaml）
```

---

### 📋 Sprint 3: AI強化機能

```
@CLAUDE_CODE_IMPLEMENTATION.md を読んで、以下を実装してください。

## Phase 7: ワンクリック背景除去（依頼13）

- Magic Penに「🔲 背景を削除」ボタン追加
- @imgly/background-removal（WebAssembly版）使用
- ローカル完結（外部API不要）
- 処理時間: 5-10秒目標

参考: https://qiita.com/ijma34/items/b95485706fb54c89951c

作成ファイル:
- src/lib/image/background-remover.ts
- src/app/api/dev/image/remove-bg/route.ts
- src/components/magic-pen/RemoveBgButton.tsx

## Phase 8: コピー診断AI（依頼14）

- ファン化哲学ナレッジ（21レッスン）でLP/原稿を自動診断
- 総合スコア（0-100）
- カテゴリ別スコア（説得力、心理テクニック、ストーリー、ムーブメント）
- 改善提案

ナレッジ: src/lib/knowledge/fanification_philosophy.md

作成ファイル:
- src/lib/copywriting/copy-analyzer.ts
- src/lib/copywriting/frameworks.ts
- src/app/dev/copy-analyzer/page.tsx

## Phase 9: 提案書自動生成（依頼17）

- リサーチ結果から提案書を自動生成
- Googleドキュメント/スライドに直接エクスポート
- テンプレート選択（シンプル/詳細/プレゼン）

作成ファイル:
- src/lib/documents/proposal-generator.ts
- src/lib/google/docs-exporter.ts
- src/app/dev/proposal/page.tsx
```

---

### 📋 実装時の注意事項

```
# 共通事項

1. 既存ファイル確認
   - src/lib/knowledge/ 配下のYAML/MDファイルを活用
   - src/lib/ai/gemini.ts のAI呼び出しパターンを踏襲

2. UIコンポーネント
   - shadcn/ui を使用
   - Tailwind CSS でスタイリング
   - レスポンシブ対応

3. 型定義
   - 各依頼に記載のinterfaceを使用
   - src/types/ に共通型を配置

4. エラーハンドリング
   - try-catch で適切にエラー処理
   - ユーザーフレンドリーなエラーメッセージ

5. テスト
   - 各機能の動作確認
   - エッジケースの考慮

# 優先順位（再掲）

高: 15 → 22 → 21 → 18
中: 16 → 19 → 13 → 14 → 17
低: デザインツール連携は後回し
```

---

**作成日**: 2025-12-15  
**更新日**: 2025-12-15  
**ステータス**: Claude Code依頼準備完了 ✅
