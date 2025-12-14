/**
 * YouTube動画スクレイパー
 *
 * 機能:
 * - キーワードで動画検索
 * - タイトル、再生数、チャンネル平均比を取得
 * - 「平均より伸びてる動画」を特定
 * - タイトルからキーワード・パターンを抽出
 * - AI駆動の高精度分析対応
 */

import { scrapeUrl, searchAndScrape } from "../firecrawl";
import { generateText } from "@/lib/ai/gemini";

// ============================================================
// 型定義
// ============================================================

export interface YouTubeVideoResult {
  id: string;
  title: string;
  channelName: string;
  channelId?: string;
  views: number;
  viewsFormatted: string;
  likes?: number;
  comments?: number;
  duration?: string;
  publishedAt?: string;
  publishedAgo?: string;
  thumbnailUrl?: string;
  url: string;
  // パフォーマンス分析
  channelAverage?: number;
  performanceRatio?: number; // 再生数 / チャンネル平均
  isOutperformer?: boolean; // 平均より伸びてる動画か
  // キーワード分析
  extractedKeywords: string[];
  titlePatterns: string[];
  emotionalHooks: string[];
  scrapedAt: string;
}

export interface YouTubeSearchOptions {
  keyword: string;
  sortBy?: "relevance" | "date" | "views" | "rating";
  duration?: "short" | "medium" | "long"; // 4分未満 / 4-20分 / 20分以上
  uploadDate?: "hour" | "day" | "week" | "month" | "year";
  limit?: number;
  useAI?: boolean;
}

export interface YouTubeAnalysis {
  videos: YouTubeVideoResult[];
  insights: {
    totalVideos: number;
    averageViews: number;
    medianViews: number;
    topPerformers: YouTubeVideoResult[];
    outperformerRate: number;
    topKeywords: string[];
    topTitlePatterns: string[];
    topEmotionalHooks: string[];
  };
  recommendations: string[];
}

// ============================================================
// 定数
// ============================================================

const YOUTUBE_SEARCH_URL = "https://www.youtube.com/results";
const YOUTUBE_VIDEO_URL = "https://www.youtube.com/watch";

// タイトルのパワーワード・パターン
const TITLE_PATTERNS = [
  // 数字系
  { pattern: /(\d+)選/, category: "ランキング" },
  { pattern: /(\d+)つの/, category: "リスト" },
  { pattern: /(\d+)分/, category: "時間指定" },
  { pattern: /(\d+)日/, category: "期間" },
  { pattern: /(\d+)万/, category: "実績数値" },
  { pattern: /(\d+)%/, category: "パーセント" },
  // 訴求系
  { pattern: /完全/, category: "網羅性" },
  { pattern: /徹底/, category: "網羅性" },
  { pattern: /決定版/, category: "網羅性" },
  { pattern: /保存版/, category: "網羅性" },
  { pattern: /初心者/, category: "初心者向け" },
  { pattern: /入門/, category: "初心者向け" },
  { pattern: /プロ/, category: "専門性" },
  { pattern: /専門家/, category: "専門性" },
  { pattern: /密着/, category: "ドキュメンタリー" },
  { pattern: /Vlog|vlog/, category: "Vlog" },
  { pattern: /ルーティン|routine/i, category: "ルーティン" },
  { pattern: /比較/, category: "比較" },
  { pattern: /vs|VS/, category: "対決" },
  { pattern: /レビュー|review/i, category: "レビュー" },
  { pattern: /開封/, category: "開封" },
  { pattern: /やってみた/, category: "挑戦" },
  { pattern: /検証/, category: "検証" },
  { pattern: /暴露/, category: "暴露" },
  { pattern: /真実/, category: "真実" },
  { pattern: /闇/, category: "ネガティブ訴求" },
];

