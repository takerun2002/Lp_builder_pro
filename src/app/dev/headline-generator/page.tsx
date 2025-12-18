"use client";

/**
 * ヘッドライン大量生成UI
 * N1ターゲット × 心理トリガーで50-100案を一括生成
 */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Download,
  Copy,
  CheckCircle2,
  Target,
  Zap,
  BarChart3,
  Filter,
} from "lucide-react";

interface GeneratedHeadline {
  text: string;
  charCount: number;
  triggers: string[];
  style: string;
  score: number;
  scoreBreakdown: {
    clarity: number;
    emotional: number;
    uniqueness: number;
    actionable: number;
  };
}

interface GenerationResult {
  success: boolean;
  headlines?: GeneratedHeadline[];
  stats?: {
    totalGenerated: number;
    averageScore: number;
    topScore: number;
    processingTime: number;
    byStyle: Record<string, number>;
    byTrigger: Record<string, number>;
  };
  error?: string;
}

const STYLE_LABELS: Record<string, string> = {
  curiosity: "好奇心",
  benefit: "ベネフィット",
  fear: "恐怖",
  social_proof: "社会的証明",
  urgency: "緊急性",
  question: "問いかけ",
  story: "ストーリー",
  direct: "直接訴求",
};

const TRIGGER_LABELS: Record<string, string> = {
  scarcity: "希少性",
  authority: "権威性",
  social_proof: "社会的証明",
  reciprocity: "返報性",
  commitment: "一貫性",
  liking: "好意",
  fear: "恐怖",
  curiosity: "好奇心",
  specificity: "具体性",
  contrast: "対比",
};

