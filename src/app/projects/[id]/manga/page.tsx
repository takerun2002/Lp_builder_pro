"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MangaStyle = "4koma" | "banner" | "hero" | "story";
type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";
type ColorMode = "fullcolor" | "monochrome";
type EditTool = "brush" | "eraser";

interface SwipeFile {
  id: string;
  name: string;
  file_path: string;
}

interface HistoryItem {
  imageDataUrl: string;
  timestamp: number;
}

const STYLE_OPTIONS: { value: MangaStyle; label: string; description: string }[] = [
  { value: "banner", label: "漫画バナー", description: "広告向けインパクト漫画" },
  { value: "hero", label: "ファーストビュー", description: "LPヒーロー向け" },
  { value: "4koma", label: "4コマ漫画", description: "縦長4コマ形式" },
  { value: "story", label: "ストーリー", description: "複数コマ構成" },
];

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" },
];

export default function MangaGeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Tab state
  const [activeTab, setActiveTab] = useState<"generate" | "edit" | "merge">("generate");

  // Generate state
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<MangaStyle>("banner");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [colorMode, setColorMode] = useState<ColorMode>("fullcolor");
  const [generating, setGenerating] = useState(false);

  // Current image
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Edit mode state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [editTool, setEditTool] = useState<EditTool>("brush");
  const [brushSize, setBrushSize] = useState(30);
  const [editPrompt, setEditPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Merge state
  const [mergeImages, setMergeImages] = useState<string[]>([]);
  const [mergePrompt, setMergePrompt] = useState("");
  const [merging, setMerging] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);

  // References
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);
  const [selectedCharRefs, setSelectedCharRefs] = useState<string[]>([]);

  // File input ref for merge
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch swipe files
  useEffect(() => {
    async function fetchSwipeFiles() {
      try {
        const res = await fetch(`/api/swipe-files?projectId=${projectId}`);
        const data = await res.json();
        if (data.ok) {
          setSwipeFiles(data.swipeFiles);
        }
      } catch (err) {
        console.error("Failed to fetch swipe files:", err);
      }
    }
    fetchSwipeFiles();
  }, [projectId]);

  // Add to history
  const addToHistory = useCallback((imageDataUrl: string) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ imageDataUrl, timestamp: Date.now() });
      return newHistory.slice(-20); // Keep last 20 items
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 19));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentImage(history[prevIndex].imageDataUrl);
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentImage(history[nextIndex].imageDataUrl);
    }
  }, [historyIndex, history]);

  // Toggle character reference
  const toggleCharRef = useCallback((id: string) => {
    setSelectedCharRefs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4)
    );
  }, []);

  // Load reference images as base64
  const loadRefImages = async (): Promise<{ mimeType: string; base64: string }[]> => {
    const refs: { mimeType: string; base64: string }[] = [];
    for (const refId of selectedCharRefs) {
      const sf = swipeFiles.find((s) => s.id === refId);
      if (!sf) continue;
      try {
        const filename = sf.file_path.split("/").pop();
        const res = await fetch(`/api/images/${filename}`);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          refs.push({ mimeType: match[1], base64: match[2] });
        }
      } catch (err) {
        console.error("Failed to load ref:", err);
      }
    }
    return refs;
  };

  // Generate manga
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);

    try {
      const characterRefs = await loadRefImages();
      const res = await fetch("/api/generate/manga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, aspectRatio, colorMode, characterRefs }),
      });

      const data = await res.json();
      if (data.ok) {
        setCurrentImage(data.imageDataUrl);
        addToHistory(data.imageDataUrl);
      } else {
        alert(data.error?.message || "生成に失敗しました");
      }
    } catch (err) {
      console.error("Generate error:", err);
      alert("生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  // Setup edit canvas when switching to edit mode
  useEffect(() => {
    if (activeTab === "edit" && currentImage && canvasRef.current && maskCanvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const maskCanvas = maskCanvasRef.current!;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        maskCanvas.width = img.naturalWidth;
        maskCanvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }

        const maskCtx = maskCanvas.getContext("2d");
        if (maskCtx) {
          maskCtx.fillStyle = "black";
          maskCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
        }

        // Calculate scale to fit
        const containerWidth = 600;
        const containerHeight = 500;
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        setCanvasScale(Math.min(scaleX, scaleY, 1));
      };
      img.src = currentImage;
    }
  }, [activeTab, currentImage]);

  // Canvas drawing functions
  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = maskCanvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / canvasScale,
      y: (e.clientY - rect.top) / canvasScale,
    };
  }, [canvasScale]);

  const draw = useCallback((x: number, y: number) => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = editTool === "brush" ? "white" : "black";
    ctx.fill();

    if (lastPosRef.current.x !== 0 || lastPosRef.current.y !== 0) {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.strokeStyle = editTool === "brush" ? "white" : "black";
      ctx.stroke();
    }
  }, [brushSize, editTool]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    draw(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pos = getCanvasPos(e);
    draw(pos.x, pos.y);
    lastPosRef.current = pos;
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = { x: 0, y: 0 };
  };

  const clearMask = () => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
  };

  // Magic Pen edit
  const handleMagicEdit = async () => {
    if (!editPrompt.trim() || !maskCanvasRef.current || !currentImage) return;
    setEditing(true);

    try {
      const maskDataUrl = maskCanvasRef.current.toDataURL("image/png");
      const refImages = await loadRefImages();

      const res = await fetch("/api/dev/gemini/magic-pen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editPrompt,
          imageDataUrl: currentImage,
          maskDataUrl,
          refImages,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setCurrentImage(data.imageDataUrl);
        addToHistory(data.imageDataUrl);
        clearMask();
        setEditPrompt("");
      } else {
        alert(data.error?.message || "編集に失敗しました");
      }
    } catch (err) {
      console.error("Edit error:", err);
      alert("編集に失敗しました");
    } finally {
      setEditing(false);
    }
  };

  // Handle merge file upload
  const handleMergeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setMergeImages((prev) => [...prev, dataUrl].slice(0, 6));
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = "";
  };

  // Add current image to merge
  const addCurrentToMerge = () => {
    if (currentImage && mergeImages.length < 6) {
      setMergeImages((prev) => [...prev, currentImage]);
    }
  };

  // Remove from merge
  const removeFromMerge = (index: number) => {
    setMergeImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Merge images
  const handleMerge = async () => {
    if (mergeImages.length < 2 || !mergePrompt.trim()) return;
    setMerging(true);

    try {
      const refImages = mergeImages.map((dataUrl) => {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        return match ? { mimeType: match[1], base64: match[2] } : null;
      }).filter(Boolean) as { mimeType: string; base64: string }[];

      const res = await fetch("/api/generate/manga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の参照画像を元に、これらの要素を組み合わせて新しい漫画を生成してください。\n\n${mergePrompt}`,
          style,
          aspectRatio,
          colorMode,
          characterRefs: refImages,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setCurrentImage(data.imageDataUrl);
        addToHistory(data.imageDataUrl);
        setActiveTab("generate");
      } else {
        alert(data.error?.message || "マージに失敗しました");
      }
    } catch (err) {
      console.error("Merge error:", err);
      alert("マージに失敗しました");
    } finally {
      setMerging(false);
    }
  };

  // Save to section
  const handleSaveAsSection = async () => {
    if (!currentImage) return;
    setSaving(true);

    try {
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = currentImage;
      });

      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `漫画${style === "4koma" ? "（4コマ）" : style === "banner" ? "バナー" : style === "hero" ? "ヒーロー" : "ストーリー"}`,
          imageDataUrl: currentImage,
          width: dimensions.width,
          height: dimensions.height,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        alert("セクションとして保存しました");
        router.push(`/projects/${projectId}`);
      } else {
        throw new Error(data.error?.message);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // Download
  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `manga-${style}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm">← 戻る</Button>
            </Link>
            <h1 className="text-lg font-semibold">漫画ジェネレーター</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              ↩ 戻す
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              ↪ やり直す
            </Button>
            {currentImage && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  ダウンロード
                </Button>
                <Button size="sm" onClick={handleSaveAsSection} disabled={saving}>
                  {saving ? "保存中..." : "セクションとして保存"}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 border-r bg-card p-4 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="generate" className="flex-1">生成</TabsTrigger>
              <TabsTrigger value="edit" className="flex-1" disabled={!currentImage}>編集</TabsTrigger>
              <TabsTrigger value="merge" className="flex-1">マージ</TabsTrigger>
            </TabsList>

            {/* Generate Tab */}
            <TabsContent value="generate" className="space-y-4 mt-0">
              {/* Style */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">スタイル</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStyle(opt.value)}
                      className={`p-2 rounded border text-left text-xs transition-colors ${
                        style === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-muted-foreground">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">プロンプト</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例: 笑顔の女性が商品を紹介。「効率アップ！」のセリフ付き"
                  className="min-h-[100px] text-sm"
                />
              </div>

              {/* Options */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">比率</Label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                  >
                    {ASPECT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">カラー</Label>
                  <select
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value as ColorMode)}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                  >
                    <option value="fullcolor">フルカラー</option>
                    <option value="monochrome">モノクロ</option>
                  </select>
                </div>
              </div>

              {/* Character refs */}
              {swipeFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">キャラ参照（最大4枚）</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {swipeFiles.slice(0, 8).map((sf) => {
                      const filename = sf.file_path.split("/").pop();
                      const isSelected = selectedCharRefs.includes(sf.id);
                      return (
                        <button
                          key={sf.id}
                          onClick={() => toggleCharRef(sf.id)}
                          className={`aspect-square rounded overflow-hidden border-2 ${
                            isSelected ? "border-primary" : "border-transparent"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/images/${filename}`}
                            alt={sf.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="w-full"
              >
                {generating ? "生成中..." : "漫画を生成"}
              </Button>
            </TabsContent>

            {/* Edit Tab */}
            <TabsContent value="edit" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm font-medium">ツール</Label>
                <div className="flex gap-2">
                  <Button
                    variant={editTool === "brush" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditTool("brush")}
                    className="flex-1"
                  >
                    ブラシ
                  </Button>
                  <Button
                    variant={editTool === "eraser" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditTool("eraser")}
                    className="flex-1"
                  >
                    消しゴム
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">サイズ: {brushSize}</Label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <Button variant="outline" size="sm" onClick={clearMask} className="w-full">
                マスクをクリア
              </Button>

              <div className="space-y-2">
                <Label className="text-sm font-medium">編集指示</Label>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="例: この部分を青い空に変更"
                  className="min-h-[80px] text-sm"
                />
              </div>

              <Button
                onClick={handleMagicEdit}
                disabled={editing || !editPrompt.trim()}
                className="w-full"
              >
                {editing ? "編集中..." : "Magic編集を実行"}
              </Button>

              <p className="text-xs text-muted-foreground">
                編集したい領域をブラシで塗ってから、編集指示を入力してください
              </p>
            </TabsContent>

            {/* Merge Tab */}
            <TabsContent value="merge" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm font-medium">マージする画像（2〜6枚）</Label>
                <div className="grid grid-cols-3 gap-2">
                  {mergeImages.map((img, i) => (
                    <div key={i} className="relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`Merge ${i + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                      <button
                        onClick={() => removeFromMerge(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {mergeImages.length < 6 && (
                    <button
                      onClick={() => mergeFileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed rounded flex items-center justify-center text-muted-foreground hover:border-primary/50"
                    >
                      +追加
                    </button>
                  )}
                </div>
                <input
                  ref={mergeFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleMergeFileChange}
                />
              </div>

              {currentImage && mergeImages.length < 6 && (
                <Button variant="outline" size="sm" onClick={addCurrentToMerge} className="w-full">
                  現在の画像を追加
                </Button>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">マージ指示</Label>
                <Textarea
                  value={mergePrompt}
                  onChange={(e) => setMergePrompt(e.target.value)}
                  placeholder="例: キャラクターを背景に配置して、吹き出しを追加"
                  className="min-h-[80px] text-sm"
                />
              </div>

              <Button
                onClick={handleMerge}
                disabled={merging || mergeImages.length < 2 || !mergePrompt.trim()}
                className="w-full"
              >
                {merging ? "マージ中..." : "画像をマージ"}
              </Button>

              <p className="text-xs text-muted-foreground">
                複数の画像（キャラ、背景など）を組み合わせて新しい漫画を生成
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-muted/20 p-4 overflow-auto">
          {activeTab === "edit" && currentImage ? (
            <div className="relative">
              <canvas
                ref={canvasRef}
                style={{
                  transform: `scale(${canvasScale})`,
                  transformOrigin: "top left",
                }}
              />
              <canvas
                ref={maskCanvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `scale(${canvasScale})`,
                  transformOrigin: "top left",
                  opacity: 0.4,
                  mixBlendMode: "multiply",
                  cursor: "crosshair",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          ) : generating || editing || merging ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                {generating ? "漫画を生成中..." : editing ? "編集中..." : "マージ中..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">20〜60秒程度</p>
            </div>
          ) : currentImage ? (
            <div className="max-w-full max-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage}
                alt="Generated manga"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-lg">漫画ジェネレーター</p>
              <p className="text-sm mt-2">左パネルからプロンプトを入力して生成</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
