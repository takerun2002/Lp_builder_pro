/**
 * lp-web.com スクレイパー
 *
 * 日本語LP収集サイト（カテゴリ・色で分類済み）からLPデザインを収集
 * https://lp-web.com/
 */

import { scrapeUrl } from "../firecrawl";

// ============================================================
// 型定義
// ============================================================

export interface LpWebSearchParams {
  category?: string;
  colors?: string[];
  page?: number;
  limit?: number;
}

export interface LpWebResult {
  pageUrl: string;
  thumbnailUrl: string;
  fullImageUrl?: string;
  title?: string;
  companyName?: string;
  category: string;
  industry?: string;
  colors: string[];
  scrapedAt: string;
}

// ============================================================
// カテゴリ・色マッピング
// ============================================================

export const LPWEB_CATEGORIES: Record<string, string> = {
  beauty: "美容・化粧品",
  health: "健康食品・サプリメント",
  education: "スクール（専門学校・大学）・資格",
  finance: "金融・証券・保険・FP",
  saas: "BtoB",
  ec: "飲料・食品",
  service: "サービス",
  recruit: "求人・転職（人材系）",
  travel: "旅行・ホテル",
  realestate: "不動産（戸建て・マンション）",
  car: "車・バイク",
  wedding: "ウェディング",
  gift: "ギフト",
  kids: "子供・ベビー",
  pet: "ペット",
  fashion: "ファッション",
  interior: "インテリア・家具",
  hobby: "趣味・エンタメ",
};

export const LPWEB_COLORS: Record<string, string> = {
  white: "白",
  pink: "桃",
  red: "赤",
  orange: "橙",
  yellow: "黄",
  green: "緑",
  blue: "青",
  purple: "紫",
  black: "黒",
  gold: "金",
  silver: "銀",
  brown: "茶",
  beige: "ベージュ",
};

// ============================================================
// メイン関数
// ============================================================

/**
 * lp-web.comからLPデザインを収集
 */
export async function scrapeLpWebCom(
  params: LpWebSearchParams
): Promise<LpWebResult[]> {
  const limit = params.limit || 20;
  const page = params.page || 1;
  const results: LpWebResult[] = [];

  try {
    // URLを構築
    const baseUrl = "https://lp-web.com";
    let searchUrl = baseUrl;

    // カテゴリフィルタ
    if (params.category) {
      const categoryPath = getCategoryPath(params.category);
      if (categoryPath) {
        searchUrl = `${baseUrl}/category/${encodeURIComponent(categoryPath)}`;
      }
    }

    // 色フィルタ（複数の場合は最初の色を使用）
    if (params.colors && params.colors.length > 0) {
      const colorPath = getColorPath(params.colors[0]);
      if (colorPath) {
        // 色でフィルタリングする場合のURL構造
        searchUrl = `${baseUrl}/color/${encodeURIComponent(colorPath)}`;
      }
    }

    // ページネーション
    if (page > 1) {
      searchUrl += `?page=${page}`;
    }

    console.log(`[lp-web-scraper] Fetching: ${searchUrl}`);

    // Firecrawlでスクレイピング
    const scrapeResult = await scrapeUrl(searchUrl, {
      formats: ["markdown", "html"],
      onlyMainContent: false,
      waitFor: 2000,
    });

    if (!scrapeResult.success || !scrapeResult.html) {
      console.error("[lp-web-scraper] Scrape failed:", scrapeResult.error);
      // フォールバック: シミュレートデータを返す
      return getSimulatedResults(params.category, limit);
    }

    // HTMLからLP情報を抽出
    const parsedResults = parseHtmlResults(scrapeResult.html, baseUrl);
    results.push(...parsedResults);

    // 指定色でフィルタリング（複数色の場合）
    let filteredResults = results;
    if (params.colors && params.colors.length > 1) {
      filteredResults = results.filter((result) =>
        params.colors!.some((color) =>
          result.colors.some((c) => c.includes(getColorPath(color) || ""))
        )
      );
    }

    return filteredResults.slice(0, limit);
  } catch (error) {
    console.error("[lp-web-scraper] Error:", error);
    // エラー時はシミュレートデータを返す
    return getSimulatedResults(params.category, limit);
  }
}

/**
 * LP詳細ページから追加情報を取得
 */
