"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================
// 型定義
// ============================================================

interface SwipeFileResult {
  id: string;
  sourceUrl: string;
  thumbnailUrl: string;
  fullImageUrl?: string;
  category: string;
  colors: string[];
  industry: string;
  companyName?: string;
  title?: string;
  styleAnalysis?: {
    layout: string;
    toneManner: string;
    targetAudience: string;
    colorPalette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    typography: {
      headlineStyle: string;
      bodyStyle: string;
      fontMood: string;
    };
    strengths: string[];
    weaknesses?: string[];
    designTips?: string[];
    overallScore: number;
  };
  source: string;
  scrapedAt: string;
}

interface SearchResult {
  items: SwipeFileResult[];
  totalFound: number;
  sources: string[];
}

// ============================================================
// カテゴリ・色オプション
// ============================================================

const CATEGORIES = [
  { value: "beauty", label: "美容・化粧品" },
  { value: "health", label: "健康食品・サプリ" },
  { value: "education", label: "スクール・教育" },
  { value: "finance", label: "金融・保険" },
  { value: "saas", label: "SaaS・BtoB" },
  { value: "ec", label: "EC・物販" },
  { value: "service", label: "サービス業" },
  { value: "recruit", label: "求人・採用" },
];

const COLORS = [
  { value: "white", label: "白", hex: "#FFFFFF" },
  { value: "pink", label: "ピンク", hex: "#FF69B4" },
  { value: "red", label: "赤", hex: "#FF0000" },
  { value: "orange", label: "オレンジ", hex: "#FFA500" },
  { value: "yellow", label: "黄", hex: "#FFFF00" },
  { value: "green", label: "緑", hex: "#00FF00" },
  { value: "blue", label: "青", hex: "#0000FF" },
  { value: "purple", label: "紫", hex: "#800080" },
  { value: "black", label: "黒", hex: "#000000" },
  { value: "gold", label: "金", hex: "#FFD700" },
];

// ============================================================
// メインコンポーネント
// ============================================================

