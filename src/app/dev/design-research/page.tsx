"use client";

/**
 * デザイン収集ページ
 *
 * LPアーカイブサイトへのリンク一覧を表示
 * URL手動入力でLP追加・分析機能
 * API連携なし・コストゼロで実現
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Link2,
  AlertCircle,
} from "lucide-react";

// LPアーカイブサイト一覧（外部リンク）
const LP_ARCHIVE_SITES = [
  {
    name: "LPアーカイブ",
    url: "https://rdlp.jp/lp-archive/",
    description: "ジャンル・業界で検索可能。国内最大級のLPギャラリー。",
    icon: "📚",
  },
  {
    name: "LP ADVANCE",
    url: "https://lp-web.com/",
    description: "デザイン参考に最適。カテゴリ別に整理されたLP集。",
    icon: "🎨",
  },
  {
    name: "WebDesign Clip",
    url: "https://webdesignclip.com/",
    description: "LP以外のデザインも豊富。Webデザイン全般の参考に。",
    icon: "✂️",
  },
  {
    name: "SANKOU!",
    url: "https://sankoudesign.com/category/lp/",
    description: "LP特集あり。国内の優れたWebデザインを厳選。",
    icon: "⭐",
  },
  {
    name: "Meta Ad Library",
    url: "https://www.facebook.com/ads/library/",
    description: "Facebook/Instagram広告を検索。競合の広告クリエイティブを確認。",
    icon: "📱",
  },
  {
    name: "Pinterest (LP Design)",
    url: "https://www.pinterest.jp/search/pins/?q=LP%20%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3",
    description: "LPデザインのアイデアを収集。ビジュアル参考に。",
    icon: "📌",
  },
];

// 収集したLPの型
interface CollectedLP {
  id: string;
  url: string;
  title?: string;
  screenshotUrl?: string;
  analysis?: LPAnalysis;
  addedAt: string;
}

interface LPAnalysis {
  headline?: string;
  colorScheme?: string[];
  sections?: string[];
  overallTone?: string;
  targetAudience?: string;
}

export default function DesignResearchPage() {
  const [collectedLPs, setCollectedLPs] = useState<CollectedLP[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // LP追加
  const handleAddLP = () => {
    if (!newUrl.trim()) return;

    // URL validation
    try {
      new URL(newUrl);
    } catch {
      setError("有効なURLを入力してください");
      return;
    }

    const newLP: CollectedLP = {
      id: `lp-${Date.now()}`,
      url: newUrl.trim(),
      addedAt: new Date().toISOString(),
    };

    setCollectedLPs((prev) => [...prev, newLP]);
    setNewUrl("");
    setError(null);
  };

  // LP削除
  const handleRemoveLP = (id: string) => {
    setCollectedLPs((prev) => prev.filter((lp) => lp.id !== id));
  };

  // LP分析（Gemini Vision）
  const handleAnalyzeLP = async (lp: CollectedLP) => {
    setIsAnalyzing(lp.id);
    setError(null);

    try {
      // スクリーンショット取得 + 分析
      const res = await fetch("/api/dev/scraper/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: lp.url,
          mode: "lp_analysis",
        }),
      });

      const result = await res.json();

      if (result.success) {
        setCollectedLPs((prev) =>
          prev.map((p) =>
            p.id === lp.id
              ? {
                  ...p,
                  title: result.title || getDomainFromUrl(lp.url),
                  screenshotUrl: result.screenshotUrl,
                  analysis: result.analysis,
                }
              : p
          )
        );
      } else {
        setError(result.error || "分析に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsAnalyzing(null);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">デザイン収集</h1>
        <p className="text-muted-foreground">
          LPアーカイブサイトを参考に、気に入ったLPをURL入力で追加・分析
        </p>
      </div>

      {/* LPアーカイブサイト一覧 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            LPアーカイブサイト（外部リンク）
          </CardTitle>
          <CardDescription>
            以下のサイトでデザイン参考を探し、気に入ったLPのURLを下の入力欄に追加してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LP_ARCHIVE_SITES.map((site) => (
              <a
                key={site.name}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{site.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {site.name}
                      </h3>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {site.description}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* LP追加フォーム */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" />
            参考LPを追加
          </CardTitle>
          <CardDescription>
            気に入ったLPのURLを入力して追加。「分析」ボタンでAI分析を実行できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="url" className="sr-only">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/lp"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLP()}
              />
            </div>
            <Button onClick={handleAddLP} disabled={!newUrl.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              追加
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 収集したLP一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            収集したLP ({collectedLPs.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collectedLPs.length === 0 ? (
            <div className="py-12 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                まだLPが追加されていません。<br />
                上のアーカイブサイトから参考LPを見つけて、URLを追加してください。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {collectedLPs.map((lp) => (
                <div
                  key={lp.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  {/* サムネイル */}
                  <div className="w-32 h-24 bg-muted rounded flex-shrink-0 overflow-hidden">
                    {lp.screenshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lp.screenshotUrl}
                        alt={lp.title || "LP"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {lp.title || getDomainFromUrl(lp.url)}
                    </h3>
                    <a
                      href={lp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary truncate block"
                    >
                      {lp.url}
                    </a>

                    {/* 分析結果 */}
                    {lp.analysis && (
                      <div className="mt-2 text-sm space-y-1">
                        {lp.analysis.headline && (
                          <p>
                            <span className="font-medium">ヘッドライン:</span>{" "}
                            {lp.analysis.headline}
                          </p>
                        )}
                        {lp.analysis.overallTone && (
                          <p>
                            <span className="font-medium">トーン:</span>{" "}
                            {lp.analysis.overallTone}
                          </p>
                        )}
                        {lp.analysis.colorScheme && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">カラー:</span>
                            {lp.analysis.colorScheme.map((color, i) => (
                              <span
                                key={i}
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalyzeLP(lp)}
                      disabled={isAnalyzing === lp.id}
                    >
                      {isAnalyzing === lp.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span className="ml-1">分析</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLP(lp.id)}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// URLからドメインを取得
function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}
