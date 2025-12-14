"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MagicPenDialog } from "@/components/magic-pen";

// Types
type ToolType = "select" | "sticky" | "text" | "image";

interface Project {
  id: string;
  name: string;
  canvas_json: string | null;
}

interface SwipeFile {
  id: string;
  name: string;
  width: number | null;
  height: number | null;
}

interface FabricCanvas {
  dispose: () => void;
  add: (...objects: FabricObject[]) => void;
  remove: (...objects: FabricObject[]) => void;
  getActiveObject: () => FabricObject | null;
  discardActiveObject: () => void;
  setActiveObject: (obj: FabricObject) => void;
  renderAll: () => void;
  toJSON: () => object;
  loadFromJSON: (json: object, callback?: () => void) => void;
  toDataURL: (options?: { format?: string; quality?: number; multiplier?: number }) => string;
  on: (event: string, handler: (e?: FabricEvent) => void) => void;
  off: (event: string, handler?: () => void) => void;
  getObjects: () => FabricObject[];
  setDimensions: (dimensions: { width: number; height: number }) => void;
  setViewportTransform: (transform: number[]) => void;
  viewportTransform: number[];
  getZoom: () => number;
  setZoom: (zoom: number) => void;
  zoomToPoint: (point: { x: number; y: number }, zoom: number) => void;
  relativePan: (point: { x: number; y: number }) => void;
  getPointer: (e: MouseEvent) => { x: number; y: number };
  requestRenderAll: () => void;
  defaultCursor: string;
  hoverCursor: string;
  selection: boolean;
  width: number;
  height: number;
}

interface FabricObject {
  type?: string;
  set: (options: Record<string, unknown>) => void;
  get: (key: string) => unknown;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: string | number;
  text?: string;
  fill?: string;
  backgroundColor?: string;
  opacity?: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  textAlign?: string;
  data?: Record<string, unknown>;
}

