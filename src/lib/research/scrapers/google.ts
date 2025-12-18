/**
 * Google検索スクレイパー
 *
 * 競合LP発見のためのGoogle検索
 * Task 1.1: Google検索で競合LP発見
 */

import { searchAndScrape, scrapeUrl } from "../firecrawl";
import type { ResearchContext } from "../types";

// ============================================================
// 型定義
// ============================================================

export interface GoogleSearchResult {
  organic: OrganicResult[];
  ads: AdResult[];
  relatedSearches: string[];
  totalResults?: number;
}

export interface OrganicResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
  domain: string;
  isLP?: boolean;
  markdown?: string;
}

export interface AdResult {
  url: string;
  title: string;
  description: string;
  domain: string;
  displayUrl?: string;
  extensions?: string[];
}

export interface GoogleSearchOptions {
  region?: "japan" | "us" | "global";
  limit?: number;
  includeAds?: boolean;
  scrapeResults?: boolean;
  filterLP?: boolean;
}

// ============================================================
// LP検出パターン
// ============================================================

const LP_URL_PATTERNS = [
  /\/lp\//i,
  /\/landing/i,
  /\/campaign/i,
  /\/promo/i,
  /\/offer/i,
  /\/special/i,
  /\/sales/i,
  /infotop\.jp/i,
  /clickbank\.com/i,
  /\.lp\./i,
];

const LP_TITLE_PATTERNS = [
  /【.*?】/,
  /期間限定/,
  /今だけ/,
  /特別/,
  /限定/,
  /無料/,
  /プレゼント/,
  /〇〇式/,
  /〇〇法/,
  /〇〇メソッド/,
];

// ============================================================
// メイン関数
// ============================================================

/**
 * 競合LP発見のためのGoogle検索
 */
