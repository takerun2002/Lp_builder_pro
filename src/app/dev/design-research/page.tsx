"use client";

/**
 * デザインリサーチページ
 *
 * LPアーカイブサイトからデザインを収集
 * Crawl4AIを使用したボット検出回避スクレイピング
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";
import { LP_ARCHIVE_SITES, type LPInfo } from "@/lib/scrapers";

interface ServerStatus {
  available: boolean;
  error?: string;
}

const IMAGE_TYPES = [
  { value: "", label: "すべて" },
  { value: "高級・セレブ", label: "高級・セレブ" },
  { value: "シンプル", label: "シンプル" },
  { value: "にぎやか", label: "にぎやか" },
  { value: "かわいい", label: "かわいい" },
  { value: "クール", label: "クール" },
  { value: "ナチュラル", label: "ナチュラル" },
];

export default function DesignResearchPage() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LPInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // フィルター状態
  const [selectedSite, setSelectedSite] = useState(LP_ARCHIVE_SITES[0].id);
  const [imageType, setImageType] = useState("");
  const [limit, setLimit] = useState("10");

  // サーバーステータスチェック
  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch("/api/scrape/lp-archive");
      const data = await response.json();
      setServerStatus({
        available: data.available ?? false,
        error: data.error,
      });
    } catch {
      setServerStatus({
        available: false,
        error: "APIに接続できません",
      });
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const site = LP_ARCHIVE_SITES.find((s) => s.id === selectedSite);
      if (!site) {
        throw new Error("サイトが選択されていません");
      }

      const response = await fetch("/api/scrape/lp-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: site.url,
          imageType: imageType || undefined,
          limit: parseInt(limit, 10),
          useLLM: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || "スクレイピングに失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">デザインリサーチ</h1>
        <p className="text-muted-foreground">
          LPアーカイブサイトからデザイン参考を収集します
        </p>
      </div>

      {/* サーバーステータス */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Crawl4AI サーバーステータス
            {serverStatus === null ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : serverStatus.available ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {serverStatus?.available ? (
            <p className="text-sm text-green-600">
              サーバーが稼働中です。スクレイピングを実行できます。
            </p>
          ) : (
            <div className="text-sm text-red-600">
              <p>サーバーが起動していません。以下のコマンドで起動してください：</p>
              <pre className="mt-2 p-2 bg-muted rounded text-xs">
                cd python-scripts{"\n"}
                pip install -r requirements.txt{"\n"}
                python crawl4ai_server.py
              </pre>
              {serverStatus?.error && (
                <p className="mt-2 text-xs">エラー: {serverStatus.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 検索フォーム */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">検索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* サイト選択 */}
            <div>
              <Label htmlFor="site">アーカイブサイト</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger id="site">
                  <SelectValue placeholder="サイトを選択" />
                </SelectTrigger>
                <SelectContent>
                  {LP_ARCHIVE_SITES.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* イメージタイプ */}
            <div>
              <Label htmlFor="imageType">イメージタイプ</Label>
              <Select value={imageType} onValueChange={setImageType}>
                <SelectTrigger id="imageType">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 取得件数 */}
            <div>
              <Label htmlFor="limit">取得件数</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>

            {/* 検索ボタン */}
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleSearch}
                disabled={isLoading || !serverStatus?.available}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    検索中...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    検索
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 検索結果 */}
      {results.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            検索結果 ({results.length}件)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((lp, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* サムネイル */}
                <div className="aspect-[4/3] bg-muted relative">
                  {lp.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lp.thumbnailUrl}
                      alt={lp.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* 情報 */}
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2">
                    {lp.title}
                  </h3>
                  {lp.category && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {lp.category}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <a
                      href={lp.lpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      LPを見る
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 結果なし */}
      {!isLoading && !error && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              検索条件を設定して「検索」ボタンをクリックしてください
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
