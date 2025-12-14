"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// === Types ===
interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RefImage {
  id?: string;
  mimeType: string;
  base64: string;
  name: string;
  width: number;
  height: number;
}

interface SwipeFile {
  id: string;
  name: string;
  mime_type: string;
  width: number | null;
  height: number | null;
}

interface Section {
  id: string;
  project_id: string;
  name: string;
  image_path: string | null;
  width: number | null;
  height: number | null;
}

interface Project {
  id: string;
  name: string;
}

interface MagicPenResult {
  ok: true;
  modelUsed: string;
  imageDataUrl: string;
  elapsedMs: number;
}

interface MagicPenError {
  ok: false;
  error: { message: string; status?: number };
}

type MagicPenResponse = MagicPenResult | MagicPenError;
type SelectionMode = "rect" | "brush";
type BrushTool = "brush" | "eraser";

// === Constants ===
const MAX_REF_IMAGES = 6;

// === Utils ===
function canvasPointFromEvent(e: MouseEvent, canvasEl: HTMLCanvasElement, zoom: number) {
  const rect = canvasEl.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
}

export default function SectionMagicPenPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const sectionId = params.sectionId as string;

  // Data state
  const [project, setProject] = useState<Project | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Canvas refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MagicPenResponse | null>(null);
  const [saving, setSaving] = useState(false);

  // Selection mode
  const [mode, setMode] = useState<SelectionMode>("brush");
  const [brushTool, setBrushTool] = useState<BrushTool>("brush");
  const [brushSize, setBrushSize] = useState(30);
  const [zoom, setZoom] = useState(1);

  // Reference images
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const [showMask, setShowMask] = useState(true);
  const [invertMask, setInvertMask] = useState(false);
  const [showSwipeSelector, setShowSwipeSelector] = useState(false);

  // Drawing refs
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  // === Load image to canvas ===
  const loadImage = useCallback((dataUrl: string) => {
    setImageDataUrl(dataUrl);
    const img = new Image();
    img.onload = () => {
      const ns = { width: img.naturalWidth, height: img.naturalHeight };
      setNaturalSize(ns);
      [imageCanvasRef, maskCanvasRef, viewCanvasRef, overlayCanvasRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = ns.width;
          ref.current.height = ns.height;
        }
      });
      const imgCtx = imageCanvasRef.current?.getContext("2d");
      if (imgCtx) imgCtx.drawImage(img, 0, 0);
      setImageLoaded(true);
      setSelection(null);
      setResult(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setZoom(1);
    };
    img.src = dataUrl;
  }, []);

  // === Fetch project, section, swipe files ===
  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, secRes, swipeRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/sections/${sectionId}`),
          fetch(`/api/swipe-files?projectId=${projectId}`),
        ]);
        const projData = await projRes.json();
        const secData = await secRes.json();
        const swipeData = await swipeRes.json();

        if (!projData.ok || !secData.ok) {
          router.push(`/projects/${projectId}`);
          return;
        }

        setProject(projData.project);
        setSection(secData.section);
        if (swipeData.ok) setSwipeFiles(swipeData.swipeFiles);

        // Load section image
        if (secData.section.image_path) {
          const filename = secData.section.image_path.split("/").pop();
          const imgUrl = `/api/images/${filename}`;
          const imgRes = await fetch(imgUrl);
          const blob = await imgRes.blob();
          const dataUrl = await new Promise<string>((res) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.readAsDataURL(blob);
          });
          loadImage(dataUrl);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, [projectId, sectionId, router, loadImage]);

  // === Mask operations ===
  const getMaskCtx = useCallback(() => maskCanvasRef.current?.getContext("2d") || null, []);

  const updateViewCanvas = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    const viewCanvas = viewCanvasRef.current;
    if (!maskCanvas || !viewCanvas) return;
    const ctx = viewCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, viewCanvas.width, viewCanvas.height);
    ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
    ctx.fillRect(0, 0, viewCanvas.width, viewCanvas.height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const pushUndo = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    try {
      const data = canvas.toDataURL("image/png");
      undoStackRef.current.push(data);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
    } catch {}
  }, []);

  const doUndo = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !undoStackRef.current.length) return;
    const data = undoStackRef.current.pop()!;
    redoStackRef.current.push(canvas.toDataURL("image/png"));
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      updateViewCanvas();
    };
    img.src = data;
  }, [updateViewCanvas]);

  const doRedo = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !redoStackRef.current.length) return;
    const data = redoStackRef.current.pop()!;
    undoStackRef.current.push(canvas.toDataURL("image/png"));
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      updateViewCanvas();
    };
    img.src = data;
  }, [updateViewCanvas]);

  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    pushUndo();
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateViewCanvas();
  }, [pushUndo, updateViewCanvas]);

  // === Drawing ===
  const beginDraw = useCallback((x: number, y: number) => {
    const ctx = getMaskCtx();
    if (!ctx) return;
    isDrawingRef.current = true;
    pushUndo();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushTool === "eraser" ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)";
    ctx.globalCompositeOperation = brushTool === "eraser" ? "destination-out" : "source-over";
    lastPtRef.current = { x, y };
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushTool === "eraser" ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)";
    if (brushTool === "eraser") ctx.globalCompositeOperation = "destination-out";
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    updateViewCanvas();
  }, [brushSize, brushTool, getMaskCtx, pushUndo, updateViewCanvas]);

  const drawTo = useCallback((x: number, y: number) => {
    if (!isDrawingRef.current) return;
    const ctx = getMaskCtx();
    if (!ctx) return;
    const lx = lastPtRef.current?.x ?? x;
    const ly = lastPtRef.current?.y ?? y;
    ctx.globalCompositeOperation = brushTool === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPtRef.current = { x, y };
    updateViewCanvas();
  }, [brushTool, getMaskCtx, updateViewCanvas]);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPtRef.current = null;
    const ctx = getMaskCtx();
    if (ctx) ctx.globalCompositeOperation = "source-over";
  }, [getMaskCtx]);

  // === Rectangle selection ===
  const beginRect = useCallback((x: number, y: number) => {
    rectStartRef.current = { x, y };
    setSelection({ x, y, width: 0, height: 0 });
  }, []);

  const updateRect = useCallback((x: number, y: number) => {
    if (!rectStartRef.current) return;
    const sx = rectStartRef.current.x;
    const sy = rectStartRef.current.y;
    setSelection({
      x: Math.round(Math.min(sx, x)),
      y: Math.round(Math.min(sy, y)),
      width: Math.round(Math.abs(x - sx)),
      height: Math.round(Math.abs(y - sy)),
    });
  }, []);

  const endRect = useCallback(() => {
    rectStartRef.current = null;
  }, []);

  // === Draw overlay ===
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !naturalSize) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode === "rect" && selection && selection.width > 0 && selection.height > 0) {
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    }
  }, [mode, naturalSize, selection]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // === Mouse handlers ===
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || !naturalSize) return;

    const handleMouseDown = (e: MouseEvent) => {
      const pt = canvasPointFromEvent(e, overlay, zoom);
      if (mode === "brush") beginDraw(pt.x, pt.y);
      else beginRect(pt.x, pt.y);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const pt = canvasPointFromEvent(e, overlay, zoom);
      if (mode === "brush") drawTo(pt.x, pt.y);
      else if (rectStartRef.current) updateRect(pt.x, pt.y);
    };

    const handleMouseUp = () => {
      if (mode === "brush") endDraw();
      else endRect();
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
        setZoom((z) => Math.min(8, Math.max(0.1, z * factor)));
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
  }, [naturalSize, zoom, mode, beginDraw, drawTo, endDraw, beginRect, updateRect, endRect, doUndo, doRedo]);

  // === Mask data URL ===
  const getMaskDataUrl = useCallback((): string | null => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !naturalSize) return null;
    const ctx = maskCanvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    let hasContent = false;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) { hasContent = true; break; }
    }
    if (!hasContent) return null;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = maskCanvas.width;
    outputCanvas.height = maskCanvas.height;
    const outCtx = outputCanvas.getContext("2d")!;
    if (invertMask) {
      outCtx.fillStyle = "#ffffff";
      outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      outCtx.globalCompositeOperation = "destination-out";
      outCtx.drawImage(maskCanvas, 0, 0);
      outCtx.globalCompositeOperation = "source-over";
    } else {
      outCtx.fillStyle = "#000000";
      outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      outCtx.drawImage(maskCanvas, 0, 0);
    }
    return outputCanvas.toDataURL("image/png");
  }, [naturalSize, invertMask]);

  const generateRectMask = useCallback((sel: Selection, w: number, h: number): string => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
    return canvas.toDataURL("image/png");
  }, []);

  // === Composite with mask ===
  const compositeWithMask = useCallback(async (
    originalDataUrl: string,
    generatedDataUrl: string,
    maskBWDataUrl: string
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
      loadImg(maskBWDataUrl),
    ]);

    const w = originalImg.naturalWidth;
    const h = originalImg.naturalHeight;

    const layerB = document.createElement("canvas");
    layerB.width = w;
    layerB.height = h;
    const ctxB = layerB.getContext("2d")!;
    ctxB.drawImage(generatedImg, 0, 0, w, h);
    ctxB.globalCompositeOperation = "destination-in";
    ctxB.drawImage(maskImg, 0, 0, w, h);
    ctxB.globalCompositeOperation = "source-over";

    const final = document.createElement("canvas");
    final.width = w;
    final.height = h;
    const ctxF = final.getContext("2d")!;
    ctxF.drawImage(originalImg, 0, 0, w, h);
    ctxF.drawImage(layerB, 0, 0);

    return final.toDataURL("image/png");
  }, []);

  // === Submit ===
  const handleSubmit = async () => {
    if (!imageDataUrl || !prompt.trim() || !naturalSize) return;
    const brushMaskDataUrl = mode === "brush" ? getMaskDataUrl() : null;
    if (mode === "rect" && (!selection || selection.width < 5 || selection.height < 5)) return;
    if (mode === "brush" && !brushMaskDataUrl) return;

    setLoading(true);
    setResult(null);

    const maskForApi = mode === "brush"
      ? brushMaskDataUrl
      : generateRectMask(selection!, naturalSize.width, naturalSize.height);

    try {
      const res = await fetch("/api/dev/gemini/magic-pen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageDataUrl,
          selection: mode === "rect" ? selection : undefined,
          maskDataUrl: maskForApi,
          refImages: refImages.map((r) => ({ mimeType: r.mimeType, base64: r.base64 })),
        }),
      });
      const data: MagicPenResponse = await res.json();

      if (data.ok && maskForApi) {
        const compositedDataUrl = await compositeWithMask(imageDataUrl, data.imageDataUrl, maskForApi);
        setResult({ ...data, imageDataUrl: compositedDataUrl });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({ ok: false, error: { message: err instanceof Error ? err.message : "Network error" } });
    } finally {
      setLoading(false);
    }
  };

  // === Save result to section ===
  const handleSaveToSection = async () => {
    if (!result?.ok) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: result.imageDataUrl,
          width: naturalSize?.width,
          height: naturalSize?.height,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // Reload the saved image as current
        loadImage(result.imageDataUrl);
        setResult(null);
        alert("セクションに保存しました");
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  // === Add swipe file as reference ===
  const addSwipeAsRef = async (swipe: SwipeFile) => {
    if (refImages.length >= MAX_REF_IMAGES) return;
    try {
      const res = await fetch(`/api/swipe-files/${swipe.id}/image`);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.readAsDataURL(blob);
      });
      const comma = dataUrl.indexOf(",");
      const base64 = dataUrl.substring(comma + 1);
      const mimeType = dataUrl.substring(5, dataUrl.indexOf(";"));

      setRefImages((prev) => [
        ...prev,
        { id: swipe.id, mimeType, base64, name: swipe.name, width: swipe.width || 0, height: swipe.height || 0 },
      ]);
      setShowSwipeSelector(false);
    } catch (err) {
      console.error("Failed to load swipe file:", err);
    }
  };

  // === Append ref label to prompt ===
  const appendRefToPrompt = (idx: number) => {
    const label = `参考${idx + 1}（画像#${idx + 3}）`;
    setPrompt((prev) => (prev.includes(label) ? prev : prev ? `${prev.trimEnd()} ${label}` : label));
  };

  // === Display size ===
  const getDisplaySize = useCallback(() => {
    if (!naturalSize) return { width: 600, height: 400 };
    return { width: naturalSize.width * zoom, height: naturalSize.height * zoom };
  }, [naturalSize, zoom]);

  const canSubmit = imageLoaded && prompt.trim() && (
    (mode === "rect" && selection && selection.width > 5 && selection.height > 5) ||
    (mode === "brush")
  );

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-card px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/projects/${projectId}`} className="text-muted-foreground hover:text-foreground">
            {project?.name || "プロジェクト"}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{section?.name || "セクション"}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-primary">Magic Pen</span>
        </div>
      </div>

      <div className="p-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-[350px_1fr]">
            {/* Left: Controls */}
            <div className="space-y-4">
              {/* Mode */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">選択モード</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button variant={mode === "rect" ? "default" : "outline"} size="sm" onClick={() => setMode("rect")}>矩形</Button>
                    <Button variant={mode === "brush" ? "default" : "outline"} size="sm" onClick={() => setMode("brush")}>ブラシ</Button>
                  </div>
                  {mode === "brush" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button variant={brushTool === "brush" ? "default" : "outline"} size="sm" onClick={() => setBrushTool("brush")}>ブラシ</Button>
                        <Button variant={brushTool === "eraser" ? "default" : "outline"} size="sm" onClick={() => setBrushTool("eraser")}>消しゴム</Button>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">サイズ: {brushSize}px</label>
                        <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full" />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={doUndo}>Undo</Button>
                        <Button size="sm" variant="outline" onClick={doRedo}>Redo</Button>
                        <Button size="sm" variant="outline" onClick={clearMask}>Clear</Button>
                        <Button size="sm" variant={showMask ? "default" : "outline"} onClick={() => setShowMask((v) => !v)}>
                          {showMask ? "マスク表示" : "非表示"}
                        </Button>
                      </div>
                      <Button size="sm" variant={invertMask ? "destructive" : "outline"} onClick={() => setInvertMask((v) => !v)}>
                        {invertMask ? "保護モード" : "編集モード"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reference Images */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">参考画像スロット ({refImages.length}/{MAX_REF_IMAGES})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: MAX_REF_IMAGES }).map((_, i) => {
                      const hasImage = i < refImages.length;
                      const isNextSlot = i === refImages.length;
                      const r = refImages[i];
                      const slotLabel = `参考${i + 1}`;
                      const geminiLabel = `画像#${i + 3}`;
                      return (
                        <div
                          key={i}
                          className={`relative aspect-square rounded border-2 transition-all ${
                            hasImage ? "border-primary/50 cursor-pointer" : isNextSlot ? "border-dashed border-primary/60 cursor-pointer hover:bg-primary/10" : "border-dashed border-muted-foreground/30 opacity-50"
                          }`}
                          onClick={() => {
                            if (isNextSlot) setShowSwipeSelector(true);
                            else if (hasImage) appendRefToPrompt(i);
                          }}
                        >
                          {hasImage ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`data:${r.mimeType};base64,${r.base64}`} alt={r.name} className="w-full h-full object-cover rounded" />
                              <button
                                onClick={(e) => { e.stopPropagation(); setRefImages((prev) => prev.filter((_, idx) => idx !== i)); }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] z-10"
                              >×</button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded-b leading-tight">
                                <div className="font-bold">{slotLabel}</div>
                                <div className="opacity-80">{geminiLabel}</div>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-muted-foreground">
                              {isNextSlot ? <><span className="text-sm">+</span><span>{slotLabel}</span></> : <span className="opacity-50">{slotLabel}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">クリックでプロンプトに追記</p>
                </CardContent>
              </Card>

              {/* Prompt */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">指示テキスト</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <textarea
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`例: 参考1（画像#3）の配色を使って、この領域を華やかにして。\n\n※ 参考画像スロットをクリックすると番号が自動入力されます`}
                  />
                  <Button onClick={handleSubmit} disabled={loading || !canSubmit} className="w-full">
                    {loading ? "生成中..." : "実行"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right: Canvas */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">キャンバス</CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={containerRef} className="border rounded-md bg-muted/20 overflow-auto" style={{ maxHeight: 500 }}>
                    <div className="relative" style={{ width: getDisplaySize().width, height: getDisplaySize().height, minWidth: 300, minHeight: 200 }}>
                      <canvas ref={imageCanvasRef} className="absolute top-0 left-0" style={{ transformOrigin: "top left", transform: `scale(${zoom})` }} />
                      <canvas ref={maskCanvasRef} className="absolute top-0 left-0 pointer-events-none" style={{ display: "none" }} />
                      <canvas ref={viewCanvasRef} className="absolute top-0 left-0 pointer-events-none" style={{ transformOrigin: "top left", transform: `scale(${zoom})`, display: showMask ? "block" : "none" }} />
                      <canvas ref={overlayCanvasRef} className="absolute top-0 left-0" style={{ transformOrigin: "top left", transform: `scale(${zoom})`, cursor: "crosshair" }} />
                      {!imageLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          セクション画像なし
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Result */}
              {result && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className={`text-sm ${result.ok ? "text-green-600" : "text-red-600"}`}>
                      {result.ok ? "生成成功" : "エラー"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.ok ? (
                      <div className="space-y-3">
                        <div className="border rounded-md overflow-hidden bg-muted/30 p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={result.imageDataUrl} alt="Generated result" className="max-w-full h-auto" style={{ maxHeight: 400 }} />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveToSection} disabled={saving} className="flex-1">
                            {saving ? "保存中..." : "セクションに保存"}
                          </Button>
                          <Button variant="outline" onClick={() => loadImage(result.imageDataUrl)}>
                            これを元画像に
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {result.error.message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Swipe Selector Modal */}
      {showSwipeSelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowSwipeSelector(false)}>
          <div className="bg-background rounded-lg p-4 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">スワイプファイルから選択</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSwipeSelector(false)}>×</Button>
            </div>
            {swipeFiles.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                このプロジェクトにスワイプファイルがありません。
                <Link href="/swipe-files" className="block text-primary hover:underline mt-2">
                  スワイプファイル管理へ
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {swipeFiles.map((sf) => (
                  <div
                    key={sf.id}
                    className="aspect-square rounded border cursor-pointer hover:ring-2 hover:ring-primary overflow-hidden"
                    onClick={() => addSwipeAsRef(sf)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/swipe-files/${sf.id}/image`} alt={sf.name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
