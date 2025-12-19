"use client";

/**
 * MagicPenEditorV2 - 番号付きマスク & インラインチャット版
 *
 * Manus AI風のUXを実装:
 * - マジックペンで塗った領域に番号（①②③...）を表示
 * - 塗り終わると、領域の近くにインラインチャットボックスが出現
 * - 各領域に個別の編集指示を入力可能
 * - 領域ごとに生成・プレビュー・適用
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionChatBox } from "./RegionChatBox";
import { RegionList } from "./RegionList";
import { ReferenceLPSelector } from "@/components/workspace/ReferenceLPSelector";
import {
  type MaskRegion,
  generateRegionId,
  detectBoundingBox,
  calculateCentroid,
  extractRegionMask,
  isValidRegion,
} from "./utils/region-detection";
import { Undo2, Redo2, Eraser, Brush, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// === Types ===
interface RefImage {
  mimeType: string;
  base64: string;
}

interface SwipeFile {
  id: string;
  name: string;
  file_path: string;
  category?: string;
  tone_manner?: string;
}

export interface MagicPenEditorV2Props {
  imageDataUrl: string;
  projectId?: string; // Optional for future use
  refImages?: RefImage[];
  onSave: (resultDataUrl: string) => Promise<void>;
  onCancel: () => void;
}

// === Utils ===
function canvasPointFromEvent(
  e: MouseEvent,
  canvasEl: HTMLCanvasElement,
  zoom: number
) {
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / zoom,
    y: (e.clientY - rect.top) / zoom,
  };
}

// === Main Component ===
export function MagicPenEditorV2({
  imageDataUrl: initialImageDataUrl,
  refImages = [],
  onSave,
  onCancel,
}: MagicPenEditorV2Props) {
  // Canvas refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempMaskCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string>(initialImageDataUrl);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

  // Tool state
  const [brushSize, setBrushSize] = useState(30);
  const [brushTool, setBrushTool] = useState<"brush" | "eraser">("brush");

  // Region state
  const [regions, setRegions] = useState<MaskRegion[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

  // Drawing refs
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Reference LP state
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);
  const [selectedReferenceLP, setSelectedReferenceLP] = useState<string | null>(null);

  // === Load image ===
  const loadImage = useCallback((dataUrl: string) => {
    setImageDataUrl(dataUrl);
    const img = new Image();
    img.onload = () => {
      const ns = { width: img.naturalWidth, height: img.naturalHeight };
      setNaturalSize(ns);

      // Initialize all canvases
      [imageCanvasRef, maskCanvasRef, tempMaskCanvasRef, overlayCanvasRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = ns.width;
          ref.current.height = ns.height;
        }
      });

      // Draw image
      const imgCtx = imageCanvasRef.current?.getContext("2d");
      if (imgCtx) imgCtx.drawImage(img, 0, 0);

      setImageLoaded(true);
      setRegions([]);
      setActiveRegionId(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setZoom(1);
    };
    img.src = dataUrl;
  }, []);

  useEffect(() => {
    loadImage(initialImageDataUrl);
  }, [initialImageDataUrl, loadImage]);

  // Fetch swipe files for reference LP selection
  useEffect(() => {
    const fetchSwipeFiles = async () => {
      try {
        // Try project-specific endpoint first, fall back to global
        const res = await fetch("/api/swipe-files");
        if (res.ok) {
          const data = await res.json();
          setSwipeFiles(data.swipeFiles || data || []);
        }
      } catch {
        // Silently fail - swipe files are optional
      }
    };
    fetchSwipeFiles();
  }, []);

  // === Update container offset for chat box positioning ===
  useEffect(() => {
    const updateOffset = () => {
      if (canvasContainerRef.current && imageCanvasRef.current) {
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const canvasRect = imageCanvasRef.current.getBoundingClientRect();
        setContainerOffset({
          x: canvasRect.left - containerRect.left,
          y: canvasRect.top - containerRect.top,
        });
      }
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [imageLoaded, zoom]);

  // === Mask operations ===
  const getTempMaskCtx = useCallback(() => tempMaskCanvasRef.current?.getContext("2d") || null, []);

  const pushUndo = useCallback(() => {
    const canvas = tempMaskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current.push(imageData);
      if (undoStackRef.current.length > 30) undoStackRef.current.shift();
      redoStackRef.current = [];
    } catch {
      // Ignore
    }
  }, []);

  const doUndo = useCallback(() => {
    const canvas = tempMaskCanvasRef.current;
    if (!canvas || !undoStackRef.current.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    redoStackRef.current.push(currentData);

    const prevData = undoStackRef.current.pop()!;
    ctx.putImageData(prevData, 0, 0);
    updateViewCanvas();
  }, []);

  const doRedo = useCallback(() => {
    const canvas = tempMaskCanvasRef.current;
    if (!canvas || !redoStackRef.current.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(currentData);

    const nextData = redoStackRef.current.pop()!;
    ctx.putImageData(nextData, 0, 0);
    updateViewCanvas();
  }, []);

  const clearTempMask = useCallback(() => {
    const canvas = tempMaskCanvasRef.current;
    if (!canvas) return;
    pushUndo();
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateViewCanvas();
  }, [pushUndo]);

  // === Update view canvas (show mask overlay) ===
  const updateViewCanvas = useCallback(() => {
    const maskCanvas = tempMaskCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!maskCanvas || !overlayCanvas || !naturalSize) return;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw temp mask with semi-transparent red
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "rgba(59, 130, 246, 0.5)";

    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx) {
      const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      for (let y = 0; y < maskCanvas.height; y++) {
        for (let x = 0; x < maskCanvas.width; x++) {
          const idx = (y * maskCanvas.width + x) * 4;
          if (imageData.data[idx + 3] > 10) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }
    ctx.restore();

    // Draw region numbers
    regions.forEach((region) => {
      const { x, y } = region.centroid;
      const radius = 14;

      // Circle background
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        region.id === activeRegionId
          ? "#3b82f6"
          : region.status === "done"
          ? "#22c55e"
          : region.status === "generating"
          ? "#eab308"
          : "#6b7280";
      ctx.fill();

      // Number text
      ctx.fillStyle = "white";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(region.number.toString(), x, y);

      // Selection highlight
      if (region.id === activeRegionId) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          region.boundingBox.x,
          region.boundingBox.y,
          region.boundingBox.width,
          region.boundingBox.height
        );
        ctx.setLineDash([]);
      }
    });
  }, [naturalSize, regions, activeRegionId]);

  useEffect(() => {
    updateViewCanvas();
  }, [updateViewCanvas]);

  // === Drawing ===
  const beginDraw = useCallback(
    (x: number, y: number) => {
      const ctx = getTempMaskCtx();
      if (!ctx) return;
      isDrawingRef.current = true;
      pushUndo();

      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = brushSize;

      if (brushTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(255,255,255,1)";
      }

      lastPtRef.current = { x, y };

      // Draw initial dot
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = brushTool === "eraser" ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)";
      if (brushTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      }
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      updateViewCanvas();
    },
    [brushSize, brushTool, getTempMaskCtx, pushUndo, updateViewCanvas]
  );

  const drawTo = useCallback(
    (x: number, y: number) => {
      if (!isDrawingRef.current) return;
      const ctx = getTempMaskCtx();
      if (!ctx) return;

      const lx = lastPtRef.current?.x ?? x;
      const ly = lastPtRef.current?.y ?? y;

      ctx.globalCompositeOperation =
        brushTool === "eraser" ? "destination-out" : "source-over";
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastPtRef.current = { x, y };
      updateViewCanvas();
    },
    [brushTool, getTempMaskCtx, updateViewCanvas]
  );

  const endDraw = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPtRef.current = null;

    const ctx = getTempMaskCtx();
    if (ctx) ctx.globalCompositeOperation = "source-over";

    // Detect and register new region
    const tempMask = tempMaskCanvasRef.current;
    if (!tempMask) return;

    const boundingBox = detectBoundingBox(tempMask);
    if (!boundingBox || !isValidRegion(boundingBox)) return;

    const centroid = calculateCentroid(tempMask, boundingBox);
    const maskDataUrl = extractRegionMask(tempMask, boundingBox);

    const newRegion: MaskRegion = {
      id: generateRegionId(),
      number: regions.length + 1,
      boundingBox,
      maskDataUrl,
      centroid,
      prompt: "",
      status: "idle",
    };

    setRegions((prev) => [...prev, newRegion]);
    setActiveRegionId(newRegion.id);

    // Clear temp mask for next region
    const tempCtx = tempMask.getContext("2d");
    if (tempCtx) tempCtx.clearRect(0, 0, tempMask.width, tempMask.height);

    // Copy to main mask canvas
    const mainMask = maskCanvasRef.current;
    if (mainMask) {
      const mainCtx = mainMask.getContext("2d");
      if (mainCtx) {
        // Load the mask and draw it
        const img = new Image();
        img.onload = () => {
          mainCtx.drawImage(img, 0, 0);
        };
        img.src = maskDataUrl;
      }
    }

    updateViewCanvas();
  }, [getTempMaskCtx, regions.length, updateViewCanvas]);

  // === Mouse handlers ===
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || !naturalSize) return;

    const handleMouseDown = (e: MouseEvent) => {
      const pt = canvasPointFromEvent(e, overlay, zoom);
      beginDraw(pt.x, pt.y);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const pt = canvasPointFromEvent(e, overlay, zoom);
      drawTo(pt.x, pt.y);
    };

    const handleMouseUp = () => {
      endDraw();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setZoom((z) => Math.min(4, Math.max(0.25, z * factor)));
      }
    };

    overlay.addEventListener("mousedown", handleMouseDown);
    overlay.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    overlay.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      overlay.removeEventListener("mousedown", handleMouseDown);
      overlay.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
      overlay.removeEventListener("wheel", handleWheel);
    };
  }, [naturalSize, zoom, beginDraw, drawTo, endDraw, doUndo, doRedo]);

  // === Region operations ===
  const updateRegionPrompt = useCallback((id: string, prompt: string) => {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, prompt } : r)));
  }, []);

  const deleteRegion = useCallback(
    (id: string) => {
      setRegions((prev) => {
        const filtered = prev.filter((r) => r.id !== id);
        // Renumber remaining regions
        return filtered.map((r, idx) => ({ ...r, number: idx + 1 }));
      });
      if (activeRegionId === id) {
        setActiveRegionId(null);
      }
    },
    [activeRegionId]
  );

  const generateRegion = useCallback(
    async (id: string) => {
      const region = regions.find((r) => r.id === id);
      if (!region || !region.prompt.trim()) return;

      setRegions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "generating" } : r))
      );

      try {
        const res = await fetch("/api/dev/gemini/magic-pen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: region.prompt,
            imageDataUrl,
            maskDataUrl: region.maskDataUrl,
            refImages: refImages.map((r) => ({ mimeType: r.mimeType, base64: r.base64 })),
            refSwipeIds: selectedReferenceLP ? [selectedReferenceLP] : [],
          }),
        });

        const data = await res.json();

        if (data.ok) {
          // Composite the result with the original image using the mask
          const compositedDataUrl = await compositeWithMask(
            imageDataUrl,
            data.imageDataUrl,
            region.maskDataUrl
          );

          setRegions((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, status: "done", resultDataUrl: compositedDataUrl } : r
            )
          );
        } else {
          setRegions((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: "error" } : r))
          );
        }
      } catch {
        setRegions((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "error" } : r))
        );
      }
    },
    [regions, imageDataUrl, refImages, selectedReferenceLP]
  );

  const applyRegionResult = useCallback(
    (id: string) => {
      const region = regions.find((r) => r.id === id);
      if (!region?.resultDataUrl) return;

      // Update the base image with the result
      setImageDataUrl(region.resultDataUrl);
      loadImage(region.resultDataUrl);

      // Remove the applied region
      deleteRegion(id);
    },
    [regions, loadImage, deleteRegion]
  );

  const generateAllRegions = useCallback(async () => {
    const regionsToGenerate = regions.filter(
      (r) => r.prompt.trim() && r.status !== "generating" && r.status !== "done"
    );

    for (const region of regionsToGenerate) {
      await generateRegion(region.id);
    }
  }, [regions, generateRegion]);

  const applyAllResults = useCallback(() => {
    const doneRegions = regions.filter((r) => r.status === "done" && r.resultDataUrl);
    if (doneRegions.length === 0) return;

    // Apply regions one by one (they composite on top of each other)
    let currentImage = imageDataUrl;

    const applyNext = async (index: number) => {
      if (index >= doneRegions.length) {
        setImageDataUrl(currentImage);
        loadImage(currentImage);
        setRegions([]);
        setActiveRegionId(null);
        return;
      }

      const region = doneRegions[index];
      if (region.resultDataUrl) {
        currentImage = region.resultDataUrl;
      }
      applyNext(index + 1);
    };

    applyNext(0);
  }, [regions, imageDataUrl, loadImage]);

  const clearAllRegions = useCallback(() => {
    if (regions.length > 0 && !confirm("全ての領域をクリアしますか？")) return;
    setRegions([]);
    setActiveRegionId(null);

    // Clear mask canvas
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const ctx = maskCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    updateViewCanvas();
  }, [regions.length, updateViewCanvas]);

  // === Composite helper ===
  const compositeWithMask = useCallback(
    async (
      originalDataUrl: string,
      generatedDataUrl: string,
      maskDataUrl: string
    ): Promise<string> => {
      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      const [originalImg, generatedImg, maskImg] = await Promise.all([
        loadImg(originalDataUrl),
        loadImg(generatedDataUrl),
        loadImg(maskDataUrl),
      ]);

      const w = originalImg.naturalWidth;
      const h = originalImg.naturalHeight;

      // Create layer with generated content masked
      const layerB = document.createElement("canvas");
      layerB.width = w;
      layerB.height = h;
      const ctxB = layerB.getContext("2d")!;
      ctxB.drawImage(generatedImg, 0, 0, w, h);
      ctxB.globalCompositeOperation = "destination-in";
      ctxB.drawImage(maskImg, 0, 0, w, h);
      ctxB.globalCompositeOperation = "source-over";

      // Composite on original
      const final = document.createElement("canvas");
      final.width = w;
      final.height = h;
      const ctxF = final.getContext("2d")!;
      ctxF.drawImage(originalImg, 0, 0, w, h);
      ctxF.drawImage(layerB, 0, 0);

      return final.toDataURL("image/png");
    },
    []
  );

  // === Save result ===
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(imageDataUrl);
    } finally {
      setSaving(false);
    }
  };

  // === Display size ===
  const getDisplaySize = useCallback(() => {
    if (!naturalSize) return { width: 600, height: 400 };
    return { width: naturalSize.width * zoom, height: naturalSize.height * zoom };
  }, [naturalSize, zoom]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card shrink-0 z-10 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            ← 戻る
          </Button>
          <h1 className="font-semibold">Magic Pen V2</h1>
          <span className="text-xs text-muted-foreground">
            {regions.length}個の領域
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存して完了"}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30">
            {/* Brush/Eraser */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={brushTool === "brush" ? "default" : "outline"}
                onClick={() => setBrushTool("brush")}
              >
                <Brush className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={brushTool === "eraser" ? "default" : "outline"}
                onClick={() => setBrushTool("eraser")}
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">サイズ:</span>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs w-8">{brushSize}px</span>
            </div>

            {/* Undo/Redo */}
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={doUndo}>
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={doRedo}>
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Clear */}
            <Button size="sm" variant="outline" onClick={clearTempMask}>
              <RotateCcw className="w-4 h-4 mr-1" />
              クリア
            </Button>

            {/* Zoom */}
            <div className="flex items-center gap-1 ml-auto">
              <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={canvasContainerRef}
            className="flex-1 overflow-auto bg-muted/20 relative"
            onClick={() => setActiveRegionId(null)}
          >
            <div
              className="inline-block relative"
              style={{
                minWidth: "100%",
                minHeight: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
              }}
            >
              <div
                className="relative border rounded-lg overflow-hidden shadow-lg bg-white"
                style={{
                  width: getDisplaySize().width,
                  height: getDisplaySize().height,
                }}
              >
                {/* Base image */}
                <canvas
                  ref={imageCanvasRef}
                  className="absolute top-0 left-0"
                  style={{
                    transformOrigin: "top left",
                    transform: `scale(${zoom})`,
                  }}
                />
                {/* Main mask (stored regions) */}
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ display: "none" }}
                />
                {/* Temp mask (current drawing) */}
                <canvas
                  ref={tempMaskCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ display: "none" }}
                />
                {/* Overlay (visual feedback + numbers) */}
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0"
                  style={{
                    transformOrigin: "top left",
                    transform: `scale(${zoom})`,
                    cursor: "crosshair",
                  }}
                />

                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    画像読み込み中...
                  </div>
                )}
              </div>
            </div>

            {/* Region Chat Boxes */}
            {regions.map((region) => (
              <RegionChatBox
                key={region.id}
                region={region}
                position={region.centroid}
                scale={zoom}
                containerOffset={containerOffset}
                isActive={region.id === activeRegionId}
                onPromptChange={(prompt) => updateRegionPrompt(region.id, prompt)}
                onGenerate={() => generateRegion(region.id)}
                onDelete={() => deleteRegion(region.id)}
                onApply={() => applyRegionResult(region.id)}
                onRegenerate={() => generateRegion(region.id)}
                onSelect={() => setActiveRegionId(region.id)}
              />
            ))}
          </div>

          {/* Instructions */}
          <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
            ブラシで編集したい領域を塗ってください • Ctrl+ホイールでズーム • Ctrl+Z で元に戻す
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l bg-card shrink-0 flex flex-col">
          {/* Reference LP Selector */}
          {swipeFiles.length > 0 && (
            <Card className="m-4 mb-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">参考LP</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ReferenceLPSelector
                  swipeFiles={swipeFiles}
                  selectedId={selectedReferenceLP}
                  onSelect={setSelectedReferenceLP}
                  compact
                />
                <p className="text-xs text-muted-foreground mt-2">
                  選択すると、このLPのトンマナに合わせて編集されます
                </p>
              </CardContent>
            </Card>
          )}

          {/* Region List */}
          <div className="flex-1 overflow-hidden">
            <RegionList
              regions={regions}
              activeRegionId={activeRegionId}
              onSelectRegion={setActiveRegionId}
              onDeleteRegion={deleteRegion}
              onGenerateAll={generateAllRegions}
              onApplyAll={applyAllResults}
              onClearAll={clearAllRegions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MagicPenEditorV2;
