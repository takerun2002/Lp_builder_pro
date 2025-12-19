# Claude Code 緊急タスク: スクレイパー精度修正

**ディレクター**: Cursor AI  
**日付**: 2024年12月  
**優先度**: 🔴 最高（リサーチワークフロー全体に影響）

---

## 📋 問題の概要

リサーチエージェントのワークフローが正しく動作していない：

1. **競合LP発見** → LPが正しく発見されない
2. **LPの分析** → 分析対象がないためスキップされる  
3. **ペインポイント分類** → 入力データがないためエラー

**根本原因**: スクレイパーの精度が低く、情報抽出が失敗している

---

## 🔴 タスク1: Google検索スクレイパーの修正

**ファイル**: `src/lib/research/scrapers/google.ts`

### 問題点

1. `extractUrl` が Firecrawl のレスポンス形式と合っていない
2. LP検出パターンが厳しすぎてフィルタアウトされる
3. エラー時に空配列を返すだけ

### 修正内容

#### 1.1 URL抽出ロジックの修正

```typescript
function extractUrl(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return "";
  
  // Firecrawlの様々なレスポンス形式に対応
  const urlFields = ["sourceURL", "url", "ogUrl", "canonicalUrl", "link"];
  for (const field of urlFields) {
    const value = metadata[field];
    if (typeof value === "string" && value.startsWith("http")) {
      return value;
    }
  }
  
  return "";
}
```

#### 1.2 LP検出パターンの緩和

```typescript
// 既存のパターンに加えて、より緩いパターンを追加
const LP_URL_PATTERNS_LOOSE = [
  /\/lp/i,
  /\/landing/i,
  /\/promo/i,
  /\/offer/i,
  /infotop/i,
  /note\.com/i,  // コンテンツ販売
  /brain-market/i,  // Brain
  /coconala/i,  // ココナラ
  /peraichi/i,  // ペライチ
  /wix/i,
  /jimdo/i,
];

const LP_CONTENT_KEYWORDS = [
  "今すぐ", "申込", "購入", "限定", "特別", "無料",
  "実績", "お客様の声", "よくある質問", "保証",
  "特典", "ボーナス", "値段", "価格", "返金",
];

function filterLPCandidates(results: OrganicResult[]): OrganicResult[] {
  return results.filter((r) => {
    // スコアベースの判定に変更
    let score = 0;
    
    // URL パターン（厳密）: +3点
    if (LP_URL_PATTERNS.some((p) => p.test(r.url))) score += 3;
    
    // URL パターン（緩い）: +2点
    if (LP_URL_PATTERNS_LOOSE.some((p) => p.test(r.url))) score += 2;
    
    // タイトルパターン: +2点
    if (LP_TITLE_PATTERNS.some((p) => p.test(r.title))) score += 2;
    
    // コンテンツキーワード: +1点/キーワード
    const content = `${r.title} ${r.snippet}`;
    for (const kw of LP_CONTENT_KEYWORDS) {
      if (content.includes(kw)) score += 1;
    }
    
    // 明示的LP判定: +3点
    if (r.isLP) score += 3;
    
    // 2点以上でLP候補として採用
    return score >= 2;
  });
}
```

#### 1.3 フォールバックの強化

