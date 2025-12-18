# API統合ツールと実装パターン調査

## 1. 既存の統合ツール・フレームワーク

### 1.1 Google Gemini Fullstack LangGraph Quickstart

**プロジェクト概要**
- **GitHub URL**: https://github.com/google-gemini/gemini-fullstack-langgraph-quickstart
- **スター数**: 17.5k
- **言語**: Python (Backend), TypeScript (Frontend)
- **ライセンス**: Apache-2.0

**特徴**
- LangGraph を使用した研究エージェントの完全な実装例
- React フロントエンド + FastAPI バックエンド
- Google Gemini モデルとの統合
- Google Search API を使用した Web 検索機能
- リアルタイムストリーミング対応
- Docker 対応

**アーキテクチャ**
```
Frontend (React + Vite + Tailwind)
    ↓
Backend (LangGraph + FastAPI)
    ↓
[Agent Logic]
├─ Query Generation (Gemini)
├─ Web Search (Google Search API)
├─ Reflection & Gap Analysis (Gemini)
├─ Iterative Refinement (Loop)
└─ Answer Synthesis with Citations (Gemini)
```

**実装のポイント**
1. LangGraph を使用した状態管理
2. 複数ステップの反復的なリサーチプロセス
3. Gemini モデルによる複数段階の処理
4. Redis + PostgreSQL による本番運用対応
5. LangSmith との統合（監視・デバッグ）

**導入工数**: 3-5日（既存プロジェクトへの統合）

---

### 1.2 Firecrawl LangChain 統合

**統合方法**
Firecrawl は LangChain の Document Loader として統合可能。複数の使用パターンがある。

**パターン1: Scrape + Chat**
```python
from firecrawl import FirecrawlApp
from langchain.chat_models import ChatOpenAI

firecrawl = FirecrawlApp(api_key="YOUR_KEY")
chat = ChatOpenAI(model="gpt-4")

# ウェブサイトをスクレイプ
result = firecrawl.scrape_url("https://example.com")

# LLM で処理
response = chat.invoke(f"要約してください: {result['markdown']}")
```

**パターン2: Tool Calling**
```python
from langchain.tools import Tool
from langchain.agents import AgentExecutor, create_openai_tools_agent

# Firecrawl をツール化
scrape_tool = Tool(
    name="scrape_website",
    description="ウェブサイトをスクレイプ",
    func=lambda url: firecrawl.scrape_url(url)['markdown']
)

# エージェントで自動的に使用
agent = create_openai_tools_agent(
    llm=chat,
    tools=[scrape_tool],
    prompt=prompt
)
```

**パターン3: Chains**
```python
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert analyst"),
    ("user", "Analyze: {content}")
])

chain = prompt | chat

# スクレイプ結果をチェーンに渡す
result = chain.invoke({"content": scraped_content})
```

**パターン4: 構造化データ抽出**
```python
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel

class CompanyInfo(BaseModel):
    name: str
    industry: str
    products: list[str]

parser = PydanticOutputParser(pydantic_object=CompanyInfo)

# スクレイプしたコンテンツから構造化データを抽出
result = chat.invoke(
    f"Extract company info: {scraped_content}\n{parser.get_format_instructions()}"
)
```

**統合の利点**
- シンプルな API
- 複数の LLM プロバイダーに対応
- LangChain エコシステムとの親和性
- 自動的なエラーハンドリング

---

### 1.3 GPT Researcher Gemini 統合

**統合方法**
GPT Researcher は複数の LLM プロバイダーをサポート。Gemini も設定可能。

**環境設定**
```bash
export GOOGLE_API_KEY="YOUR_API_KEY"
export FAST_LLM="google_genai:gemini-1.5-flash"
export SMART_LLM="google_genai:gemini-1.5-pro"
export STRATEGIC_LLM="google_genai:gemini-1.5-pro"
```

**使用例**
```python
from gpt_researcher import GPTResearcher

async def research():
    researcher = GPTResearcher(
        query="最新のAI技術トレンド",
        report_type="research_report",
        config_path=None
    )
    report = await researcher.conduct_research()
    return report
```

**特徴**
- 複数 LLM プロバイダーの自動切り替え
- リサーチ特化の機能セット
- MCP サーバー対応
- Web UI + API 両対応

---

## 2. 推奨される統合パターン

### パターンA: Firecrawl + Gemini Interactions API (推奨)

**用途**: 高速・低コストのハイブリッドリサーチ

**アーキテクチャ**
```
ユーザー入力
    ↓
[オーケストレーター]
    ↓
[並列実行]
├─ Firecrawl (初期データ収集)
│  ├─ URL スクレイピング
│  ├─ マークダウン変換
│  └─ 構造化データ抽出
│
└─ Gemini Deep Research (詳細分析)
   ├─ Web 検索
   ├─ 情報統合
   └─ レポート生成
    ↓
[結果統合]
    ↓
最終レポート
```

