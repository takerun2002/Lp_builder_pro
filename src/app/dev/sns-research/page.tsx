"use client";

/**
 * SNSリサーチ開発画面
 *
 * X、Instagram、TikTokからトレンドを収集・分析
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Twitter,
  Instagram,
  Video,
  TrendingUp,
  Users,
  Hash,
  Sparkles,
  Loader2,
} from "lucide-react";

// ============================================================
// 型定義
// ============================================================

interface SnsResearchResponse {
  success: boolean;
  data?: {
    full: {
      xData?: {
        tweets: Array<{
          authorUsername: string;
          text: string;
          likeCount: number;
          retweetCount: number;
          replyCount: number;
        }>;
        topHashtags: Array<{ tag: string; count: number }>;
        sentiment: {
          positive: number;
          neutral: number;
          negative: number;
          dominant: string;
        };
        topInfluencers: Array<{
          name: string;
          followers: number;
          engagement: number;
        }>;
      };
      instagramData?: {
        posts: Array<{
          ownerUsername: string;
          caption?: string;
          likeCount: number;
          commentCount: number;
          mediaUrl?: string;
        }>;
        topHashtags: Array<{ tag: string; count: number }>;
        topInfluencers: Array<{
          name: string;
          followers: number;
          engagement: number;
        }>;
        engagementStats: {
          avgLikes: number;
          avgComments: number;
          totalEngagement: number;
        };
      };
      tiktokData?: {
        videos: Array<{
          authorUsername: string;
          desc: string;
          playCount: number;
          likeCount: number;
          commentCount: number;
        }>;
        topHashtags: Array<{ tag: string; count: number }>;
        topSounds?: string[];
        viralPatterns: string[];
      };
      analysis?: {
        trendingKeywords: string[];
        effectivePatterns: string[];
        audienceInsights: string[];
        lpSuggestions: string[];
        highlightContent: Array<{
          platform: string;
          content: string;
          engagement: number;
          reason: string;
        }>;
      };
      collectedAt: string;
      platforms: string[];
    };
    summary: {
      hashtags: Array<{ tag: string; count: number }>;
      topics: Array<{ topic: string; sentiment: string; mentions: number }>;
      influencers: Array<{
        name: string;
        platform: string;
        followers: number;
      }>;
    };
  };
  error?: string;
}

// ============================================================
// コンポーネント
// ============================================================

export default function SnsResearchPage() {
  const [keyword, setKeyword] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([
    "x",
    "instagram",
    "tiktok",
  ]);
  const [limit, setLimit] = useState(50);
  const [analyzeWithAI, setAnalyzeWithAI] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SnsResearchResponse | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    setIsLoading(true);
    setProgress(10);
    setResult(null);

    try {
      // プログレス更新（擬似）
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 90));
      }, 500);

      const response = await fetch("/api/sns-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          platforms,
          limit,
          analyzeWithAI,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data: SnsResearchResponse = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Search error:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SNSリサーチ</h1>
        <p className="text-muted-foreground">
          X、Instagram、TikTokからトレンドを収集・分析
        </p>
      </div>

      {/* 検索フォーム */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            検索設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="keyword">検索キーワード</Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例: ダイエット、投資、美容"
              className="mt-1"
            />
          </div>

          <div>
            <Label>プラットフォーム</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="x"
                  checked={platforms.includes("x")}
                  onCheckedChange={() => togglePlatform("x")}
                />
                <Label htmlFor="x" className="flex items-center gap-1">
                  <Twitter className="h-4 w-4" />X
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="instagram"
                  checked={platforms.includes("instagram")}
                  onCheckedChange={() => togglePlatform("instagram")}
                />
                <Label htmlFor="instagram" className="flex items-center gap-1">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tiktok"
                  checked={platforms.includes("tiktok")}
                  onCheckedChange={() => togglePlatform("tiktok")}
                />
                <Label htmlFor="tiktok" className="flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  TikTok
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="limit">取得件数（各プラットフォーム）</Label>
              <Input
                id="limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                min={10}
                max={100}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ai"
                checked={analyzeWithAI}
                onCheckedChange={(checked) =>
                  setAnalyzeWithAI(checked as boolean)
                }
              />
              <Label htmlFor="ai" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                AI分析
              </Label>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isLoading || !keyword.trim() || platforms.length === 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                リサーチ中...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                リサーチ開始
              </>
            )}
          </Button>

          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                SNSデータを収集中...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 結果表示 */}
      {result && (
        <>
          {result.success && result.data ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="x">X ({result.data.full.xData?.tweets?.length || 0})</TabsTrigger>
                <TabsTrigger value="instagram">
                  Instagram ({result.data.full.instagramData?.posts?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="tiktok">
                  TikTok ({result.data.full.tiktokData?.videos?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="analysis">AI分析</TabsTrigger>
              </TabsList>

              {/* 概要タブ */}
              <TabsContent value="overview">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* トップハッシュタグ */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Hash className="h-5 w-5" />
                        トップハッシュタグ
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.data.summary.hashtags
                          .slice(0, 15)
                          .map((tag, i) => (
                            <Badge
                              key={i}
                              variant={i < 3 ? "default" : "secondary"}
                            >
                              {tag.tag} ({tag.count})
                            </Badge>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* トピック */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5" />
                        トレンドトピック
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.data.summary.topics.slice(0, 10).map((topic, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{topic.topic}</span>
                            <Badge
                              variant={
                                topic.sentiment === "positive"
                                  ? "default"
                                  : topic.sentiment === "negative"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {topic.sentiment}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* インフルエンサー */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5" />
                        トップインフルエンサー
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.data.summary.influencers
                          .slice(0, 10)
                          .map((inf, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>@{inf.name}</span>
                              <span className="text-muted-foreground">
                                {formatNumber(inf.followers)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Xタブ */}
              <TabsContent value="x">
                {result.data.full.xData ? (
                  <div className="space-y-4">
                    {/* センチメント */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          センチメント分析
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">
                              ポジティブ
                            </div>
                            <div className="text-2xl font-bold text-green-500">
                              {result.data.full.xData.sentiment.positive}%
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">
                              ニュートラル
                            </div>
                            <div className="text-2xl font-bold text-gray-500">
                              {result.data.full.xData.sentiment.neutral}%
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">
                              ネガティブ
                            </div>
                            <div className="text-2xl font-bold text-red-500">
                              {result.data.full.xData.sentiment.negative}%
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ツイート一覧 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          収集ツイート ({result.data.full.xData.tweets.length}件)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {result.data.full.xData.tweets.map((tweet, i) => (
                            <div
                              key={i}
                              className="p-3 border rounded-lg text-sm"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium">
                                  @{tweet.authorUsername}
                                </span>
                              </div>
                              <p className="text-muted-foreground mb-2">
                                {tweet.text}
                              </p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>{tweet.likeCount} likes</span>
                                <span>{tweet.retweetCount} RTs</span>
                                <span>{tweet.replyCount} replies</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Xデータなし
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Instagramタブ */}
              <TabsContent value="instagram">
                {result.data.full.instagramData ? (
                  <div className="space-y-4">
                    {/* エンゲージメント統計 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          エンゲージメント統計
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">
                              平均いいね
                            </div>
                            <div className="text-2xl font-bold">
                              {formatNumber(
                                result.data.full.instagramData.engagementStats
                                  .avgLikes
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">
                              平均コメント
                            </div>
                            <div className="text-2xl font-bold">
                              {formatNumber(
                                result.data.full.instagramData.engagementStats
                                  .avgComments
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">
                              総エンゲージメント
                            </div>
                            <div className="text-2xl font-bold">
                              {formatNumber(
                                result.data.full.instagramData.engagementStats
                                  .totalEngagement
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 投稿一覧 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          収集投稿 (
                          {result.data.full.instagramData.posts.length}件)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                          {result.data.full.instagramData.posts.map(
                            (post, i) => (
                              <div
                                key={i}
                                className="p-3 border rounded-lg text-sm"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium">
                                    @{post.ownerUsername}
                                  </span>
                                </div>
                                <p className="text-muted-foreground mb-2 line-clamp-3">
                                  {post.caption}
                                </p>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>{formatNumber(post.likeCount)} likes</span>
                                  <span>
                                    {formatNumber(post.commentCount)} comments
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Instagramデータなし
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TikTokタブ */}
              <TabsContent value="tiktok">
                {result.data.full.tiktokData ? (
                  <div className="space-y-4">
                    {/* バイラルパターン */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          バイラルパターン
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {result.data.full.tiktokData.viralPatterns.map(
                            (pattern, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-sm"
                              >
                                <TrendingUp className="h-4 w-4 text-primary" />
                                {pattern}
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* トップサウンド */}
                    {result.data.full.tiktokData.topSounds &&
                      result.data.full.tiktokData.topSounds.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              トップサウンド
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {result.data.full.tiktokData.topSounds.map(
                                (sound, i) => (
                                  <Badge key={i} variant="secondary">
                                    {sound}
                                  </Badge>
                                )
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    {/* 動画一覧 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          収集動画 (
                          {result.data.full.tiktokData.videos.length}件)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                          {result.data.full.tiktokData.videos.map(
                            (video, i) => (
                              <div
                                key={i}
                                className="p-3 border rounded-lg text-sm"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium">
                                    @{video.authorUsername}
                                  </span>
                                </div>
                                <p className="text-muted-foreground mb-2 line-clamp-2">
                                  {video.desc}
                                </p>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>{formatNumber(video.playCount)} views</span>
                                  <span>{formatNumber(video.likeCount)} likes</span>
                                  <span>
                                    {formatNumber(video.commentCount)} comments
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      TikTokデータなし
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* AI分析タブ */}
              <TabsContent value="analysis">
                {result.data.full.analysis ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          トレンドキーワード
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {result.data.full.analysis.trendingKeywords.map(
                            (kw, i) => (
                              <Badge key={i}>{kw}</Badge>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          効果的な表現パターン
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.data.full.analysis.effectivePatterns.map(
                            (pattern, i) => (
                              <li
                                key={i}
                                className="text-sm flex items-start gap-2"
                              >
                                <span className="text-primary">*</span>
                                {pattern}
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          ターゲット層の反応傾向
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.data.full.analysis.audienceInsights.map(
                            (insight, i) => (
                              <li
                                key={i}
                                className="text-sm flex items-start gap-2"
                              >
                                <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                {insight}
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">LP制作への提案</CardTitle>
                        <CardDescription>
                          SNSトレンドに基づいた具体的な提案
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.data.full.analysis.lpSuggestions.map(
                            (suggestion, i) => (
                              <li
                                key={i}
                                className="text-sm flex items-start gap-2"
                              >
                                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                {suggestion}
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>

                    {result.data.full.analysis.highlightContent.length > 0 && (
                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle className="text-lg">
                            注目コンテンツ
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid md:grid-cols-2 gap-3">
                            {result.data.full.analysis.highlightContent.map(
                              (content, i) => (
                                <div key={i} className="p-3 border rounded-lg">
                                  <div className="flex justify-between items-start mb-2">
                                    <Badge>{content.platform}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {formatNumber(content.engagement)}{" "}
                                      engagement
                                    </span>
                                  </div>
                                  <p className="text-sm mb-2">
                                    {content.content}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {content.reason}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      AI分析データなし（AI分析を有効にして再実行してください）
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-destructive">{result.error || "エラーが発生しました"}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// ユーティリティ
// ============================================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}
