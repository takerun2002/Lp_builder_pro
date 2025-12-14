"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// === Types ===
interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RefImage {
  mimeType: string;
  base64: string;
  name: string;
  width: number;
  height: number;
}

interface MagicPenResult {
  ok: true;
  modelUsed: string;
  imageDataUrl: string;
  elapsedMs: number;
}

interface MagicPenError {
  ok: false;
  error: {
    message: string;
    status?: number;
  };
}

type MagicPenResponse = MagicPenResult | MagicPenError;
type SelectionMode = "rect" | "brush";
type BrushTool = "brush" | "eraser";

// === Constants ===
const MAX_REF_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// === Coordinate conversion (easy_banana style) ===
function canvasPointFromEvent(
  e: MouseEvent,
  canvasEl: HTMLCanvasElement,
  zoom: number
): { x: number; y: number } {
  const rect = canvasEl.getBoundingClientRect();
  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;
  return { x, y };
}

// === Image downscale (easy_banana style) ===
async function downscaleImage(
  blob: Blob,
  { maxBytes = MAX_IMAGE_BYTES, maxDim = 2048 } = {}
): Promise<{ mimeType: string; base64: string; width: number; height: number } | null> {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => resolve(String(fr.result || ""));
      fr.readAsDataURL(blob);
    });
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = dataUrl;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.floor(w * scale));
    h = Math.max(1, Math.floor(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    let lo = 0.5, hi = 0.95, best: string | null = null;
    for (let i = 0; i < 6; i++) {
      const q = i === 0 ? Math.min(0.9, hi) : (lo + hi) / 2;
      const b64 = canvas.toDataURL("image/jpeg", q);
      const est = Math.floor((b64.length - "data:;base64,".length) * 0.75);
      if (est <= maxBytes) { best = b64; lo = q; } else { hi = q; }
    }
    const out = best || canvas.toDataURL("image/jpeg", 0.85);
    const comma = out.indexOf(",");
    return {
      mimeType: out.substring(5, out.indexOf(";")),
      base64: out.substring(comma + 1),
      width: w,
      height: h,
    };
  } catch {
    return null;
  }
}