export default function HeadlineGeneratorPage() {
  // 入力状態
  const [targetAge, setTargetAge] = useState("");
  const [targetOccupation, setTargetOccupation] = useState("");
  const [targetSituation, setTargetSituation] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [benefits, setBenefits] = useState("");
  const [keywords, setKeywords] = useState("");
  const [productName, setProductName] = useState("");
  const [genre, setGenre] = useState("");
  const [count, setCount] = useState(50);

  // 処理状態
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // フィルター状態
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState(0);

  // ヘッドライン生成
  const handleGenerate = async () => {
    if (!painPoints.trim() || !benefits.trim()) {
      alert("痛みポイントとベネフィットは必須です");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/headlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: {
            age: targetAge || undefined,
            occupation: targetOccupation || undefined,
            situation: targetSituation || undefined,
          },
          painPoints: painPoints.split("\n").filter((p) => p.trim()),
          benefits: benefits.split("\n").filter((b) => b.trim()),
          keywords: keywords ? keywords.split(",").map((k) => k.trim()) : undefined,
          productName: productName || undefined,
          genre: genre || undefined,
          count,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // CSVダウンロード
  const downloadCsv = async () => {
    if (!result?.headlines) return;

    const response = await fetch("/api/headlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: {
          age: targetAge || undefined,
          occupation: targetOccupation || undefined,
          situation: targetSituation || undefined,
        },
        painPoints: painPoints.split("\n").filter((p) => p.trim()),
        benefits: benefits.split("\n").filter((b) => b.trim()),
        keywords: keywords ? keywords.split(",").map((k) => k.trim()) : undefined,
        productName: productName || undefined,
        genre: genre || undefined,
        count,
        exportFormat: "csv",
      }),
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "headlines.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // クリップボードにコピー
  const copyAllHeadlines = () => {
    if (!result?.headlines) return;
    const text = filteredHeadlines.map((h) => h.text).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // フィルター適用
  const filteredHeadlines = result?.headlines?.filter((h) => {
    if (styleFilter !== "all" && h.style !== styleFilter) return false;
    if (h.score < minScore) return false;
    return true;
  }) || [];

  return (
    <div className="container max-w-6xl py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dev">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">ヘッドライン大量生成</h1>
          <p className="text-sm text-muted-foreground">
            N1ターゲット × 心理トリガーで50-100案を一括生成
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 入力セクション */}
        <div className="space-y-6">
          {/* ターゲット情報 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-blue-500" />
                ターゲット情報
              </CardTitle>
              <CardDescription>N1ペルソナを設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">年齢層</label>
                  <Input
                    value={targetAge}
                    onChange={(e) => setTargetAge(e.target.value)}
                    placeholder="例: 30代後半"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">職業</label>
                  <Input
                    value={targetOccupation}
                    onChange={(e) => setTargetOccupation(e.target.value)}
                    placeholder="例: 会社員、主婦"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">状況・背景</label>
                <Input
                  value={targetSituation}
                  onChange={(e) => setTargetSituation(e.target.value)}
                  placeholder="例: 副業を始めたいが時間がない"
                />
              </div>
            </CardContent>
          </Card>

          {/* 痛みとベネフィット */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-yellow-500" />
                痛み・ベネフィット
              </CardTitle>
              <CardDescription>1行1項目で入力</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">痛みポイント *</label>
                <Textarea
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                  placeholder="時間がない&#10;お金がかかりすぎる&#10;何から始めればいいかわからない"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ベネフィット *</label>
                <Textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="1日10分で完結&#10;月5万円の副収入&#10;スマホだけでOK"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* オプション */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">オプション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">商品・サービス名</label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="例: AI副業マスター講座"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ジャンル</label>
                  <Input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="例: 副業、投資、美容"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">必須キーワード（カンマ区切り）</label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="例: AI, 副業, 自動化"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">生成数: {count}件</label>
                <Slider
                  value={[count]}
                  onValueChange={(v) => setCount(v[0])}
                  min={10}
                  max={100}
                  step={10}
                />
              </div>
            </CardContent>
          </Card>

          {/* 生成ボタン */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中... ({count}件)
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                ヘッドライン生成
              </>
            )}
          </Button>
        </div>

        {/* 結果セクション */}
        <div className="space-y-6">
          {result?.success && result.stats && (
            <>
              {/* 統計 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-green-500" />
                    生成結果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{result.stats.totalGenerated}</p>
                      <p className="text-xs text-muted-foreground">生成数</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{result.stats.averageScore}</p>
                      <p className="text-xs text-muted-foreground">平均スコア</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{result.stats.topScore}</p>
                      <p className="text-xs text-muted-foreground">最高スコア</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{(result.stats.processingTime / 1000).toFixed(1)}s</p>
                      <p className="text-xs text-muted-foreground">処理時間</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* フィルター */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="w-5 h-5" />
                    フィルター
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium">スタイル</label>
                      <Select value={styleFilter} onValueChange={setStyleFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          {Object.entries(STYLE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium">最低スコア: {minScore}</label>
                      <Slider
                        value={[minScore]}
                        onValueChange={(v) => setMinScore(v[0])}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    表示中: {filteredHeadlines.length} / {result.stats.totalGenerated}件
                  </p>
                </CardContent>
              </Card>

              {/* アクションボタン */}
              <div className="flex gap-3">
                <Button onClick={copyAllHeadlines} variant="outline" className="flex-1">
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      コピー完了
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      全てコピー
                    </>
                  )}
                </Button>
                <Button onClick={downloadCsv} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  CSVダウンロード
                </Button>
              </div>

              {/* ヘッドライン一覧 */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredHeadlines.map((headline, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{headline.text}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {STYLE_LABELS[headline.style] || headline.style}
                          </Badge>
                          {headline.triggers.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">
                              {TRIGGER_LABELS[t] || t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{headline.score}</p>
                        <p className="text-xs text-muted-foreground">{headline.charCount}文字</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {result && !result.success && (
            <Card className="p-6 bg-destructive/10">
              <p className="text-destructive">{result.error}</p>
            </Card>
          )}

          {!result && !isGenerating && (
            <Card className="p-12 text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>左側のフォームに情報を入力して</p>
              <p>「ヘッドライン生成」をクリック</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