```typescript
export async function searchGoogle(
  query: string,
  options?: { region?: "japan" | "us" | "global"; limit?: number }
): Promise<GoogleSearchResult> {
  const region = options?.region || "japan";
  const limit = options?.limit || 10;

  console.log(`[google] Searching: "${query}" (region: ${region}, limit: ${limit})`);

  try {
    // Firecrawlで検索
    const results = await searchAndScrape(query, {
      limit: limit * 2,
      region,
    });

    console.log(`[google] Firecrawl returned ${results.length} results`);

    if (results.length === 0) {
      console.warn("[google] No results from Firecrawl, using alternative");
      // Crawl4AIへのフォールバックを試行
      return await searchGoogleWithCrawl4AI(query, options);
    }

    const organic: OrganicResult[] = results.map((r, i) => {
      const url = extractUrl(r.metadata);
      const title = r.metadata?.title as string || "";
      
      console.log(`[google] Result ${i + 1}: ${title.slice(0, 50)} - ${url}`);
      
      return {
        url,
        title,
        snippet: r.metadata?.description as string || "",
        position: i + 1,
        domain: extractDomain(url),
        isLP: isLikelyLP(title, url),
        markdown: r.markdown,
      };
    }).filter((r) => r.url);

    return { organic, ads: [], relatedSearches: [] };
  } catch (error) {
    console.error("[google] Search error:", error);
    
    // フォールバック: Crawl4AI
    try {
      return await searchGoogleWithCrawl4AI(query, options);
    } catch (fallbackError) {
      console.error("[google] Fallback also failed:", fallbackError);
      return { organic: [], ads: [], relatedSearches: [] };
    }
  }
}

// Crawl4AIを使ったGoogle検索フォールバック
async function searchGoogleWithCrawl4AI(
  query: string,
  options?: { region?: string; limit?: number }
): Promise<GoogleSearchResult> {
  const limit = options?.limit || 10;
  
  try {
    const { Crawl4AIClient } = await import("@/lib/scrapers/crawl4ai-client");
    const client = new Crawl4AIClient();
    
    // Google検索結果ページをスクレイプ
    const googleUrl = `https://www.google.co.jp/search?q=${encodeURIComponent(query)}&num=${limit}`;
    
    const result = await client.scrape({
      url: googleUrl,
      extractionConfig: {
        type: "llm",
        instruction: `このGoogle検索結果から、以下の情報をJSON配列で抽出してください：
- url: リンク先URL
- title: ページタイトル
- snippet: 説明文

広告は除外し、オーガニック検索結果のみを抽出してください。`,
      },
    });

    if (result.extractedContent) {
      const parsed = JSON.parse(result.extractedContent) as Array<{
        url: string;
        title: string;
        snippet: string;
      }>;
      
      return {
        organic: parsed.map((r, i) => ({
          url: r.url,
          title: r.title,
          snippet: r.snippet,
          position: i + 1,
          domain: extractDomain(r.url),
          isLP: isLikelyLP(r.title, r.url),
        })),
        ads: [],
        relatedSearches: [],
      };
    }
  } catch (error) {
    console.error("[google] Crawl4AI fallback error:", error);
  }
  
  return { organic: [], ads: [], relatedSearches: [] };
}
```

---

## 🔴 タスク2: Infotopスクレイパーの修正

**ファイル**: `src/lib/research/scrapers/infotop.ts`

### 問題点

1. `parseRankingMarkdown` が実際のInfotopのHTML構造と合っていない
2. シミュレートデータへのフォールバックが多い

### 修正内容

#### 2.1 AI駆動のパースに完全移行

```typescript
export async function scrapeInfotopRanking(
  options?: InfotopScrapeOptions
): Promise<InfotopResult[]> {
  const limit = options?.limit || 10;
  const genreId = options?.genre ? GENRE_IDS[options.genre] || "" : "";

  console.log("[infotop] Scraping ranking...", { genre: options?.genre, limit });

  try {
    const url = genreId
      ? `${INFOTOP_RANKING_URL}?genre=${genreId}`
      : INFOTOP_RANKING_URL;

    // 方法1: Firecrawl
    let markdown = "";
    try {
      const result = await scrapeUrl(url, {
        formats: ["markdown"],
        onlyMainContent: false, // ← trueからfalseに変更（全体を取得）
        waitFor: 3000,
      });
      markdown = result.markdown || "";
      console.log(`[infotop] Firecrawl scraped ${markdown.length} chars`);
    } catch (firecrawlError) {
      console.warn("[infotop] Firecrawl failed:", firecrawlError);
    }

    // 方法2: Crawl4AI（フォールバック）
    if (!markdown) {
      try {
        const { Crawl4AIClient } = await import("@/lib/scrapers/crawl4ai-client");
        const client = new Crawl4AIClient();
        const crawl4aiResult = await client.scrape({
          url,
          options: {
            waitForSelector: ".ranking-list",
            timeout: 10000,
          },
        });
        markdown = crawl4aiResult.markdown || "";
        console.log(`[infotop] Crawl4AI scraped ${markdown.length} chars`);
      } catch (crawl4aiError) {
        console.warn("[infotop] Crawl4AI failed:", crawl4aiError);
      }
    }

    if (!markdown) {
      console.warn("[infotop] All scraping methods failed");
      return getSimulatedRanking(options?.genre || "other", limit);
    }

    // AI分析でパース（常に使用）
    const aiResult = await analyzeInfotopProductWithAI(markdown, options?.genre);

    if (aiResult.products.length > 0) {
      console.log(`[infotop] AI extracted ${aiResult.products.length} products`);
      return aiResult.products.slice(0, limit).map((p, i) => ({
        rank: p.rank || i + 1,
        productName: p.name,
        genre: options?.genre || "",
        price: p.price,
        lpUrl: p.lpUrl || "",
      }));
    }

    // 最終フォールバック（レガシーパース）
    console.log("[infotop] AI analysis returned no products, trying legacy parse");
    const legacyProducts = parseRankingMarkdown(markdown, limit);
    
    if (legacyProducts.length > 0) {
      return legacyProducts;
    }

    return getSimulatedRanking(options?.genre || "other", limit);
  } catch (err) {
    console.error("[infotop] Error:", err);
    return getSimulatedRanking(options?.genre || "other", limit);
  }
}
```

#### 2.2 AI分析関数の強化

`src/lib/research/ai-analyzer.ts` に以下を追加/修正：

```typescript
export async function analyzeInfotopProductWithAI(
  markdown: string,
  genre?: string
): Promise<{
  products: Array<{
    rank: number;
    name: string;
    price: number;
    lpUrl?: string;
  }>;
  priceInsights?: {
    average: number;
    range: { min: number; max: number };
    sweetSpot: string;
  };
  conceptPatterns?: string[];
}> {
  const client = getGeminiClient();

  const prompt = `以下はInfotopのランキングページのコンテンツです。
商品情報を抽出してください。

## コンテンツ
${markdown.slice(0, 15000)}

## 抽出ルール
1. ランキング順位、商品名、価格を抽出
2. 商品名は完全な形で抽出（「...」で省略しない）
3. 価格は数値のみ（円マークなし）
4. LPのURLがあれば含める
5. 最大20商品まで

## 出力形式（JSON）
\`\`\`json
{
  "products": [
    {"rank": 1, "name": "商品名", "price": 29800, "lpUrl": "https://..."}
  ],
  "priceInsights": {
    "average": 25000,
    "range": {"min": 9800, "max": 98000},
    "sweetSpot": "2万円〜3万円台が最も売れている"
  },
  "conceptPatterns": ["ステップバイステップ系", "〇〇式メソッド", "専門家監修"]
}
\`\`\`

${genre ? `ジャンル: ${genre}` : ""}
`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    });

    const text = response.text || "";
    
    // JSONパース
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // フォールバック: 直接パース試行
    const directMatch = text.match(/\{[\s\S]*"products"[\s\S]*\}/);
    if (directMatch) {
      return JSON.parse(directMatch[0]);
    }
  } catch (error) {
    console.error("[ai-analyzer] analyzeInfotopProductWithAI error:", error);
  }

  return { products: [] };
}
```

---

## 🔴 タスク3: ワークフローエラーハンドリングの強化

**ファイル**: `src/app/api/research/competitors/route.ts`

### 修正内容

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, mode = "discover", urls } = body as {
      context: ResearchContext;
      mode: "discover" | "analyze" | "both";
      urls?: string[];
    };

    if (!context) {
      return NextResponse.json(
        { error: "コンテキストが必要です" },
        { status: 400 }
      );
    }

    const results: {
      discovered?: Awaited<ReturnType<typeof searchCompetitorLPs>>;
      analyzed?: Awaited<ReturnType<typeof extractConceptsBulk>>;
      warnings?: string[];
    } = {
      warnings: [],
    };

    // 競合発見
    if (mode === "discover" || mode === "both") {
      console.log("[competitors] Starting discovery...");
      
      const searchResults = await searchCompetitorLPs(context, {
        region: "japan",
        limit: 10,
        scrapeResults: true,
        filterLP: true,
      });
      
      results.discovered = searchResults;
      
      console.log(`[competitors] Discovered ${searchResults.organic.length} results`);
      
      // LP候補がない場合の警告
      if (searchResults.organic.length === 0) {
        results.warnings?.push("競合LPが見つかりませんでした。検索キーワードを変更してみてください。");
      }
      
      const lpCandidates = searchResults.organic.filter(r => r.isLP);
      console.log(`[competitors] LP candidates: ${lpCandidates.length}`);
      
      if (lpCandidates.length === 0 && searchResults.organic.length > 0) {
        results.warnings?.push("LP候補のフィルタリングで結果が0件になりました。全結果を分析対象とします。");
        // フィルタリングを緩和
        searchResults.organic.forEach(r => r.isLP = true);
      }
    }

    // 競合分析
    if (mode === "analyze" || mode === "both") {
      let competitorsToAnalyze: Array<{ url: string; markdown: string }> = [];

      if (urls && urls.length > 0) {
        // 指定URLを分析
        for (const url of urls.slice(0, 5)) {
          try {
            const scraped = await scrapeUrl(url, {
              formats: ["markdown"],
              onlyMainContent: false,
              waitFor: 3000,
            });
            if (scraped.markdown) {
              competitorsToAnalyze.push({ url, markdown: scraped.markdown });
            }
          } catch (error) {
            console.error(`[competitors] Failed to scrape ${url}:`, error);
            results.warnings?.push(`${url} のスクレイピングに失敗しました`);
          }
        }
      } else if (results.discovered?.organic) {
        // 発見した競合を分析（markdownがなくてもisLPならスクレイピング試行）
        const candidates = results.discovered.organic.filter((r) => r.isLP).slice(0, 5);
        
        for (const candidate of candidates) {
          if (candidate.markdown) {
            competitorsToAnalyze.push({
              url: candidate.url,
              markdown: candidate.markdown,
            });
          } else {
            // markdownがない場合は再スクレイピング
            try {
              const scraped = await scrapeUrl(candidate.url, {
                formats: ["markdown"],
                onlyMainContent: false,
                waitFor: 3000,
              });
              if (scraped.markdown) {
                competitorsToAnalyze.push({
                  url: candidate.url,
                  markdown: scraped.markdown,
                });
              }
            } catch (error) {
              console.error(`[competitors] Re-scrape failed for ${candidate.url}:`, error);
            }
          }
        }
      }

      console.log(`[competitors] Analyzing ${competitorsToAnalyze.length} competitors`);

      if (competitorsToAnalyze.length > 0) {
        const analysisResults = await extractConceptsBulk(
          competitorsToAnalyze,
          {
            genre: context.genre,
            targetGender: context.target.gender,
          }
        );
        results.analyzed = analysisResults;
      } else {
        results.warnings?.push("分析対象の競合LPがありませんでした。");
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("[competitors] API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "競合分析に失敗しました",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
```

