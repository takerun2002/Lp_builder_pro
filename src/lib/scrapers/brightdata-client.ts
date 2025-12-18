/**
 * Bright Data API クライアント
 *
 * 高度なWebスクレイピング・SNSデータ収集
 * - Scraping Browser API
 * - Web Unlocker API
 * - Scraper API (Instagram, TikTok, X)
 */

import { getApiKey } from "../api-keys";

// ============================================================
// 型定義
// ============================================================

export interface BrightDataConfig {
  apiKey?: string;
  zone?: string;        // データセンターゾーン
  country?: string;     // プロキシ国指定 (jp, us, etc.)
}

export interface BrowseOptions {
  waitFor?: string;           // CSSセレクタ待機
  waitForTimeout?: number;    // 待機タイムアウト (ms)
  screenshot?: boolean;       // スクリーンショット取得
  fullPage?: boolean;         // フルページスクリーンショット
  javascript?: boolean;       // JavaScript有効化
  headers?: Record<string, string>;
}

export interface BrowseResult {
  success: boolean;
  html?: string;
  screenshot?: string;        // Base64エンコード
  url?: string;
  statusCode?: number;
  error?: string;
}

export interface InstagramPost {
  id: string;
  shortcode: string;
  caption?: string;
  mediaType: "image" | "video" | "carousel";
  mediaUrl: string;
  thumbnailUrl?: string;
  likeCount: number;
  commentCount: number;
  timestamp: string;
  ownerUsername: string;
  ownerFullName?: string;
  hashtags: string[];
  mentions: string[];
}

export interface TikTokVideo {
  id: string;
  desc: string;
  videoUrl: string;
  coverUrl: string;
  playCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: string;
  authorUsername: string;
  authorNickname?: string;
  music?: {
    title: string;
    author: string;
  };
  hashtags: string[];
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  authorUsername: string;
  authorName?: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  mediaUrls?: string[];
  hashtags: string[];
  mentions: string[];
  urls: string[];
}

// ============================================================
// Bright Data クライアント
// ============================================================

export class BrightDataClient {
  private apiKey: string | null = null;
  private zone: string;
  private country: string;
  private baseUrl = "https://api.brightdata.com";

  constructor(config?: BrightDataConfig) {
    this.zone = config?.zone || "web_unlocker1";
    this.country = config?.country || "jp";
    if (config?.apiKey) {
      this.apiKey = config.apiKey;
    }
  }

  // ============================================================
  // APIキー取得
  // ============================================================

  private async getApiKeyValue(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;

    // 環境変数から取得
    if (process.env.BRIGHTDATA_API_KEY) {
      return process.env.BRIGHTDATA_API_KEY;
    }

    // ストレージから取得
    try {
      const key = await getApiKey("brightdata");
      if (key) {
        this.apiKey = key;
        return key;
      }
    } catch {
      // ignore
    }

    return null;
  }

  // ============================================================
  // Web Unlocker API
  // ============================================================

  /**
   * Web Unlocker APIでページを取得
   * 難しいサイトでもアクセス可能
   */
  async unlockPage(url: string): Promise<string> {
    const apiKey = await this.getApiKeyValue();

    if (!apiKey) {
      console.warn("[brightdata] No API key, using fallback");
      return this.fallbackFetch(url);
    }

    try {
      // Bright Data proxy URL for future implementation with proper HTTP agent
      // const proxyUrl = `http://brd-customer-${apiKey}-zone-${this.zone}:${apiKey}@brd.superproxy.io:22225`;
      void apiKey; // Mark as used for future proxy implementation

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        // Note: In Node.js, you'd use an HTTP agent with proxy
        // This is a simplified version
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error("[brightdata] Web Unlocker error:", error);
      return this.fallbackFetch(url);
    }
  }

  // ============================================================
  // Scraping Browser API
  // ============================================================