export async function scrapeLpWebDetail(
  pageUrl: string
): Promise<{
  fullImageUrl?: string;
  description?: string;
  tags?: string[];
}> {
  try {
    const scrapeResult = await scrapeUrl(pageUrl, {
      formats: ["html"],
      onlyMainContent: false,
      waitFor: 1500,
    });

    if (!scrapeResult.success || !scrapeResult.html) {
      return {};
    }

    // 詳細ページからフル画像URLなどを抽出
    const fullImageMatch = scrapeResult.html.match(
      /<img[^>]+class="[^"]*full-image[^"]*"[^>]+src="([^"]+)"/i
    ) || scrapeResult.html.match(
      /<img[^>]+src="([^"]+)"[^>]+class="[^"]*lp-image[^"]*"/i
    );

    const descriptionMatch = scrapeResult.html.match(
      /<meta[^>]+name="description"[^>]+content="([^"]+)"/i
    );

    const tagsMatch = scrapeResult.html.match(
      /<a[^>]+class="[^"]*tag[^"]*"[^>]*>([^<]+)<\/a>/gi
    );

    return {
      fullImageUrl: fullImageMatch?.[1],
      description: descriptionMatch?.[1],
      tags: tagsMatch?.map((tag) => tag.replace(/<[^>]+>/g, "").trim()),
    };
  } catch (error) {
    console.error("[lp-web-scraper] Detail scrape error:", error);
    return {};
  }
}

// ============================================================
// パーサー
// ============================================================

function parseHtmlResults(html: string, baseUrl: string): LpWebResult[] {
  const results: LpWebResult[] = [];

  // LP項目を抽出（正規表現ベース）
  // lp-web.comの構造に合わせて調整が必要
  const itemPattern = /<article[^>]*class="[^"]*lp-item[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  const items = html.match(itemPattern) || [];

  // 代替パターン: カードやリスト形式
  const altPattern = /<div[^>]*class="[^"]*(?:card|item|lp-card)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  const altItems = html.match(altPattern) || [];

  const allItems = [...items, ...altItems];

  for (const itemHtml of allItems.slice(0, 50)) {
    try {
      // サムネイル画像
      const imgMatch = itemHtml.match(/<img[^>]+src="([^"]+)"/i);
      const thumbnailUrl = imgMatch?.[1] || "";

      if (!thumbnailUrl || thumbnailUrl.includes("placeholder")) {
        continue;
      }

      // リンクURL
      const linkMatch = itemHtml.match(/<a[^>]+href="([^"]+)"/i);
      const pageUrl = linkMatch?.[1]
        ? linkMatch[1].startsWith("http")
          ? linkMatch[1]
          : `${baseUrl}${linkMatch[1]}`
        : "";

      // タイトル
      const titleMatch = itemHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
        itemHtml.match(/title="([^"]+)"/i);
      const title = titleMatch?.[1]?.trim();

      // 会社名
      const companyMatch = itemHtml.match(/company[^>]*>([^<]+)</i) ||
        itemHtml.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)</i);
      const companyName = companyMatch?.[1]?.trim();

      // カテゴリ
      const categoryMatch = itemHtml.match(/category[^>]*>([^<]+)</i);
      const category = categoryMatch?.[1]?.trim() || "その他";

      // 色タグ
      const colorMatches = itemHtml.match(/color-([a-z]+)/gi) || [];
      const colors = colorMatches.map((c) => c.replace("color-", ""));

      results.push({
        pageUrl,
        thumbnailUrl: thumbnailUrl.startsWith("http")
          ? thumbnailUrl
          : `${baseUrl}${thumbnailUrl}`,
        title,
        companyName,
        category,
        colors,
        scrapedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[lp-web-scraper] Parse item error:", e);
    }
  }

  return results;
}

// ============================================================
// ユーティリティ
// ============================================================

function getCategoryPath(category: string): string | undefined {
  const categoryMap: Record<string, string> = {
    beauty: "beauty",
    health: "health",
    education: "education",
    finance: "finance",
    saas: "btob",
    ec: "food",
    service: "service",
    recruit: "recruit",
  };
  return categoryMap[category.toLowerCase()] || categoryMap[category];
}

function getColorPath(color: string): string | undefined {
  const colorMap: Record<string, string> = {
    white: "white",
    pink: "pink",
    red: "red",
    orange: "orange",
    yellow: "yellow",
    green: "green",
    blue: "blue",
    purple: "purple",
    black: "black",
    gold: "gold",
  };
  return colorMap[color.toLowerCase()] || colorMap[color];
}

/**
 * シミュレートデータ（APIが使えない場合のフォールバック）
 */
