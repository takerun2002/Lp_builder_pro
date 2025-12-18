/**
 * LPデザインスワイプファイル収集エージェント
 *
 * トンマナ・ジャンルに合ったLPデザインを自動で探して収集
 */

import { scrapeLpWebCom } from "../research/scrapers/lp-web-scraper";
import { analyzeLpStyle, type StyleAnalysis } from "./style-analyzer";
import { randomUUID } from "crypto";

// ============================================================
// 型定義
// ============================================================

export type SwipeCategory =
  | "beauty"      // 美容・化粧品
  | "health"      // 健康食品
  | "education"   // スクール・教育
  | "finance"     // 金融・保険
  | "saas"        // SaaS・BtoB
  | "ec"          // EC・物販
  | "service"     // サービス業
  | "recruit";    // 求人・採用

export type SwipeColor =
  | "white"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "black"
  | "gold";

export interface SwipeFileSearchParams {
  // ジャンル指定
  category?: SwipeCategory;
  // 色系統
  colorScheme?: SwipeColor[];
  // トンマナキーワード
  keywords?: string[];
  // 収集枚数上限
  limit?: number;
  // AIスタイル分析を実行するか
  analyzeStyle?: boolean;
  // 出力形式
  outputFormat?: "gallery" | "pdf" | "zip";
}

export interface SwipeFileResult {
  id: string;
  sourceUrl: string;
  thumbnailUrl: string;
  fullImageUrl?: string;
  screenshotPath?: string;
  category: SwipeCategory;
  colors: string[];         // 抽出した主要カラー
  industry: string;
  companyName?: string;
  title?: string;
  styleAnalysis?: StyleAnalysis;
  source: "lp-web" | "pinterest" | "lpadvance" | "parts-design";
  scrapedAt: string;
}

export interface SwipeFileSearchResult {
  items: SwipeFileResult[];
  totalFound: number;
  searchParams: SwipeFileSearchParams;
  sources: string[];
}

// ============================================================
// カテゴリ・色マッピング
// ============================================================

export const CATEGORY_LABELS: Record<SwipeCategory, string> = {
  beauty: "美容・化粧品",
  health: "健康食品・サプリメント",
  education: "スクール・教育",
  finance: "金融・保険",
  saas: "SaaS・BtoB",
  ec: "EC・物販",
  service: "サービス業",
  recruit: "求人・採用",
};

export const COLOR_LABELS: Record<SwipeColor, string> = {
  white: "白 [White]",
  pink: "桃 [Pink]",
  red: "赤 [Red]",
  orange: "橙 [Orange]",
  yellow: "黄 [Yellow]",
  green: "緑 [Green]",
  blue: "青 [Blue]",
  purple: "紫 [Purple]",
  black: "黒 [Black]",
  gold: "金 [Gold]",
};

// ============================================================
// メインエージェント
// ============================================================

/**
 * スワイプファイル収集エージェント
 */
export async function collectSwipeFiles(
  params: SwipeFileSearchParams,
  onProgress?: (message: string, progress: number) => void
): Promise<SwipeFileSearchResult> {
  const limit = params.limit || 20;
  const results: SwipeFileResult[] = [];
  const sources: string[] = [];

  onProgress?.("検索を開始しています...", 0);

  // 1. lp-web.comから収集
  try {
    onProgress?.("lp-web.comを検索中...", 10);

    const lpWebResults = await scrapeLpWebCom({
      category: params.category,
      colors: params.colorScheme,
      limit: Math.min(limit, 50),
    });

    sources.push("lp-web.com");

    for (const item of lpWebResults) {
      results.push({
        id: randomUUID(),
        sourceUrl: item.pageUrl,
        thumbnailUrl: item.thumbnailUrl,
        fullImageUrl: item.fullImageUrl,
        category: mapToSwipeCategory(item.category) || params.category || "service",
        colors: item.colors || [],
        industry: item.industry || item.category,
        companyName: item.companyName,
        title: item.title,
        source: "lp-web",
        scrapedAt: new Date().toISOString(),
      });
    }

    onProgress?.(`lp-web.comから${lpWebResults.length}件取得`, 40);
  } catch (error) {
    console.error("[swipe-agent] lp-web.com scraping error:", error);
  }

  // 2. AIスタイル分析（オプション）
  if (params.analyzeStyle && results.length > 0) {
    onProgress?.("AIスタイル分析を実行中...", 60);

    const analyzeLimit = Math.min(results.length, 10); // 最大10件まで分析
    for (let i = 0; i < analyzeLimit; i++) {
      try {
        const imageUrl = results[i].fullImageUrl || results[i].thumbnailUrl;
        if (imageUrl) {
          const styleAnalysis = await analyzeLpStyle(imageUrl);
          results[i].styleAnalysis = styleAnalysis;
        }
      } catch (error) {
        console.error(`[swipe-agent] Style analysis error for ${results[i].id}:`, error);
      }

      onProgress?.(
        `スタイル分析中... (${i + 1}/${analyzeLimit})`,
        60 + ((i + 1) / analyzeLimit) * 30
      );
    }
  }

  onProgress?.("完了", 100);

  return {
    items: results.slice(0, limit),
    totalFound: results.length,
    searchParams: params,
    sources,
  };
}

/**
 * 単一のスワイプファイルを詳細分析
 */
export async function analyzeSwipeFile(
  item: SwipeFileResult
): Promise<SwipeFileResult> {
  const imageUrl = item.fullImageUrl || item.thumbnailUrl;

  if (!imageUrl) {
    return item;
  }

  try {
    const styleAnalysis = await analyzeLpStyle(imageUrl);
    return {
      ...item,
      styleAnalysis,
    };
  } catch (error) {
    console.error("[swipe-agent] Analysis error:", error);
    return item;
  }
}

// ============================================================
// ユーティリティ
// ============================================================

function mapToSwipeCategory(category: string): SwipeCategory | undefined {
  const mapping: Record<string, SwipeCategory> = {
    "美容・化粧品": "beauty",
    "健康食品・サプリメント": "health",
    "健康食品": "health",
    "スクール（専門学校・大学）・資格": "education",
    "スクール・教育": "education",
    "教育": "education",
    "金融・証券・保険・FP": "finance",
    "金融・保険": "finance",
    "BtoB": "saas",
    "SaaS": "saas",
    "飲料・食品": "ec",
    "EC・物販": "ec",
    "サービス": "service",
    "サービス業": "service",
    "求人・転職（人材系）": "recruit",
    "求人・採用": "recruit",
  };

  return mapping[category];
}

/**
 * 検索結果をPDFエクスポート用に整形
 */
export function formatForPdfExport(result: SwipeFileSearchResult): {
  title: string;
  items: Array<{
    imageUrl: string;
    title: string;
    url: string;
    analysis: string;
  }>;
} {
  return {
    title: `スワイプファイル - ${result.searchParams.category || "全カテゴリ"}`,
    items: result.items.map((item) => ({
      imageUrl: item.fullImageUrl || item.thumbnailUrl,
      title: item.title || item.companyName || "無題",
      url: item.sourceUrl,
      analysis: item.styleAnalysis
        ? `レイアウト: ${item.styleAnalysis.layout}\nトンマナ: ${item.styleAnalysis.toneManner}\nターゲット: ${item.styleAnalysis.targetAudience}`
        : "分析なし",
    })),
  };
}
