/**
 * スクレイパー共通型定義
 *
 * Crawl4AI、Firecrawl、カスタムスクレイパーの共通インターフェース
 */

/**
 * LP情報
 */
export interface LPInfo {
  title: string;
  thumbnailUrl: string;
  lpUrl: string;
  category?: string;
  tags?: string[];
  description?: string;
}

/**
 * スクレイピング結果
 */
export interface ScrapeResult<T = LPInfo> {
  success: boolean;
  results: T[];
  error?: string;
  metadata?: {
    source: "crawl4ai" | "firecrawl" | "custom";
    scrapedAt: string;
    totalCount?: number;
  };
}

/**
 * LPアーカイブスクレイピングリクエスト
 */
export interface LPArchiveScrapeRequest {
  /** スクレイピング対象URL */
  url: string;
  /** イメージタイプフィルター（高級・セレブ、シンプル等） */
  imageType?: string;
  /** カラーフィルター */
  color?: string;
  /** 取得件数制限 */
  limit?: number;
  /** LLM抽出を使用するか（Gemini） */
  useLLM?: boolean;
}

/**
 * スクレイパーステータス
 */
export interface ScraperStatus {
  available: boolean;
  service: string;
  version?: string;
  error?: string;
}

/**
 * スクレイパーインターフェース（抽象化）
 */
export interface IScraper {
  name: string;
  checkHealth(): Promise<ScraperStatus>;
  scrapeLPArchive(request: LPArchiveScrapeRequest): Promise<ScrapeResult<LPInfo>>;
}

/**
 * デザインリサーチフィルター
 */
export interface DesignResearchFilters {
  imageType?: string;
  color?: string;
  industry?: string;
  style?: string;
  limit?: number;
}

/**
 * LPアーカイブサイト設定
 */
export interface LPArchiveSite {
  id: string;
  name: string;
  url: string;
  description: string;
  supportedFilters: string[];
}

/**
 * 対応LPアーカイブサイト一覧
 */
export const LP_ARCHIVE_SITES: LPArchiveSite[] = [
  {
    id: "rdlp",
    name: "RDLP.jp",
    url: "https://rdlp.jp",
    description: "国内最大級のLPデザインギャラリー",
    supportedFilters: ["imageType", "color", "industry"],
  },
  {
    id: "lp-web",
    name: "LP ARCHIVE",
    url: "https://rdlp.jp/lp-archive",
    description: "業種別LPアーカイブ",
    supportedFilters: ["industry", "style"],
  },
  {
    id: "parts",
    name: "Parts.design",
    url: "https://parts.design",
    description: "LPパーツデザイン集",
    supportedFilters: ["partType", "style"],
  },
];