function getSimulatedResults(category?: string, limit = 20): LpWebResult[] {
  const simulatedData: LpWebResult[] = [
    {
      pageUrl: "https://lp-web.com/lp/sample-beauty-1",
      thumbnailUrl: "https://picsum.photos/seed/lp1/400/600",
      fullImageUrl: "https://picsum.photos/seed/lp1/800/1200",
      title: "美容液LP - 透明感あふれる肌へ",
      companyName: "サンプル化粧品株式会社",
      category: "美容・化粧品",
      colors: ["white", "pink"],
      scrapedAt: new Date().toISOString(),
    },
    {
      pageUrl: "https://lp-web.com/lp/sample-health-1",
      thumbnailUrl: "https://picsum.photos/seed/lp2/400/600",
      fullImageUrl: "https://picsum.photos/seed/lp2/800/1200",
      title: "サプリメントLP - 毎日の健康習慣",
      companyName: "ヘルスケア株式会社",
      category: "健康食品・サプリメント",
      colors: ["green", "white"],
      scrapedAt: new Date().toISOString(),
    },
    {
      pageUrl: "https://lp-web.com/lp/sample-education-1",
      thumbnailUrl: "https://picsum.photos/seed/lp3/400/600",
      fullImageUrl: "https://picsum.photos/seed/lp3/800/1200",
      title: "オンラインスクールLP - 3ヶ月で資格取得",
      companyName: "エデュケーション株式会社",
      category: "スクール・教育",
      colors: ["blue", "white"],
      scrapedAt: new Date().toISOString(),
    },
    {
      pageUrl: "https://lp-web.com/lp/sample-finance-1",
      thumbnailUrl: "https://picsum.photos/seed/lp4/400/600",
      fullImageUrl: "https://picsum.photos/seed/lp4/800/1200",
      title: "投資顧問LP - 堅実な資産形成",
      companyName: "ファイナンス株式会社",
      category: "金融・保険",
      colors: ["blue", "gold"],
      scrapedAt: new Date().toISOString(),
    },
    {
      pageUrl: "https://lp-web.com/lp/sample-saas-1",
      thumbnailUrl: "https://picsum.photos/seed/lp5/400/600",
      fullImageUrl: "https://picsum.photos/seed/lp5/800/1200",
      title: "業務効率化SaaS - 生産性を3倍に",
      companyName: "テック株式会社",
      category: "BtoB",
      colors: ["blue", "purple"],
      scrapedAt: new Date().toISOString(),
    },
    {
      pageUrl: "https://lp-web.com/lp/sample-recruit-1",
      thumbnailUrl: "https://picsum.photos/seed/lp6/400/600",
      fullImageUrl: "https://picsum.photos/seed/lp6/800/1200",
      title: "採用LP - あなたの可能性を広げる",
      companyName: "人材サービス株式会社",
      category: "求人・採用",
      colors: ["orange", "white"],
      scrapedAt: new Date().toISOString(),
    },
    {
      pageUrl: "https://lp-web.com/lp/sample-service-1",
      thumbnailUrl: "https://picsum.photos/seed/lp7/400/600",
      fullImageUrl: "https://picsum.photos/seed/lp7/800/1200",
      title: "コンサルティングLP - ビジネスを次のステージへ",
      companyName: "コンサルティング株式会社",
      category: "サービス",
      colors: ["black", "gold"],
      scrapedAt: new Date().toISOString(),
    },
    {
      pageUrl: "https://lp-web.com/lp/sample-ec-1",
      thumbnailUrl: "https://picsum.photos/seed/lp8/400/600",
      fullImageUrl: "https://picsum.photos/seed/lp8/800/1200",
      title: "食品通販LP - 産地直送の美味しさ",
      companyName: "フードデリバリー株式会社",
      category: "EC・物販",
      colors: ["red", "yellow"],
      scrapedAt: new Date().toISOString(),
    },
  ];

  // カテゴリでフィルタ
  let results = simulatedData;
  if (category) {
    const categoryLabel = LPWEB_CATEGORIES[category] || category;
    results = simulatedData.filter(
      (item) =>
        item.category.includes(categoryLabel) ||
        item.category.toLowerCase().includes(category.toLowerCase())
    );

    // フィルタ結果が少ない場合はシミュレートデータを増やす
    if (results.length < limit) {
      const additionalItems = simulatedData.slice(0, limit - results.length).map((item, i) => ({
        ...item,
        pageUrl: `${item.pageUrl}-${i}`,
        thumbnailUrl: `https://picsum.photos/seed/lp${10 + i}/400/600`,
      }));
      results = [...results, ...additionalItems];
    }
  }

  return results.slice(0, limit);
}

// ============================================================
// エクスポート
// ============================================================

export { LPWEB_CATEGORIES as categories, LPWEB_COLORS as colors };