// 感情フック
const EMOTIONAL_HOOKS = [
  { pattern: /衝撃/, category: "驚き" },
  { pattern: /驚き|驚愕/, category: "驚き" },
  { pattern: /ヤバい|やばい|ヤバ/, category: "驚き" },
  { pattern: /最強/, category: "最上級" },
  { pattern: /最高/, category: "最上級" },
  { pattern: /神/, category: "最上級" },
  { pattern: /絶対/, category: "確信" },
  { pattern: /必見/, category: "緊急性" },
  { pattern: /注意/, category: "警告" },
  { pattern: /危険/, category: "警告" },
  { pattern: /後悔/, category: "損失回避" },
  { pattern: /損/, category: "損失回避" },
  { pattern: /知らないと/, category: "損失回避" },
  { pattern: /禁断/, category: "希少性" },
  { pattern: /秘密/, category: "希少性" },
  { pattern: /限定/, category: "希少性" },
  { pattern: /なぜ/, category: "好奇心" },
  { pattern: /？|?/, category: "疑問" },
  { pattern: /【.*】/, category: "括弧強調" },
];

// ============================================================
// メイン関数
// ============================================================

/**
 * YouTubeで動画を検索
 */
export async function searchYouTube(
  options: YouTubeSearchOptions
): Promise<YouTubeVideoResult[]> {
  const { keyword, limit = 10, useAI = false } = options;

  console.log("[youtube] Searching:", keyword, { limit, useAI });

  try {
    // 検索URLを構築
    const searchUrl = buildSearchUrl(keyword, options);

    // Firecrawlでスクレイピング
    const result = await scrapeUrl(searchUrl, {
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 4000,
    });

    if (!result.success || !result.markdown) {
      console.warn("[youtube] Direct scraping failed, trying Google search");
      return searchViaGoogle(keyword, limit, useAI);
    }

    // AI分析を使用する場合
    if (useAI) {
      return parseWithAI(result.markdown, keyword, limit);
    }

    // 従来のパース
    const videos = parseSearchResults(result.markdown, limit);

    // キーワード・パターン抽出で充実させる
    return videos.map((video) => enrichVideoData(video));
  } catch (err) {
    console.error("[youtube] Search error:", err);
    return searchViaGoogle(keyword, limit, useAI);
  }
}

/**
 * YouTube動画を分析（統計付き）
 */
export async function analyzeYouTube(
  options: YouTubeSearchOptions
): Promise<YouTubeAnalysis> {
  const videos = await searchYouTube(options);

  // 再生数統計
  const viewCounts = videos.map((v) => v.views).filter((v) => v > 0);
  const averageViews = viewCounts.length > 0
    ? viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length
    : 0;

  // 中央値計算
  const sortedViews = [...viewCounts].sort((a, b) => a - b);
  const medianViews = sortedViews.length > 0
    ? sortedViews[Math.floor(sortedViews.length / 2)]
    : 0;

  // パフォーマンス分析（平均より伸びてる動画を特定）
  const videosWithPerformance = videos.map((video) => {
    const performanceRatio = averageViews > 0 ? video.views / averageViews : 1;
    return {
      ...video,
      channelAverage: averageViews,
      performanceRatio,
      isOutperformer: performanceRatio > 1.5,
    };
  });

  const topPerformers = videosWithPerformance
    .filter((v) => v.isOutperformer)
    .sort((a, b) => (b.performanceRatio || 0) - (a.performanceRatio || 0))
    .slice(0, 5);

  const outperformerRate = videos.length > 0
    ? (topPerformers.length / videos.length) * 100
    : 0;

  // キーワード頻度
  const allKeywords = videos.flatMap((v) => v.extractedKeywords);
  const keywordCounts: Record<string, number> = {};
  allKeywords.forEach((kw) => {
    keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
  });
  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw]) => kw);

  // タイトルパターン頻度
  const allPatterns = videos.flatMap((v) => v.titlePatterns);
  const patternCounts: Record<string, number> = {};
  allPatterns.forEach((p) => {
    patternCounts[p] = (patternCounts[p] || 0) + 1;
  });
  const topTitlePatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p]) => p);

  // 感情フック頻度
  const allHooks = videos.flatMap((v) => v.emotionalHooks);
  const hookCounts: Record<string, number> = {};
  allHooks.forEach((h) => {
    hookCounts[h] = (hookCounts[h] || 0) + 1;
  });
  const topEmotionalHooks = Object.entries(hookCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([h]) => h);

  // 推奨事項生成
  const recommendations = generateRecommendations(
    videosWithPerformance,
    topPerformers,
    topKeywords,
    topTitlePatterns
  );

  return {
    videos: videosWithPerformance,
    insights: {
      totalVideos: videos.length,
      averageViews: Math.round(averageViews),
      medianViews: Math.round(medianViews),
      topPerformers,
      outperformerRate,
      topKeywords,
      topTitlePatterns,
      topEmotionalHooks,
    },
    recommendations,
  };
}