**実装コード例**
```python
import asyncio
from firecrawl import FirecrawlApp
import google.generativeai as genai

class HybridResearchAgent:
    def __init__(self, firecrawl_key, gemini_key):
        self.fc = FirecrawlApp(api_key=firecrawl_key)
        genai.configure(api_key=gemini_key)
        self.client = genai.Client()
    
    async def research(self, query: str, urls: list[str] = None):
        # フェーズ1: Firecrawl でスクレイピング
        context = ""
        if urls:
            for url in urls:
                result = self.fc.scrape_url(url)
                context += f"\n## {url}\n{result['markdown']}"
        
        # フェーズ2: Gemini Deep Research で詳細分析
        prompt = f"""
        以下のコンテキストを参考に、'{query}' について詳細なリサーチレポートを作成してください。
        
        初期コンテキスト:
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
            await asyncio.sleep(10)
```

**メリット**
- 高速: Firecrawl の初期データで Deep Research の検索時間を短縮
- 低コスト: キャッシング可能な初期データで API コスト削減
- 信頼性: 複数ソースからの検証
- 拡張性: 各コンポーネントを独立して改善可能

**コスト見積もり**
- Firecrawl: $0.001-0.01/リクエスト
- Gemini Deep Research: $0.20-$1.00/レポート
- **合計**: $0.21-$1.01/レポート

---

### パターンB: GPT Researcher + Gemini Deep Research

**用途**: 最高品質のリサーチが必要な場合

**アーキテクチャ**
```
ユーザー入力
    ↓
GPT Researcher
├─ 複数ソース検索（20以上）
├─ 情報集約
└─ 初期レポート生成
    ↓
Gemini Deep Research
├─ GPT Researcher 結果の検証
├─ 追加検索
└─ 最終レポート生成
    ↓
統合レポート
```

**実装のポイント**
1. GPT Researcher で初期リサーチを実行
2. 結果を Gemini Deep Research に渡す
3. Gemini が追加検索・検証を実施
4. 最終的な統合レポートを生成

**メリット**
- 最高品質: 2段階のリサーチで信頼性向上
- 包括性: 複数リサーチエンジンの利点を活用
- 検証: 情報の交差検証が可能

**デメリット**
- コスト: 2つのシステムを並行実行
- 実行時間: 合計 10-20 分

---

### パターンC: LangGraph + Gemini Interactions API

**用途**: カスタマイズ・制御が必要な場合

**特徴**
- LangGraph による複雑なワークフロー制御
- 状態管理の柔軟性
- 複数エージェント間の調整
- 本番運用対応（Redis + PostgreSQL）

**実装例**
```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict

class ResearchState(TypedDict):
    query: str
    search_results: list[str]
    analysis: str
    final_report: str

def scrape_sources(state):
    # Firecrawl でスクレイピング
    return {"search_results": [...]}

def analyze_results(state):
    # Gemini で分析
    return {"analysis": "..."}

def generate_report(state):
    # Gemini Deep Research でレポート生成
    return {"final_report": "..."}

# ワークフロー定義
workflow = StateGraph(ResearchState)
workflow.add_node("scrape", scrape_sources)
workflow.add_node("analyze", analyze_results)
workflow.add_node("report", generate_report)

workflow.add_edge(START, "scrape")
workflow.add_edge("scrape", "analyze")
workflow.add_edge("analyze", "report")
workflow.add_edge("report", END)

app = workflow.compile()
```

---

## 3. 実装難易度比較

| パターン | 難易度 | 工数 | セットアップ | 本番対応 |
| :--- | :--- | :--- | :--- | :--- |
| **Firecrawl + Gemini** | ⭐⭐ | 3-5日 | 簡単 | 中程度 |
| **GPT Researcher + Gemini** | ⭐⭐⭐ | 5-7日 | 中程度 | 中程度 |
| **LangGraph + Gemini** | ⭐⭐⭐⭐ | 1-2週間 | 複雑 | 高い |
| **Gemini Fullstack LangGraph** | ⭐⭐⭐⭐ | 1-2週間 | 複雑 | 高い |

---

## 4. 選定ガイド

### Firecrawl + Gemini を選ぶべき場合
- ✅ 迅速な導入が必要
- ✅ コスト効率を重視
- ✅ シンプルなワークフロー
- ✅ 既存 LangChain プロジェクトへの統合

### GPT Researcher + Gemini を選ぶべき場合
- ✅ 最高品質のリサーチが必要
- ✅ 複数ソースからの検証が重要
- ✅ リサーチ特化の機能が必要
- ✅ 予算に余裕がある

### LangGraph + Gemini を選ぶべき場合
- ✅ 複雑なワークフロー制御が必要
- ✅ 本番環境での運用が前提
- ✅ 複数エージェント間の調整が必要
- ✅ 長期的なメンテナンス・拡張を計画

---

## 5. 実装チェックリスト

### セットアップ段階
- [ ] API キーの取得（Gemini、Firecrawl）
- [ ] 環境変数の設定
- [ ] 依存ライブラリのインストール
- [ ] 基本的な動作確認

### 開発段階
- [ ] スクレイパーの実装
- [ ] Deep Research の統合
- [ ] エラーハンドリングの実装
- [ ] ログ・監視の設定
- [ ] キャッシング機構の実装

### テスト段階
- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] 負荷テスト
- [ ] コスト見積もりの検証

### 本番デプロイ段階
- [ ] セキュリティレビュー
- [ ] スケーリング対応
- [ ] バックアップ・リカバリ戦略
- [ ] 監視・アラート設定
- [ ] ドキュメント作成

