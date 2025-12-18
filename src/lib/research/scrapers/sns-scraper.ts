/**
 * SNSリサーチスクレイパー
 *
 * Bright Data API を活用してSNS（X、Instagram、TikTok）からトレンドを収集・分析
 */

import { GoogleGenAI } from "@google/genai";
import {
  BrightDataClient,
  type Tweet,
  type InstagramPost,
  type TikTokVideo,
} from "../../scrapers/brightdata-client";
import type {
  ResearchContext,
  SNSTrendResult,
  HashtagTrend,
  TopicTrend,
  InfluencerInfo,
} from "../types";

// ============================================================
// 型定義
// ============================================================

export interface SnsResearchParams {
  /** 検索キーワード */
  keyword: string;
  /** 業界/カテゴリ */
  category?: string;
  /** 対象プラットフォーム */
  platforms?: ("x" | "instagram" | "tiktok")[];
  /** 各プラットフォームの取得件数上限 */
  limit?: number;
  /** AI分析を実行するか */
  analyzeWithAI?: boolean;
}

export interface SnsResearchResult {
  /** X (Twitter) データ */
  xData?: {
    tweets: Tweet[];
    topHashtags: HashtagTrend[];
    sentiment: SentimentSummary;
    topInfluencers: InfluencerInfo[];
  };
  /** Instagram データ */
  instagramData?: {
    posts: InstagramPost[];
    topHashtags: HashtagTrend[];
    topInfluencers: InfluencerInfo[];
    engagementStats: EngagementStats;
  };
  /** TikTok データ */
  tiktokData?: {
    videos: TikTokVideo[];
    topHashtags: HashtagTrend[];
    topSounds?: string[];
    viralPatterns: string[];
  };
  /** 統合分析結果 */
  analysis?: SnsAnalysis;
  /** 収集日時 */
  collectedAt: string;
  /** 使用したプラットフォーム */
  platforms: string[];
}

interface SentimentSummary {
  positive: number;
  neutral: number;
  negative: number;
  dominant: "positive" | "neutral" | "negative";
}

interface EngagementStats {
  avgLikes: number;
  avgComments: number;
  totalEngagement: number;
  topPerformer?: InstagramPost;
}

interface SnsAnalysis {
  /** トレンドキーワード */
  trendingKeywords: string[];
  /** 効果的な表現パターン */
  effectivePatterns: string[];
  /** ターゲット層の反応傾向 */
  audienceInsights: string[];
  /** LP制作への提案 */
  lpSuggestions: string[];
  /** 注目すべきコンテンツ */
  highlightContent: HighlightContent[];
}

interface HighlightContent {
  platform: string;
  content: string;
  engagement: number;
  reason: string;
}

// ============================================================
// メイン関数
// ============================================================

/**
 * SNSリサーチを実行
 */
export async function researchSocialMedia(
  context: ResearchContext
): Promise<SnsResearchResult> {
  const params: SnsResearchParams = {
    keyword: context.projectName,
    category: context.genre,
    platforms: ["x", "instagram", "tiktok"],
    limit: 50,
    analyzeWithAI: true,
  };

  return await executeSnsResearch(params);
}

/**
 * SNSリサーチを実行（パラメータ直接指定）
 */