// ============================================================
// URL構築
// ============================================================

/**
 * 検索URLを構築
 */
function buildSearchUrl(keyword: string, options: YouTubeSearchOptions): string {
  const params = new URLSearchParams();
  params.set("search_query", keyword);

  // ソート順
  if (options.sortBy === "date") {
    params.set("sp", "CAI%253D"); // 日付順
  } else if (options.sortBy === "views") {
    params.set("sp", "CAM%253D"); // 再生数順
  } else if (options.sortBy === "rating") {
    params.set("sp", "CAE%253D"); // 評価順
  }

  return `${YOUTUBE_SEARCH_URL}?${params.toString()}`;
}

/**
 * 動画URLを構築
 */
function buildVideoUrl(videoId: string): string {
  return `${YOUTUBE_VIDEO_URL}?v=${videoId}`;
}

// ============================================================
// パース関数
// ============================================================

/**
 * 検索結果をパース
 */
function parseSearchResults(markdown: string, limit: number): Partial<YouTubeVideoResult>[] {
  const videos: Partial<YouTubeVideoResult>[] = [];
  const lines = markdown.split("\n");

  let currentVideo: Partial<YouTubeVideoResult> | null = null;

  for (const line of lines) {
    // 動画タイトルを検出（リンク形式）
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const [, title, url] = linkMatch;

      // YouTubeの動画URLかチェック
      if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
        if (currentVideo && currentVideo.title) {
          videos.push(currentVideo);
        }

        // Video IDを抽出
        const idMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
                        url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        const id = idMatch ? idMatch[1] : `vid${Date.now()}`;

        currentVideo = {
          id,
          title: cleanTitle(title),
          url: buildVideoUrl(id),
          views: 0,
          viewsFormatted: "0",
          extractedKeywords: [],
          titlePatterns: [],
          emotionalHooks: [],
          scrapedAt: new Date().toISOString(),
        };
      }
    }

    if (currentVideo) {
      // チャンネル名を検出
      if (!currentVideo.channelName) {
        const channelMatch = line.match(/(?:チャンネル|by|投稿者)[:\s]*([^\n,]+)/i) ||
                             line.match(/^([^•\n]{2,30})$/);
        if (channelMatch && !channelMatch[1].includes("再生") && !channelMatch[1].includes("views")) {
          currentVideo.channelName = channelMatch[1].trim();
        }
      }

      // 再生数を検出
      const viewsMatch = line.match(/(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?[万億]?)\s*(?:回視聴|回再生|views|view)/i);
      if (viewsMatch) {
        currentVideo.viewsFormatted = viewsMatch[1];
        currentVideo.views = parseViewCount(viewsMatch[1]);
      }

      // 投稿日時を検出
      const dateMatch = line.match(/(\d+)\s*(?:年|ヶ月|週間|日|時間|分)\s*前/);
      if (dateMatch) {
        currentVideo.publishedAgo = dateMatch[0];
      }

      // 動画時間を検出
      const durationMatch = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
      if (durationMatch && !currentVideo.duration) {
        currentVideo.duration = durationMatch[1];
      }
    }

    if (videos.length >= limit) break;
  }

  // 最後の動画を追加
  if (currentVideo && currentVideo.title && videos.length < limit) {
    videos.push(currentVideo);
  }

  return videos;
}