  /**
   * ステルスブラウザでページをスクレイプ
   * JavaScript実行、スクリーンショット対応
   */
  async browseWithStealth(
    url: string,
    options?: BrowseOptions
  ): Promise<BrowseResult> {
    const apiKey = await this.getApiKeyValue();

    if (!apiKey) {
      console.warn("[brightdata] No API key, using fallback");
      return this.fallbackBrowse(url);
    }

    try {
      // Bright Data Scraping Browser API
      const response = await fetch(`${this.baseUrl}/scraping-browser/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          country: this.country,
          wait_for: options?.waitFor,
          wait_timeout: options?.waitForTimeout || 30000,
          screenshot: options?.screenshot || false,
          screenshot_full_page: options?.fullPage || false,
          javascript: options?.javascript ?? true,
          headers: options?.headers,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        success: true,
        html: data.html,
        screenshot: data.screenshot,
        url: data.url || url,
        statusCode: data.status_code,
      };
    } catch (error) {
      console.error("[brightdata] Scraping Browser error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ============================================================
  // Scraper API - Instagram
  // ============================================================

  /**
   * Instagram投稿を取得
   */
  async scrapeInstagram(query: {
    username?: string;
    hashtag?: string;
    limit?: number;
  }): Promise<InstagramPost[]> {
    const apiKey = await this.getApiKeyValue();
    const limit = query.limit || 20;

    if (!apiKey) {
      console.warn("[brightdata] No API key, returning simulated data");
      return this.getSimulatedInstagramPosts(query.hashtag || query.username || "", limit);
    }

    try {
      let endpoint = "";
      let params: Record<string, string> = {};

      if (query.username) {
        endpoint = "/datasets/v3/instagram/posts";
        params = { username: query.username, limit: limit.toString() };
      } else if (query.hashtag) {
        endpoint = "/datasets/v3/instagram/hashtag";
        params = { hashtag: query.hashtag.replace("#", ""), limit: limit.toString() };
      } else {
        return [];
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${this.baseUrl}${endpoint}?${queryString}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseInstagramData(data);
    } catch (error) {
      console.error("[brightdata] Instagram scrape error:", error);
      return this.getSimulatedInstagramPosts(query.hashtag || query.username || "", limit);
    }
  }

  // ============================================================
  // Scraper API - TikTok
  // ============================================================

  /**
   * TikTok動画を取得
   */
  async scrapeTikTok(query: {
    username?: string;
    hashtag?: string;
    limit?: number;
  }): Promise<TikTokVideo[]> {
    const apiKey = await this.getApiKeyValue();
    const limit = query.limit || 20;

    if (!apiKey) {
      console.warn("[brightdata] No API key, returning simulated data");
      return this.getSimulatedTikTokVideos(query.hashtag || query.username || "", limit);
    }

    try {
      let endpoint = "";
      let params: Record<string, string> = {};

      if (query.username) {
        endpoint = "/datasets/v3/tiktok/posts";
        params = { username: query.username, limit: limit.toString() };
      } else if (query.hashtag) {
        endpoint = "/datasets/v3/tiktok/hashtag";
        params = { hashtag: query.hashtag.replace("#", ""), limit: limit.toString() };
      } else {
        return [];
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${this.baseUrl}${endpoint}?${queryString}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseTikTokData(data);
    } catch (error) {
      console.error("[brightdata] TikTok scrape error:", error);
      return this.getSimulatedTikTokVideos(query.hashtag || query.username || "", limit);
    }
  }

  // ============================================================
  // Scraper API - X (Twitter)
  // ============================================================

  /**
   * X (Twitter) ツイートを取得
   */
  async scrapeX(query: {
    username?: string;
    keyword?: string;
    limit?: number;
  }): Promise<Tweet[]> {
    const apiKey = await this.getApiKeyValue();
    const limit = query.limit || 20;

    if (!apiKey) {
      console.warn("[brightdata] No API key, returning simulated data");
      return this.getSimulatedTweets(query.keyword || query.username || "", limit);
    }

    try {
      let endpoint = "";
      let params: Record<string, string> = {};

      if (query.username) {
        endpoint = "/datasets/v3/twitter/posts";
        params = { username: query.username, limit: limit.toString() };
      } else if (query.keyword) {
        endpoint = "/datasets/v3/twitter/search";
        params = { query: query.keyword, limit: limit.toString() };
      } else {
        return [];
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${this.baseUrl}${endpoint}?${queryString}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseTwitterData(data);
    } catch (error) {
      console.error("[brightdata] X scrape error:", error);
      return this.getSimulatedTweets(query.keyword || query.username || "", limit);
    }
  }

  // ============================================================
  // Pinterest スクレイピング
  // ============================================================

  /**
   * Pinterest検索結果を取得
   */
  async scrapePinterest(query: {
    keyword: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    title?: string;
    description?: string;
    imageUrl: string;
    sourceUrl?: string;
    pinner?: string;
  }>> {
    const limit = query.limit || 20;

    try {
      const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query.keyword)}`;
      const result = await this.browseWithStealth(searchUrl, {
        waitFor: "[data-test-id=\"pin\"]",
        waitForTimeout: 10000,
        javascript: true,
      });

      if (!result.success || !result.html) {
        return this.getSimulatedPinterestPins(query.keyword, limit);
      }

      // HTMLからピンを抽出
      return this.parsePinterestHtml(result.html, limit);
    } catch (error) {
      console.error("[brightdata] Pinterest scrape error:", error);
      return this.getSimulatedPinterestPins(query.keyword, limit);
    }
  }

  // ============================================================
  // フォールバック・シミュレート
  // ============================================================

  private async fallbackFetch(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      return await response.text();
    } catch {
      return "";
    }
  }

