# Claude Code 指示書: Crawl4AI 統合

## 概要

LP Builder ProにCrawl4AI（高精度LLMフレンドリースクレイパー）を統合し、LPアーカイブ等からのデザインリサーチ機能を強化する。

## 背景

- 現在のPlaywrightベースのスクレイピングは精度が低い
- LPアーカイブ（rdlp.jp/lp-archive/）は動的サイトでボット検出がある
- Crawl4AIはボット検出回避、LLM構造化抽出をネイティブサポート
- 46k+ GitHub Starsの人気ツール

## Crawl4AIについて

GitHub: https://github.com/unclecode/crawl4ai

### 主な特徴
- ボット検出回避機能内蔵
- LLMで構造化データ抽出（Gemini対応）
- Playwright上に構築（精度向上）
- Managed Browser対応
- 完全無料（Pythonライブラリ）

---

## 実装タスク

### Phase 1: Python環境セットアップ

#### 1.1 Pythonスクリプト用ディレクトリ作成

```
/python-scripts/
├── requirements.txt
├── crawl4ai_server.py      # FastAPIサーバー
├── lp_archive_scraper.py   # LPアーカイブ専用
└── design_gallery_scraper.py # 汎用デザインギャラリー
```

#### 1.2 requirements.txt

```txt
crawl4ai>=0.4.0
fastapi>=0.109.0
uvicorn>=0.27.0
pydantic>=2.0.0
google-generativeai>=0.3.0
```

#### 1.3 FastAPI サーバー（crawl4ai_server.py）

```python
"""
Crawl4AI スクレイピングサーバー
LP Builder Pro から呼び出される
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import asyncio
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.extraction_strategy import LLMExtractionStrategy, JsonCssExtractionStrategy
import os

app = FastAPI(title="LP Builder Pro - Crawl4AI Server")

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
    """LPアーカイブをスクレイピング"""
    try:
        async with AsyncWebCrawler(
            headless=True,
            browser_type="chromium",
            verbose=False
        ) as crawler:
            # カテゴリ選択用のURL構築
            url = request.url
            
            # LLM抽出戦略を設定
            if request.use_llm and request.gemini_api_key:
                extraction_strategy = LLMExtractionStrategy(
                    provider=f"gemini/gemini-2.0-flash",
                    api_token=request.gemini_api_key,
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
                    - title: LPのタイトル
                    - thumbnail_url: サムネイル画像のURL
                    - lp_url: LPへのリンク
                    - category: カテゴリ（あれば）
                    最大{request.limit}件まで取得してください。
                    """
                )
            else:
                # CSS セレクター戦略（LLM不使用）
                extraction_strategy = JsonCssExtractionStrategy(
                    schema={
                        "name": "LP List",
                        "baseSelector": ".lp-item, [class*='lp-card'], article",
                        "fields": [
                            {"name": "title", "selector": "h3, .title, [class*='title']", "type": "text"},
                            {"name": "thumbnail_url", "selector": "img", "type": "attribute", "attribute": "src"},
                            {"name": "lp_url", "selector": "a", "type": "attribute", "attribute": "href"}
                        ]
                    }
                )
            
            config = CrawlerRunConfig(
                extraction_strategy=extraction_strategy,
                wait_for="css:.lp-item, css:[class*='lp-card'], css:article",
                delay_before_return_html=2.0,
                screenshot=False,
                anti_detection=True  # ボット検出回避
            )
            
            result = await crawler.arun(url=url, config=config)
            
            if result.success:
                extracted = result.extracted_content
                # パース処理
                lps = []
                if isinstance(extracted, dict) and "lps" in extracted:
                    lps = extracted["lps"][:request.limit]
                elif isinstance(extracted, list):
                    lps = extracted[:request.limit]
                
                return ScrapeResponse(
                    success=True,
                    results=[LPResult(**lp) for lp in lps if lp.get("lp_url")]
                )
            else:
                return ScrapeResponse(
                    success=False,
                    results=[],
                    error=result.error_message
                )
                
    except Exception as e:
        return ScrapeResponse(
            success=False,
            results=[],
            error=str(e)
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "crawl4ai-server"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
```

---

### Phase 2: Next.js API連携

#### 2.1 Crawl4AI クライアント