export async function executeSnsResearch(
  params: SnsResearchParams
): Promise<SnsResearchResult> {
  const platforms = params.platforms || ["x", "instagram", "tiktok"];
  const limit = params.limit || 50;
  const brightdata = new BrightDataClient();

  const result: SnsResearchResult = {
    collectedAt: new Date().toISOString(),
    platforms,
  };

  // 並列でデータ収集
  const promises: Promise<void>[] = [];

  // X (Twitter)
  if (platforms.includes("x")) {
    promises.push(
      (async () => {
        try {
          const tweets = await brightdata.scrapeX({
            keyword: params.keyword,
            limit,
          });

          result.xData = {
            tweets,
            topHashtags: extractHashtagsFromTweets(tweets),
            sentiment: analyzeTweetSentiment(tweets),
            topInfluencers: extractInfluencersFromTweets(tweets),
          };
        } catch (error) {
          console.error("[sns-scraper] X scraping error:", error);
        }
      })()
    );
  }

  // Instagram
  if (platforms.includes("instagram")) {
    promises.push(
      (async () => {
        try {
          const posts = await brightdata.scrapeInstagram({
            hashtag: params.keyword.replace(/\s+/g, ""),
            limit,
          });

          result.instagramData = {
            posts,
            topHashtags: extractHashtagsFromPosts(posts),
            topInfluencers: extractInfluencersFromPosts(posts),
            engagementStats: calculateEngagementStats(posts),
          };
        } catch (error) {
          console.error("[sns-scraper] Instagram scraping error:", error);
        }
      })()
    );
  }

  // TikTok
  if (platforms.includes("tiktok")) {
    promises.push(
      (async () => {
        try {
          const videos = await brightdata.scrapeTikTok({
            hashtag: params.keyword.replace(/\s+/g, ""),
            limit,
          });

          result.tiktokData = {
            videos,
            topHashtags: extractHashtagsFromTikTok(videos),
            topSounds: extractTopSounds(videos),
            viralPatterns: analyzeViralPatterns(videos),
          };
        } catch (error) {
          console.error("[sns-scraper] TikTok scraping error:", error);
        }
      })()
    );
  }

  await Promise.all(promises);

  // AI分析
  if (params.analyzeWithAI) {
    try {
      result.analysis = await analyzeSnsTrends(result, params.keyword);
    } catch (error) {
      console.error("[sns-scraper] AI analysis error:", error);
    }
  }

  return result;
}

// ============================================================
// データ抽出ヘルパー
// ============================================================

function extractHashtagsFromTweets(tweets: Tweet[]): HashtagTrend[] {
  const hashtagCounts = new Map<string, number>();

  for (const tweet of tweets) {
    const hashtags = tweet.text.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g) || [];
    for (const tag of hashtags) {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(hashtagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({
      tag,
      count,
      growth: 0, // 履歴データがないため0
    }));
}

function extractHashtagsFromPosts(posts: InstagramPost[]): HashtagTrend[] {
  const hashtagCounts = new Map<string, number>();

  for (const post of posts) {
    const caption = post.caption || "";
    const hashtags = caption.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g) || [];
    for (const tag of hashtags) {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(hashtagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({
      tag,
      count,
      growth: 0,
    }));
}

function extractHashtagsFromTikTok(videos: TikTokVideo[]): HashtagTrend[] {
  const hashtagCounts = new Map<string, number>();

  for (const video of videos) {
    for (const tag of video.hashtags || []) {
      const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
      hashtagCounts.set(normalizedTag, (hashtagCounts.get(normalizedTag) || 0) + 1);
    }
  }

  return Array.from(hashtagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({
      tag,
      count,
      growth: 0,
    }));
}

function analyzeTweetSentiment(tweets: Tweet[]): SentimentSummary {
  // 簡易的なセンチメント分析
  const positiveWords = ["最高", "素晴らしい", "嬉しい", "良い", "おすすめ", "神", "amazing", "great", "love", "good"];
  const negativeWords = ["最悪", "ダメ", "悪い", "ひどい", "残念", "bad", "terrible", "hate", "worst"];

  let positive = 0;
  let negative = 0;
  let neutral = 0;

  for (const tweet of tweets) {
    const text = tweet.text.toLowerCase();
    const hasPositive = positiveWords.some((w) => text.includes(w));
    const hasNegative = negativeWords.some((w) => text.includes(w));

    if (hasPositive && !hasNegative) {
      positive++;
    } else if (hasNegative && !hasPositive) {
      negative++;
    } else {
      neutral++;
    }
  }

  const total = tweets.length || 1;
  return {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100),
    dominant:
      positive >= negative && positive >= neutral
        ? "positive"
        : negative >= positive && negative >= neutral
          ? "negative"
          : "neutral",
  };
}

function extractInfluencersFromTweets(tweets: Tweet[]): InfluencerInfo[] {
  const userMap = new Map<string, { engagement: number }>();

  for (const tweet of tweets) {
    const existing = userMap.get(tweet.authorUsername);
    const engagement = tweet.likeCount + tweet.retweetCount + tweet.replyCount;

    userMap.set(tweet.authorUsername, {
      engagement: existing ? existing.engagement + engagement : engagement,
    });
  }

  return Array.from(userMap.entries())
    .sort((a, b) => b[1].engagement - a[1].engagement)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      platform: "X",
      followers: 0, // Tweetからはフォロワー数を取得できない
      engagement: data.engagement,
    }));
}