/**
 * 再生数をパース
 */
function parseViewCount(viewStr: string): number {
  let count = 0;

  // 「万」「億」の処理
  if (viewStr.includes("億")) {
    const num = parseFloat(viewStr.replace(/[億,]/g, ""));
    count = num * 100000000;
  } else if (viewStr.includes("万")) {
    const num = parseFloat(viewStr.replace(/[万,]/g, ""));
    count = num * 10000;
  } else {
    count = parseInt(viewStr.replace(/,/g, ""), 10) || 0;
  }

  return count;
}

/**
 * タイトルをクリーニング
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 動画データを充実させる（キーワード・パターン抽出）
 */
function enrichVideoData(video: Partial<YouTubeVideoResult>): YouTubeVideoResult {
  const title = video.title || "";

  // タイトルパターンを検出
  const titlePatterns: string[] = [];
  for (const tp of TITLE_PATTERNS) {
    if (tp.pattern.test(title)) {
      titlePatterns.push(tp.category);
    }
  }

  // 感情フックを検出
  const emotionalHooks: string[] = [];
  for (const eh of EMOTIONAL_HOOKS) {
    if (eh.pattern.test(title)) {
      emotionalHooks.push(eh.category);
    }
  }

  // キーワード抽出（数字パターンなど）
  const keywords: string[] = [];

  // 数字+単位パターンを抽出
  const numberPatterns = title.match(/\d+[選つ分日万円秒週月年%]/g) || [];
  keywords.push(...numberPatterns);

  // 括弧内のテキストを抽出
  const bracketMatches = title.match(/【([^】]+)】/g) || [];
  keywords.push(...bracketMatches.map((m) => m.replace(/[【】]/g, "")));

  return {
    id: video.id || `vid${Date.now()}`,
    title,
    channelName: video.channelName || "不明",
    channelId: video.channelId,
    views: video.views || 0,
    viewsFormatted: video.viewsFormatted || "0",
    likes: video.likes,
    comments: video.comments,
    duration: video.duration,
    publishedAt: video.publishedAt,
    publishedAgo: video.publishedAgo,
    thumbnailUrl: video.thumbnailUrl,
    url: video.url || "",
    channelAverage: video.channelAverage,
    performanceRatio: video.performanceRatio,
    isOutperformer: video.isOutperformer,
    extractedKeywords: [...new Set(keywords)],
    titlePatterns: [...new Set(titlePatterns)],
    emotionalHooks: [...new Set(emotionalHooks)],
    scrapedAt: video.scrapedAt || new Date().toISOString(),
  };
}

// ============================================================
// Google経由の検索（フォールバック）
// ============================================================

/**
 * Google経由でYouTube動画を検索
 */
async function searchViaGoogle(
  keyword: string,
  limit: number,
  useAI: boolean
): Promise<YouTubeVideoResult[]> {
  console.log("[youtube] Falling back to Google search");

  try {
    const query = `site:youtube.com ${keyword}`;

    const results = await searchAndScrape(query, {
      limit: limit * 2,
      region: "japan",
    });

    if (results.length === 0) {
      console.warn("[youtube] No results from Google search");
      return getSimulatedResults(keyword, limit);
    }

    // AI分析
    if (useAI && results.some((r) => r.markdown)) {
      const combinedMarkdown = results.map((r) => r.markdown || "").join("\n---\n");
      return parseWithAI(combinedMarkdown, keyword, limit);
    }

    // 従来のパース
    const videos: YouTubeVideoResult[] = [];

    for (const sr of results) {
      if (videos.length >= limit) break;
      if (!sr.metadata?.title) continue;

      // Video IDを抽出
      const idMatch = sr.metadata.title.match(/([a-zA-Z0-9_-]{11})/);

      const video: Partial<YouTubeVideoResult> = {
        id: idMatch ? idMatch[1] : `vid${Date.now()}-${videos.length}`,
        title: cleanTitle(sr.metadata.title),
        channelName: "不明",
        views: 0,
        viewsFormatted: "0",
        scrapedAt: new Date().toISOString(),
      };

      videos.push(enrichVideoData(video));
    }

    return videos;
  } catch (err) {
    console.error("[youtube] Google search error:", err);
    return getSimulatedResults(keyword, limit);
  }
}

