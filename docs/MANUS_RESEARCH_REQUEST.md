# Manus 調査依頼書

## 📌 概要

LP Builder Pro の機能拡張に向けて、以下4つのテーマについて調査をお願いします。  
特に **Google Workspace連携** と **リサーチ自動化ツール** を重点的に調査してください。

---

## 🔴 調査テーマ1: Google Workspace連携（最優先）

### 背景
LP Builder ProはDBを持たない設計です。代わりにGoogle Workspaceをバックエンドとして活用し、データの永続化・チーム共有・レポート生成を実現したいです。

### 調査対象

#### 1.1 Google Sheets as Database
- スプレッドシートをデータベースとして使うパターン
- TypeScript/Next.jsとの統合方法
- パフォーマンス最適化（キャッシュ、バッチ操作）

**探してほしいリポジトリ例:**
```
- "google sheets database typescript"
- "google sheets cms nextjs"
- "spreadsheet as backend"
- "sheets-database"
```

#### 1.2 Google Docs API
- ドキュメント自動生成
- テンプレートからの差し込み
- マークダウン → Google Docs変換

**探してほしいリポジトリ例:**
```
- "google docs api template"
- "google docs automation"
- "markdown to google docs"
```

#### 1.3 Google Slides API
- スライド自動生成
- テンプレートからのスライド作成
- 画像・グラフの自動挿入

**探してほしいリポジトリ例:**
```
- "google slides api automation"
- "google slides template generator"
- "slides api typescript"
```

#### 1.4 Google Drive API
- ファイルアップロード/ダウンロード
- フォルダ管理
- 共有設定の自動化

### 評価基準
- ⭐ GitHub Star 300以上
- 📅 最終更新 1年以内
- 🔷 TypeScript対応優先
- 📚 ドキュメントが充実

### 特に知りたいこと
1. Google Sheets APIのレート制限と回避策
2. 大量データ（1000行以上）の効率的な読み書き
3. OAuth認証のベストプラクティス（サービスアカウント vs ユーザー認証）
4. Next.js App Routerでの実装パターン

---

## 🔴 調査テーマ2: リサーチ自動化ツール（高優先）

### 背景
たけるん式リサーチメソッドを自動化するため、各種プラットフォームからのデータ収集が必要です。

### 調査対象

#### 2.1 Yahoo知恵袋スクレイピング
- 日本語対応のスクレイパー
- 質問・回答の取得
- 閲覧数・回答数の取得

**探してほしいリポジトリ例:**
```
- "yahoo chiebukuro scraper"
- "yahoo answers japan api"
- "chiebukuro python"
```

#### 2.2 Amazon Japan スクレイピング
- 書籍検索（タイトル、レビュー数、評価）
- 商品ランキング取得
- 日本のAmazon対応

**探してほしいリポジトリ例:**
```
- "amazon japan scraper"
- "amazon product api japan"
- "amazon book scraper"
```

#### 2.3 YouTube Data API
- 動画検索
- 再生数・チャンネル登録者数取得
- コメント取得

**探してほしいリポジトリ例:**
```
- "youtube data api typescript"
- "youtube analytics scraper"
- "youtube search api"
```

#### 2.4 競合LP分析ツール
- Webページの構造分析
- ヘッドライン抽出
- CTA検出

**探してほしいリポジトリ例:**
```
- "landing page analyzer"
- "competitor analysis tool"
- "web page structure analyzer"
```

### Firecrawl以外の選択肢
現在Firecrawlを使用していますが、代替・補完ツールがあれば調査してください：
- Playwright/Puppeteerベースのスクレイパー
- Crawlee
- Scrapy（Python）
- Beautiful Soup（Python）

### 特に知りたいこと
1. 日本語サイトのスクレイピングで注意すべき点
2. ブロック回避のベストプラクティス
3. 法的なガイドライン（robots.txt対応など）

---

## 🟡 調査テーマ3: AI Agent フレームワーク（中優先）

### 背景
複数のAIモデル（Gemini, Claude, GPT-4）を組み合わせて、それぞれの得意分野を活かしたマルチエージェントシステムを構築したいです。

### 調査対象

#### 3.1 マルチエージェント オーケストレーション
- 複数AIの協調動作
- タスク分配と結果統合
- エージェント間通信

**探してほしいリポジトリ/フレームワーク:**
```
- CrewAI
- AutoGen (Microsoft)
- LangGraph
- Agency Swarm
```

#### 3.2 リサーチ特化エージェント
- Web検索エージェント
- 情報収集・要約エージェント
- ファクトチェックエージェント

**探してほしいリポジトリ例:**
```
- "research agent ai"
- "web research automation"
- "autonomous research agent"
- GPT Researcher (https://github.com/assafelovic/gpt-researcher)
```

#### 3.3 LangChain / LangGraph 最新パターン
- 2024-2025の最新ベストプラクティス
- TypeScript実装例
- エージェント構築パターン

### 特に知りたいこと
1. GeminiのDeep Research と他のAIの組み合わせ方
2. エージェントのバックグラウンド実行パターン
3. コスト最適化（安いモデルと高いモデルの使い分け）

---

## 🟡 調査テーマ4: Chrome拡張機能（中優先）

### 背景
競合LPを閲覧中にワンクリックでリサーチに追加できるChrome拡張を作りたいです。

### 調査対象

#### 4.1 Manifest V3 対応テンプレート
- モダンなChrome拡張開発
- TypeScript対応
- React/Next.js統合

**探してほしいリポジトリ例:**
```
- Plasmo (https://www.plasmo.com/)
- "chrome extension manifest v3 template"
- "chrome extension typescript react"
```

#### 4.2 Webページコンテンツ取得
- DOMからのテキスト抽出
- スクリーンショット取得
- 外部APIへの送信

#### 4.3 サイドパネル実装
- Chrome Side Panel API
- 拡張機能UIのベストプラクティス

### 特に知りたいこと
1. Manifest V3での制限と回避策
2. Service Worker の使い方
3. Content Script と Background の通信パターン

---

## 📊 調査結果フォーマット

各テーマについて、以下の形式でまとめてください：

```markdown
## [テーマ名]

### 発見したリポジトリ/ツール

#### 1. [名前] ⭐ [Star数]
- URL: [GitHub URL]
- 概要: [1-2文で説明]
- 特徴:
  - [特徴1]
  - [特徴2]
- 懸念点: [あれば]
- LP Builder Proへの適用案: [具体的な使い方]

### 実装パターン/ベストプラクティス
[発見した知見]

### 推奨アプローチ
[最終的な推奨]
```

---

## ⏰ 優先順位と期限

| テーマ | 優先度 | 希望期限 |
|--------|--------|----------|
| Google Workspace連携 | 🔴 最高 | 3日以内 |
| リサーチ自動化ツール | 🔴 高 | 5日以内 |
| AI Agent フレームワーク | 🟡 中 | 1週間以内 |
| Chrome拡張機能 | 🟡 中 | 1週間以内 |

---

## 📎 参考資料

- 現在の実装: `/Users/okajima/Lp_builder_pro/src/lib/research/`
- 仕様書: `/Users/okajima/Lp_builder_pro/docs/research_agent_uchida_spec.md`
- 最強機能仕様: `/Users/okajima/Lp_builder_pro/docs/ultimate_features_spec.md`

---

**よろしくお願いします！🔥**