// === Main Component ===
export default function MagicPenPage() {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement>(null); // 赤い半透明オーバーレイ表示用
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MagicPenResponse | null>(null);

  // Selection mode
  const [mode, setMode] = useState<SelectionMode>("brush");
  const [brushTool, setBrushTool] = useState<BrushTool>("brush");
  const [brushSize, setBrushSize] = useState(30);
  const [zoom, setZoom] = useState(1);

  // Reference images
  const [refImages, setRefImages] = useState<RefImage[]>([]);

  // Mask visibility toggle
  const [showMask, setShowMask] = useState(true);

  // Invert mode: false = "paint to edit", true = "paint to protect"
  const [invertMask, setInvertMask] = useState(false);

  // Drag reorder state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Undo stack for mask
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  // Edit history (for going back to previous versions)
  const [editHistory, setEditHistory] = useState<Array<{ imageDataUrl: string; timestamp: number }>>([]);

  // Drawing state
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const lastPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const spaceDownRef = useRef(false);

  // === Mask canvas operations ===
  const getMaskCtx = useCallback(() => {
    return maskCanvasRef.current?.getContext("2d") || null;
  }, []);

  // === Update viewCanvas to show red overlay where mask is painted ===
  const updateViewCanvas = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    const viewCanvas = viewCanvasRef.current;
    if (!maskCanvas || !viewCanvas) return;
    const ctx = viewCanvas.getContext("2d");
    if (!ctx) return;
    // Clear
    ctx.clearRect(0, 0, viewCanvas.width, viewCanvas.height);
    // Fill entire canvas with semi-transparent red
    ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
    ctx.fillRect(0, 0, viewCanvas.width, viewCanvas.height);
    // Use destination-in to keep only where maskCanvas has alpha > 0
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

  // === Draw brush stroke ===
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
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);

  const beginRect = useCallback((x: number, y: number) => {
    rectStartRef.current = { x, y };
    setSelection({ x, y, width: 0, height: 0 });
  }, []);

  const updateRect = useCallback((x: number, y: number) => {
    if (!rectStartRef.current) return;
    const sx = rectStartRef.current.x;
    const sy = rectStartRef.current.y;
    const left = Math.min(sx, x);
    const top = Math.min(sy, y);
    const width = Math.abs(x - sx);
    const height = Math.abs(y - sy);
    setSelection({ x: Math.round(left), y: Math.round(top), width: Math.round(width), height: Math.round(height) });
  }, []);

  const endRect = useCallback(() => {
    rectStartRef.current = null;
  }, []);

  // === Draw overlay (selection rect preview) ===
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

  // === Handle main image upload ===
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageDataUrl(dataUrl);
      const img = new Image();
      img.onload = () => {
        const ns = { width: img.naturalWidth, height: img.naturalHeight };
        setNaturalSize(ns);
        // Setup canvases (including viewCanvas)
        [imageCanvasRef, maskCanvasRef, viewCanvasRef, overlayCanvasRef].forEach((ref) => {
          if (ref.current) {
            ref.current.width = ns.width;
            ref.current.height = ns.height;
          }
        });
        // Draw image to image canvas
        const imgCtx = imageCanvasRef.current?.getContext("2d");
        if (imgCtx) imgCtx.drawImage(img, 0, 0);
        // Clear mask and view canvas
        const maskCtx = maskCanvasRef.current?.getContext("2d");
        if (maskCtx) maskCtx.clearRect(0, 0, ns.width, ns.height);
        const viewCtx = viewCanvasRef.current?.getContext("2d");
        if (viewCtx) viewCtx.clearRect(0, 0, ns.width, ns.height);
        setImageLoaded(true);
        setSelection(null);
        setResult(null);
        undoStackRef.current = [];
        redoStackRef.current = [];
        setZoom(1);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  // === Use generated result as new source image ===
  const applyResultAsSource = useCallback((resultImageDataUrl: string) => {
    // Save current image to history before switching
    if (imageDataUrl) {
      setEditHistory((prev) => [...prev, { imageDataUrl, timestamp: Date.now() }].slice(-10)); // Keep last 10
    }

    const img = new Image();
    img.onload = () => {
      const ns = { width: img.naturalWidth, height: img.naturalHeight };
      setNaturalSize(ns);
      setImageDataUrl(resultImageDataUrl);

      // Setup canvases
      [imageCanvasRef, maskCanvasRef, viewCanvasRef, overlayCanvasRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = ns.width;
          ref.current.height = ns.height;
        }
      });

      // Draw new image to canvas
      const imgCtx = imageCanvasRef.current?.getContext("2d");
      if (imgCtx) imgCtx.drawImage(img, 0, 0);

      // Clear mask and view canvas
      const maskCtx = maskCanvasRef.current?.getContext("2d");
      if (maskCtx) maskCtx.clearRect(0, 0, ns.width, ns.height);
      const viewCtx = viewCanvasRef.current?.getContext("2d");
      if (viewCtx) viewCtx.clearRect(0, 0, ns.width, ns.height);

      setImageLoaded(true);
      setSelection(null);
      setResult(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      // Keep prompt for iterative editing
    };
    img.src = resultImageDataUrl;
  }, [imageDataUrl]);

  // === Add generated result to reference images ===
  const addResultToReferences = useCallback((resultImageDataUrl: string) => {
    if (refImages.length >= MAX_REF_IMAGES) {
      alert(`参考画像は最大${MAX_REF_IMAGES}枚までです`);
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Parse data URL
      const comma = resultImageDataUrl.indexOf(",");
      const meta = resultImageDataUrl.substring(0, comma);
      const base64 = resultImageDataUrl.substring(comma + 1);
      const mimeMatch = meta.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

      const newRef: RefImage = {
        mimeType,
        base64,
        name: `生成結果_${new Date().toLocaleTimeString()}`,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      setRefImages((prev) => [...prev, newRef]);
    };
    img.src = resultImageDataUrl;
  }, [refImages.length]);

  // === Restore from edit history ===
  const restoreFromHistory = useCallback((historyItem: { imageDataUrl: string; timestamp: number }) => {
    const img = new Image();
    img.onload = () => {
      const ns = { width: img.naturalWidth, height: img.naturalHeight };
      setNaturalSize(ns);
      setImageDataUrl(historyItem.imageDataUrl);

      // Setup canvases
      [imageCanvasRef, maskCanvasRef, viewCanvasRef, overlayCanvasRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = ns.width;
          ref.current.height = ns.height;
        }
      });

      // Draw image to canvas
      const imgCtx = imageCanvasRef.current?.getContext("2d");
      if (imgCtx) imgCtx.drawImage(img, 0, 0);

      // Clear mask and view canvas
      const maskCtx = maskCanvasRef.current?.getContext("2d");
      if (maskCtx) maskCtx.clearRect(0, 0, ns.width, ns.height);
      const viewCtx = viewCanvasRef.current?.getContext("2d");
      if (viewCtx) viewCtx.clearRect(0, 0, ns.width, ns.height);

      setImageLoaded(true);
      setSelection(null);
      setResult(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
    };
    img.src = historyItem.imageDataUrl;
  }, []);

  // === Handle reference images ===
  const addRefFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const newRefs: RefImage[] = [];
    for (const file of arr) {
      if (refImages.length + newRefs.length >= MAX_REF_IMAGES) break;
      try {
        let mimeType: string, base64: string, width: number, height: number;
        if (file.size > MAX_IMAGE_BYTES) {
          const ds = await downscaleImage(file);
          if (!ds) continue;
          ({ mimeType, base64, width, height } = ds);
        } else {
          const dataUrl = await new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onerror = () => rej(fr.error);
            fr.onload = () => res(String(fr.result || ""));
            fr.readAsDataURL(file);
          });
          const comma = dataUrl.indexOf(",");
          const meta = dataUrl.substring(0, comma);
          base64 = dataUrl.substring(comma + 1);
          const mimeMatch = /data:(.*?);base64/.exec(meta);
          mimeType = mimeMatch ? mimeMatch[1] : file.type || "image/png";
          const dim = await new Promise<{ w: number; h: number }>((res) => {
            const im = new Image();
            im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
            im.onerror = () => res({ w: 0, h: 0 });
            im.src = dataUrl;
          });
          if (dim.w < 64 || dim.h < 64) continue;
          width = dim.w;
          height = dim.h;
        }
        // Dedupe
        if (refImages.some((r) => r.base64 === base64) || newRefs.some((r) => r.base64 === base64)) continue;
        newRefs.push({ mimeType, base64, name: file.name, width, height });
      } catch {}
    }
    if (newRefs.length) setRefImages((prev) => [...prev, ...newRefs]);
  }, [refImages]);

  const removeRefImage = useCallback((idx: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Reorder ref images via drag
  const moveRefImage = useCallback((fromIdx: number, toIdx: number) => {
    setRefImages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  }, []);

  // Fetch image from URL via server API (CORS bypass)
  const addRefFromUrl = useCallback(async (url: string) => {
    if (refImages.length >= MAX_REF_IMAGES) return;
    try {
      const res = await fetch("/api/dev/fetch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.ok || !data.base64 || !data.mimeType) {
        console.warn("[magic-pen] URL fetch failed:", data.error);
        return;
      }
      // Get dimensions
      const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
      const dim = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = dataUrl;
      });
      if (dim.w < 64 || dim.h < 64) return;
      // Dedupe
      if (refImages.some((r) => r.base64 === data.base64)) return;
      setRefImages((prev) => [
        ...prev,
        { mimeType: data.mimeType, base64: data.base64, name: url.split("/").pop() || "url-image", width: dim.w, height: dim.h },
      ]);
      console.log("[magic-pen] Added ref from URL:", url);
    } catch (err) {
      console.warn("[magic-pen] URL fetch error:", err);
    }
  }, [refImages]);

  // === D&D and Paste handlers ===
  useEffect(() => {
    const dropzone = dropzoneRef.current;
    if (!dropzone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("ring-2", "ring-primary");
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("ring-2", "ring-primary");
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("ring-2", "ring-primary");
      // Check for files first
      const files = e.dataTransfer?.files;
      if (files?.length) {
        addRefFiles(files);
        return;
      }
      // Check for URL (text/uri-list or text/plain)
      const url = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain");
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        addRefFromUrl(url.trim().split("\n")[0]);
      }
    };

    dropzone.addEventListener("dragover", handleDragOver);
    dropzone.addEventListener("dragleave", handleDragLeave);
    dropzone.addEventListener("drop", handleDrop);

    // Global paste
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type?.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        } else if (item.kind === "string" && item.type === "text/plain") {
          item.getAsString((text) => {
            if (text.startsWith("http://") || text.startsWith("https://")) {
              addRefFromUrl(text.trim());
            }
          });
        }
      }
      if (files.length) addRefFiles(files);
    };
    document.addEventListener("paste", handlePaste);

    return () => {
      dropzone.removeEventListener("dragover", handleDragOver);
      dropzone.removeEventListener("dragleave", handleDragLeave);
      dropzone.removeEventListener("drop", handleDrop);
      document.removeEventListener("paste", handlePaste);
    };
  }, [addRefFiles, addRefFromUrl]);

  // === Mouse handlers for canvas ===
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || !naturalSize) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (spaceDownRef.current) {
        isPanningRef.current = true;
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const pt = canvasPointFromEvent(e, overlay, zoom);
      if (mode === "brush") {
        beginDraw(pt.x, pt.y);
      } else {
        beginRect(pt.x, pt.y);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current && containerRef.current) {
        const dx = e.clientX - lastPanRef.current.x;
        const dy = e.clientY - lastPanRef.current.y;
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        containerRef.current.scrollLeft -= dx;
        containerRef.current.scrollTop -= dy;
        return;
      }
      const pt = canvasPointFromEvent(e, overlay, zoom);
      if (mode === "brush") {
        drawTo(pt.x, pt.y);
      } else if (rectStartRef.current) {
        updateRect(pt.x, pt.y);
      }
    };

    const handleMouseUp = () => {
      isPanningRef.current = false;
      if (mode === "brush") {
        endDraw();
      } else {
        endRect();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDownRef.current = true;
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDownRef.current = false;
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
    document.addEventListener("keyup", handleKeyUp);
    overlay.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      overlay.removeEventListener("mousedown", handleMouseDown);
      overlay.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      overlay.removeEventListener("wheel", handleWheel);
    };
  }, [naturalSize, zoom, mode, beginDraw, drawTo, endDraw, beginRect, updateRect, endRect, doUndo, doRedo]);

  // === Get mask data URL (handles invert mode) ===
  const getMaskDataUrl = useCallback((): string | null => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !naturalSize) return null;
    // Check if mask has any content
    const ctx = maskCanvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    let hasContent = false;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) { hasContent = true; break; }
    }
    if (!hasContent) return null;
    // Create output canvas
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = maskCanvas.width;
    outputCanvas.height = maskCanvas.height;
    const outCtx = outputCanvas.getContext("2d")!;

    if (invertMask) {
      // Invert mode: painted area = protected, unpainted = edit
      // Start with white (edit everything), then subtract painted area
      outCtx.fillStyle = "#ffffff";
      outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      outCtx.globalCompositeOperation = "destination-out";
      outCtx.drawImage(maskCanvas, 0, 0);
      outCtx.globalCompositeOperation = "source-over";
    } else {
      // Normal mode: painted area = edit, unpainted = protected
      outCtx.fillStyle = "#000000";
      outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      outCtx.drawImage(maskCanvas, 0, 0);
    }
    return outputCanvas.toDataURL("image/png");
  }, [naturalSize, invertMask]);

  // === Generate rect mask (black bg + white rect) ===
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

  // === Composite generated image with original using mask (CRITICAL: guarantees mask-outside unchanged) ===
  const compositeWithMask = useCallback(async (
    originalDataUrl: string,
    generatedDataUrl: string,
    maskBWDataUrl: string
  ): Promise<{ dataUrl: string; diffStats: { diffCount: number; maxDiff: number; totalPixels: number } }> => {
    // Load all images
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

    // Layer B: generated image (scaled to original size) masked by mask (white=keep generated)
    const layerB = document.createElement("canvas");
    layerB.width = w;
    layerB.height = h;
    const ctxB = layerB.getContext("2d")!;
    // Scale generated to match original size if different
    ctxB.drawImage(generatedImg, 0, 0, w, h);
    ctxB.globalCompositeOperation = "destination-in";
    ctxB.drawImage(maskImg, 0, 0, w, h);
    ctxB.globalCompositeOperation = "source-over";

    // Final: original + layerB on top
    const final = document.createElement("canvas");
    final.width = w;
    final.height = h;
    const ctxF = final.getContext("2d")!;
    ctxF.drawImage(originalImg, 0, 0, w, h);
    ctxF.drawImage(layerB, 0, 0);

    // B) Verify mask-outside pixels are unchanged (dev logging)
    const origData = (() => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(originalImg, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    })();
    const finalData = ctxF.getImageData(0, 0, w, h).data;
    const maskData = (() => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(maskImg, 0, 0, w, h);
      return ctx.getImageData(0, 0, w, h).data;
    })();

    let diffCount = 0;
    let maxDiff = 0;
    const totalPixels = w * h;
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      // If mask pixel is black (R < 128), this is protected area
      if (maskData[idx] < 128) {
        const dr = Math.abs(origData[idx] - finalData[idx]);
        const dg = Math.abs(origData[idx + 1] - finalData[idx + 1]);
        const db = Math.abs(origData[idx + 2] - finalData[idx + 2]);
        const diff = Math.max(dr, dg, db);
        if (diff > 0) {
          diffCount++;
          maxDiff = Math.max(maxDiff, diff);
        }
      }
    }

    console.log("[magic-pen] Composite applied:", {
      sizeMatch: generatedImg.naturalWidth === w && generatedImg.naturalHeight === h,
      diffStats: { diffCount, maxDiff, totalPixels },
      verdict: diffCount === 0 ? "PERFECT: mask-outside unchanged" : `WARNING: ${diffCount} pixels differ (max=${maxDiff})`,
    });

    return { dataUrl: final.toDataURL("image/png"), diffStats: { diffCount, maxDiff, totalPixels } };
  }, []);

  const parseMagicPenResponse = async (res: Response): Promise<MagicPenResponse> => {
    const raw = await res.text();
    if (!raw) {
      console.error("[magic-pen] Empty response from /api/dev/gemini/magic-pen", { status: res.status });
      return {
        ok: false,
        error: { message: `サーバーから空のレスポンスが返されました (status=${res.status})`, status: res.status },
      };
    }

    try {
      return JSON.parse(raw) as MagicPenResponse;
    } catch (err) {
      console.error("[magic-pen] Failed to parse JSON response", {
        status: res.status,
        bodyPreview: raw.slice(0, 500),
        err,
      });
      return {
        ok: false,
        error: { message: `レスポンスの解析に失敗しました (status=${res.status})`, status: res.status },
      };
    }
  };

  // === Submit ===
  const handleSubmit = async () => {
    if (!imageDataUrl || !prompt.trim() || !naturalSize) return;
    const brushMaskDataUrl = mode === "brush" ? getMaskDataUrl() : null;
    if (mode === "rect" && (!selection || selection.width < 5 || selection.height < 5)) return;
    if (mode === "brush" && !brushMaskDataUrl) return;

    setLoading(true);
    setResult(null);

    // Generate mask for API (rect mode creates mask from selection)
    const maskForApi = mode === "brush"
      ? brushMaskDataUrl
      : generateRectMask(selection!, naturalSize.width, naturalSize.height);

    // Dev logging
    console.log("[magic-pen] Submit:", {
      mode,
      hasMask: !!maskForApi,
      refCount: refImages.length,
      selection: mode === "rect" ? selection : undefined,
    });

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
      const data = await parseMagicPenResponse(res);

      if (!res.ok && data.ok) {
        setResult({
          ok: false,
          error: { message: `サーバーエラーが発生しました (status=${res.status})`, status: res.status },
        });
        return;
      }

      // CRITICAL: Apply post-processing composition for BOTH modes to guarantee mask-outside unchanged
      if (data.ok && maskForApi) {
        console.log("[magic-pen] Applying post-composition to guarantee mask-outside unchanged");
        const { dataUrl: compositedDataUrl } = await compositeWithMask(
          imageDataUrl,
          data.imageDataUrl,
          maskForApi
        );
        setResult({
          ...data,
          imageDataUrl: compositedDataUrl,
        });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({
        ok: false,
        error: { message: err instanceof Error ? err.message : "Network error" },
      });
    } finally {
      setLoading(false);
    }
  };

  // === Display size ===
  const getDisplaySize = useCallback(() => {
    if (!naturalSize) return { width: 600, height: 400 };
    return {
      width: naturalSize.width * zoom,
      height: naturalSize.height * zoom,
    };
  }, [naturalSize, zoom]);

  const canSubmit = imageLoaded && prompt.trim() && (
    (mode === "rect" && selection && selection.width > 5 && selection.height > 5) ||
    (mode === "brush")
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Magic Pen v2</CardTitle>
            <CardDescription>
              矩形 or ブラシで編集領域を指定 / 参考画像を複数追加可能
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[400px_1fr]">
            {/* Left: Controls */}
            <div className="space-y-4">
              {/* Main Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">編集対象画像</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">選択モード</label>
                <div className="flex gap-2">
                  <Button
                    variant={mode === "rect" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("rect")}
                  >
                    矩形
                  </Button>
                  <Button
                    variant={mode === "brush" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("brush")}
                  >
                    ブラシ
                  </Button>
                </div>
              </div>

              {/* Brush Controls */}
              {mode === "brush" && (
                <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                  <div className="flex gap-2">
                    <Button
                      variant={brushTool === "brush" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBrushTool("brush")}
                    >
                      ブラシ
                    </Button>
                    <Button
                      variant={brushTool === "eraser" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBrushTool("eraser")}
                    >
                      消しゴム
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">サイズ: {brushSize}px</label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={doUndo}>Undo</Button>
                    <Button size="sm" variant="outline" onClick={doRedo}>Redo</Button>
                    <Button size="sm" variant="outline" onClick={clearMask}>Clear</Button>
                    <Button
                      size="sm"
                      variant={showMask ? "default" : "outline"}
                      onClick={() => setShowMask((v) => !v)}
                    >
                      {showMask ? "マスク表示" : "マスク非表示"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant={invertMask ? "destructive" : "outline"}
                      onClick={() => setInvertMask((v) => !v)}
                    >
                      {invertMask ? "保護モード" : "編集モード"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {invertMask ? "塗った部分を保護" : "塗った部分を編集"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ctrl+Z: Undo / Ctrl+Shift+Z: Redo / Ctrl+Wheel: Zoom / Space+Drag: Pan
                  </p>
                </div>
              )}

              {/* Zoom */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))}>-</Button>
                  <Button size="sm" variant="outline" onClick={() => setZoom(1)}>100%</Button>
                  <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(8, z * 1.2))}>+</Button>
                </div>
              </div>

              {/* Selection Info */}
              {mode === "rect" && selection && selection.width > 0 && (
                <div className="text-sm bg-muted p-2 rounded-md font-mono">
                  x={selection.x}, y={selection.y}, w={selection.width}, h={selection.height}
                </div>
              )}

              {/* Reference Images - Number Slots */}
              <div className="space-y-2">
                <label className="text-sm font-medium">参考画像スロット</label>
                {/* Hidden file input */}
                <input
                  id="ref-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && addRefFiles(e.target.files)}
                />
                {/* Slot Grid - Always show MAX_REF_IMAGES slots */}
                <div
                  ref={dropzoneRef}
                  className="grid grid-cols-3 gap-2 p-2 border rounded-md bg-muted/10"
                >
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
                          hasImage
                            ? `border-primary/50 cursor-grab ${dragIdx === i ? "opacity-50 scale-95" : ""}`
                            : isNextSlot
                            ? "border-dashed border-primary/60 cursor-pointer hover:bg-primary/10"
                            : "border-dashed border-muted-foreground/30 opacity-50"
                        }`}
                        draggable={hasImage}
                        onDragStart={() => hasImage && setDragIdx(i)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragIdx !== null && dragIdx !== i && hasImage) {
                            moveRefImage(dragIdx, i);
                            setDragIdx(i);
                          }
                        }}
                        onDragEnd={() => setDragIdx(null)}
                        onClick={() => {
                          if (isNextSlot) {
                            document.getElementById("ref-file-input")?.click();
                          } else if (hasImage) {
                            // Click to append label to prompt
                            setPrompt((prev) => {
                              const label = `${slotLabel}（${geminiLabel}）`;
                              if (prev.includes(label)) return prev;
                              return prev ? `${prev.trimEnd()} ${label}` : label;
                            });
                          }
                        }}
                      >
                        {hasImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`data:${r.mimeType};base64,${r.base64}`}
                              alt={r.name}
                              className="w-full h-full object-cover rounded"
                            />
                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRefImage(i);
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs hover:scale-110 transition-transform z-10"
                            >
                              ×
                            </button>
                            {/* Labels */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded-b leading-tight">
                              <div className="font-bold">{slotLabel}</div>
                              <div className="opacity-80">{geminiLabel}</div>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground">
                            {isNextSlot ? (
                              <>
                                <span className="text-lg">+</span>
                                <span>{slotLabel}</span>
                              </>
                            ) : (
                              <span className="opacity-50">{slotLabel}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  D&D / クリック / Ctrl+V / URL で追加 / スロットをクリックでプロンプトに追記
                </p>
              </div>

              {/* Image Mapping Reference (always visible) */}
              <div className="p-2 border rounded-md bg-muted/20 text-xs space-y-1">
                <div className="font-medium text-sm mb-1">Gemini API 画像対応表</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono">
                  <span className="text-muted-foreground">画像#1:</span>
                  <span>編集対象</span>
                  <span className="text-muted-foreground">画像#2:</span>
                  <span>マスク</span>
                  {Array.from({ length: MAX_REF_IMAGES }).map((_, i) => (
                    <div key={i} className="contents">
                      <span className="text-muted-foreground">画像#{i + 3}:</span>
                      <span className={i < refImages.length ? "text-primary" : "text-muted-foreground/50"}>
                        参考{i + 1} {i < refImages.length ? "✓" : "（空）"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium">指示テキスト</label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`例: 参考1（画像#3）の配色を使って、この領域を華やかにして。背景の黄色は維持。\n\n※ 参考画像スロットをクリックすると番号が自動入力されます`}
                />
              </div>

              {/* Submit */}
              <Button onClick={handleSubmit} disabled={loading || !canSubmit} className="w-full">
                {loading ? "生成中..." : "実行"}
              </Button>

              {naturalSize && (
                <p className="text-xs text-muted-foreground">
                  画像サイズ: {naturalSize.width} x {naturalSize.height}px
                </p>
              )}
            </div>

            {/* Right: Canvas */}
            <div className="space-y-2">
              <div className="text-sm font-medium">
                キャンバス
                <span className="ml-2 text-xs text-muted-foreground">
                  {imageLoaded ? (mode === "brush" ? "ブラシで塗る" : "ドラッグで矩形") : "画像未選択"}
                </span>
              </div>
              <div
                ref={containerRef}
                className="border rounded-md bg-muted/20 overflow-auto"
                style={{ maxHeight: 600 }}
              >
                <div
                  className="relative"
                  style={{
                    width: getDisplaySize().width,
                    height: getDisplaySize().height,
                    minWidth: 300,
                    minHeight: 200,
                  }}
                >
                  {/* Image layer */}
                  <canvas
                    ref={imageCanvasRef}
                    className="absolute top-0 left-0"
                    style={{ transformOrigin: "top left", transform: `scale(${zoom})` }}
                  />
                  {/* Mask data layer (hidden - used for API) */}
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ display: "none" }}
                  />
                  {/* View layer - shows red overlay where brush painted */}
                  <canvas
                    ref={viewCanvasRef}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{
                      transformOrigin: "top left",
                      transform: `scale(${zoom})`,
                      display: showMask ? "block" : "none",
                    }}
                  />
                  {/* Overlay layer (rect selection + mouse events) */}
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
                      画像をアップロードしてください
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className={result.ok ? "text-green-600" : "text-red-600"}>
                {result.ok ? "生成成功" : "エラー"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.ok ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Model:</div>
                    <div className="font-mono">{result.modelUsed}</div>
                    <div className="text-muted-foreground">Elapsed:</div>
                    <div className="font-mono">{result.elapsedMs}ms</div>
                  </div>
                  <div className="border rounded-md overflow-hidden bg-muted/30 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.imageDataUrl}
                      alt="Generated result"
                      className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: 600 }}
                      onClick={() => applyResultAsSource(result.imageDataUrl)}
                      title="クリックでこの画像を編集対象にする"
                    />
                  </div>
                  {/* Action buttons for result */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => applyResultAsSource(result.imageDataUrl)}
                      variant="default"
                      size="sm"
                    >
                      🎨 この結果を編集
                    </Button>
                    <Button
                      onClick={() => addResultToReferences(result.imageDataUrl)}
                      variant="outline"
                      size="sm"
                      disabled={refImages.length >= MAX_REF_IMAGES}
                    >
                      📎 参考画像に追加
                    </Button>
                    <Button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.download = `magic-pen-${Date.now()}.png`;
                        link.href = result.imageDataUrl;
                        link.click();
                      }}
                      variant="outline"
                      size="sm"
                    >
                      💾 ダウンロード
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {result.error.message}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit History */}
        {editHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">編集履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {editHistory.map((item, idx) => (
                  <button
                    key={item.timestamp}
                    onClick={() => restoreFromHistory(item)}
                    className="shrink-0 border rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                    title={`${new Date(item.timestamp).toLocaleTimeString()} の状態に戻す`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageDataUrl}
                      alt={`History ${idx + 1}`}
                      className="w-20 h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                クリックで過去の状態に戻れます（最大10件）
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