export async function searchCompetitorLPs(
  context: ResearchContext,
  options?: GoogleSearchOptions
): Promise<GoogleSearchResult> {
  const queries = buildSearchQueries(context);
  const limit = options?.limit || 10;
  const region = options?.region || "japan";

  const allOrganic: OrganicResult[] = [];
  const allAds: AdResult[] = [];
  const allRelated: string[] = [];

  // 複数クエリで検索
  for (const query of queries) {
    try {
      const result = await searchGoogle(query, { region, limit: Math.ceil(limit / queries.length) });
      allOrganic.push(...result.organic);
      allAds.push(...result.ads);
      allRelated.push(...result.relatedSearches);
    } catch (error) {
      console.error(`[google] Search error for query "${query}":`, error);
    }

    // レート制限対策
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 重複を除去
  const uniqueOrganic = deduplicateResults(allOrganic);
  const uniqueAds = deduplicateAds(allAds);

  // LP候補をフィルタリング
  let filteredOrganic = uniqueOrganic;
  if (options?.filterLP !== false) {
    filteredOrganic = filterLPCandidates(uniqueOrganic);
  }

  // 結果をスクレイピング
  if (options?.scrapeResults) {
    filteredOrganic = await scrapeSearchResults(filteredOrganic);
  }

  return {
    organic: filteredOrganic.slice(0, limit),
    ads: uniqueAds,
    relatedSearches: Array.from(new Set(allRelated)),
  };
}

/**
 * キーワードでGoogle検索
 */
export async function searchGoogle(
  query: string,
  options?: {
    region?: "japan" | "us" | "global";
    limit?: number;
  }
): Promise<GoogleSearchResult> {
  const region = options?.region || "japan";
  const limit = options?.limit || 10;

  try {
    // Firecrawlの検索APIを使用
    const results = await searchAndScrape(query, {
      limit: limit * 2, // 多めに取得
      region,
    });

    const organic: OrganicResult[] = results.map((r, i) => ({
      url: extractUrl(r.metadata) || "",
      title: r.metadata?.title || "",
      snippet: r.metadata?.description || "",
      position: i + 1,
      domain: extractDomain(r.metadata?.title || ""),
      isLP: isLikelyLP(r.metadata?.title || "", extractUrl(r.metadata) || ""),
      markdown: r.markdown,
    })).filter((r) => r.url);

    // 広告は別途検出（HTMLパースが必要）
    const ads: AdResult[] = [];

    // 関連検索は現状取得不可
    const relatedSearches: string[] = [];

    return { organic, ads, relatedSearches };
  } catch (error) {
    console.error("[google] Search error:", error);
    return { organic: [], ads: [], relatedSearches: [] };
  }
}

/**
 * 特定URLが広告を出稿しているか確認
 */
export async function checkAdPresence(
  domain: string,
  keywords: string[]
): Promise<{
  hasAds: boolean;
  adKeywords: string[];
  confidence: number;
}> {
  const adKeywords: string[] = [];
  let adsFound = 0;

  for (const keyword of keywords.slice(0, 5)) {
    try {
      const result = await searchGoogle(keyword, { limit: 5 });

      for (const ad of result.ads) {
        if (ad.domain.includes(domain) || ad.url.includes(domain)) {
          adsFound++;
          adKeywords.push(keyword);
          break;
        }
      }
    } catch {
      // エラーは無視
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    hasAds: adsFound > 0,
    adKeywords,
    confidence: adsFound / keywords.length,
  };
}

// ============================================================
// クエリ構築
// ============================================================

function buildSearchQueries(context: ResearchContext): string[] {
  const queries: string[] = [];

  // ジャンル別基本クエリ
  const genreQueries: Record<string, string[]> = {
    beauty: ["美容 LP", "スキンケア セールスレター", "美白 商品"],
    health: ["健康 サプリ LP", "ダイエット 商品", "健康食品 販売"],
    education: ["オンライン講座 LP", "教材 セールスレター", "スキルアップ"],
    business: ["副業 LP", "ビジネス 教材", "稼ぐ 方法"],
    investment: ["投資 LP", "FX 商材", "株 講座"],
    romance: ["恋愛 LP", "婚活 サービス", "復縁 マニュアル"],
    spiritual: ["スピリチュアル LP", "占い サービス", "開運"],
    other: ["商品 LP", "サービス 申込"],
  };

  const baseQueries = genreQueries[context.genre] || genreQueries.other;
  queries.push(...baseQueries);

  // サブジャンルを追加
  if (context.subGenre) {
    queries.push(`${context.subGenre} LP`);
    queries.push(`${context.subGenre} 商品`);
  }

  // ターゲットの悩みを追加
  if (context.target.problems) {
    const problems = context.target.problems.split(/[、,]/).slice(0, 2);
    for (const problem of problems) {
      queries.push(`${problem.trim()} 解決`);
    }
  }

  return queries.slice(0, 5); // 最大5クエリ
}

// ============================================================
// LP候補フィルタリング
// ============================================================

function filterLPCandidates(results: OrganicResult[]): OrganicResult[] {
  return results.filter((r) => {
    // URL パターンでLP判定
    if (LP_URL_PATTERNS.some((pattern) => pattern.test(r.url))) {
      return true;
    }

    // タイトルパターンでLP判定
    if (LP_TITLE_PATTERNS.some((pattern) => pattern.test(r.title))) {
      return true;
    }

    // スニペットにセールス系キーワードがある
    const salesKeywords = ["今すぐ", "申込", "購入", "限定", "特別", "無料"];
    if (salesKeywords.some((kw) => r.snippet.includes(kw))) {
      return true;
    }

    return r.isLP === true;
  });
}

function isLikelyLP(title: string, url: string): boolean {
  // URL パターンチェック
  if (LP_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return true;
  }

  // タイトルパターンチェック
  if (LP_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return true;
  }

  return false;
}

// ============================================================
// 結果スクレイピング
// ============================================================

async function scrapeSearchResults(
  results: OrganicResult[]
): Promise<OrganicResult[]> {
  const scraped: OrganicResult[] = [];

  for (const result of results.slice(0, 10)) {
    if (!result.url) continue;

    try {
      const scrapedData = await scrapeUrl(result.url, {
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 2000,
      });

      scraped.push({
        ...result,
        markdown: scrapedData.markdown,
      });
    } catch {
      scraped.push(result);
    }

    // レート制限対策
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return scraped;
}

// ============================================================
// ユーティリティ
// ============================================================

function extractUrl(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return "";
  return (metadata.sourceURL as string) || (metadata.url as string) || "";
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "";
  }
}

function deduplicateResults(results: OrganicResult[]): OrganicResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.url || r.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateAds(ads: AdResult[]): AdResult[] {
  const seen = new Set<string>();
  return ads.filter((a) => {
    const key = a.url || a.domain;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================
// シミュレートデータ（フォールバック用）
// ============================================================

export function getSimulatedSearchResults(
  genre: string,
  limit: number
): GoogleSearchResult {
  const templates: Record<string, OrganicResult[]> = {
    beauty: [
      {
        url: "https://example.com/beauty-lp",
        title: "【97%が実感】たった3日で透明肌に",
        snippet: "今だけ特別価格でご案内。満足度No.1の美容液。",
        position: 1,
        domain: "example.com",
        isLP: true,
      },
      {
        url: "https://example.com/skincare",
        title: "皮膚科医監修のスキンケア方法",
        snippet: "年齢肌のお悩みを根本から解決。",
        position: 2,
        domain: "example.com",
        isLP: true,
      },
    ],
    business: [
      {
        url: "https://example.com/business-lp",
        title: "【副業】月収50万円を達成した方法",
        snippet: "会社員でも始められる。実績者多数。",
        position: 1,
        domain: "example.com",
        isLP: true,
      },
    ],
    romance: [
      {
        url: "https://example.com/romance-lp",
        title: "復縁成功率89%の秘密のテクニック",
        snippet: "元カノ・元カレと復縁できた実例多数。",
        position: 1,
        domain: "example.com",
        isLP: true,
      },
    ],
  };

  const results = templates[genre] || templates.business;

  return {
    organic: results.slice(0, limit).map((r, i) => ({ ...r, position: i + 1 })),
    ads: [
      {
        url: "https://example.com/ad",
        title: "【PR】人気商品のお試しキャンペーン",
        description: "今だけ特別価格。送料無料。",
        domain: "example.com",
      },
    ],
    relatedSearches: ["人気 商品", "おすすめ", "口コミ"],
  };
}

// ============================================================
// エクスポート用ヘルパー
// ============================================================

/**
 * 検索結果をCSV形式でエクスポート
 */
export function exportToCSV(result: GoogleSearchResult): string {
  const headers = ["順位", "タイトル", "URL", "ドメイン", "LP判定", "スニペット"];

  const rows = result.organic.map((r) => [
    r.position.toString(),
    `"${r.title.replace(/"/g, '""')}"`,
    r.url,
    r.domain,
    r.isLP ? "Yes" : "No",
    `"${r.snippet.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * 検索統計を取得
 */
export function getSearchStats(result: GoogleSearchResult): {
  totalResults: number;
  lpCount: number;
  adCount: number;
  topDomains: string[];
} {
  const domains = result.organic.map((r) => r.domain).filter(Boolean);
  const domainCounts = new Map<string, number>();
  for (const d of domains) {
    domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
  }

  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([d]) => d);

  return {
    totalResults: result.organic.length,
    lpCount: result.organic.filter((r) => r.isLP).length,
    adCount: result.ads.length,
    topDomains,
  };
}
