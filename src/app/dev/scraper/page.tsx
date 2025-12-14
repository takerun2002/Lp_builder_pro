"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface SectionInfo {
  index: number;
  name: string;
  startY: number;
  endY: number;
  description: string;
}

interface ScrapeResult {
  ok: true;
  scrapeId: string;
  url: string;
  fullImageUrl: string;
  pageHeight: number;
  pageWidth: number;
  sections: SectionInfo[];
  ocrText: string;
  elapsedMs: number;
}

// Progress steps for scraping
const SCRAPE_STEPS = [
  { id: "init", label: "初期化中...", duration: 2000 },
  { id: "browser", label: "ブラウザ起動中...", duration: 3000 },
  { id: "navigate", label: "ページ読み込み中...", duration: 10000 },
  { id: "scroll", label: "コンテンツ読み込み中...", duration: 8000 },
  { id: "screenshot", label: "スクリーンショット撮影中...", duration: 5000 },
  { id: "analyze", label: "AI分析中（セクション検出・OCR）...", duration: 15000 },
  { id: "complete", label: "完了！", duration: 1000 },
];

export default function ScraperPage() {
  // === URL Scraping State ===
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("preview");

  // Progress state
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // === Screenshot OCR State ===
  const [ocrMode, setOcrMode] = useState<"url" | "screenshot">("url");
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Start progress animation
  const startProgress = () => {
    setProgressStep(0);
    setProgressPercent(0);

    let currentStep = 0;
    let stepProgress = 0;
    const totalSteps = SCRAPE_STEPS.length;
    const updateInterval = 100;

    progressIntervalRef.current = setInterval(() => {
      stepProgress += updateInterval;
      const currentStepDuration = SCRAPE_STEPS[currentStep]?.duration || 5000;

      if (stepProgress >= currentStepDuration) {
        currentStep++;
        stepProgress = 0;
        setProgressStep(currentStep);
      }

      // Calculate overall progress
      let totalDuration = 0;
      let elapsedDuration = 0;
      for (let i = 0; i < totalSteps; i++) {
        totalDuration += SCRAPE_STEPS[i].duration;
        if (i < currentStep) {
          elapsedDuration += SCRAPE_STEPS[i].duration;
        } else if (i === currentStep) {
          elapsedDuration += stepProgress;
        }
      }
      const percent = Math.min(95, (elapsedDuration / totalDuration) * 100);
      setProgressPercent(percent);

      // Stop at 95% and wait for actual completion
      if (currentStep >= totalSteps - 1) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
    }, updateInterval);
  };

  // Stop progress animation
  const stopProgress = (success: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (success) {
      setProgressStep(SCRAPE_STEPS.length - 1);
      setProgressPercent(100);
    }
  };

  // === URL Scraping ===
  const handleScrape = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    startProgress();

    try {
      const res = await fetch("/api/dev/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (data.ok) {
        setResult(data);
        stopProgress(true);
      } else {
        setError(data.error || "Unknown error");
        stopProgress(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      stopProgress(false);
    } finally {
      setLoading(false);
    }
  };

  // === Screenshot OCR ===
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setOcrImage(event.target?.result as string);
      setOcrResult(null);
      setOcrError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setOcrImage(event.target?.result as string);
            setOcrResult(null);
            setOcrError(null);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleOcr = async () => {
    if (!ocrImage) return;

    setOcrLoading(true);
    setOcrResult(null);
    setOcrError(null);

    try {
      const res = await fetch("/api/dev/scraper/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: ocrImage }),
      });

      const data = await res.json();

      if (data.ok) {
        setOcrResult(data.text);
      } else {
        setOcrError(data.error || "OCR failed");
      }
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "Network error");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCopyOcr = async () => {
    if (!ocrResult) return;
    await navigator.clipboard.writeText(ocrResult);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadOcr = () => {
    if (!ocrResult) return;
    const blob = new Blob([ocrResult], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ocr-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">LP スクレイパー & OCR</h1>
            <p className="text-sm text-muted-foreground">
              URLからフルページ取得 or スクリーンショットからテキスト抽出
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">← ホーム</Button>
          </Link>
        </div>

        {/* Mode Switch */}
        <div className="flex gap-2">
          <Button
            variant={ocrMode === "url" ? "default" : "outline"}
            onClick={() => setOcrMode("url")}
          >
            🌐 URL スクレイピング
          </Button>
          <Button
            variant={ocrMode === "screenshot" ? "default" : "outline"}
            onClick={() => setOcrMode("screenshot")}
          >
            📸 スクリーンショット OCR
          </Button>
        </div>

        {/* === URL Scraping Mode === */}
        {ocrMode === "url" && (
          <>
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">URL入力</CardTitle>
                <CardDescription>スクレイピング対象のLPのURLを入力してください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/lp"
                    disabled={loading}
                    onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                  />
                  <Button onClick={handleScrape} disabled={loading || !url.trim()}>
                    {loading ? "実行中..." : "実行"}
                  </Button>
                </div>

                {/* Progress Bar */}
                {loading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {SCRAPE_STEPS[progressStep]?.label || "処理中..."}
                      </span>
                      <span className="text-muted-foreground">
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <div className="flex gap-1">
                      {SCRAPE_STEPS.slice(0, -1).map((step, idx) => (
                        <div
                          key={step.id}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            idx <= progressStep ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="text-destructive">{error}</div>
                </CardContent>
              </Card>
            )}

            {/* Result */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-green-600">スクレイピング完了</CardTitle>
                  <CardDescription>
                    {result.pageWidth}×{result.pageHeight}px • {result.sections.length}セクション検出 • {result.elapsedMs}ms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="preview">プレビュー</TabsTrigger>
                      <TabsTrigger value="sections">セクション ({result.sections.length})</TabsTrigger>
                      <TabsTrigger value="ocr">OCRテキスト</TabsTrigger>
                    </TabsList>

                    {/* Preview */}
                    <TabsContent value="preview" className="mt-4">
                      <div className="border rounded-lg overflow-auto bg-muted/20" style={{ maxHeight: 600 }}>
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={result.fullImageUrl}
                            alt="Full page screenshot"
                            className="w-full h-auto"
                          />
                          {/* Section overlays */}
                          {result.sections.map((section, idx) => (
                            <div
                              key={idx}
                              className="absolute left-0 right-0 border-t-2 border-dashed border-primary/50"
                              style={{ top: section.startY * (100 / result.pageHeight) + "%" }}
                            >
                              <div className="absolute left-2 -top-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                                {section.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Sections */}
                    <TabsContent value="sections" className="mt-4">
                      {result.sections.length === 0 ? (
                        <div className="text-muted-foreground text-center py-8">
                          セクションが検出されませんでした
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {result.sections.map((section, idx) => (
                            <div key={idx} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center">
                                  {section.index + 1}
                                </span>
                                <span className="font-medium">{section.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  Y: {section.startY} - {section.endY}px
                                </span>
                              </div>
                              {section.description && (
                                <p className="text-sm text-muted-foreground mt-1 ml-8">
                                  {section.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* OCR */}
                    <TabsContent value="ocr" className="mt-4">
                      {result.ocrText ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(result.ocrText);
                                setCopySuccess(true);
                                setTimeout(() => setCopySuccess(false), 2000);
                              }}
                            >
                              {copySuccess ? "✓ コピー完了" : "📋 コピー"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const blob = new Blob([result.ocrText], { type: "text/plain;charset=utf-8" });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `ocr-${result.scrapeId}.txt`;
                                link.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              💾 テキストファイルでダウンロード
                            </Button>
                          </div>
                          <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap overflow-auto max-h-96">
                            {result.ocrText}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-center py-8">
                          テキストが抽出されませんでした
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* === Screenshot OCR Mode === */}
        {ocrMode === "screenshot" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📸 スクリーンショット OCR</CardTitle>
              <CardDescription>
                画像をアップロードまたはペーストして、Gemini 2.5 Flash でテキストを抽出
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload/Paste area */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onPaste={handlePaste}
                tabIndex={0}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {ocrImage ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ocrImage}
                      alt="Uploaded screenshot"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      クリックで別の画像を選択 / Ctrl+V でペースト
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl">📷</div>
                    <p className="font-medium">画像をドロップまたはクリックで選択</p>
                    <p className="text-sm text-muted-foreground">
                      または Ctrl+V (Cmd+V) でクリップボードからペースト
                    </p>
                  </div>
                )}
              </div>

              {/* OCR Button */}
              {ocrImage && (
                <Button
                  onClick={handleOcr}
                  disabled={ocrLoading}
                  className="w-full"
                >
                  {ocrLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      OCR処理中...
                    </>
                  ) : (
                    "🔍 テキストを抽出 (Gemini 2.5 Flash)"
                  )}
                </Button>
              )}

              {/* OCR Error */}
              {ocrError && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  {ocrError}
                </div>
              )}

              {/* OCR Result */}
              {ocrResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-green-600">✓ 抽出完了</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={copySuccess ? "default" : "outline"}
                        onClick={handleCopyOcr}
                      >
                        {copySuccess ? "✓ コピー完了!" : "📋 コピー"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadOcr}
                      >
                        💾 .txt ダウンロード
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap overflow-auto max-h-96">
                    {ocrResult}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>※ URL スクレイピング：動的なLPや認証が必要なページには対応していません。</p>
          <p>※ スクリーンショット OCR：Gemini 2.5 Flash を使用してテキストを抽出します。</p>
        </div>
      </div>
    </div>
  );
}
