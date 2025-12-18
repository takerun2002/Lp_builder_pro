# Gemini Interactions API 調査レポート

## 1. API概要

### Gemini Interactions APIとは

**Gemini Interactions API** は、Googleが2025年12月に発表した新しい統一インターフェースで、Geminiモデルとエージェントを操作するための基盤となるAPI。状態管理、ツールオーケストレーション、長時間実行タスクを簡素化する。

### 主要特徴

- **統一インターフェース**: Geminiモデルとエージェント（Deep Research含む）を同一APIで操作
- **ステートフル会話**: 前のインタラクションIDを参照して会話を継続
- **バックグラウンド実行**: 長時間実行タスクの非同期処理対応
- **ストリーミング対応**: リアルタイムの進捗更新
- **マルチモーダル対応**: テキスト、画像、動画、音声、ドキュメント対応
- **ツール統合**: 関数呼び出し、Google組み込みツール、MCP対応
- **構造化出力**: JSON スキーマ対応

---

## 2. Gemini Deep Research Agent

### 概要

**Gemini Deep Research Agent** は、Interactions APIを通じて利用可能な専門エージェント。複数ステップのリサーチタスクを自律的に計画、実行、統合し、引用文献付きの詳細レポートを生成。

### 技術仕様

| 項目 | 詳細 |
|------|------|
| **モデル基盤** | Gemini 3 Pro |
| **処理方式** | 非同期（バックグラウンド実行推奨） |
| **実行時間** | 数分（通常3-10分） |
| **出力形式** | 詳細レポート、引用文献付き |
| **ステータス管理** | completed、in_progress、requires_action、failed |

### 主要機能

#### 1. 自動リサーチプロセス
- **計画フェーズ**: リサーチ戦略の策定
- **検索フェーズ**: 複数ソースからの情報収集
- **読解フェーズ**: 情報の分析と理解
- **反復フェーズ**: 必要に応じた追加検索
- **出力フェーズ**: レポート生成

#### 2. データソース
- **Google検索**: デフォルトで有効
- **URL コンテキスト**: 特定URLの詳細分析
- **ファイル検索**: ユーザー独自データへのアクセス（試験運用版）

#### 3. 出力カスタマイズ
- プロンプトで特定の形式を指定可能
- セクション構成の指定
- データテーブルの含有
- トーン調整（技術的、エグゼクティブ、カジュアル等）

#### 4. フォローアップ機能
- previous_interaction_idを使用した会話継続
- 追加の説明、要約、詳細化が可能

---

## 3. API仕様と使用方法

### 認証

```python
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")
```

### 基本的な使用パターン

#### 同期リサーチ（単純なケース）
```python
client = genai.Client()
response = client.interactions.create(
    model="deep-research-pro-preview-12-2025",
    input="最新のAI技術トレンドについて調査してください"
)
```

#### 非同期リサーチ（推奨）
```python
# リサーチ開始
response = client.interactions.create(
    model="deep-research-pro-preview-12-2025",
    input="市場分析レポート作成",
    background=True
)

interaction_id = response.id

# ステータス確認
while True:
    status = client.interactions.get(interaction_id)
    if status.status == "completed":
        print(status.outputs[0].text)
        break
    elif status.status == "failed":
        print("リサーチ失敗")
        break
    time.sleep(5)
```

#### ストリーミング対応
```python
# リアルタイム進捗更新
with client.interactions.stream(
    model="deep-research-pro-preview-12-2025",
    input="深いリサーチが必要なテーマ",
    background=True
) as stream:
    for event in stream:
        if event.type == "interaction.start":
            interaction_id = event.interaction.id
        elif event.type == "content.delta":
            print(event.delta.text, end="", flush=True)
```

### ステートフル会話

```python
# 初回リサーチ
initial_response = client.interactions.create(
    model="deep-research-pro-preview-12-2025",
    input="AI市場の現状について"
)

# フォローアップ質問
followup = client.interactions.create(
    model="deep-research-pro-preview-12-2025",
    input="特に日本市場について詳しく教えてください",
    previous_interaction_id=initial_response.id
)
```

---

## 4. 料金体系

### 無料枠

| 項目 | 制限 |
|------|------|
| **入力トークン** | 無料 |
| **出力トークン** | 無料 |
| **Deep Research** | 月数回まで無料試用 |

### 有料プラン

| 項目 | 価格（100万トークンあたり） |
|------|------|
| **入力（テキスト）** | $0.50 |
| **出力（テキスト）** | $2.00 |
| **入力（音声/動画）** | $3.00 |
| **出力（音声）** | $12.00 |

### Deep Research 特別価格

- **Gemini Advanced**: $19.99/月で1日約20レポート可能
- **API**: トークンベース課金（通常のGemini API料金適用）
- **推定コスト**: 1レポート約 $0.20-$1.00（トークン使用量による）

### レート制限

| 階層 | リクエスト/分 | トークン/分 |
|------|---|---|
| **無料** | 15 | 32,000 |
| **有料** | 600 | 1,000,000 |

---

## 5. 既存の統合ツール・ライブラリ

### 公式サンプル・リソース