function extractInfluencersFromPosts(posts: InstagramPost[]): InfluencerInfo[] {
  const userMap = new Map<string, { engagement: number }>();

  for (const post of posts) {
    const existing = userMap.get(post.ownerUsername);
    const engagement = post.likeCount + post.commentCount;

    userMap.set(post.ownerUsername, {
      engagement: existing ? existing.engagement + engagement : engagement,
    });
  }

  return Array.from(userMap.entries())
    .sort((a, b) => b[1].engagement - a[1].engagement)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      platform: "Instagram",
      followers: 0, // InstagramPostからはフォロワー数を取得できない
      engagement: data.engagement,
    }));
}

function calculateEngagementStats(posts: InstagramPost[]): EngagementStats {
  if (posts.length === 0) {
    return {
      avgLikes: 0,
      avgComments: 0,
      totalEngagement: 0,
    };
  }

  const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0);
  const topPerformer = posts.reduce((top, p) =>
    p.likeCount + p.commentCount > (top?.likeCount ?? 0) + (top?.commentCount ?? 0) ? p : top
  );

  return {
    avgLikes: Math.round(totalLikes / posts.length),
    avgComments: Math.round(totalComments / posts.length),
    totalEngagement: totalLikes + totalComments,
    topPerformer,
  };
}

function extractTopSounds(videos: TikTokVideo[]): string[] {
  const soundCounts = new Map<string, number>();

  for (const video of videos) {
    const soundTitle = video.music?.title;
    if (soundTitle) {
      soundCounts.set(soundTitle, (soundCounts.get(soundTitle) || 0) + 1);
    }
  }

  return Array.from(soundCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sound]) => sound);
}

function analyzeViralPatterns(videos: TikTokVideo[]): string[] {
  const patterns: string[] = [];

  // 高エンゲージメント動画の特徴を抽出
  const highEngagement = videos
    .filter((v) => v.playCount > 10000 || v.likeCount > 1000)
    .sort((a, b) => b.playCount - a.playCount);

  if (highEngagement.length > 0) {
    // キャプションの長さ分析
    const avgCaptionLength =
      highEngagement.reduce((sum, v) => sum + (v.desc?.length || 0), 0) /
      highEngagement.length;

    if (avgCaptionLength < 50) {
      patterns.push("短いキャプション（50文字以下）が効果的");
    } else if (avgCaptionLength > 150) {
      patterns.push("詳細なキャプション（150文字以上）が効果的");
    }

    // ハッシュタグ数分析
    const avgHashtags =
      highEngagement.reduce((sum, v) => sum + (v.hashtags?.length || 0), 0) /
      highEngagement.length;

    patterns.push(`平均${Math.round(avgHashtags)}個のハッシュタグを使用`);

    // エンゲージメント率分析
    const avgEngagementRate =
      highEngagement.reduce((sum, v) => {
        const engagement = v.likeCount + v.commentCount + v.shareCount;
        return sum + (v.playCount > 0 ? engagement / v.playCount : 0);
      }, 0) / highEngagement.length;

    if (avgEngagementRate > 0.1) {
      patterns.push("高エンゲージメント率（10%以上）の動画が人気");
    }
  }

  return patterns;
}

// ============================================================
// AI分析
// ============================================================

