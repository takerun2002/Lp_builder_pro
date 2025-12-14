"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Fabric.js types
interface FabricCanvas {
  dispose: () => void;
  setBackgroundImage: (
    image: FabricImage,
    callback: () => void,
    options?: Record<string, unknown>
  ) => void;
  add: (...objects: FabricObject[]) => void;
  remove: (...objects: FabricObject[]) => void;
  getActiveObject: () => FabricObject | null;
  setActiveObject: (obj: FabricObject) => void;
  renderAll: () => void;
  toDataURL: (options?: { format?: string; quality?: number }) => string;
  on: (event: string, handler: (e?: unknown) => void) => void;
  off: (event: string, handler?: (e?: unknown) => void) => void;
  getObjects: () => FabricObject[];
  setDimensions: (dimensions: { width: number; height: number }) => void;
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
  data?: Record<string, unknown>;
}

interface FabricImage extends FabricObject {
  width: number;
  height: number;
}

interface FabricTextbox extends FabricObject {
  text: string;
  fontSize: number;
  fontWeight: string | number;
  left: number;
  top: number;
  width: number;
}

interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Section {
  id: string;
  name: string;
  image_path: string | null;
  width: number | null;
  height: number | null;
}

interface Project {
  id: string;
  name: string;
}

export default function TextEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const sectionId = params.sectionId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [boxes, setBoxes] = useState<TextBox[]>([]);

  // Selected textbox properties
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editFontSize, setEditFontSize] = useState(18);
  const [editBold, setEditBold] = useState(false);
  const [editX, setEditX] = useState(0);
  const [editY, setEditY] = useState(0);

  // Fabric.js dynamic import
  const [FabricModule, setFabricModule] = useState<typeof import("fabric") | null>(null);

  useEffect(() => {
    import("fabric").then((mod) => {
      setFabricModule(mod);
    });
  }, []);

  // Fetch project and section
  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, secRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/sections/${sectionId}`),
        ]);
        const projData = await projRes.json();
        const secData = await secRes.json();

        if (!projData.ok || !secData.ok) {
          router.push(`/projects/${projectId}`);
          return;
        }

        setProject(projData.project);
        setSection(secData.section);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        router.push(`/projects/${projectId}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId, sectionId, router]);

  // Selection handler
  const handleSelection = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== "textbox") {
      setSelectedId(null);
      return;
    }

    const textbox = activeObj as FabricTextbox;
    const id = textbox.data?.id as string;
    setSelectedId(id || null);
    setEditText(textbox.text || "");
    setEditFontSize(textbox.fontSize || 18);
    setEditBold(textbox.fontWeight === "bold" || textbox.fontWeight === 700);
    setEditX(Math.round(textbox.left || 0));
    setEditY(Math.round(textbox.top || 0));
  }, []);

  // Object modified handler
  const handleObjectModified = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== "textbox") return;

    const textbox = activeObj as FabricTextbox;
    setEditX(Math.round(textbox.left || 0));
    setEditY(Math.round(textbox.top || 0));
  }, []);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!FabricModule || !canvasRef.current || !section?.image_path) return;

    const { Canvas, FabricImage } = FabricModule;

    // Create canvas
    const canvas = new Canvas(canvasRef.current, {
      selection: true,
      preserveObjectStacking: true,
    }) as unknown as FabricCanvas;

    fabricRef.current = canvas;

    // Load background image
    const filename = section.image_path.split("/").pop();
    const imageUrl = `/api/images/${filename}`;

    FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img: FabricImage) => {
      canvas.setDimensions({
        width: img.width,
        height: img.height,
      });
      canvas.setBackgroundImage(img, () => {
        canvas.renderAll();
      });
    });

    // Selection event
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => {
      setSelectedId(null);
    });

    // Object modified event
    canvas.on("object:modified", handleObjectModified);

    return () => {
      canvas.off("selection:created");
      canvas.off("selection:updated");
      canvas.off("selection:cleared");
      canvas.off("object:modified");
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [FabricModule, section, handleSelection, handleObjectModified]);

  // Run OCR
  const handleRunOcr = async () => {
    setOcrLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}/ocr`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.ok && data.boxes) {
        setBoxes(data.boxes);
        setStep(3);

        // Add textboxes to canvas
        addTextboxesToCanvas(data.boxes);
      } else {
        alert(`OCR失敗: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("OCR error:", err);
      alert("OCR実行中にエラーが発生しました");
    } finally {
      setOcrLoading(false);
    }
  };

  // Add textboxes to canvas
  const addTextboxesToCanvas = useCallback(
    (textBoxes: TextBox[]) => {
      if (!FabricModule || !fabricRef.current) return;

      const { Textbox } = FabricModule;
      const canvas = fabricRef.current;

      // Remove existing textboxes
      const existingObjects = canvas.getObjects().filter((obj) => obj.type === "textbox");
      existingObjects.forEach((obj) => canvas.remove(obj));

      // Add new textboxes
      textBoxes.forEach((box) => {
        const textbox = new Textbox(box.text, {
          left: box.x,
          top: box.y,
          width: box.w,
          fontSize: 18,
          fontWeight: "normal",
          fill: "#111827",
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          editable: true,
          data: { id: box.id },
        });
        canvas.add(textbox as unknown as FabricObject);
      });

      canvas.renderAll();
    },
    [FabricModule]
  );

  // Update selected textbox
  const updateSelectedTextbox = useCallback(
    (updates: Partial<{ text: string; fontSize: number; fontWeight: string; left: number; top: number }>) => {
      const canvas = fabricRef.current;
      if (!canvas || !selectedId) return;

      const objects = canvas.getObjects();
      const textbox = objects.find(
        (obj) => obj.type === "textbox" && (obj.data?.id as string) === selectedId
      ) as FabricTextbox | undefined;

      if (textbox) {
        textbox.set(updates as Record<string, unknown>);
        canvas.renderAll();
      }
    },
    [selectedId]
  );

  // Handle property changes
  const handleTextChange = (value: string) => {
    setEditText(value);
    updateSelectedTextbox({ text: value });
  };

  const handleFontSizeChange = (value: number) => {
    setEditFontSize(value);
    updateSelectedTextbox({ fontSize: value });
  };

  const handleBoldChange = (value: boolean) => {
    setEditBold(value);
    updateSelectedTextbox({ fontWeight: value ? "bold" : "normal" });
  };

  const handleXChange = (value: number) => {
    setEditX(value);
    updateSelectedTextbox({ left: value });
  };

  const handleYChange = (value: number) => {
    setEditY(value);
    updateSelectedTextbox({ top: value });
  };

  // Apply to image (save)
  const handleApply = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      // Export canvas as data URL
      const dataUrl = canvas.toDataURL({ format: "png", quality: 1 });

      // Save to section
      const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: dataUrl,
          width: section?.width,
          height: section?.height,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setStep(4);
        setTimeout(() => {
          router.push(`/projects/${projectId}`);
        }, 1500);
      } else {
        alert(`保存失敗: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("保存中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !FabricModule) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!section || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← {project.name}
            </Link>
            <div className="text-sm font-medium">{section.name} / テキスト編集</div>
          </div>
          <div className="flex gap-2">
            {step >= 3 && (
              <Button onClick={handleApply} disabled={saving}>
                {saving ? "保存中..." : "画像に適用"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          <div className="inline-block border rounded-lg shadow-sm bg-white">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l bg-card p-4 overflow-y-auto">
          {/* Step Indicators */}
          <div className="space-y-3 mb-6">
            <StepItem
              num={1}
              label="画像を確認"
              active={step === 1}
              done={step > 1}
            />
            <StepItem
              num={2}
              label="テキスト領域を検出"
              active={step === 2}
              done={step > 2}
            >
              {step <= 2 && (
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    setStep(2);
                    handleRunOcr();
                  }}
                  disabled={ocrLoading}
                >
                  {ocrLoading ? "OCR実行中..." : "OCRを実行"}
                </Button>
              )}
            </StepItem>
            <StepItem
              num={3}
              label="テキストを編集"
              active={step === 3}
              done={step > 3}
            >
              {step === 3 && boxes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {boxes.length}個のテキストボックスを検出
                </p>
              )}
            </StepItem>
            <StepItem
              num={4}
              label="画像に適用"
              active={step === 4}
              done={false}
            >
              {step === 4 && (
                <p className="text-xs text-green-600 mt-1">保存完了！リダイレクト中...</p>
              )}
            </StepItem>
          </div>

          {/* Edit Panel */}
          {step >= 3 && selectedId && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">選択中のテキストボックス</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Text */}
                <div>
                  <label className="text-xs text-muted-foreground">テキスト</label>
                  <textarea
                    value={editText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="w-full mt-1 p-2 border rounded text-sm h-20 resize-none"
                  />
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-xs text-muted-foreground">
                    フォントサイズ: {editFontSize}px
                  </label>
                  <input
                    type="range"
                    min={8}
                    max={72}
                    value={editFontSize}
                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                    className="w-full mt-1"
                  />
                </div>

                {/* Bold */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bold"
                    checked={editBold}
                    onChange={(e) => handleBoldChange(e.target.checked)}
                  />
                  <label htmlFor="bold" className="text-sm">
                    太字
                  </label>
                </div>

                {/* Position */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">X座標</label>
                    <Input
                      type="number"
                      value={editX}
                      onChange={(e) => handleXChange(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Y座標</label>
                    <Input
                      type="number"
                      value={editY}
                      onChange={(e) => handleYChange(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step >= 3 && !selectedId && (
            <div className="text-sm text-muted-foreground text-center py-8">
              テキストボックスをクリックして選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step indicator component
function StepItem({
  num,
  label,
  active,
  done,
  children,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        active
          ? "border-primary bg-primary/5"
          : done
          ? "border-green-500/30 bg-green-50"
          : "border-transparent bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            done
              ? "bg-green-500 text-white"
              : active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {done ? "✓" : num}
        </span>
        <span className={`text-sm ${active ? "font-medium" : ""}`}>{label}</span>
      </div>
      {children}
    </div>
  );
}