**ファイル: `src/lib/scrapers/crawl4ai-client.ts`**

```typescript
/**
 * Crawl4AI Python サーバーとの連携クライアント
 */

export interface LPResult {
  title: string;
  thumbnail_url: string;
  lp_url: string;
  category?: string;
}

export interface ScrapeRequest {
  url: string;
  imageType?: string;
  color?: string;
  limit?: number;
  useLlm?: boolean;
  geminiApiKey?: string;
}

export interface ScrapeResponse {
  success: boolean;
  results: LPResult[];
  error?: string;
}

const CRAWL4AI_SERVER_URL = process.env.CRAWL4AI_SERVER_URL || "http://localhost:8765";

export async function scrapeLPArchive(request: ScrapeRequest): Promise<ScrapeResponse> {
  try {
    const response = await fetch(`${CRAWL4AI_SERVER_URL}/scrape/lp-archive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: request.url,
        image_type: request.imageType,
        color: request.color,
        limit: request.limit || 10,
        use_llm: request.useLlm ?? true,
        gemini_api_key: request.geminiApiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Crawl4AI server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[crawl4ai-client] Error:", error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function checkCrawl4AIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CRAWL4AI_SERVER_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
```

#### 2.2 API Route

**ファイル: `src/app/api/scrape/lp-archive/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { scrapeLPArchive, checkCrawl4AIHealth } from "@/lib/scrapers/crawl4ai-client";
import { getApiKey } from "@/lib/api-keys";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageType, color, limit = 10 } = body;

    // Crawl4AIサーバーの稼働確認
    const isHealthy = await checkCrawl4AIHealth();
    if (!isHealthy) {
      return NextResponse.json(
        { error: "Crawl4AIサーバーが起動していません。python-scripts/crawl4ai_server.py を起動してください。" },
        { status: 503 }
      );
    }

    // Gemini APIキーを取得
    const geminiApiKey = process.env.GEMINI_API_KEY || await getApiKey("gemini");

    const result = await scrapeLPArchive({
      url: "https://rdlp.jp/lp-archive/",
      imageType,
      color,
      limit,
      useLlm: !!geminiApiKey,
      geminiApiKey,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[lp-archive] API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "スクレイピングに失敗しました" },
      { status: 500 }
    );
  }
}

// ヘルスチェック用
export async function GET() {
  const isHealthy = await checkCrawl4AIHealth();
  return NextResponse.json({
    crawl4ai: isHealthy ? "running" : "stopped",
    message: isHealthy ? "Crawl4AIサーバー稼働中" : "python-scripts/crawl4ai_server.py を起動してください"
  });
}
```

---

### Phase 3: フロントエンドUI

#### 3.1 デザインリサーチページ

**ファイル: `src/app/dev/design-research/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ExternalLink, Plus } from "lucide-react";

const IMAGE_TYPES = [
  "マンガ・イラスト",
  "和風",
  "かっこいい",
  "かわいい",
  "にぎやか",
  "シンプル",
  "アート・芸術",
  "キレイ",
  "信頼・安心",
  "健康・癒し",
  "力強い",
  "派手",
  "清潔",
  "爽やか",
  "神秘",
  "高級・セレブ",
  "オーガニック",
  "ナチュラル",
  "スタイリッシュ",
  "透明感",
];

interface LPResult {
  title: string;
  thumbnail_url: string;
  lp_url: string;
  category?: string;
}

