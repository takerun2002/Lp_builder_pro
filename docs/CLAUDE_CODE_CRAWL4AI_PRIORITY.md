# Claude Code タスク: Crawl4AI優先スクレイピング実装

## 概要

Crawl4AIサーバーが稼働中（ポート8765）。これを優先的に使用するスクレイピングシステムを実装する。

**前提条件**:
- ✅ Crawl4AIサーバー稼働中: `http://127.0.0.1:8765`
- ✅ 環境変数設定済み: `CRAWL4AI_SERVER_URL=http://127.0.0.1:8765`

---

## 実装タスク

### タスク1: Crawl4AIクライアント作成

**ファイル**: `src/lib/research/scraping/crawl4ai.ts`（新規作成）

```typescript
/**
 * Crawl4AI クライアント
 * ローカルサーバーとの通信
 */

export interface Crawl4AIScrapeOptions {
  waitForSelector?: string;
  timeoutMs?: number;
  render?: boolean;
  scroll?: boolean;
}

export interface Crawl4AIResult {
  success: boolean;
  markdown?: string;
  html?: string;
  metadata?: { title?: string; language?: string };
  error?: { 
    type: "network" | "timeout" | "blocked" | "parse"; 
    message: string;
  };
}

const DEFAULT_URL = "http://127.0.0.1:8765";

export async function crawl4aiScrape(
  url: string, 
  options?: Crawl4AIScrapeOptions
): Promise<Crawl4AIResult> {
  const serverUrl = process.env.CRAWL4AI_SERVER_URL || DEFAULT_URL;
  const timeoutMs = options?.timeoutMs || 30000;

  console.log(`[crawl4ai] Scraping ${url}...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${serverUrl}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        wait_for_selector: options?.waitForSelector,
        timeout: timeoutMs,
        render: options?.render ?? true,
        scroll: options?.scroll ?? true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: { type: "network", message: `HTTP ${response.status}` },
      };
    }

    const data = await response.json();
    const markdown = data.markdown || "";

    if (!markdown || markdown.length < 100) {
      return {
        success: false,
        error: { type: "blocked", message: "Empty or insufficient content" },
      };
    }

    console.log(`[crawl4ai] Success! ${markdown.length} chars`);
    return {
      success: true,
      markdown,
      html: data.html,
      metadata: data.metadata,
    };

  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: { type: "timeout", message: "Timeout" } };
    }
    return {
      success: false,
      error: { type: "network", message: err instanceof Error ? err.message : "Unknown" },
    };
  }
}

export async function checkCrawl4AIHealth(): Promise<boolean> {
  const serverUrl = process.env.CRAWL4AI_SERVER_URL || DEFAULT_URL;
  try {
    const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
```

---

### タスク2: スクレイピングプロバイダーチェーン作成

**ファイル**: `src/lib/research/scraping/provider-chain.ts`（新規作成）

```typescript
/**
 * スクレイピングプロバイダーチェーン
 * Crawl4AI → Firecrawl → Direct fetch
 */

import { crawl4aiScrape, checkCrawl4AIHealth, type Crawl4AIResult } from "./crawl4ai";
import { scrapeUrl as firecrawlScrape } from "../firecrawl";

export interface ScrapeResult {
  success: boolean;
  source: "crawl4ai" | "firecrawl" | "direct" | "failed";
  markdown: string;
  html?: string;
  error?: string;
  processingTimeMs: number;
}

export async function scrapeWithProviderChain(
  url: string,
  options?: { waitForSelector?: string; timeoutMs?: number }
): Promise<ScrapeResult> {
  const start = Date.now();
  console.log(`[provider-chain] Scraping: ${url}`);

  // 1. Crawl4AI（優先）
  const crawl4aiAvailable = await checkCrawl4AIHealth();
  if (crawl4aiAvailable) {
    console.log("[provider-chain] Using Crawl4AI...");
    const result = await crawl4aiScrape(url, {
      waitForSelector: options?.waitForSelector,
      timeoutMs: options?.timeoutMs || 30000,
      scroll: true,
    });

    if (result.success && result.markdown && result.markdown.length > 500) {
      return {
        success: true,
        source: "crawl4ai",
        markdown: result.markdown,
        html: result.html,
        processingTimeMs: Date.now() - start,
      };
    }
    console.log(`[provider-chain] Crawl4AI failed: ${result.error?.message}`);
  }

  // 2. Firecrawl（フォールバック）
  if (process.env.FIRECRAWL_API_KEY) {
    console.log("[provider-chain] Using Firecrawl...");
    try {
      const result = await firecrawlScrape(url, {
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 5000,
      });

      if (result.success && result.markdown && result.markdown.length > 500) {
        return {
          success: true,
          source: "firecrawl",
          markdown: result.markdown,
          html: result.html,
          processingTimeMs: Date.now() - start,
        };
      }
    } catch (err) {
      console.error("[provider-chain] Firecrawl error:", err);
    }
  }

  // 3. 直接fetch（最終）
  console.log("[provider-chain] Using direct fetch...");
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(options?.timeoutMs || 30000),
    });

    if (res.ok) {
      const html = await res.text();
      const markdown = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "\n")
        .replace(/\s+/g, " ")
        .trim();

      if (markdown.length > 500) {
        return {
          success: true,
          source: "direct",
          markdown,
          html,
          processingTimeMs: Date.now() - start,
        };
      }
    }
  } catch {}

  // 全て失敗
  return {
    success: false,
    source: "failed",
    markdown: "",
    error: "All scraping methods failed",
    processingTimeMs: Date.now() - start,
  };
}
```

---

### タスク3: Infotopスクレイパー更新

**ファイル**: `src/lib/research/scrapers/infotop.ts`

**変更内容**: 新しいプロバイダーチェーンを使用するように更新

```typescript
// 先頭にインポート追加
import { scrapeWithProviderChain } from "../scraping/provider-chain";