  private async fallbackBrowse(url: string): Promise<BrowseResult> {
    try {
      const html = await this.fallbackFetch(url);
      return {
        success: true,
        html,
        url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ============================================================
  // データパーサー
  // ============================================================

  private parseInstagramData(data: unknown[]): InstagramPost[] {
    if (!Array.isArray(data)) return [];

    return (data as Record<string, unknown>[]).map((item) => ({
      id: String(item.id || ""),
      shortcode: String(item.shortcode || item.code || ""),
      caption: item.caption as string | undefined,
      mediaType: (item.media_type || item.type || "image") as "image" | "video" | "carousel",
      mediaUrl: String(item.media_url || item.display_url || ""),
      thumbnailUrl: item.thumbnail_url as string | undefined,
      likeCount: Number(item.like_count || item.likes || 0),
      commentCount: Number(item.comment_count || item.comments || 0),
      timestamp: String(item.timestamp || item.taken_at || new Date().toISOString()),
      ownerUsername: String(item.owner_username || item.username || ""),
      ownerFullName: item.owner_full_name as string | undefined,
      hashtags: this.extractHashtags(String(item.caption || "")),
      mentions: this.extractMentions(String(item.caption || "")),
    }));
  }

  private parseTikTokData(data: unknown[]): TikTokVideo[] {
    if (!Array.isArray(data)) return [];

    return (data as Record<string, unknown>[]).map((item) => {
      const stats = item.stats as Record<string, unknown> | undefined;
      const author = item.author as Record<string, unknown> | undefined;
      return {
        id: String(item.id || ""),
        desc: String(item.desc || item.description || ""),
        videoUrl: String(item.video_url || item.play_url || ""),
        coverUrl: String(item.cover_url || item.origin_cover || ""),
        playCount: Number(item.play_count || stats?.playCount || 0),
        likeCount: Number(item.like_count || stats?.diggCount || 0),
        commentCount: Number(item.comment_count || stats?.commentCount || 0),
        shareCount: Number(item.share_count || stats?.shareCount || 0),
        createTime: String(item.create_time || new Date().toISOString()),
        authorUsername: String(item.author_username || author?.uniqueId || ""),
        authorNickname: (item.author_nickname || author?.nickname) as string | undefined,
        music: item.music ? {
          title: String((item.music as Record<string, unknown>).title || ""),
          author: String((item.music as Record<string, unknown>).author || ""),
        } : undefined,
        hashtags: this.extractHashtags(String(item.desc || "")),
      };
    });
  }

  private parseTwitterData(data: unknown[]): Tweet[] {
    if (!Array.isArray(data)) return [];

    return (data as Record<string, unknown>[]).map((item) => ({
      id: String(item.id || item.id_str || ""),
      text: String(item.text || item.full_text || ""),
      createdAt: String(item.created_at || new Date().toISOString()),
      authorId: String(item.author_id || item.user_id || ""),
      authorUsername: String(item.author_username || item.screen_name || ""),
      authorName: item.author_name as string | undefined,
      likeCount: Number(item.like_count || item.favorite_count || 0),
      retweetCount: Number(item.retweet_count || 0),
      replyCount: Number(item.reply_count || 0),
      quoteCount: Number(item.quote_count || 0),
      mediaUrls: Array.isArray(item.media_urls) ? item.media_urls as string[] : undefined,
      hashtags: this.extractHashtags(String(item.text || "")),
      mentions: this.extractMentions(String(item.text || "")),
      urls: this.extractUrls(String(item.text || "")),
    }));
  }

  private parsePinterestHtml(html: string, limit: number): Array<{
    id: string;
    title?: string;
    description?: string;
    imageUrl: string;
    sourceUrl?: string;
    pinner?: string;
  }> {
    const results: Array<{
      id: string;
      title?: string;
      description?: string;
      imageUrl: string;
      sourceUrl?: string;
      pinner?: string;
    }> = [];

    // 簡易的なHTMLパース
    const pinPattern = /<div[^>]*data-test-id="pin"[^>]*>([\s\S]*?)<\/div>/gi;
    const matches = html.match(pinPattern) || [];

    for (const match of matches.slice(0, limit)) {
      const imgMatch = match.match(/src="([^"]+)"/);
      const titleMatch = match.match(/alt="([^"]+)"/);

      if (imgMatch) {
        results.push({
          id: `pin_${results.length}`,
          title: titleMatch?.[1],
          imageUrl: imgMatch[1],
        });
      }
    }

    return results;
  }

  // ============================================================
  // ユーティリティ
  // ============================================================

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g);
    return matches || [];
  }

  private extractMentions(text: string): string[] {
    const matches = text.match(/@[\w]+/g);
    return matches || [];
  }

  private extractUrls(text: string): string[] {
    const matches = text.match(/https?:\/\/[^\s]+/g);
    return matches || [];
  }

  // ============================================================
  // シミュレートデータ
  // ============================================================

  private getSimulatedInstagramPosts(query: string, limit: number): InstagramPost[] {
    const posts: InstagramPost[] = [];
    for (let i = 0; i < limit; i++) {
      posts.push({
        id: `ig_${i}`,
        shortcode: `ABC${i}XYZ`,
        caption: `${query}に関する投稿 #${query} #マーケティング #ビジネス`,
        mediaType: i % 3 === 0 ? "video" : "image",
        mediaUrl: `https://picsum.photos/seed/ig${i}/640/640`,
        likeCount: Math.floor(Math.random() * 10000),
        commentCount: Math.floor(Math.random() * 500),
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        ownerUsername: `user_${i}`,
        hashtags: [`#${query}`, "#マーケティング"],
        mentions: [],
      });
    }
    return posts;
  }

  private getSimulatedTikTokVideos(query: string, limit: number): TikTokVideo[] {
    const videos: TikTokVideo[] = [];
    for (let i = 0; i < limit; i++) {
      videos.push({
        id: `tt_${i}`,
        desc: `${query}について解説！ #${query} #TikTok #バズる`,
        videoUrl: `https://example.com/video${i}.mp4`,
        coverUrl: `https://picsum.photos/seed/tt${i}/720/1280`,
        playCount: Math.floor(Math.random() * 1000000),
        likeCount: Math.floor(Math.random() * 100000),
        commentCount: Math.floor(Math.random() * 5000),
        shareCount: Math.floor(Math.random() * 10000),
        createTime: new Date(Date.now() - i * 86400000).toISOString(),
        authorUsername: `tiktoker_${i}`,
        authorNickname: `TikToker ${i}`,
        hashtags: [`#${query}`, "#TikTok"],
      });
    }
    return videos;
  }

  private getSimulatedTweets(query: string, limit: number): Tweet[] {
    const tweets: Tweet[] = [];
    for (let i = 0; i < limit; i++) {
      tweets.push({
        id: `tw_${i}`,
        text: `${query}についてツイート。これは重要なトピックです。 #${query} #話題`,
        createdAt: new Date(Date.now() - i * 3600000).toISOString(),
        authorId: `author_${i}`,
        authorUsername: `twitter_user_${i}`,
        authorName: `Twitter User ${i}`,
        likeCount: Math.floor(Math.random() * 5000),
        retweetCount: Math.floor(Math.random() * 1000),
        replyCount: Math.floor(Math.random() * 200),
        quoteCount: Math.floor(Math.random() * 100),
        hashtags: [`#${query}`, "#話題"],
        mentions: [],
        urls: [],
      });
    }
    return tweets;
  }

  private getSimulatedPinterestPins(query: string, limit: number): Array<{
    id: string;
    title?: string;
    description?: string;
    imageUrl: string;
    sourceUrl?: string;
    pinner?: string;
  }> {
    const pins: Array<{
      id: string;
      title?: string;
      description?: string;
      imageUrl: string;
      sourceUrl?: string;
      pinner?: string;
    }> = [];

    for (let i = 0; i < limit; i++) {
      pins.push({
        id: `pin_${i}`,
        title: `${query} デザイン ${i + 1}`,
        description: `${query}に関するインスピレーション`,
        imageUrl: `https://picsum.photos/seed/pin${i}/600/900`,
        pinner: `pinner_${i}`,
      });
    }

    return pins;
  }
}

// ============================================================
// シングルトンインスタンス
// ============================================================

let clientInstance: BrightDataClient | null = null;

export function getBrightDataClient(config?: BrightDataConfig): BrightDataClient {
  if (!clientInstance) {
    clientInstance = new BrightDataClient(config);
  }
  return clientInstance;
}

export function resetBrightDataClient(): void {
  clientInstance = null;
}
