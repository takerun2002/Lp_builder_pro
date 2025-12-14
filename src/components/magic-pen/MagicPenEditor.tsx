"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MagicPenEditorProps {
  initialImageDataUrl: string;
  projectId: string;
  onApply: (imageDataUrl: string, width: number, height: number) => Promise<void>;
  onCancel: () => void;
}

interface SwipeFile {
  id: string;
  name: string;
  file_path: string;
}

type Tool = "brush" | "eraser";

type MagicPenResponse =
  | { ok: true; imageDataUrl: string; modelUsed?: string; elapsedMs?: number }
  | { ok: false; error?: { message?: string; status?: number } };

const parseMagicPenResponse = async (res: Response): Promise<MagicPenResponse> => {
  const raw = await res.text();
  if (!raw) {
    console.error("[magic-pen] Empty response from /api/dev/gemini/magic-pen", { status: res.status });
    return { ok: false, error: { message: `サーバーから空のレスポンス (status=${res.status})`, status: res.status } };
  }
  try {
    return JSON.parse(raw) as MagicPenResponse;
  } catch (err) {
    console.error("[magic-pen] Failed to parse JSON response", {
      status: res.status,
      bodyPreview: raw.slice(0, 500),
      err,
    });
    return { ok: false, error: { message: `レスポンス解析に失敗しました (status=${res.status})`, status: res.status } };
  }
};

export function MagicPenEditor({
  initialImageDataUrl,
  projectId,
  onApply,
  onCancel,
}: MagicPenEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);

  // Drawing state
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Load image and setup canvases
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

      // Calculate scale to fit in container
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const containerHeight = containerRef.current.clientHeight - 200;
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        setScale(Math.min(scaleX, scaleY, 1));
      }

      // Setup main canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        canvasRef.current.width = img.naturalWidth;
        canvasRef.current.height = img.naturalHeight;
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
      }

      // Setup mask canvas
      if (maskCanvasRef.current) {
        maskCanvasRef.current.width = img.naturalWidth;
        maskCanvasRef.current.height = img.naturalHeight;
        const ctx = maskCanvasRef.current.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
        }
      }
    };
    img.src = initialImageDataUrl;
  }, [initialImageDataUrl]);

  // Fetch swipe files for reference
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

  // Get canvas coordinates
  const getCanvasPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  // Draw on mask
  const draw = useCallback(
    (x: number, y: number) => {
      if (!maskCanvasRef.current) return;
      const ctx = maskCanvasRef.current.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = tool === "brush" ? "white" : "black";
      ctx.fill();

      // Draw line from last position for smooth strokes
      if (lastPosRef.current.x !== 0 || lastPosRef.current.y !== 0) {
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(x, y);
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.strokeStyle = tool === "brush" ? "white" : "black";
        ctx.stroke();
      }
    },
    [brushSize, tool]
  );

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

  // Clear mask
  const clearMask = () => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, imageSize.width, imageSize.height);
    }
  };

  // Generate with Magic Pen
  const handleGenerate = async () => {
    if (!prompt.trim() || !maskCanvasRef.current) return;

    setGenerating(true);
    setGeneratedImage(null);

    try {
      const maskDataUrl = maskCanvasRef.current.toDataURL("image/png");

      // Prepare reference images
      const refImages: { mimeType: string; base64: string }[] = [];
      for (const refId of selectedRefIds.slice(0, 6)) {
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
            refImages.push({ mimeType: match[1], base64: match[2] });
          }
        } catch (err) {
          console.error("Failed to load ref image:", err);
        }
      }

      const res = await fetch("/api/dev/gemini/magic-pen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageDataUrl: initialImageDataUrl,
          maskDataUrl,
          refImages,
        }),
      });

      const data = await parseMagicPenResponse(res);
      if (!res.ok && data.ok) {
        alert(`サーバーエラーが発生しました (status=${res.status})`);
        return;
      }
      if (data.ok) {
        setGeneratedImage(data.imageDataUrl);
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

  // Apply generated image
  const handleApply = async () => {
    if (!generatedImage) return;
    setApplying(true);
    try {
      await onApply(generatedImage, imageSize.width, imageSize.height);
    } finally {
      setApplying(false);
    }
  };

  // Toggle reference image selection
  const toggleRef = (id: string) => {
    setSelectedRefIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 6)
    );
  };

  return (
    <div className="flex h-full">
      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-4 shrink-0">
          <div className="flex gap-2">
            <Button
              variant={tool === "brush" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("brush")}
            >
              ブラシ
            </Button>
            <Button
              variant={tool === "eraser" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("eraser")}
            >
              消しゴム
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">サイズ: {brushSize}</span>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <Button variant="outline" size="sm" onClick={clearMask}>
            クリア
          </Button>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden relative">
          <div style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
            <canvas
              ref={maskCanvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                opacity: 0.5,
                mixBlendMode: "multiply",
                cursor: "crosshair",
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2 text-center">
          編集したい領域をブラシで塗ってください（白い部分が編集対象）
        </p>
      </div>

      {/* Right Panel */}
      <div className="w-80 border-l bg-card flex flex-col p-4 space-y-4">
        {/* Prompt */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">編集指示</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例: この部分を青いボタンに変更&#10;例: 背景を夕焼けに変更"
              className="w-full h-24 p-2 text-sm border rounded resize-none bg-background"
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              size="sm"
              className="w-full"
            >
              {generating ? "生成中..." : "生成"}
            </Button>
          </CardContent>
        </Card>

        {/* Reference Images */}
        {swipeFiles.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">参考画像（最大6枚）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                {swipeFiles.map((sf) => {
                  const filename = sf.file_path.split("/").pop();
                  const isSelected = selectedRefIds.includes(sf.id);
                  return (
                    <button
                      key={sf.id}
                      onClick={() => toggleRef(sf.id)}
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
            </CardContent>
          </Card>
        )}

        {/* Generated Result */}
        {generatedImage && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">生成結果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full h-auto"
                />
              </div>
              <Button
                onClick={handleApply}
                disabled={applying}
                size="sm"
                className="w-full"
              >
                {applying ? "適用中..." : "この結果を適用"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="mt-auto pt-4">
          <Button variant="outline" onClick={onCancel} className="w-full">
            キャンセル
          </Button>
        </div>
      </div>
    </div>
  );
}