async function analyzeSnsTrends(
  data: SnsResearchResult,
  keyword: string
): Promise<SnsAnalysis> {
  const ai = new GoogleGenAI({});

  const prompt = `
あなたはLP制作のためのSNSマーケティング分析の専門家です。
以下のSNSデータを分析し、LP制作に活用できるインサイトを抽出してください。

## 検索キーワード
${keyword}

## 収集データ概要

### X (Twitter)
- 投稿数: ${data.xData?.tweets?.length || 0}件
- トップハッシュタグ: ${data.xData?.topHashtags?.slice(0, 5).map((h) => h.tag).join(", ") || "なし"}
- センチメント: ${data.xData?.sentiment?.dominant || "不明"} (ポジティブ${data.xData?.sentiment?.positive || 0}%, ネガティブ${data.xData?.sentiment?.negative || 0}%)
- サンプル投稿:
${data.xData?.tweets?.slice(0, 5).map((t) => `  - ${t.text.slice(0, 100)}`).join("\n") || "なし"}

### Instagram
- 投稿数: ${data.instagramData?.posts?.length || 0}件
- トップハッシュタグ: ${data.instagramData?.topHashtags?.slice(0, 5).map((h) => h.tag).join(", ") || "なし"}
- 平均いいね: ${data.instagramData?.engagementStats?.avgLikes || 0}
- サンプルキャプション:
${data.instagramData?.posts?.slice(0, 3).map((p) => `  - ${(p.caption || "").slice(0, 100)}`).join("\n") || "なし"}

### TikTok
- 動画数: ${data.tiktokData?.videos?.length || 0}件
- トップハッシュタグ: ${data.tiktokData?.topHashtags?.slice(0, 5).map((h) => h.tag).join(", ") || "なし"}
- バイラルパターン: ${data.tiktokData?.viralPatterns?.join(", ") || "なし"}
- サンプルキャプション:
${data.tiktokData?.videos?.slice(0, 3).map((v) => `  - ${(v.desc || "").slice(0, 100)}`).join("\n") || "なし"}

## 出力形式（JSON）
{
  "trendingKeywords": ["キーワード1", "キーワード2", ...],
  "effectivePatterns": ["パターン1", "パターン2", ...],
  "audienceInsights": ["インサイト1", "インサイト2", ...],
  "lpSuggestions": ["提案1", "提案2", ...],
  "highlightContent": [
    {
      "platform": "プラットフォーム名",
      "content": "注目コンテンツの概要",
      "engagement": 数値,
      "reason": "注目理由"
    }
  ]
}

必ず有効なJSON形式で出力してください。
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        trendingKeywords: parsed.trendingKeywords || [],
        effectivePatterns: parsed.effectivePatterns || [],
        audienceInsights: parsed.audienceInsights || [],
        lpSuggestions: parsed.lpSuggestions || [],
        highlightContent: parsed.highlightContent || [],
      };
    }
  } catch (error) {
    console.error("[sns-scraper] AI analysis failed:", error);
  }

  // フォールバック
  return {
    trendingKeywords: extractTrendingKeywords(data),
    effectivePatterns: data.tiktokData?.viralPatterns || [],
    audienceInsights: [],
    lpSuggestions: [],
    highlightContent: [],
  };
}

function extractTrendingKeywords(data: SnsResearchResult): string[] {
  const keywords = new Set<string>();

  // ハッシュタグからキーワード抽出
  const allHashtags = [
    ...(data.xData?.topHashtags || []),
    ...(data.instagramData?.topHashtags || []),
    ...(data.tiktokData?.topHashtags || []),
  ];

  for (const hashtag of allHashtags.slice(0, 30)) {
    keywords.add(hashtag.tag.replace("#", ""));
  }

  return Array.from(keywords).slice(0, 20);
}

// ============================================================
// SNSTrendResult変換（既存の型との互換性）
// ============================================================

/**
 * SnsResearchResult を SNSTrendResult に変換
 */
export function toSNSTrendResult(result: SnsResearchResult): SNSTrendResult {
  const hashtags: HashtagTrend[] = [
    ...(result.xData?.topHashtags || []),
    ...(result.instagramData?.topHashtags || []),
    ...(result.tiktokData?.topHashtags || []),
  ]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const topics: TopicTrend[] = (result.analysis?.trendingKeywords || [])
    .slice(0, 10)
    .map((keyword) => ({
      topic: keyword,
      sentiment: result.xData?.sentiment?.dominant || "neutral",
      mentions: 0, // 詳細な言及数は取得していない
    }));

  const influencers: InfluencerInfo[] = [
    ...(result.xData?.topInfluencers || []),
    ...(result.instagramData?.topInfluencers || []),
  ]
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 10);

  return {
    hashtags,
    topics,
    influencers,
  };
}

// ============================================================
// エクスポート
// ============================================================

export type { SnsAnalysis, HighlightContent, SentimentSummary, EngagementStats };