interface FabricEvent {
  e?: MouseEvent | WheelEvent;
  target?: FabricObject;
}

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<ToolType>("select");
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);
  const [showSwipeModal, setShowSwipeModal] = useState(false);

  // Selected object properties
  const [selectedObj, setSelectedObj] = useState<FabricObject | null>(null);
  const [editText, setEditText] = useState("");
  const [editFontSize, setEditFontSize] = useState(16);
  const [editBold, setEditBold] = useState(false);
  const [editColor, setEditColor] = useState("#111827");
  const [editBgColor, setEditBgColor] = useState("#fef08a");
  const [editOpacity, setEditOpacity] = useState(1);
  const [editAlign, setEditAlign] = useState("left");

  // Generate panel
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Magic Pen dialog state
  const [magicPenOpen, setMagicPenOpen] = useState(false);
  const [magicPenImageUrl, setMagicPenImageUrl] = useState<string | null>(null);
  const [magicPenObjectRef, setMagicPenObjectRef] = useState<FabricObject | null>(null);

  // Undo/Redo history
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);

  // Grid state
  const [showGrid, setShowGrid] = useState(true);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Right panel state
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Pan state
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Fabric.js module
  const [FabricModule, setFabricModule] = useState<typeof import("fabric") | null>(null);

  useEffect(() => {
    import("fabric").then((mod) => {
      const m = mod as unknown as Record<string, unknown>;
      // #region agent log
      fetch("/api/dev/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "canvas-debug", hypothesisId: "H1", location: "src/app/projects/[id]/canvas/page.tsx:import-fabric", message: "fabric module loaded", data: { keysSample: Object.keys(m).slice(0, 30), hasCanvas: "Canvas" in m, hasPoint: "Point" in m, hasImage: "Image" in m, hasFabricImage: "FabricImage" in m }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      setFabricModule(mod);
    });
  }, []);

  // Fetch project and swipe files
  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, swipeRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/swipe-files`),
        ]);
        const projData = await projRes.json();
        const swipeData = await swipeRes.json();

        if (!projData.ok) {
          router.push("/projects");
          return;
        }

        setProject(projData.project);
        if (swipeData.ok) setSwipeFiles(swipeData.swipeFiles);
      } catch (err) {
        console.error("Fetch error:", err);
        router.push("/projects");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId, router]);

  // Selection handler (defined before useEffect that uses it)
  const handleSelection = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const obj = canvas.getActiveObject();
    if (!obj) {
      setSelectedObj(null);
      return;
    }

    setSelectedObj(obj);
    if (obj.type === "textbox" || obj.type === "i-text") {
      setEditText((obj.text as string) || "");
      setEditFontSize((obj.fontSize as number) || 16);
      setEditBold(obj.fontWeight === "bold" || obj.fontWeight === 700);
      setEditColor((obj.fill as string) || "#111827");
      setEditAlign((obj.textAlign as string) || "left");
      if (obj.backgroundColor) {
        setEditBgColor(obj.backgroundColor as string);
      }
    }
    if (obj.type === "image") {
      setEditOpacity((obj.opacity as number) ?? 1);
    }
  }, []);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!FabricModule || !canvasRef.current || !containerRef.current || !project) return;

    const { Canvas, Point } = FabricModule;

    const containerRect = containerRef.current.getBoundingClientRect();
    // #region agent log
    fetch("/api/dev/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "canvas-debug", hypothesisId: "H2", location: "src/app/projects/[id]/canvas/page.tsx:init", message: "init fabric canvas attempt", data: { containerW: containerRect.width, containerH: containerRect.height, hasCanvasCtor: typeof Canvas === "function", hasPointCtor: typeof Point === "function", hasCanvasJson: !!project.canvas_json }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    const canvas = new Canvas(canvasRef.current, {
      width: containerRect.width,
      height: containerRect.height,
      backgroundColor: "#f8fafc",
      selection: true,
      preserveObjectStacking: true,
    }) as unknown as FabricCanvas;

    fabricRef.current = canvas;

    // Load saved canvas
    if (project.canvas_json) {
      try {
        const json = JSON.parse(project.canvas_json);
        canvas.loadFromJSON(json, () => {
          canvas.renderAll();
          // 初期状態を履歴に保存
          historyRef.current = [JSON.stringify(canvas.toJSON())];
          historyIndexRef.current = 0;
        });
      } catch (e) {
        console.error("Failed to load canvas:", e);
      }
    } else {
      // 新規キャンバスの初期状態を履歴に保存
      historyRef.current = [JSON.stringify(canvas.toJSON())];
      historyIndexRef.current = 0;
    }

    // Selection events
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => setSelectedObj(null));

    // Object modified - save to history and trigger auto-save
    const handleObjectModified = () => {
      handleSelection();
      // 履歴保存は少し遅延させる（連続操作対応）
      setTimeout(() => {
        const json = JSON.stringify(canvas.toJSON());
        if (historyRef.current.length === 0 || historyRef.current[historyIndexRef.current] !== json) {
          if (historyIndexRef.current < historyRef.current.length - 1) {
            historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
          }
          historyRef.current.push(json);
          if (historyRef.current.length > 50) historyRef.current.shift();
          historyIndexRef.current = historyRef.current.length - 1;
        }
      }, 100);
      // Auto-save trigger
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          const jsonStr = JSON.stringify(canvas.toJSON());
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ canvas_json: jsonStr }),
          });
          setLastSaved(new Date());
        } catch (err) {
          console.error("Auto-save error:", err);
        }
      }, 2000);
    };
    canvas.on("object:modified", handleObjectModified);
    canvas.on("object:added", handleObjectModified);
    canvas.on("object:removed", handleObjectModified);

    // Pan with Space + drag, Undo/Redo with Ctrl+Z/Y
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (historyIndexRef.current > 0) {
          isUndoRedoRef.current = true;
          historyIndexRef.current--;
          const json = JSON.parse(historyRef.current[historyIndexRef.current]);
          canvas.loadFromJSON(json, () => {
            canvas.renderAll();
            isUndoRedoRef.current = false;
          });
        }
        return;
      }
      // Redo: Ctrl+Y / Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key === "y") || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        if (historyIndexRef.current < historyRef.current.length - 1) {
          isUndoRedoRef.current = true;
          historyIndexRef.current++;
          const json = JSON.parse(historyRef.current[historyIndexRef.current]);
          canvas.loadFromJSON(json, () => {
            canvas.renderAll();
            isUndoRedoRef.current = false;
          });
        }
        return;
      }
      // Pan mode
      if (e.code === "Space" && !isPanningRef.current) {
        isPanningRef.current = true;
        canvas.defaultCursor = "grab";
        canvas.hoverCursor = "grab";
        canvas.selection = false;
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isPanningRef.current = false;
        canvas.defaultCursor = "default";
        canvas.hoverCursor = "move";
        canvas.selection = true;
        canvas.renderAll();
      }
    };

    const handleMouseDown = (opt: FabricEvent) => {
      if (isPanningRef.current && opt.e) {
        canvas.defaultCursor = "grabbing";
        lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
      }
    };

    const handleMouseMove = (opt: FabricEvent) => {
      if (isPanningRef.current && opt.e && (opt.e as MouseEvent).buttons === 1) {
        const e = opt.e as MouseEvent;
        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;
        canvas.relativePan(new Point(dx, dy) as unknown as { x: number; y: number });
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        canvas.requestRenderAll();
      }
    };

    const handleMouseUp = () => {
      if (isPanningRef.current) {
        canvas.defaultCursor = "grab";
      }
    };

    // Wheel: Pan (normal) / Zoom (Ctrl/Cmd)
    const handleWheel = (opt: FabricEvent) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom with Ctrl/Cmd + wheel
        const delta = e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        zoom = Math.min(Math.max(0.01, zoom), 20);
        canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
        setZoomLevel(zoom);
      } else {
        // Pan with normal wheel (trackpad friendly)
        const panX = -e.deltaX;
        const panY = -e.deltaY;
        canvas.relativePan(new Point(panX, panY) as unknown as { x: number; y: number });
      }
      canvas.requestRenderAll();
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("mouse:wheel", handleWheel);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Resize handler
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.setDimensions({ width: rect.width, height: rect.height });
        canvas.renderAll();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      canvas.off("selection:created");
      canvas.off("selection:updated");
      canvas.off("selection:cleared");
      canvas.off("object:modified");
      canvas.off("object:added");
      canvas.off("object:removed");
      canvas.off("mouse:down");
      canvas.off("mouse:move");
      canvas.off("mouse:up");
      canvas.off("mouse:wheel");
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [FabricModule, project, handleSelection, projectId]);

  // Draw grid on background canvas
  useEffect(() => {
    if (!showGrid || !gridCanvasRef.current || !containerRef.current) return;

    const gridCanvas = gridCanvasRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Set canvas size
    gridCanvas.width = rect.width;
    gridCanvas.height = rect.height;

    const ctx = gridCanvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

    // Get viewport transform from fabric canvas
    const vpt = fabricRef.current?.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0]; // Scale
    const offsetX = vpt[4]; // Pan X
    const offsetY = vpt[5]; // Pan Y

    // Grid settings - adjust grid size based on zoom
    let gridSize = 20;
    if (zoom < 0.2) gridSize = 100;
    else if (zoom < 0.5) gridSize = 50;
    else if (zoom > 2) gridSize = 10;

    const scaledGridSize = gridSize * zoom;

    // Calculate grid start position
    const startX = offsetX % scaledGridSize;
    const startY = offsetY % scaledGridSize;

    // Draw grid dots
    ctx.fillStyle = "#d1d5db";
    const dotRadius = Math.max(1, zoom * 1.5);

    for (let x = startX; x < gridCanvas.width; x += scaledGridSize) {
      for (let y = startY; y < gridCanvas.height; y += scaledGridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [showGrid, zoomLevel]);

  // Redraw grid when canvas is panned
  useEffect(() => {
    if (!fabricRef.current || !showGrid) return;

    const canvas = fabricRef.current;
    const redrawGrid = () => {
      if (!gridCanvasRef.current || !containerRef.current) return;

      const gridCanvas = gridCanvasRef.current;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      gridCanvas.width = rect.width;
      gridCanvas.height = rect.height;

      const ctx = gridCanvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];
      const offsetX = vpt[4];
      const offsetY = vpt[5];

      let gridSize = 20;
      if (zoom < 0.2) gridSize = 100;
      else if (zoom < 0.5) gridSize = 50;
      else if (zoom > 2) gridSize = 10;

      const scaledGridSize = gridSize * zoom;
      const startX = offsetX % scaledGridSize;
      const startY = offsetY % scaledGridSize;

      ctx.fillStyle = "#d1d5db";
      const dotRadius = Math.max(1, zoom * 1.5);

      for (let x = startX; x < gridCanvas.width; x += scaledGridSize) {
        for (let y = startY; y < gridCanvas.height; y += scaledGridSize) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    canvas.on("after:render", redrawGrid);
    return () => {
      canvas.off("after:render", redrawGrid);
    };
  }, [showGrid]);

  // Add sticky note at position
  // Note: object:added event already handles history/autosave in canvas init
  const addStickyAt = useCallback(
    (x: number, y: number) => {
      if (!FabricModule || !fabricRef.current) return;
      const { Textbox } = FabricModule;
      const canvas = fabricRef.current;

      const sticky = new Textbox("付箋メモ", {
        left: x - 75,
        top: y - 50,
        width: 150,
        fontSize: 14,
        fontFamily: "sans-serif",
        fill: "#111827",
        backgroundColor: "#fef08a",
        padding: 10,
        editable: true,
        data: { type: "sticky" },
      });
      canvas.add(sticky as unknown as FabricObject);
      canvas.setActiveObject(sticky as unknown as FabricObject);
      canvas.renderAll();
      setTool("select");
    },
    [FabricModule]
  );

  // Add text at position
  // Note: object:added event already handles history/autosave in canvas init
  const addTextAt = useCallback(
    (x: number, y: number) => {
      if (!FabricModule || !fabricRef.current) return;
      const { Textbox } = FabricModule;
      const canvas = fabricRef.current;

      const text = new Textbox("テキストを入力", {
        left: x - 100,
        top: y - 20,
        width: 200,
        fontSize: 24,
        fontFamily: "sans-serif",
        fill: "#111827",
        editable: true,
        data: { type: "text" },
      });
      canvas.add(text as unknown as FabricObject);
      canvas.setActiveObject(text as unknown as FabricObject);
      canvas.renderAll();
      setTool("select");
    },
    [FabricModule]
  );

  // Legacy add functions (center placement)
  const addSticky = useCallback(() => {
    if (!fabricRef.current) return;
    addStickyAt(fabricRef.current.width / 2, fabricRef.current.height / 2);
  }, [addStickyAt]);

  const addText = useCallback(() => {
    if (!fabricRef.current) return;
    addTextAt(fabricRef.current.width / 2, fabricRef.current.height / 2);
  }, [addTextAt]);

  // Add image from swipe file
  const addImageFromSwipe = useCallback(
    async (swipeId: string) => {
      if (!FabricModule || !fabricRef.current) return;
      const { FabricImage } = FabricModule;
      const canvas = fabricRef.current;

      const imageUrl = `/api/swipe-files/${swipeId}/image`;

      try {
        // #region agent log
        fetch("/api/dev/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "canvas-debug", hypothesisId: "H1", location: "src/app/projects/[id]/canvas/page.tsx:addImageFromSwipe", message: "addImageFromSwipe called", data: { swipeId, imageUrl, hasFabricImage: "FabricImage" in (FabricModule as unknown as Record<string, unknown>), hasImage: "Image" in (FabricModule as unknown as Record<string, unknown>) }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        img.set({
          left: canvas.width / 2 - 100,
          top: canvas.height / 2 - 100,
          scaleX: 0.5,
          scaleY: 0.5,
          data: { type: "image", swipeId },
        });
        canvas.add(img as unknown as FabricObject);
        canvas.setActiveObject(img as unknown as FabricObject);
        canvas.renderAll();
      } catch (err) {
        // #region agent log
        fetch("/api/dev/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "canvas-debug", hypothesisId: "H4", location: "src/app/projects/[id]/canvas/page.tsx:addImageFromSwipe", message: "addImageFromSwipe error", data: { swipeId, imageUrl, error: err instanceof Error ? err.message : String(err) }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        console.error("Failed to add image:", err);
      }
      setShowSwipeModal(false);
      setTool("select");
    },
    [FabricModule]
  );

  // Add image from data URL
  const addImageFromDataUrl = useCallback(
    async (dataUrl: string) => {
      if (!FabricModule || !fabricRef.current) return;
      const { FabricImage } = FabricModule;
      const canvas = fabricRef.current;

      try {
        // #region agent log
        fetch("/api/dev/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "canvas-debug", hypothesisId: "H1", location: "src/app/projects/[id]/canvas/page.tsx:addImageFromDataUrl", message: "addImageFromDataUrl called", data: { dataUrlLen: dataUrl.length, dataUrlMime: dataUrl.startsWith("data:") ? dataUrl.slice(5, dataUrl.indexOf(";")) : null, hasFabricImage: "FabricImage" in (FabricModule as unknown as Record<string, unknown>), hasImage: "Image" in (FabricModule as unknown as Record<string, unknown>) }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        const img = await FabricImage.fromURL(dataUrl);
        img.set({
          left: canvas.width / 2 - 100,
          top: canvas.height / 2 - 100,
          scaleX: 0.5,
          scaleY: 0.5,
          data: { type: "image", generated: true },
        });
        canvas.add(img as unknown as FabricObject);
        canvas.setActiveObject(img as unknown as FabricObject);
        canvas.renderAll();
      } catch (err) {
        // #region agent log
        fetch("/api/dev/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "canvas-debug", hypothesisId: "H1", location: "src/app/projects/[id]/canvas/page.tsx:addImageFromDataUrl", message: "addImageFromDataUrl error", data: { error: err instanceof Error ? err.message : String(err) }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        console.error("Failed to add generated image:", err);
      }
    },
    [FabricModule]
  );

  // Update selected object
  const updateSelected = useCallback(
    (updates: Record<string, unknown>) => {
      if (!fabricRef.current || !selectedObj) return;
      selectedObj.set(updates);
      fabricRef.current.renderAll();
    },
    [selectedObj]
  );

  // Save canvas
  const saveCanvas = useCallback(async () => {
    if (!fabricRef.current) return;
    setSaving(true);

    try {
      const json = JSON.stringify(fabricRef.current.toJSON());
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas_json: json }),
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveCanvas();
    }, 2000); // 2秒後に自動保存
  }, [saveCanvas]);

  // Undo
  const undo = useCallback(() => {
    if (!fabricRef.current || historyIndexRef.current <= 0) return;

    isUndoRedoRef.current = true;
    historyIndexRef.current--;
    const json = JSON.parse(historyRef.current[historyIndexRef.current]);
    fabricRef.current.loadFromJSON(json, () => {
      fabricRef.current?.renderAll();
      isUndoRedoRef.current = false;
      triggerAutoSave();
    });
  }, [triggerAutoSave]);

  // Redo
  const redo = useCallback(() => {
    if (!fabricRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;

    isUndoRedoRef.current = true;
    historyIndexRef.current++;
    const json = JSON.parse(historyRef.current[historyIndexRef.current]);
    fabricRef.current.loadFromJSON(json, () => {
      fabricRef.current?.renderAll();
      isUndoRedoRef.current = false;
      triggerAutoSave();
    });
  }, [triggerAutoSave]);

  // Open Magic Pen for selected image
  const openMagicPenForImage = useCallback(() => {
    if (!fabricRef.current || !selectedObj || selectedObj.type !== "image") return;

    // Get image data URL from Fabric image object
    try {
      const imgObj = selectedObj as unknown as {
        toDataURL: (options?: { format?: string }) => string;
      };
      const dataUrl = imgObj.toDataURL({ format: "png" });
      setMagicPenImageUrl(dataUrl);
      setMagicPenObjectRef(selectedObj);
      setMagicPenOpen(true);
    } catch (err) {
      // #region agent log
      fetch("/api/dev/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "canvas-debug", hypothesisId: "H3", location: "src/app/projects/[id]/canvas/page.tsx:openMagicPenForImage", message: "openMagicPenForImage error", data: { selectedType: selectedObj.type, hasToDataURL: typeof (selectedObj as unknown as { toDataURL?: unknown }).toDataURL === "function", error: err instanceof Error ? err.message : String(err) }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      console.error("Failed to get image data URL:", err);
      alert("画像の取得に失敗しました");
    }
  }, [selectedObj]);

  // Apply Magic Pen result to canvas image
  const handleMagicPenApply = useCallback(
    async (imageDataUrl: string) => {
      if (!FabricModule || !fabricRef.current || !magicPenObjectRef) return;

      const { FabricImage } = FabricModule;
      const canvas = fabricRef.current;

      try {
        // Create new image from result
        const newImg = await FabricImage.fromURL(imageDataUrl);

        // Copy position and transform from original
        newImg.set({
          left: magicPenObjectRef.left,
          top: magicPenObjectRef.top,
          scaleX: magicPenObjectRef.scaleX,
          scaleY: magicPenObjectRef.scaleY,
          angle: magicPenObjectRef.angle,
          data: { type: "image", magicPenEdited: true },
        });

        // Remove original and add new
        canvas.remove(magicPenObjectRef);
        canvas.add(newImg as unknown as FabricObject);
        canvas.setActiveObject(newImg as unknown as FabricObject);
        canvas.renderAll();

        setMagicPenObjectRef(null);
        setMagicPenImageUrl(null);
      } catch (err) {
        // #region agent log
        fetch("/api/dev/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "debug-session", runId: "canvas-debug", hypothesisId: "H1", location: "src/app/projects/[id]/canvas/page.tsx:handleMagicPenApply", message: "handleMagicPenApply error", data: { hasFabricImage: "FabricImage" in (FabricModule as unknown as Record<string, unknown>), hasImage: "Image" in (FabricModule as unknown as Record<string, unknown>), imageDataUrlLen: imageDataUrl.length, error: err instanceof Error ? err.message : String(err) }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        console.error("Failed to apply Magic Pen result:", err);
        alert("編集結果の適用に失敗しました");
      }
    },
    [FabricModule, magicPenObjectRef]
  );

  // Generate image
  const handleGenerate = async () => {
    if (!generatePrompt.trim()) return;
    setGenerating(true);
    setGeneratedImage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/assets/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: generatePrompt }),
      });
      const data = await res.json();
      if (data.ok && data.imageDataUrl) {
        setGeneratedImage(data.imageDataUrl);
      } else {
        alert(`生成失敗: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Generate error:", err);
      alert("画像生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  // Save to swipe file
  const saveToSwipe = async (dataUrl: string) => {
    try {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return;

      const mimeType = match[1];
      const base64 = match[2];

      // Get dimensions
      const img = new Image();
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.src = dataUrl;
      });

      const res = await fetch("/api/swipe-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [
            {
              name: `generated-${Date.now()}`,
              mimeType,
              base64,
              width: img.naturalWidth,
              height: img.naturalHeight,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("スワイプファイルに保存しました");
        // Refresh swipe files
        const swipeRes = await fetch("/api/swipe-files");
        const swipeData = await swipeRes.json();
        if (swipeData.ok) setSwipeFiles(swipeData.swipeFiles);
      }
    } catch (err) {
      console.error("Save to swipe error:", err);
    }
  };

  // Export canvas as PNG
  const exportCanvas = useCallback(async () => {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({ format: "png", multiplier: 2 });

    try {
      const res = await fetch(`/api/projects/${projectId}/assets/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl, filename: "canvas.png" }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`書き出し完了: ${data.path}`);
      }
    } catch {
      // Fallback: download directly
      const link = document.createElement("a");
      link.download = `canvas-${projectId}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [projectId]);

  // Copy summary (all sticky/text content)
  const copySummary = useCallback(() => {
    if (!fabricRef.current) return;
    const objects = fabricRef.current.getObjects();
    const texts: string[] = [];

    objects.forEach((obj) => {
      if ((obj.type === "textbox" || obj.type === "i-text") && obj.text) {
        const objData = obj.data as Record<string, unknown> | undefined;
        const prefix = objData?.type === "sticky" ? "[付箋] " : "";
        texts.push(prefix + (obj.text as string));
      }
    });

    if (texts.length === 0) {
      alert("コピーするテキストがありません");
      return;
    }

    navigator.clipboard.writeText(texts.join("\n\n"));
    alert(`${texts.length}件のテキストをコピーしました`);
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    let zoom = canvas.getZoom() * 1.2;
    zoom = Math.min(zoom, 20);
    canvas.setZoom(zoom);
    setZoomLevel(zoom);
    canvas.requestRenderAll();
  }, []);

  const zoomOut = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    let zoom = canvas.getZoom() / 1.2;
    zoom = Math.max(zoom, 0.01);
    canvas.setZoom(zoom);
    setZoomLevel(zoom);
    canvas.requestRenderAll();
  }, []);

  const zoomReset = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoomLevel(1);
    canvas.requestRenderAll();
  }, []);

  const zoomFit = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    // Reset to fit view (zoom 100%)
    canvas.setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoomLevel(1);
    canvas.requestRenderAll();
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !FabricModule || !fabricRef.current) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        await addImageFromDataUrl(dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [FabricModule, addImageFromDataUrl]
  );

  if (loading || !FabricModule) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← {project.name}
          </Link>
          <span className="text-sm font-medium">キャンバス</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <Button variant="outline" size="sm" onClick={undo} title="元に戻す (Ctrl+Z)">
            ↩
          </Button>
          <Button variant="outline" size="sm" onClick={redo} title="やり直す (Ctrl+Y)">
            ↪
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={copySummary}>
            要約をコピー
          </Button>
          <Button variant="outline" size="sm" onClick={exportCanvas}>
            PNG書き出し
          </Button>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                {lastSaved.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 保存済
              </span>
            )}
            <Button size="sm" onClick={saveCanvas} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-14 border-r bg-card flex flex-col items-center py-2 gap-1 shrink-0">
          <ToolButton
            icon="↖"
            label="選択"
            active={tool === "select"}
            onClick={() => setTool("select")}
          />
          <ToolButton
            icon="📝"
            label="付箋"
            active={tool === "sticky"}
            onClick={() => {
              setTool("sticky");
              addSticky();
            }}
          />
          <ToolButton
            icon="T"
            label="テキスト"
            active={tool === "text"}
            onClick={() => {
              setTool("text");
              addText();
            }}
          />
          <ToolButton
            icon="🖼"
            label="画像"
            active={tool === "image"}
            onClick={() => {
              setTool("image");
              setShowSwipeModal(true);
            }}
          />
          <div className="border-t w-8 my-2" />
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="w-10 h-10 rounded flex items-center justify-center hover:bg-muted text-lg" title="アップロード">
              📤
            </div>
          </label>
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-muted/30">
          {/* Grid Canvas (background layer) */}
          {showGrid && (
            <canvas
              ref={gridCanvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
            />
          )}
          <canvas ref={canvasRef} style={{ position: "relative", zIndex: 1 }} />
          {/* Hint */}
          <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded">
            ホイール: パン / Ctrl+ホイール: ズーム / Space+ドラッグ: パン
          </div>
          {/* Zoom Controls */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-card/90 rounded border shadow-sm px-1 py-0.5">
            <button
              onClick={zoomOut}
              className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-sm"
              title="縮小"
            >
              −
            </button>
            <button
              onClick={zoomReset}
              className="px-2 h-7 rounded hover:bg-muted text-xs font-mono min-w-[48px]"
              title="100%にリセット"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={zoomIn}
              className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-sm"
              title="拡大"
            >
              +
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={zoomFit}
              className="px-2 h-7 rounded hover:bg-muted text-xs"
              title="フィット"
            >
              Fit
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2 h-7 rounded text-xs ${showGrid ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}
              title="グリッド表示切替"
            >
              Grid
            </button>
          </div>
        </div>

        {/* Right Panel Toggle Button (shown when panel is closed) */}
        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="w-8 border-l bg-card flex items-center justify-center hover:bg-muted shrink-0"
            title="パネルを開く"
          >
            <span className="text-muted-foreground">‹</span>
          </button>
        )}

        {/* Right Panel */}
        <div className={`${rightPanelOpen ? "w-72" : "w-0 overflow-hidden"} border-l bg-card flex flex-col shrink-0 transition-all duration-200`}>
          {/* Panel Header with close button */}
          <div className="flex items-center justify-between px-2 py-1 border-b">
            <span className="text-xs font-medium text-muted-foreground">パネル</span>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center"
              title="パネルを閉じる"
            >
              ›
            </button>
          </div>
          <Tabs defaultValue="properties" className="flex-1 flex flex-col">
            <TabsList className="mx-2 mt-2">
              <TabsTrigger value="properties" className="flex-1">プロパティ</TabsTrigger>
              <TabsTrigger value="generate" className="flex-1">素材生成</TabsTrigger>
            </TabsList>

            {/* Properties Tab */}
            <TabsContent value="properties" className="flex-1 overflow-y-auto p-3">
              {selectedObj ? (
                <div className="space-y-4">
                  {(selectedObj.type === "textbox" || selectedObj.type === "i-text") && (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground">テキスト</label>
                        <textarea
                          value={editText}
                          onChange={(e) => {
                            setEditText(e.target.value);
                            updateSelected({ text: e.target.value });
                          }}
                          className="w-full mt-1 p-2 border rounded text-sm h-20 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          フォントサイズ: {editFontSize}px
                        </label>
                        <input
                          type="range"
                          min={8}
                          max={72}
                          value={editFontSize}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setEditFontSize(v);
                            updateSelected({ fontSize: v });
                          }}
                          className="w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bold"
                          checked={editBold}
                          onChange={(e) => {
                            setEditBold(e.target.checked);
                            updateSelected({ fontWeight: e.target.checked ? "bold" : "normal" });
                          }}
                        />
                        <label htmlFor="bold" className="text-sm">太字</label>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">文字色</label>
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => {
                            setEditColor(e.target.value);
                            updateSelected({ fill: e.target.value });
                          }}
                          className="w-full h-8 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">配置</label>
                        <div className="flex gap-1 mt-1">
                          {["left", "center", "right"].map((align) => (
                            <Button
                              key={align}
                              variant={editAlign === align ? "default" : "outline"}
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setEditAlign(align);
                                updateSelected({ textAlign: align });
                              }}
                            >
                              {align === "left" ? "←" : align === "center" ? "↔" : "→"}
                            </Button>
                          ))}
                        </div>
                      </div>
                      {(selectedObj.data as Record<string, unknown>)?.type === "sticky" && (
                        <div>
                          <label className="text-xs text-muted-foreground">背景色</label>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {["#fef08a", "#fca5a5", "#86efac", "#93c5fd", "#c4b5fd", "#fcd34d"].map(
                              (color) => (
                                <button
                                  key={color}
                                  className={`w-8 h-8 rounded border-2 ${
                                    editBgColor === color ? "border-foreground" : "border-transparent"
                                  }`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => {
                                    setEditBgColor(color);
                                    updateSelected({ backgroundColor: color });
                                  }}
                                />
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {selectedObj.type === "image" && (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          不透明度: {Math.round(editOpacity * 100)}%
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={editOpacity}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setEditOpacity(v);
                            updateSelected({ opacity: v });
                          }}
                          className="w-full"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={openMagicPenForImage}
                      >
                        M Magic Penで編集
                      </Button>
                    </>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (fabricRef.current && selectedObj) {
                        fabricRef.current.remove(selectedObj);
                        fabricRef.current.discardActiveObject();
                        fabricRef.current.renderAll();
                        setSelectedObj(null);
                      }
                    }}
                  >
                    削除
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  オブジェクトを選択してください
                </div>
              )}
            </TabsContent>

            {/* Generate Tab */}
            <TabsContent value="generate" className="flex-1 overflow-y-auto p-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">画像生成</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="生成したい画像の説明を入力..."
                    className="w-full p-2 border rounded text-sm h-24 resize-none"
                  />
                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={generating || !generatePrompt.trim()}
                  >
                    {generating ? "生成中..." : "生成"}
                  </Button>

                  {generatedImage && (
                    <div className="space-y-2">
                      <div className="border rounded overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={generatedImage} alt="Generated" className="w-full h-auto" />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => addImageFromDataUrl(generatedImage)}
                        >
                          キャンバスに追加
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => saveToSwipe(generatedImage)}
                        >
                          スワイプに保存
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Swipe File Modal */}
      {showSwipeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">スワイプファイルから選択</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSwipeModal(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              {swipeFiles.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  スワイプファイルがありません
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {swipeFiles.map((sf) => (
                    <button
                      key={sf.id}
                      className="aspect-square border rounded overflow-hidden hover:ring-2 ring-primary"
                      onClick={() => addImageFromSwipe(sf.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/swipe-files/${sf.id}/image`}
                        alt={sf.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Magic Pen Dialog */}
      <MagicPenDialog
        open={magicPenOpen}
        onOpenChange={setMagicPenOpen}
        imageDataUrl={magicPenImageUrl}
        projectId={projectId}
        onApply={handleMagicPenApply}
      />
    </div>
  );
}

// Tool button component
function ToolButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-10 h-10 rounded flex items-center justify-center text-lg transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      }`}
      onClick={onClick}
      title={label}
    >
      {icon}
    </button>
  );
}