export default function DesignResearchPage() {
  const [imageType, setImageType] = useState<string>("");
  const [results, setResults] = useState<LPResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<"unknown" | "running" | "stopped">("unknown");

  const checkServerStatus = async () => {
    try {
      const res = await fetch("/api/scrape/lp-archive");
      const data = await res.json();
      setServerStatus(data.crawl4ai === "running" ? "running" : "stopped");
    } catch {
      setServerStatus("stopped");
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scrape/lp-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageType,
          limit: 20,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || "検索に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const addToSwipeFile = async (lp: LPResult) => {
    // TODO: スワイプファイルに追加する処理
    console.log("Add to swipe file:", lp);
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">🎨 デザインリサーチ</h1>
          <p className="text-muted-foreground mt-1">
            LPアーカイブからトンマナ参考を検索
          </p>
        </div>
        <Button variant="outline" onClick={checkServerStatus}>
          サーバー状態確認
        </Button>
      </div>

      {serverStatus === "stopped" && (
        <Card className="mb-6 border-yellow-500 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Crawl4AIサーバーが起動していません。以下のコマンドで起動してください:
            </p>
            <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs">
              cd python-scripts && pip install -r requirements.txt && python crawl4ai_server.py
            </pre>
          </CardContent>
        </Card>
      )}

      {/* 検索フォーム */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">検索条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">イメージタイプ</label>
              <Select value={imageType} onValueChange={setImageType}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    検索中...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    検索
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Card className="mb-6 border-red-500 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-800">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      {/* 検索結果 */}
      {results.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            検索結果 ({results.length}件)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((lp, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[3/4] relative bg-muted">
                  {lp.thumbnail_url && (
                    <img
                      src={lp.thumbnail_url}
                      alt={lp.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="text-sm font-medium line-clamp-2 mb-2">
                    {lp.title || "タイトルなし"}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(lp.lp_url, "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      開く
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => addToSwipeFile(lp)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      追加
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Phase 4: サイドバー追加

#### 4.1 サイドバーにデザインリサーチを追加

**ファイル: `src/components/sidebar.tsx` に追加**

```tsx
// ツールセクションに追加
{
  name: "デザインリサーチ",
  href: "/dev/design-research",
  icon: Palette,
  description: "LPアーカイブからトンマナ参考を検索",
}
```

---

### Phase 5: 将来拡張（Skyvern統合準備）

#### 5.1 スクレイパー抽象化

**ファイル: `src/lib/scrapers/types.ts`**

```typescript
export type ScraperEngine = "playwright" | "crawl4ai" | "skyvern";

export interface ScraperConfig {
  engine: ScraperEngine;
  url: string;
  options?: Record<string, unknown>;
}

export interface ScraperResult {
  success: boolean;
  data: unknown;
  error?: string;
  engine: ScraperEngine;
}

export interface ScraperProvider {
  name: ScraperEngine;
  scrape(config: ScraperConfig): Promise<ScraperResult>;
  isAvailable(): Promise<boolean>;
}
```

---

## 環境変数

`.env.local` に追加:

```env
# Crawl4AI Python サーバーURL
CRAWL4AI_SERVER_URL=http://localhost:8765
```

---

## 起動手順

### 1. Python環境セットアップ

```bash
cd python-scripts
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Crawl4AIサーバー起動

```bash
cd python-scripts
python crawl4ai_server.py
# サーバーが http://localhost:8765 で起動
```

### 3. Next.js開発サーバー起動

```bash
npm run dev
```

### 4. アクセス

- デザインリサーチページ: http://localhost:3000/dev/design-research

---

## 完了条件

### Phase 1
- [ ] python-scripts/ ディレクトリ作成
- [ ] requirements.txt 作成
- [ ] crawl4ai_server.py 作成・動作確認

### Phase 2
- [ ] crawl4ai-client.ts 作成
- [ ] /api/scrape/lp-archive API Route 作成
- [ ] ヘルスチェック機能動作確認

### Phase 3
- [ ] /dev/design-research ページ作成
- [ ] 検索機能動作確認
- [ ] スワイプファイル追加機能

### Phase 4
- [ ] サイドバーにリンク追加

### Phase 5（将来）
- [ ] Skyvern統合準備
- [ ] スクレイパー抽象化

---

## 注意事項

1. **Pythonサーバーは別プロセス**
   - Next.jsとは別にPythonサーバーを起動する必要がある
   - 将来的にはDocker Composeで統合可能

2. **LLM使用時のコスト**
   - Gemini 2.0 Flash は無料枠あり
   - 大量スクレイピング時はLLM不使用モードも用意

3. **レート制限**
   - LPアーカイブへの過度なリクエストを避ける
   - 適切な遅延を設定

4. **ボット検出**
   - Crawl4AIのanti_detection機能を有効化
   - それでもブロックされる場合はプロキシ検討

---

## 参考リンク

- Crawl4AI GitHub: https://github.com/unclecode/crawl4ai
- Crawl4AI Docs: https://docs.crawl4ai.com/
- LPアーカイブ: https://rdlp.jp/lp-archive/