---

## 🔴 タスク4: ペインポイントAPIの空配列ハンドリング

**ファイル**: `src/app/api/research/pain-points/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { painPoints, context, options } = body as {
      painPoints: string[];
      context?: ResearchContext;
      options?: {
        genre?: string;
        targetGender?: string;
      };
    };

    // 空配列の場合はエラーではなく空結果を返す
    if (!painPoints || painPoints.length === 0) {
      console.warn("[pain-points] No pain points provided");
      return NextResponse.json({
        success: true,
        classified: [],
        quadrantSummary: null,
        insights: [],
        warning: "悩みデータがありませんでした。前の工程（競合LP分析）で悩みが抽出されなかった可能性があります。",
      });
    }

    // 重複を除去
    const uniquePainPoints = Array.from(new Set(painPoints));

    // 分類オプション
    const classifyOptions = {
      genre: options?.genre || context?.genre,
      targetGender: options?.targetGender || context?.target?.gender,
    };

    // 悩み分類
    const result = await classifyPainPoints(uniquePainPoints, classifyOptions);

    return NextResponse.json({
      success: true,
      classified: result.painPoints,
      quadrantSummary: result.quadrantSummary,
      insights: result.insights,
    });
  } catch (error) {
    console.error("[pain-points] API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "悩み分類に失敗しました",
        classified: [],
        insights: [],
      },
      { status: 500 }
    );
  }
}
```

---

## 📝 実装手順

1. `src/lib/research/scrapers/google.ts` を修正
2. `src/lib/research/scrapers/infotop.ts` を修正
3. `src/lib/research/ai-analyzer.ts` の `analyzeInfotopProductWithAI` を強化
4. `src/app/api/research/competitors/route.ts` を修正
5. `src/app/api/research/pain-points/route.ts` を修正
6. 動作テスト

---

## ✅ 完了条件

- [ ] Google検索で競合LPが10件以上発見される
- [ ] Infotopランキングから実際の商品情報が抽出される
- [ ] 競合LP分析が正常に実行される
- [ ] ペインポイント分類がエラーにならない（空でもOK）
- [ ] ワークフロー全体が正常に完了する

---

## 🔧 テスト方法

1. リサーチエージェントページにアクセス
2. 「ビジネス」ジャンルで競合LP発見を実行
3. ログで抽出件数を確認
4. ペインポイント分類まで正常に進むことを確認

---

**バージョン**: 1.0  
**作成者**: Cursor AI（ディレクター）  
**ステータス**: Claude Code 実装待ち