export default function SwipeCollectorPage() {
  // 検索パラメータ
  const [category, setCategory] = useState<string>("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [limit, setLimit] = useState(20);
  const [analyzeStyle, setAnalyzeStyle] = useState(false);

  // 状態
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 詳細モーダル
  const [selectedItem, setSelectedItem] = useState<SwipeFileResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // 色選択ハンドラ
  const handleColorToggle = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color)
        ? prev.filter((c) => c !== color)
        : [...prev, color]
    );
  };

  // 検索実行
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setProgress(0);
    setProgressMessage("検索を開始しています...");
    setError(null);
    setResults(null);

    try {
      // プログレスシミュレーション
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 90));
      }, 500);

      const response = await fetch("/api/swipe-collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category || undefined,
          colors: selectedColors.length > 0 ? selectedColors : undefined,
          limit,
          analyzeStyle,
        }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "検索に失敗しました");
      }

      setProgress(100);
      setProgressMessage("完了!");
      setResults(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [category, selectedColors, limit, analyzeStyle]);

  // 詳細分析
  const handleAnalyze = async (item: SwipeFileResult) => {
    setSelectedItem(item);
    setDetailOpen(true);

    if (!item.styleAnalysis) {
      setAnalyzing(true);
      try {
        const response = await fetch(
          `/api/swipe-collector?action=analyze&item=${encodeURIComponent(
            JSON.stringify(item)
          )}`
        );
        const data = await response.json();
        if (data.success && data.data.styleAnalysis) {
          setSelectedItem(data.data);
          // 結果を更新
          if (results) {
            setResults({
              ...results,
              items: results.items.map((i) =>
                i.id === item.id ? data.data : i
              ),
            });
          }
        }
      } catch (err) {
        console.error("Analysis error:", err);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              LPスワイプファイル収集
            </h1>
            <p className="text-gray-600">
              トンマナに合ったLPデザインを自動で収集・分析
            </p>
          </div>
          <Link href="/dev">
            <Button variant="outline">← 開発メニュー</Button>
          </Link>
        </div>

        {/* 検索パネル */}
        <Card>
          <CardHeader>
            <CardTitle>検索条件</CardTitle>
            <CardDescription>
              カテゴリや色を指定して、参考になるLPを検索します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* カテゴリ選択 */}
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全カテゴリ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全カテゴリ</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 色選択 */}
            <div className="space-y-2">
              <Label>カラー</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleColorToggle(color.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                      selectedColors.includes(color.value)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* オプション */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="limit">件数:</Label>
                <Select
                  value={limit.toString()}
                  onValueChange={(v) => setLimit(parseInt(v))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="analyzeStyle"
                  checked={analyzeStyle}
                  onCheckedChange={(v) => setAnalyzeStyle(!!v)}
                />
                <Label htmlFor="analyzeStyle" className="cursor-pointer">
                  AIスタイル分析を実行
                </Label>
              </div>
            </div>

            {/* 検索ボタン */}
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "検索中..." : "スワイプファイルを検索"}
            </Button>

            {/* プログレスバー */}
            {loading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-gray-600 text-center">
                  {progressMessage}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* エラー表示 */}
        {error && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 結果表示 */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>
                検索結果（{results.totalFound}件）
              </CardTitle>
              <CardDescription>
                データソース: {results.sources.join(", ")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {results.items.map((item) => (
                  <div
                    key={item.id}
                    className="group cursor-pointer"
                    onClick={() => handleAnalyze(item)}
                  >
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title || "LP"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {item.styleAnalysis && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                          分析済
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium truncate">
                        {item.title || item.companyName || "無題"}
                      </p>
                      <p className="text-xs text-gray-500">{item.industry}</p>
                      {item.colors.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.colors.slice(0, 4).map((color, i) => (
                            <span
                              key={i}
                              className="w-3 h-3 rounded-full border border-gray-300"
                              style={{
                                backgroundColor:
                                  COLORS.find((c) => c.value === color)?.hex ||
                                  "#ccc",
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 詳細モーダル */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedItem.title || selectedItem.companyName || "LP詳細"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedItem.industry} / {selectedItem.source}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* 画像 */}
                  <div className="space-y-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        selectedItem.fullImageUrl || selectedItem.thumbnailUrl
                      }
                      alt={selectedItem.title || "LP"}
                      className="w-full rounded-lg border"
                    />
                    <a
                      href={selectedItem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      元のLPを見る →
                    </a>
                  </div>

                  {/* スタイル分析 */}
                  <div className="space-y-4">
                    {analyzing ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="text-gray-600">
                          AIスタイル分析中...
                        </div>
                      </div>
                    ) : selectedItem.styleAnalysis ? (
                      <>
                        <div className="space-y-2">
                          <h4 className="font-medium">レイアウト</h4>
                          <p className="text-gray-700">
                            {selectedItem.styleAnalysis.layout}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">トンマナ</h4>
                          <p className="text-gray-700">
                            {selectedItem.styleAnalysis.toneManner}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">ターゲット</h4>
                          <p className="text-gray-700">
                            {selectedItem.styleAnalysis.targetAudience}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">カラーパレット</h4>
                          <div className="flex gap-2">
                            {Object.entries(
                              selectedItem.styleAnalysis.colorPalette
                            ).map(([name, hex]) => (
                              <div
                                key={name}
                                className="text-center"
                              >
                                <div
                                  className="w-10 h-10 rounded border"
                                  style={{ backgroundColor: hex }}
                                />
                                <span className="text-xs text-gray-500">
                                  {name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">強み</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700">
                            {selectedItem.styleAnalysis.strengths.map(
                              (s, i) => (
                                <li key={i}>{s}</li>
                              )
                            )}
                          </ul>
                        </div>

                        {selectedItem.styleAnalysis.designTips &&
                          selectedItem.styleAnalysis.designTips.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium">学べるポイント</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700">
                                {selectedItem.styleAnalysis.designTips.map(
                                  (tip, i) => (
                                    <li key={i}>{tip}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        <div className="flex items-center gap-2">
                          <span className="font-medium">総合評価:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {selectedItem.styleAnalysis.overallScore}/10
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-gray-600">
                          スタイル分析はまだ実行されていません。
                        </p>
                        <Button
                          onClick={() =>
                            handleAnalyze({ ...selectedItem, styleAnalysis: undefined })
                          }
                        >
                          AIスタイル分析を実行
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