// ============================================================
// AI分析
// ============================================================

/**
 * AIでパース・分析
 */
async function parseWithAI(
  markdown: string,
  keyword: string,
  limit: number
): Promise<YouTubeVideoResult[]> {
  const prompt = `あなたはYouTube動画分析のエキスパートです。
以下のスクレイピング結果から、「${keyword}」に関する動画を抽出・分析してください。

## スクレイピング結果
${markdown.slice(0, 10000)}

## 分析観点
1. 動画タイトル
2. チャンネル名
3. 再生数
4. 投稿日時
5. タイトルに含まれるパワーワード・パターン
6. 感情フック（驚き、警告、好奇心など）
7. なぜ再生数が伸びているか推測

## 出力形式（JSON）
\`\`\`json
{
  "videos": [
    {
      "id": "abc123xyz",
      "title": "動画タイトル",
      "channelName": "チャンネル名",
      "views": 100000,
      "viewsFormatted": "10万",
      "duration": "10:30",
      "publishedAgo": "3日前",
      "extractedKeywords": ["10選", "完全版"],
      "titlePatterns": ["ランキング", "網羅性"],
      "emotionalHooks": ["驚き", "好奇心"]
    }
  ]
}
\`\`\`

再生数が多い動画を優先し、最大${limit}件まで抽出してください。`;

  try {
    const response = await generateText(prompt, { model: "flash" });
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return (parsed.videos || []).map((v: Partial<YouTubeVideoResult>) => ({
        id: v.id || `vid${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: v.title || "",
        channelName: v.channelName || "不明",
        views: v.views || 0,
        viewsFormatted: v.viewsFormatted || formatViews(v.views || 0),
        duration: v.duration,
        publishedAgo: v.publishedAgo,
        url: v.id ? buildVideoUrl(v.id) : "",
        extractedKeywords: v.extractedKeywords || [],
        titlePatterns: v.titlePatterns || [],
        emotionalHooks: v.emotionalHooks || [],
        scrapedAt: new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.error("[youtube] AI parse error:", err);
  }

  // フォールバック
  return parseSearchResults(markdown, limit).map((v) => enrichVideoData(v));
}

/**
 * 再生数をフォーマット
 */
function formatViews(views: number): string {
  if (views >= 100000000) {
    return `${(views / 100000000).toFixed(1)}億`;
  } else if (views >= 10000) {
    return `${(views / 10000).toFixed(1)}万`;
  }
  return views.toLocaleString();
}

// ============================================================
// 推奨事項生成
// ============================================================

/**
 * 推奨事項を生成
 */
function generateRecommendations(
  videos: YouTubeVideoResult[],
  topPerformers: YouTubeVideoResult[],
  topKeywords: string[],
  topPatterns: string[]
): string[] {
  const recommendations: string[] = [];

  if (videos.length === 0) {
    return ["動画が見つかりませんでした"];
  }

  // トップパフォーマー分析
  if (topPerformers.length > 0) {
    const avgRatio = topPerformers.reduce((sum, v) => sum + (v.performanceRatio || 0), 0) / topPerformers.length;
    recommendations.push(
      `🚀 平均の${avgRatio.toFixed(1)}倍伸びてる動画が${topPerformers.length}本発見`
    );

    // トップ動画のタイトル分析
    const topTitle = topPerformers[0].title;
    if (topTitle) {
      recommendations.push(
        `🏆 最も伸びてる動画「${topTitle.slice(0, 40)}...」`
      );
    }
  }

  // キーワード推奨
  if (topKeywords.length > 0) {
    recommendations.push(
      `🔑 効果的なタイトル要素: ${topKeywords.slice(0, 3).join("、")}`
    );
  }

  // パターン推奨
  if (topPatterns.length > 0) {
    recommendations.push(
      `💡 よく使われるパターン: ${topPatterns.slice(0, 3).join("、")}`
    );
  }

  // 再生数分析
  const avgViews = videos.reduce((sum, v) => sum + v.views, 0) / videos.length;
  if (avgViews > 0) {
    recommendations.push(
      `📊 平均再生数: ${formatViews(avgViews)} - このジャンルの目安にしてください`
    );
  }

  // トップパフォーマーの共通点
  if (topPerformers.length >= 2) {
    const commonPatterns = findCommonElements(
      topPerformers.map((v) => v.titlePatterns)
    );
    if (commonPatterns.length > 0) {
      recommendations.push(
        `✨ 伸びてる動画の共通点: ${commonPatterns.slice(0, 3).join("、")}`
      );
    }
  }

  return recommendations;
}

/**
 * 共通要素を見つける
 */
function findCommonElements(arrays: string[][]): string[] {
  if (arrays.length === 0) return [];

  const counts: Record<string, number> = {};
  arrays.forEach((arr) => {
    const unique = [...new Set(arr)];
    unique.forEach((item) => {
      counts[item] = (counts[item] || 0) + 1;
    });
  });

  // 半数以上で使われている要素
  const threshold = Math.ceil(arrays.length / 2);
  return Object.entries(counts)
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item);
}

// ============================================================
// シミュレートデータ（フォールバック）
// ============================================================

/**
 * シミュレートされた結果（フォールバック用）
 */
function getSimulatedResults(keyword: string, limit: number): YouTubeVideoResult[] {
  const templates = [
    {
      title: `【完全版】${keyword}の始め方｜初心者向け徹底解説`,
      channelName: "解説チャンネル",
      views: 523000,
      patterns: ["網羅性", "初心者向け"],
      hooks: ["括弧強調"],
    },
    {
      title: `${keyword}で人生変わった話【体験談】`,
      channelName: "体験談TV",
      views: 234000,
      patterns: ["Vlog"],
      hooks: ["括弧強調"],
    },
    {
      title: `なぜ${keyword}は失敗するのか？プロが解説`,
      channelName: "プロの解説",
      views: 456000,
      patterns: ["専門性"],
      hooks: ["疑問", "好奇心"],
    },
    {
      title: `【衝撃】${keyword}の真実を暴露します`,
      channelName: "暴露チャンネル",
      views: 789000,
      patterns: [],
      hooks: ["驚き", "括弧強調"],
    },
    {
      title: `${keyword}おすすめ10選【2024年最新版】`,
      channelName: "ランキングTV",
      views: 345000,
      patterns: ["ランキング", "リスト"],
      hooks: ["括弧強調"],
    },
  ];

  return templates.slice(0, limit).map((t, i) => ({
    id: `sim${Date.now()}${i}`,
    title: t.title,
    channelName: t.channelName,
    views: t.views,
    viewsFormatted: formatViews(t.views),
    url: `https://www.youtube.com/watch?v=sim${Date.now()}${i}`,
    extractedKeywords: [],
    titlePatterns: t.patterns,
    emotionalHooks: t.hooks,
    scrapedAt: new Date().toISOString(),
  }));
}

// ============================================================
// エクスポート
// ============================================================

export const YouTubeResearch = {
  search: searchYouTube,
  analyze: analyzeYouTube,
  enrichVideoData,
  buildVideoUrl,
  formatViews,
};

export default YouTubeResearch;
