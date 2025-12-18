"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  HeadlineTypeSelector,
  TriggerSelector,
  GenerationProgress,
  HeadlineStats,
  HeadlineList,
} from "@/components/copywriting/HeadlineGenerator";
import {
  type HeadlineType,
  type HeadlineStatus,
  type HeadlineBatch,
  HEADLINE_TYPE_LABELS,
} from "@/lib/copywriting/headline-generator";

export default function HeadlinesPage() {
  // Generation settings
  const [selectedTypes, setSelectedTypes] = useState<HeadlineType[]>(["hero", "cta"]);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [countPerType, setCountPerType] = useState(5);

  // Product info
  const [productInfo, setProductInfo] = useState({
    name: "",
    description: "",
    targetAudience: "",
    uniqueValue: "",
  });

  // N1 data
  const [n1Data, setN1Data] = useState({
    painPoints: "",
    triggers: "",
    transformations: "",
    hesitations: "",
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentType: undefined as HeadlineType | undefined });
  const [batches, setBatches] = useState<HeadlineBatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [activeTab, setActiveTab] = useState("settings");
  const [filterStatus, setFilterStatus] = useState<HeadlineStatus | "all">("all");
  const [sortByScore, setSortByScore] = useState(false);

  // Get all headlines from batches
  const allHeadlines = batches.flatMap((b) => b.headlines);

  // Handle status change
  const handleStatusChange = useCallback((id: string, status: HeadlineStatus) => {
    setBatches((prev) =>
      prev.map((batch) => ({
        ...batch,
        headlines: batch.headlines.map((h) =>
          h.id === id ? { ...h, status } : h
        ),
      }))
    );
  }, []);

  // Generate headlines
  const handleGenerate = async () => {
    if (selectedTypes.length === 0) {
      setError("少なくとも1つのセクションを選択してください");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: selectedTypes.length, currentType: selectedTypes[0] });

    try {
      // Parse N1 data
      const parsedN1Data = {
        painPoints: n1Data.painPoints.split("\n").filter((s) => s.trim()),
        triggers: n1Data.triggers.split("\n").filter((s) => s.trim()),
        transformations: n1Data.transformations.split("\n").filter((s) => s.trim()),
        hesitations: n1Data.hesitations.split("\n").filter((s) => s.trim()),
      };

      // Check if N1 data is provided
      const hasN1Data = Object.values(parsedN1Data).some((arr) => arr.length > 0);
      const hasProductInfo = productInfo.name || productInfo.description;

      // Generate batch
      const response = await fetch("/api/headlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-batch",
          projectId: `project_${Date.now()}`,
          types: selectedTypes,
          countPerType,
          n1Data: hasN1Data ? parsedN1Data : undefined,
          productInfo: hasProductInfo ? productInfo : undefined,
          psychologicalTriggers: selectedTriggers.length > 0 ? selectedTriggers : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBatches(data.batches);
        setProgress({ current: selectedTypes.length, total: selectedTypes.length, currentType: undefined });
        setActiveTab("results");
      } else {
        setError(data.error || "生成に失敗しました");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError("生成中にエラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    if (batches.length === 0) return;

    try {
      const response = await fetch("/api/headlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "export-csv",
          batches,
        }),
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `headlines_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      setError("エクスポートに失敗しました");
    }
  };

  // Copy approved headlines
  const handleCopyApproved = () => {
    const approved = allHeadlines
      .filter((h) => h.status === "approved")
      .map((h) => `【${HEADLINE_TYPE_LABELS[h.type]}】${h.content}`)
      .join("\n");

    if (approved) {
      navigator.clipboard.writeText(approved);
      alert("採用ヘッドラインをクリップボードにコピーしました");
    } else {
      alert("採用済みのヘッドラインがありません");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ヘッドライン大量生成</h1>
        <p className="text-muted-foreground">
          N1データと心理トリガーを活用して、LP各セクション用のヘッドラインを一括生成
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="settings">設定</TabsTrigger>
          <TabsTrigger value="results" disabled={allHeadlines.length === 0}>
            結果 ({allHeadlines.length})
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Section Selector */}
          <HeadlineTypeSelector
            selectedTypes={selectedTypes}
            onSelectionChange={setSelectedTypes}
          />

          {/* Trigger Selector */}
          <TriggerSelector
            selectedTriggers={selectedTriggers}
            onSelectionChange={setSelectedTriggers}
          />

          {/* Generation Count */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">生成数設定</CardTitle>
              <CardDescription>各セクションごとの生成数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="count">1セクションあたり:</Label>
                <Select
                  value={String(countPerType)}
                  onValueChange={(v) => setCountPerType(Number(v))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3案</SelectItem>
                    <SelectItem value="5">5案</SelectItem>
                    <SelectItem value="10">10案</SelectItem>
                    <SelectItem value="15">15案</SelectItem>
                    <SelectItem value="20">20案</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  合計: 約{selectedTypes.length * countPerType}案
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">商品情報（任意）</CardTitle>
              <CardDescription>
                商品情報を入力すると、より適切なヘッドラインが生成されます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">商品名</Label>
                  <Input
                    id="productName"
                    placeholder="例: LP Builder Pro"
                    value={productInfo.name}
                    onChange={(e) =>
                      setProductInfo((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">ターゲット</Label>
                  <Input
                    id="targetAudience"
                    placeholder="例: 中小企業の経営者"
                    value={productInfo.targetAudience}
                    onChange={(e) =>
                      setProductInfo((prev) => ({ ...prev, targetAudience: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">商品説明</Label>
                <Textarea
                  id="description"
                  placeholder="商品・サービスの概要"
                  value={productInfo.description}
                  onChange={(e) =>
                    setProductInfo((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uniqueValue">独自の価値</Label>
                <Input
                  id="uniqueValue"
                  placeholder="例: AIで10倍速のLP制作"
                  value={productInfo.uniqueValue}
                  onChange={(e) =>
                    setProductInfo((prev) => ({ ...prev, uniqueValue: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* N1 Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">N1データ（推奨）</CardTitle>
              <CardDescription>
                実在顧客の声を入力すると、感情に訴えるヘッドラインが生成されます（1行に1項目）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="painPoints">悩み・課題</Label>
                  <Textarea
                    id="painPoints"
                    placeholder="LP作成に1週間かかる&#10;外注費が高い&#10;成約率が上がらない"
                    value={n1Data.painPoints}
                    onChange={(e) =>
                      setN1Data((prev) => ({ ...prev, painPoints: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="triggers">購入のきっかけ</Label>
                  <Textarea
                    id="triggers"
                    placeholder="無料トライアルがあった&#10;デモを見て納得した&#10;導入企業の事例を見た"
                    value={n1Data.triggers}
                    onChange={(e) =>
                      setN1Data((prev) => ({ ...prev, triggers: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transformations">変化・成果</Label>
                  <Textarea
                    id="transformations"
                    placeholder="LP作成が1日で完了&#10;成約率が2倍に&#10;外注費が月50万円削減"
                    value={n1Data.transformations}
                    onChange={(e) =>
                      setN1Data((prev) => ({ ...prev, transformations: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hesitations">躊躇・不安</Label>
                  <Textarea
                    id="hesitations"
                    placeholder="本当に簡単に使えるのか&#10;デザインのクオリティが心配&#10;サポート体制が不安"
                    value={n1Data.hesitations}
                    onChange={(e) =>
                      setN1Data((prev) => ({ ...prev, hesitations: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || selectedTypes.length === 0}
              className="px-8"
            >
              {isGenerating ? "生成中..." : `${selectedTypes.length * countPerType}案を一括生成`}
            </Button>
          </div>

          {/* Progress */}
          {isGenerating && (
            <GenerationProgress
              current={progress.current}
              total={progress.total}
              currentType={progress.currentType}
            />
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {/* Stats */}
          <HeadlineStats headlines={allHeadlines} />

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    CSVエクスポート
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyApproved}>
                    採用をコピー
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("settings")}
                  >
                    追加生成
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Label htmlFor="filter" className="text-sm">
                    フィルター:
                  </Label>
                  <Select
                    value={filterStatus}
                    onValueChange={(v) => setFilterStatus(v as HeadlineStatus | "all")}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="pending">保留</SelectItem>
                      <SelectItem value="approved">採用</SelectItem>
                      <SelectItem value="rejected">没</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={sortByScore ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortByScore(!sortByScore)}
                  >
                    スコア順
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Headlines by Section */}
          {batches.map((batch) => (
            <Card key={batch.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{HEADLINE_TYPE_LABELS[batch.type]}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {batch.headlines.length}案
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HeadlineList
                  headlines={batch.headlines}
                  onStatusChange={handleStatusChange}
                  filterStatus={filterStatus}
                  sortByScore={sortByScore}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