1. **Google Gemini Cookbook**
   - GitHub: https://github.com/google-gemini/cookbook
   - スター数: 15.9k
   - Interactions API、Deep Research関連の実装例を含む
   - Jupyter Notebookベースのチュートリアル

2. **Google AI Studio**
   - Web UI: https://aistudio.google.com
   - 無料でInteractions APIをテスト可能
   - プロトタイピング向け

### 競合ツール

#### Perplexity Deep Research
- **特徴**: 数十の検索、数百のソース分析
- **API**: Perplexity API Platform で利用可能
- **コスト**: 従量課金制
- **利点**: 検索最適化、高速処理

#### Anthropic Claude Research
- **特徴**: Extended Thinking、Tool Search対応
- **API**: Claude API で利用可能
- **特別機能**: Multi-agent research system
- **利点**: 高度な推論能力

#### OpenAI o1 / o3
- **特徴**: 深い思考、複雑問題解決
- **API**: OpenAI API で利用可能
- **制限**: リアルタイム検索なし
- **用途**: 分析・推論中心

---

## 6. 統合アーキテクチャ提案

### 推奨アーキテクチャ: Pythonスクレイパー + Interactions API

```
┌─────────────────────────────────────────────────────────────┐
│                    ユーザーインターフェース                      │
│                  (Web/CLI/Streamlit等)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  リサーチオーケストレーター                       │
│  (LangChain/LangGraph/Crew.ai等)                           │
└──┬──────────────────────────────────────────────────────┬──┘
   │                                                      │
   │ ┌──────────────────────────────────────────────┐   │
   │ │  フェーズ1: スクレイピング                    │   │
   │ │  - Firecrawl/ScrapeGraphAI                   │   │
   │ │  - 初期データ収集                            │   │
   │ │  - キャッシング                              │   │
   │ └──────────────────────────────────────────────┘   │
   │                                                      │
   │ ┌──────────────────────────────────────────────┐   │
   │ │  フェーズ2: Deep Research                    │   │
   │ │  - Gemini Interactions API                   │   │
   │ │  - スクレイパーデータ + Web検索              │   │
   │ │  - 詳細分析・統合                            │   │
   │ └──────────────────────────────────────────────┘   │
   │                                                      │
   │ ┌──────────────────────────────────────────────┐   │
   │ │  フェーズ3: ポスト処理                       │   │
   │ │  - レポート整形                              │   │
   │ │  - PDF/Word生成                              │   │
   │ │  - メタデータ抽出                            │   │
   │ └──────────────────────────────────────────────┘   │
   │                                                      │
└──┴──────────────────────────────────────────────────────┴──┘
```

### ワークフロー設計

#### 1. ハイブリッド検索戦略
```
入力クエリ
    ↓
[並列実行]
├─ スクレイパー検索（Firecrawl）
│  └─ 構造化データ抽出
│
└─ Deep Research（Gemini）
   └─ Web検索 + 分析
    ↓
結果統合・キャッシング
    ↓
出力レポート
```

#### 2. エラーハンドリング戦略

| エラータイプ | 対応策 |
|---|---|
| **スクレイパー失敗** | Deep Researchのみで実行継続 |
| **API タイムアウト** | バックグラウンド実行で再試行 |
| **レート制限** | キューイング + 指数バックオフ |
| **データ品質低下** | フォールバック検索ツール使用 |

#### 3. キャッシング戦略
- 同一クエリの結果をキャッシュ
- TTL: 7日間（ニュース系は1日）
- キャッシュキー: クエリハッシュ + タイムスタンプ

---

## 7. 実装ガイドライン

### ステップ1: 環境セットアップ

```bash
# 依存関係インストール
pip install google-generativeai langchain langchain-google-genai firecrawl-py

# APIキー設定
export GEMINI_API_KEY="your-api-key"
export FIRECRAWL_API_KEY="your-firecrawl-key"
```

### ステップ2: 基本的な統合実装

```python
import google.generativeai as genai
from firecrawl import FirecrawlApp
import asyncio

class HybridResearchAgent:
    def __init__(self, gemini_key, firecrawl_key):
        genai.configure(api_key=gemini_key)
        self.fc = FirecrawlApp(api_key=firecrawl_key)
        self.client = genai.Client()
    
    async def research(self, query: str):
        # ステップ1: スクレイピング
        print(f"スクレイピング開始: {query}")
        scrape_results = await self._scrape_sources(query)
        
        # ステップ2: Deep Research
        print("Deep Research開始...")
        research_result = await self._deep_research(
            query, 
            context=scrape_results
        )
        
        return research_result
    
    async def _scrape_sources(self, query):
        # Firecrawlで初期データ収集
        results = self.fc.crawl_url(
            f"https://www.google.com/search?q={query}",
            params={"limit": 10}
        )
        return results
    
    async def _deep_research(self, query, context):
        # Gemini Deep Researchで詳細分析
        prompt = f"""
        以下のコンテキストを参考にして、'{query}' について詳細なリサーチレポートを作成してください。
        
        初期データ:
        {context}
        
        要件:
        - 複数ソースからの情報統合
        - 引用文献の明記
        - 構造化されたセクション分け
        """
        
        response = self.client.interactions.create(
            model="deep-research-pro-preview-12-2025",
            input=prompt,
            background=True
        )
        
        # ポーリング
        while True:
            status = self.client.interactions.get(response.id)
            if status.status == "completed":
                return status.outputs[0].text
            elif status.status == "failed":
                raise Exception("Deep Research failed")
            await asyncio.sleep(5)

# 使用例
async def main():
    agent = HybridResearchAgent(
        gemini_key="...",
        firecrawl_key="..."
    )
    result = await agent.research("AI市場の最新トレンド")
    print(result)

asyncio.run(main())
```