// scrapeInfotopRankingDetailed関数内のスクレイピング部分を置換
// 既存のFirecrawl/Crawl4AI/直接fetchのコードを以下に置き換え:

const scrapeResult = await scrapeWithProviderChain(url, {
  waitForSelector: ".ranking-list, .product-list, table",
  timeoutMs: 30000,
});

console.log(`[infotop] Scrape result: source=${scrapeResult.source}, success=${scrapeResult.success}`);

if (!scrapeResult.success) {
  console.error(`[infotop] All scraping failed: ${scrapeResult.error}`);
  // サンプルデータは返さない - エラーを返す
  return {
    success: false,
    products: [],
    source: "error",
    error: scrapeResult.error || "Scraping failed",
    metadata: {
      scrapedAt: new Date().toISOString(),
      processingTimeMs: scrapeResult.processingTimeMs,
      markdownLength: 0,
      retryCount: 0,
    },
  };
}

const markdown = scrapeResult.markdown;
// 以降は既存のAI分析ロジックを続行...
```

---

### タスク4: getSimulatedRanking削除

**ファイル**: `src/lib/research/scrapers/infotop.ts`

`getSimulatedRanking`関数の呼び出しをすべて削除し、代わりにエラーレスポンスを返すようにする。

**理由**: サンプルデータは実データではないため、ユーザーに誤解を与える

---

## ディレクトリ構造

```
src/lib/research/
├── scraping/           ← 新規作成
│   ├── crawl4ai.ts     ← タスク1
│   └── provider-chain.ts ← タスク2
├── scrapers/
│   └── infotop.ts      ← タスク3で更新
├── firecrawl.ts        ← 既存（そのまま）
└── orchestrator.ts     ← 必要に応じて更新
```

---

## 実装順序

1. `src/lib/research/scraping/` ディレクトリ作成
2. `crawl4ai.ts` 作成（タスク1）
3. `provider-chain.ts` 作成（タスク2）
4. `infotop.ts` 更新（タスク3）
5. `getSimulatedRanking` 呼び出し削除（タスク4）
6. 動作確認

---

## テスト方法

1. 開発サーバー再起動: `npm run dev`
2. `/dev/research` ページでリサーチ実行
3. サーバーログで以下を確認:
   - `[crawl4ai] Scraping https://www.infotop.jp/...`
   - `[crawl4ai] Success! XXXX chars`
   - `[infotop] Scrape result: source=crawl4ai, success=true`

---

## 受け入れ条件

- [ ] Crawl4AIが最優先で使用される
- [ ] Crawl4AI失敗時にFirecrawlにフォールバック
- [ ] サンプルデータ（`getSimulatedRanking`）は使用されない
- [ ] エラー時は明確なエラーメッセージが返される
- [ ] UIに実データまたはエラーが表示される

---

**作成者**: Cursor AI（ディレクター）  
**ステータス**: Claude Code 実装待ち
