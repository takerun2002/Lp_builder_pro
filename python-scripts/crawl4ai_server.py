"""
Crawl4AI スクレイピングサーバー
LP Builder Pro から HTTP 経由で呼び出される FastAPI サーバー

起動方法:
    cd python-scripts
    pip install -r requirements.txt
    python crawl4ai_server.py

エンドポイント:
    POST /scrape/lp-archive - LPアーカイブをスクレイピング
    GET /health - ヘルスチェック
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import json

app = FastAPI(
    title="LP Builder Pro - Crawl4AI Server",
    description="Crawl4AIを使用したLPスクレイピングサーバー",
    version="1.0.0"
)

# CORS設定（Next.jsからのリクエストを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    url: str
    image_type: Optional[str] = None  # 高級・セレブ, シンプル, etc.
    color: Optional[str] = None
    limit: int = 10
    use_llm: bool = True
    gemini_api_key: Optional[str] = None


class LPResult(BaseModel):
    title: str
    thumbnail_url: str
    lp_url: str
    category: Optional[str] = None


class ScrapeResponse(BaseModel):
    success: bool
    results: List[LPResult]
    error: Optional[str] = None


@app.post("/scrape/lp-archive", response_model=ScrapeResponse)
async def scrape_lp_archive(request: ScrapeRequest):
    """
    LPアーカイブ（rdlp.jp）をスクレイピング

    - イメージタイプでフィルタリング可能
    - LLM（Gemini）を使用した構造化抽出
    - ボット検出回避機能付き
    """
    try:
        from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, LLMConfig
        from crawl4ai.extraction_strategy import LLMExtractionStrategy, JsonCssExtractionStrategy

        async with AsyncWebCrawler(
            headless=True,
            browser_type="chromium",
            verbose=False
        ) as crawler:
            # URLの構築（カテゴリフィルタリング）
            url = request.url
            if request.image_type:
                # LPアーカイブのカテゴリURLパターンに対応
                url = f"{request.url}?image_type={request.image_type}"

            # 抽出戦略の設定
            if request.use_llm and request.gemini_api_key:
                llm_config = LLMConfig(
                    provider="gemini/gemini-2.0-flash",
                    api_token=request.gemini_api_key
                )
                extraction_strategy = LLMExtractionStrategy(
                    llm_config=llm_config,
                    extraction_type="schema",
                    schema={
                        "type": "object",
                        "properties": {
                            "lps": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "title": {"type": "string"},
                                        "thumbnail_url": {"type": "string"},
                                        "lp_url": {"type": "string"},
                                        "category": {"type": "string"}
                                    }
                                }
                            }
                        }
                    },
                    instruction=f"""
このページからLP（ランディングページ）の一覧を抽出してください。
各LPについて以下を取得:
- title: LPのタイトル（商品名やサービス名）
- thumbnail_url: サムネイル画像の完全なURL
- lp_url: LPへのリンクURL
- category: カテゴリ（あれば）

最大{request.limit}件まで取得してください。
相対URLは絶対URLに変換してください。
"""
                )
            else:
                # CSSセレクター戦略（LLM不使用・高速モード）
                extraction_strategy = JsonCssExtractionStrategy(
                    schema={
                        "name": "LP List",
                        "baseSelector": ".lp-item, [class*='lp-card'], article, .archive-item",
                        "fields": [
                            {
                                "name": "title",
                                "selector": "h3, h2, .title, [class*='title'], .name",
                                "type": "text"
                            },
                            {
                                "name": "thumbnail_url",
                                "selector": "img",
                                "type": "attribute",
                                "attribute": "src"
                            },
                            {
                                "name": "lp_url",
                                "selector": "a",
                                "type": "attribute",
                                "attribute": "href"
                            }
                        ]
                    }
                )

            config = CrawlerRunConfig(
                extraction_strategy=extraction_strategy,
                wait_for="css:body",  # ページ読み込み完了を待つ
                delay_before_return_html=3.0,
                screenshot=False,
                magic=True,  # 自動ボット検出回避
            )

            result = await crawler.arun(url=url, config=config)

            if result.success:
                extracted = result.extracted_content
                lps = []

                # 抽出結果のパース
                if isinstance(extracted, str):
                    try:
                        extracted = json.loads(extracted)
                    except json.JSONDecodeError:
                        pass

                if isinstance(extracted, dict) and "lps" in extracted:
                    lps = extracted["lps"][:request.limit]
                elif isinstance(extracted, list):
                    # LLMが[{"lps": [...]}]形式で返す場合への対応
                    if len(extracted) > 0 and isinstance(extracted[0], dict) and "lps" in extracted[0]:
                        lps = extracted[0]["lps"][:request.limit]
                    else:
                        lps = extracted[:request.limit]

                # 結果をフィルタリング（有効なURLのみ）
                valid_results = []
                for lp in lps:
                    if isinstance(lp, dict) and lp.get("lp_url"):
                        valid_results.append(LPResult(
                            title=lp.get("title", "タイトルなし"),
                            thumbnail_url=lp.get("thumbnail_url", ""),
                            lp_url=lp.get("lp_url", ""),
                            category=lp.get("category")
                        ))

                return ScrapeResponse(
                    success=True,
                    results=valid_results
                )
            else:
                return ScrapeResponse(
                    success=False,
                    results=[],
                    error=result.error_message or "スクレイピングに失敗しました"
                )

    except ImportError as e:
        return ScrapeResponse(
            success=False,
            results=[],
            error=f"Crawl4AIがインストールされていません: {str(e)}"
        )
    except Exception as e:
        return ScrapeResponse(
            success=False,
            results=[],
            error=str(e)
        )


@app.get("/health")
async def health_check():
    """
    ヘルスチェックエンドポイント
    Crawl4AIが利用可能かどうかも確認
    """
    crawl4ai_available = False
    try:
        import crawl4ai
        crawl4ai_available = True
    except ImportError:
        pass

    return {
        "status": "healthy",
        "service": "crawl4ai-server",
        "crawl4ai_available": crawl4ai_available,
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "LP Builder Pro - Crawl4AI Server",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("LP Builder Pro - Crawl4AI Server")
    print("=" * 50)
    print("Starting server at http://localhost:8765")
    print("API Docs: http://localhost:8765/docs")
    print("Health Check: http://localhost:8765/health")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8765)
