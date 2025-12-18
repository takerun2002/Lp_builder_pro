"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// OCR Configuration
const DEFAULT_CONFIG = {
  width: 640,
  tileHeight: 2400,
  deviceScale: 1,
  overlap: 200,
  chunkHeight: 5000,
  parallelWorkers: 4,
  pauseAnimations: true,
  hideFixed: true,
  preRenderScroll: true,
  timeout: 90000,
};

interface ChunkStatus {
  index: number;
  yStart: number;
  yEnd: number;
  status: "pending" | "processing" | "completed" | "error";
  text?: string;
  error?: string;
}

interface LogEntry {
  timestamp: Date;
  type: "info" | "success" | "error" | "progress";
  message: string;
}

export default function LpOcrPage() {
  // URL and config
  const [url, setUrl] = useState("");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");

  // Screenshot state
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotDimensions, setScreenshotDimensions] = useState<{ width: number; height: number } | null>(null);
  const [tileCount, setTileCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [chunks, setChunks] = useState<ChunkStatus[]>([]);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Copy state
  const [copySuccess, setCopySuccess] = useState(false);

  // Scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { timestamp: new Date(), type, message }]);
  }, []);

  // Capture screenshot using our backend
  const handleCaptureScreenshot = async () => {
    if (!url.trim()) return;

    setScreenshotLoading(true);
    setScreenshotDataUrl(null);
    setOcrText("");
    setChunks([]);
    setLogs([]);
    
    const startTime = Date.now();
    addLog("info", `🚀 スクリーンショット撮影を開始: ${url}`);
    addLog("info", `📐 設定: 幅${config.width}px, タイル高さ${config.tileHeight}px`);

    try {
      // Use the existing scraper API
      const res = await fetch("/api/dev/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Screenshot failed");
      }

      // Fetch the actual image
      const imageRes = await fetch(data.fullImageUrl);
      const imageBlob = await imageRes.blob();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setScreenshotDataUrl(dataUrl);
        setScreenshotDimensions({ width: data.pageWidth, height: data.pageHeight });
        setTileCount(Math.ceil(data.pageHeight / config.tileHeight));
        setElapsedTime((Date.now() - startTime) / 1000);
        
        addLog("success", `✅ スクリーンショット完了: ${data.pageWidth}x${data.pageHeight}px`);
        addLog("info", `⏱️ 処理時間: ${((Date.now() - startTime) / 1000).toFixed(1)}秒`);
        addLog("info", `📷 タイル数: ${Math.ceil(data.pageHeight / config.tileHeight)}`);
        
        // If OCR text was already extracted
        if (data.ocrText) {
          setOcrText(data.ocrText);
          addLog("success", `📝 テキスト抽出完了: ${data.ocrText.length}文字`);
        }
      };
      
      reader.readAsDataURL(imageBlob);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog("error", `❌ エラー: ${message}`);
    } finally {
      setScreenshotLoading(false);
    }
  };

  // Split image into chunks using Canvas API
  const splitImageIntoChunks = async (dataUrl: string): Promise<{ dataUrl: string; yStart: number; yEnd: number }[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const chunks: { dataUrl: string; yStart: number; yEnd: number }[] = [];
        const { chunkHeight, overlap } = config;
        const totalHeight = img.height;
        
        let yStart = 0;
        while (yStart < totalHeight) {
          const yEnd = Math.min(yStart + chunkHeight, totalHeight);
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = yEnd - yStart;
          
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context unavailable"));
            return;
          }
          
          ctx.drawImage(img, 0, yStart, img.width, yEnd - yStart, 0, 0, img.width, yEnd - yStart);
          chunks.push({
            dataUrl: canvas.toDataURL("image/png"),
            yStart,
            yEnd,
          });
          
          if (yEnd >= totalHeight) break;
          yStart = yEnd - overlap;
        }
        
        resolve(chunks);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  };

  // Parallel OCR processing
  const handleParallelOcr = async () => {
    if (!screenshotDataUrl) return;

    setOcrLoading(true);
    setOcrText("");
    setOcrProgress(0);
    
    addLog("info", "⚡ 並列OCRモードを開始...");
    
    try {
      // Split image into chunks
      const imageChunks = await splitImageIntoChunks(screenshotDataUrl);
      addLog("info", `📐 ${imageChunks.length}チャンクに分割 (各${config.chunkHeight}px, オーバーラップ${config.overlap}px)`);
      
      // Initialize chunk status
      const initialChunks: ChunkStatus[] = imageChunks.map((chunk, i) => ({
        index: i,
        yStart: chunk.yStart,
        yEnd: chunk.yEnd,
        status: "pending",
      }));
      setChunks(initialChunks);
      
      // Process chunks with limited concurrency
      const results: { index: number; text: string; error?: string }[] = [];
      const workers = config.parallelWorkers;
      let completed = 0;
      
      const processChunk = async (chunkIndex: number): Promise<void> => {
        const chunk = imageChunks[chunkIndex];
        
        setChunks((prev) =>
          prev.map((c) =>
            c.index === chunkIndex ? { ...c, status: "processing" } : c
          )
        );
        addLog("progress", `🔄 チャンク ${chunkIndex + 1}/${imageChunks.length} を処理中 (y=${chunk.yStart}~${chunk.yEnd}px)`);
        
        try {
          const res = await fetch("/api/dev/scraper/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageDataUrl: chunk.dataUrl, parallel: false }),
          });
          
          const data = await res.json();
          
          if (data.ok) {
            results[chunkIndex] = { index: chunkIndex, text: data.text };
            setChunks((prev) =>
              prev.map((c) =>
                c.index === chunkIndex ? { ...c, status: "completed", text: data.text } : c
              )
            );
            addLog("success", `✅ チャンク ${chunkIndex + 1}/${imageChunks.length} 完了 (${data.text.length}文字)`);
          } else {
            results[chunkIndex] = { index: chunkIndex, text: "", error: data.error };
            setChunks((prev) =>
              prev.map((c) =>
                c.index === chunkIndex ? { ...c, status: "error", error: data.error } : c
              )
            );
            addLog("error", `⚠️ チャンク ${chunkIndex + 1}/${imageChunks.length} エラー: ${data.error}`);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          results[chunkIndex] = { index: chunkIndex, text: "", error: message };
          setChunks((prev) =>
            prev.map((c) =>
              c.index === chunkIndex ? { ...c, status: "error", error: message } : c
            )
          );
          addLog("error", `⚠️ チャンク ${chunkIndex + 1}/${imageChunks.length} エラー: ${message}`);
        }
        
        completed++;
        setOcrProgress((completed / imageChunks.length) * 100);
      };
      
      // Process with limited concurrency
      const queue = Array.from({ length: imageChunks.length }, (_, i) => i);
      const runWorker = async () => {
        while (queue.length > 0) {
          const chunkIndex = queue.shift();
          if (chunkIndex !== undefined) {
            await processChunk(chunkIndex);
          }
        }
      };
      
      await Promise.all(Array(Math.min(workers, imageChunks.length)).fill(0).map(() => runWorker()));
      
      // Merge results
      const mergedText = mergeOcrTexts(
        results.sort((a, b) => a.index - b.index).map((r) => r.text)
      );
      
      setOcrText(mergedText);
      addLog("success", `🎉 OCR完了: 合計${mergedText.length}文字`);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog("error", `❌ OCRエラー: ${message}`);
    } finally {
      setOcrLoading(false);
    }
  };

  // Single-shot OCR (full image)
  const handleSimpleOcr = async () => {
    if (!screenshotDataUrl) return;

    setOcrLoading(true);
    setOcrText("");
    setChunks([]);
    
    addLog("info", "🔍 シングルOCRモードを開始...");
    
    try {
      const res = await fetch("/api/dev/scraper/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: screenshotDataUrl }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setOcrText(data.text);
        addLog("success", `✅ OCR完了: ${data.text.length}文字 (${data.elapsedMs}ms)`);
      } else {
        addLog("error", `❌ OCRエラー: ${data.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog("error", `❌ エラー: ${message}`);
    } finally {
      setOcrLoading(false);
    }
  };

  // Merge OCR texts with duplicate removal
  const mergeOcrTexts = (texts: string[]): string => {
    const merged: string[] = [];
    
    for (const text of texts) {
      if (!text) continue;
      
      for (const line of text.split("\n")) {
        const stripped = line.trim();
        if (!stripped) {
          if (merged.length && merged[merged.length - 1] !== "") {
            merged.push("");
          }
          continue;
        }
        // Skip duplicate lines from overlap
        if (merged.length && merged[merged.length - 1].trim() === stripped) {
          continue;
        }
        merged.push(line.trimEnd());
      }
      
      if (merged.length && merged[merged.length - 1] !== "") {
        merged.push("");
      }
    }
    
    while (merged.length && merged[merged.length - 1] === "") {
      merged.pop();
    }
    
    return merged.join("\n");
  };

  const handleCopyText = async () => {
    if (!ocrText) return;
    await navigator.clipboard.writeText(ocrText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadText = () => {
    if (!ocrText) return;
    const blob = new Blob([ocrText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lp-ocr-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🖼️ LP OCR (並列処理対応)</h1>
            <p className="text-sm text-muted-foreground">
              LPのフルページスクリーンショット → 並列OCRでテキスト抽出
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dev/scraper">
              <Button variant="outline" size="sm">旧スクレイパー</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">← ホーム</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: URL & Config */}
          <div className="space-y-4">
            {/* URL Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">LPのURL</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/lp"
                  disabled={screenshotLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleCaptureScreenshot()}
                />
                <Button
                  onClick={handleCaptureScreenshot}
                  disabled={screenshotLoading || !url.trim()}
                  className="w-full"
                >
                  {screenshotLoading ? "📸 撮影中..." : "📸 スクショを撮影"}
                </Button>
              </CardContent>
            </Card>

            {/* Screenshot Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">撮影設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">画面幅(px): {config.width}</Label>
                  <Slider
                    value={[config.width]}
                    onValueChange={([v]) => setConfig({ ...config, width: v })}
                    min={640}
                    max={1920}
                    step={10}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">タイル高さ(px): {config.tileHeight}</Label>
                  <Slider
                    value={[config.tileHeight]}
                    onValueChange={([v]) => setConfig({ ...config, tileHeight: v })}
                    min={1200}
                    max={4000}
                    step={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">タイル重なり(px): {config.overlap}</Label>
                  <Slider
                    value={[config.overlap]}
                    onValueChange={([v]) => setConfig({ ...config, overlap: v })}
                    min={0}
                    max={400}
                    step={50}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pauseAnim"
                      checked={config.pauseAnimations}
                      onCheckedChange={(c) => setConfig({ ...config, pauseAnimations: !!c })}
                    />
                    <Label htmlFor="pauseAnim" className="text-sm">アニメーション停止</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hideFixed"
                      checked={config.hideFixed}
                      onCheckedChange={(c) => setConfig({ ...config, hideFixed: !!c })}
                    />
                    <Label htmlFor="hideFixed" className="text-sm">固定要素を非表示</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="preScroll"
                      checked={config.preRenderScroll}
                      onCheckedChange={(c) => setConfig({ ...config, preRenderScroll: !!c })}
                    />
                    <Label htmlFor="preScroll" className="text-sm">遅延読み込みを事前スクロールで描画</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OCR Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">OCR設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">チャンク高さ(px): {config.chunkHeight}</Label>
                  <Slider
                    value={[config.chunkHeight]}
                    onValueChange={([v]) => setConfig({ ...config, chunkHeight: v })}
                    min={2000}
                    max={10000}
                    step={500}
                  />
                  <p className="text-xs text-muted-foreground">大きいほど分割数減少（API負荷増）</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">並列処理数: {config.parallelWorkers}</Label>
                  <Slider
                    value={[config.parallelWorkers]}
                    onValueChange={([v]) => setConfig({ ...config, parallelWorkers: v })}
                    min={1}
                    max={8}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column: Preview & OCR */}
          <div className="space-y-4 lg:col-span-2">
            {/* Screenshot Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>📷 スクショプレビュー</span>
                  {screenshotDimensions && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {screenshotDimensions.width}×{screenshotDimensions.height}px
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {screenshotDataUrl ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-auto bg-muted/20" style={{ maxHeight: 400 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotDataUrl}
                        alt="LP Screenshot"
                        className="w-full h-auto"
                      />
                    </div>
                    
                    {/* OCR Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={handleParallelOcr}
                        disabled={ocrLoading}
                        className="flex-1"
                      >
                        {ocrLoading ? "⏳ OCR処理中..." : "⚡ 並列OCRで文字起こし"}
                      </Button>
                      <Button
                        onClick={handleSimpleOcr}
                        disabled={ocrLoading}
                        variant="outline"
                      >
                        🔍 シンプルOCR
                      </Button>
                    </div>
                    
                    {/* OCR Progress */}
                    {ocrLoading && chunks.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>並列OCR進行中...</span>
                          <span>{Math.round(ocrProgress)}%</span>
                        </div>
                        <Progress value={ocrProgress} />
                        <div className="flex gap-1 flex-wrap">
                          {chunks.map((chunk) => (
                            <div
                              key={chunk.index}
                              className={`w-8 h-8 rounded text-xs flex items-center justify-center ${
                                chunk.status === "completed"
                                  ? "bg-green-500 text-white"
                                  : chunk.status === "processing"
                                  ? "bg-blue-500 text-white animate-pulse"
                                  : chunk.status === "error"
                                  ? "bg-red-500 text-white"
                                  : "bg-muted"
                              }`}
                              title={`y=${chunk.yStart}~${chunk.yEnd}`}
                            >
                              {chunk.index + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-2">📷</div>
                    <p>URLを入力してスクショを撮影してください</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OCR Result & Logs */}
            <Card>
              <CardHeader className="pb-3">
                <Tabs defaultValue="text" className="w-full">
                  <div className="flex items-center justify-between">
                    <TabsList>
                      <TabsTrigger value="text">抽出テキスト</TabsTrigger>
                      <TabsTrigger value="logs">進捗ログ</TabsTrigger>
                    </TabsList>
                    {ocrText && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={copySuccess ? "default" : "outline"}
                          onClick={handleCopyText}
                        >
                          {copySuccess ? "✓ コピー完了" : "📋 テキストをコピー"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDownloadText}
                        >
                          💾 テキストをダウンロード
                        </Button>
                      </div>
                    )}
                  </div>

                  <TabsContent value="text" className="mt-4">
                    {ocrText ? (
                      <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap overflow-auto max-h-96">
                        {ocrText}
                      </pre>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>スクショ撮影後、OCRボタンをクリックしてください</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="logs" className="mt-4">
                    <div className="bg-muted p-4 rounded-lg max-h-96 overflow-auto font-mono text-xs space-y-1">
                      {logs.length === 0 ? (
                        <p className="text-muted-foreground">ログがありません</p>
                      ) : (
                        logs.map((log, i) => (
                          <div
                            key={i}
                            className={
                              log.type === "error"
                                ? "text-red-500"
                                : log.type === "success"
                                ? "text-green-500"
                                : log.type === "progress"
                                ? "text-blue-500"
                                : ""
                            }
                          >
                            <span className="text-muted-foreground">
                              [{log.timestamp.toLocaleTimeString()}]
                            </span>{" "}
                            {log.message}
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>

            {/* Stats */}
            {screenshotDimensions && (
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{screenshotDimensions.height.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">高さ (px)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{tileCount}</div>
                    <div className="text-xs text-muted-foreground">タイル数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{geminiModel.split("-").pop()}</div>
                    <div className="text-xs text-muted-foreground">モデル</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{elapsedTime.toFixed(1)}s</div>
                    <div className="text-xs text-muted-foreground">処理時間</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