### ステップ3: 注意すべきポイント

#### 1. コスト管理
- Deep Researchは1レポート $0.20-$1.00
- 月間予算: 100レポート = $20-$100
- キャッシング導入で30-50%削減可能

#### 2. レート制限対策
```python
from tenacity import retry, wait_exponential

@retry(wait=wait_exponential(multiplier=1, min=2, max=10))
async def call_deep_research(query):
    # API呼び出し
    pass
```

#### 3. 長時間実行の管理
- バックグラウンド実行は必須（background=True）
- ストリーミングでリアルタイム進捗監視
- ネットワーク中断時の再接続対応

#### 4. データ品質保証
- 複数ソースからの検証
- 矛盾検出とフラグ立て
- 信頼度スコアの付与

---

## 8. 実装難易度評価

| 項目 | 難易度 | 工数 | 備考 |
|------|------|------|------|
| **基本的な統合** | ⭐⭐ (低) | 2-3日 | APIドキュメント充実 |
| **エラーハンドリング** | ⭐⭐⭐ (中) | 3-5日 | レート制限対応必須 |
| **キャッシング実装** | ⭐⭐⭐ (中) | 2-3日 | Redis/DynamoDB等 |
| **本番運用** | ⭐⭐⭐⭐ (高) | 5-7日 | 監視・ロギング・スケーリング |
| **全体統合** | ⭐⭐⭐⭐ (高) | 2-3週間 | スクレイパー + API統合 |

---

## 9. コスト見積もり

### 月間運用コスト（想定シナリオ）

#### シナリオ1: 低使用量（10レポート/月）
- Deep Research: 10 × $0.50 = $5
- スクレイピング: $0（無料枠内）
- **合計**: $5/月

#### シナリオ2: 中使用量（100レポート/月）
- Deep Research: 100 × $0.50 = $50
- スクレイピング: $20（Firecrawl）
- **合計**: $70/月

#### シナリオ3: 高使用量（1,000レポート/月）
- Deep Research: 1,000 × $0.50 = $500
- スクレイピング: $200（Firecrawl）
- **合計**: $700/月

### コスト最適化策
1. **キャッシング**: 30-50%削減
2. **バッチ処理**: 20%割引（Batch API）
3. **スクレイパー選別**: 必要な場合のみ使用（50%削減可能）

---

## 10. リスク評価

| リスク | 影響度 | 対応策 |
|------|------|------|
| **API仕様変更** | 中 | ベータ版対応、バージョン管理 |
| **コスト超過** | 中 | 予算上限設定、キャッシング |
| **レート制限** | 中 | キューイング、指数バックオフ |
| **データ品質** | 低 | 複数ソース検証、品質スコア |
| **ネットワーク障害** | 低 | 再接続ロジック、タイムアウト設定 |

---

## 11. 推奨される統合パターン

### パターンA: GPT Researcher + Gemini Deep Research
**用途**: 最高品質のリサーチが必要な場合
```
GPT Researcher (計画・実行) 
    ↓
Gemini Deep Research (詳細分析)
    ↓
統合レポート生成
```

### パターンB: Firecrawl + Gemini Deep Research
**用途**: 高速・低コストのリサーチ
```
Firecrawl (データ収集)
    ↓
Gemini Deep Research (分析)
    ↓
レポート生成
```

### パターンC: Open Deep Research + Gemini Deep Research
**用途**: オープンソース・カスタマイズ重視
```
Open Deep Research (LangChain)
    ↓
Gemini Deep Research (統合)
    ↓
カスタムレポート
```

---

## 12. 参考リンク

### 公式ドキュメント
- [Gemini Interactions API](https://ai.google.dev/gemini-api/docs/interactions)
- [Gemini Deep Research](https://ai.google.dev/gemini-api/docs/deep-research)
- [Gemini API 料金](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Gemini Cookbook](https://github.com/google-gemini/cookbook)

### 関連ツール
- [Firecrawl](https://firecrawl.dev/)
- [GPT Researcher](https://github.com/assafelovic/gpt-researcher)
- [Open Deep Research](https://github.com/langchain-ai/open_deep_research)
- [LangChain](https://www.langchain.com/)

### ブログ・記事
- [Interactions API: A unified foundation for models and agents](https://blog.google/technology/developers/interactions-api/)
- [Build with Gemini Deep Research](https://blog.google/technology/developers/deep-research-agent-gemini-api/)
- [Building agents with the ADK and the new Interactions API](https://developers.googleblog.com/building-agents-with-the-adk-and-the-new-interactions-api/)

