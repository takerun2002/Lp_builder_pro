"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MagicPenEditorFull } from "@/components/magic-pen/MagicPenEditorFull";
import { ReferencePanel } from "./components/ReferencePanel";
import { QualitySelector, QUALITY_CONFIG, type ImageQuality } from "./components/QualitySelector";

// ============================================================
// Types
// ============================================================

interface Project {
  id: string;
  name: string;
  description: string | null;
  manuscript: string | null;
  created_at: string;
  updated_at: string;
}

interface Section {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  image_path: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
}

interface SwipeFile {
  id: string;
  name: string;
  file_path: string;
}

interface PaletteImage {
  id: string;
  dataUrl: string;
  name: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  timestamp: number;
}

type ViewMode = "connected" | "blocks";
type MangaStyle = "4koma" | "banner" | "hero" | "story";
type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";

interface GenerateOptions {
  style: MangaStyle;
  aspectRatio: AspectRatio;
  colorMode: "fullcolor" | "monochrome";
  quality: ImageQuality;
}

// ============================================================
// Helper Functions
// ============================================================

function getImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  const filename = imagePath.split("/").pop();
  return `/api/images/${filename}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// ============================================================
// Main Component
// ============================================================

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Project & Sections
  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("connected");

  // Selected section for editing
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Magic Pen Edit Mode
  const [editMode, setEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editImageDataUrl, setEditImageDataUrl] = useState<string | null>(null);

  // Palette (image stock)
  const [palette, setPalette] = useState<PaletteImage[]>([]);
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [showGenOptions, setShowGenOptions] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [genOptions, setGenOptions] = useState<GenerateOptions>({
    style: "banner",
    aspectRatio: "16:9",
    colorMode: "fullcolor",
    quality: "2k",
  });
  
  // Panel widths (resizable)
  const [paletteWidth, setPaletteWidth] = useState(220);
  const [chatWidth, setChatWidth] = useState(280);
  const isResizingRef = useRef<"palette" | "chat" | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Panel visibility
  const [showPalette, setShowPalette] = useState(true);
  const [showReference, setShowReference] = useState(false);
  const [showChat, setShowChat] = useState(true);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge mode
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSectionId, setMergeSectionId] = useState<string | null>(null);
  const [draggingPaletteId, setDraggingPaletteId] = useState<string | null>(null);

  // ============================================================
  // Data Fetching
  // ============================================================

  const fetchData = useCallback(async () => {
    try {
      const [projRes, secRes, swipeRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/sections`),
        fetch(`/api/swipe-files?projectId=${projectId}`),
      ]);

      const projData = await projRes.json();
      const secData = await secRes.json();
      const swipeData = await swipeRes.json();

      if (projData.ok) {
        setProject(projData.project);
      } else {
        router.push("/projects");
        return;
      }

      if (secData.ok) {
        setSections(secData.sections);
      }

      if (swipeData.ok) {
        setSwipeFiles(swipeData.swipeFiles);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ============================================================
  // Panel Resize
  // ============================================================

  const handleResizeStart = useCallback((panel: "palette" | "chat", e: React.MouseEvent) => {
    isResizingRef.current = panel;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = panel === "palette" ? paletteWidth : chatWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [paletteWidth, chatWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = e.clientX - resizeStartXRef.current;
      const newWidth = Math.max(150, Math.min(400, resizeStartWidthRef.current + (isResizingRef.current === "palette" ? delta : -delta)));
      if (isResizingRef.current === "palette") {
        setPaletteWidth(newWidth);
      } else {
        setChatWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isResizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // ============================================================
  // Magic Pen Edit Mode
  // ============================================================

  const enterEditMode = async (section: Section) => {
    const imageUrl = getImageUrl(section.image_path);
    if (!imageUrl) return;

    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setEditImageDataUrl(dataUrl);
        setEditingSection(section);
        setEditMode(true);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to load image:", err);
    }
  };

  const exitEditMode = () => {
    setEditMode(false);
    setEditingSection(null);
    setEditImageDataUrl(null);
  };

  // Handle save from MagicPenEditorFull
  const handleMagicPenSave = async (resultDataUrl: string) => {
    if (!editingSection) return;

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = resultDataUrl;
      });

      const updateRes = await fetch(`/api/projects/${projectId}/sections/${editingSection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: resultDataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }),
      });

      const updateData = await updateRes.json();
      if (updateData.ok) {
        // Update sections list
        setSections((prev) =>
          prev.map((s) =>
            s.id === editingSection.id
              ? { ...s, image_path: updateData.section.image_path }
              : s
          )
        );
        // Also add to palette
        addToPalette(resultDataUrl, `編集後 ${new Date().toLocaleTimeString()}`);
        exitEditMode();
      }
    } catch (err) {
      console.error("Failed to save:", err);
      alert("保存に失敗しました");
    }
  };

  // ============================================================
  // Section Actions
  // ============================================================

  const handleAddSection = useCallback(
    async (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = async () => {
          try {
            const res = await fetch(`/api/projects/${projectId}/sections`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: file.name.replace(/\.[^/.]+$/, ""),
                imageDataUrl: dataUrl,
                width: img.naturalWidth,
                height: img.naturalHeight,
              }),
            });
            const data = await res.json();
            if (data.ok) {
              setSections((prev) => [...prev, data.section]);
            }
          } catch (err) {
            console.error("Failed to add section:", err);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [projectId]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        handleAddSection(file);
      }
    });
    e.target.value = "";
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("このセクションを削除しますか？")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
        if (selectedSectionId === sectionId) {
          setSelectedSectionId(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete section:", err);
    }
  };

  // Add palette image as new section
  const addPaletteAsSection = async (paletteImg: PaletteImage) => {
    try {
      const img = new Image();
      img.onload = async () => {
        const res = await fetch(`/api/projects/${projectId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: paletteImg.name,
            imageDataUrl: paletteImg.dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setSections((prev) => [...prev, data.section]);
        }
      };
      img.src = paletteImg.dataUrl;
    } catch (err) {
      console.error("Failed to add section from palette:", err);
    }
  };

  // ============================================================
  // Palette Actions
  // ============================================================

  const addToPalette = (dataUrl: string, name: string) => {
    const newImage: PaletteImage = {
      id: generateId(),
      dataUrl,
      name,
      timestamp: Date.now(),
    };
    setPalette((prev) => [newImage, ...prev].slice(0, 20));
  };

  const removeFromPalette = (id: string) => {
    setPalette((prev) => prev.filter((p) => p.id !== id));
  };

  // Replace section image with palette image
  const replaceWithPaletteImage = async (sectionId: string, paletteImg: PaletteImage) => {
    try {
      const img = new Image();
      img.onload = async () => {
        const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl: paletteImg.dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setSections((prev) =>
            prev.map((s) =>
              s.id === sectionId
                ? { ...s, image_path: data.section.image_path, width: img.naturalWidth, height: img.naturalHeight }
                : s
            )
          );
          setMergeMode(false);
          setMergeSectionId(null);
        }
      };
      img.src = paletteImg.dataUrl;
    } catch (err) {
      console.error("Failed to replace section image:", err);
    }
  };

  // Handle drag start from palette
  const handlePaletteDragStart = (e: React.DragEvent, paletteId: string) => {
    setDraggingPaletteId(paletteId);
    e.dataTransfer.setData("paletteId", paletteId);
    e.dataTransfer.effectAllowed = "copy";
  };

  // Handle drag over section
  const handleSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // Handle drop on section
  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    const paletteId = e.dataTransfer.getData("paletteId");
    if (paletteId) {
      const paletteImg = palette.find((p) => p.id === paletteId);
      if (paletteImg) {
        replaceWithPaletteImage(sectionId, paletteImg);
      }
    }
    setDraggingPaletteId(null);
  };

  const addSwipeFileToPalette = async (sf: SwipeFile) => {
    try {
      const filename = sf.file_path.split("/").pop();
      const res = await fetch(`/api/images/${filename}`);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        addToPalette(dataUrl, sf.name);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to load swipe file:", err);
    }
  };

  // ============================================================
  // AI Chat Actions
  // ============================================================

  const styleLabels: Record<MangaStyle, string> = {
    "4koma": "4コマ",
    banner: "バナー",
    hero: "ヒーロー",
    story: "ストーリー",
  };

  const aspectLabels: Record<AspectRatio, string> = {
    "16:9": "横長",
    "9:16": "縦長",
    "1:1": "正方形",
    "4:3": "標準",
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || generating) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: chatInput,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    const promptText = chatInput;
    setChatInput("");
    setGenerating(true);
    setGenerateProgress(0);

    try {
      // Detect if user wants image generation
      const wantsImage = /生成|作って|作成|描いて|画像|イラスト|バナー|素材|漫画|マンガ|コマ/.test(promptText);

      if (wantsImage) {
        // Progress simulation for UX
        const progressInterval = setInterval(() => {
          setGenerateProgress((prev) => Math.min(prev + Math.random() * 15, 90));
        }, 500);

        // Auto-detect style from prompt
        let detectedStyle = genOptions.style;
        if (/4コマ|四コマ|よんこま|4koma/i.test(promptText)) {
          detectedStyle = "4koma";
        } else if (/ヒーロー|hero|ファーストビュー|メインビジュアル/i.test(promptText)) {
          detectedStyle = "hero";
        } else if (/ストーリー|story|物語|漫画|マンガ/i.test(promptText)) {
          detectedStyle = "story";
        }

        // Auto-detect aspect from prompt
        let detectedAspect = genOptions.aspectRatio;
        if (/縦長|縦型|9:16|スマホ|モバイル/i.test(promptText)) {
          detectedAspect = "9:16";
        } else if (/正方形|1:1|スクエア/i.test(promptText)) {
          detectedAspect = "1:1";
        } else if (/横長|16:9|ワイド|バナー/i.test(promptText)) {
          detectedAspect = "16:9";
        }

        // Generate image using manga API
        const res = await fetch("/api/generate/manga", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            style: detectedStyle,
            aspectRatio: detectedAspect,
            colorMode: genOptions.colorMode,
          }),
        });

        clearInterval(progressInterval);
        setGenerateProgress(100);
        const data = await res.json();
        if (data.ok) {
          const styleInfo = `${styleLabels[detectedStyle]} / ${aspectLabels[detectedAspect]}`;
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: `画像を生成しました（${styleInfo}）`,
            imageUrl: data.imageDataUrl,
            timestamp: Date.now(),
          };
          setChatMessages((prev) => [...prev, assistantMessage]);

          // Auto add to palette
          addToPalette(data.imageDataUrl, `AI ${styleLabels[detectedStyle]} ${new Date().toLocaleTimeString()}`);
        } else {
          throw new Error(data.error?.message || "生成に失敗しました");
        }
      } else {
        // 壁打ちチャット - NVIDIA Nemotron（無料）を使用
        try {
          const chatRes = await fetch("/api/chat/workspace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                ...chatMessages.map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
                { role: "user", content: promptText },
              ],
            }),
          });
          const chatData = await chatRes.json();
          
          if (chatData.ok) {
            const assistantMessage: ChatMessage = {
              id: generateId(),
              role: "assistant",
              content: chatData.content,
              timestamp: Date.now(),
            };
            setChatMessages((prev) => [...prev, assistantMessage]);
          } else {
            throw new Error(chatData.error || "チャット生成に失敗しました");
          }
        } catch {
          // フォールバック：ヒントメッセージ
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: "💡 画像を生成するには「〜を生成して」「〜を作って」などと指示してください。\n\nヒント:\n・「横長バナーを生成」→ バナー形式\n・「4コマ漫画を作って」→ 4コマ形式\n・「縦長のヒーロー画像」→ 縦長ヒーロー\n\n※ 壁打ちチャットを使うにはOpenRouter APIキーを設定してください",
            timestamp: Date.now(),
          };
          setChatMessages((prev) => [...prev, assistantMessage]);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `エラー: ${err instanceof Error ? err.message : "不明なエラー"}`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setGenerating(false);
      setGenerateProgress(0);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  // Edit Mode UI - 完成版マジックペンを使用
  if (editMode && editingSection && editImageDataUrl) {
    return (
      <div className="h-screen bg-background">
        <MagicPenEditorFull
          imageDataUrl={editImageDataUrl}
          projectId={projectId}
          onSave={handleMagicPenSave}
          onCancel={exitEditMode}
        />
      </div>
    );
  }

  // Normal Mode UI
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card shrink-0 z-10">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm">← 一覧</Button>
            </Link>
            <h1 className="font-semibold truncate max-w-[300px]">{project.name}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="connected" className="text-xs px-3">連結</TabsTrigger>
                <TabsTrigger value="blocks" className="text-xs px-3">ブロック</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Panel Toggles */}
            <Button
              variant={showPalette ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPalette(!showPalette)}
            >
              パレット
            </Button>
            <Button
              variant={showReference ? "default" : "outline"}
              size="sm"
              onClick={() => setShowReference(!showReference)}
            >
              📋 参照LP
            </Button>
            <Button
              variant={showChat ? "default" : "outline"}
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              AIチャット
            </Button>

            {/* Quality Selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">品質:</span>
              <QualitySelector
                value={genOptions.quality}
                onChange={(q) => setGenOptions((prev) => ({ ...prev, quality: q }))}
                compact
              />
            </div>

            {/* Add Section */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              + 追加
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Other Tools */}
            <Link href={`/projects/${projectId}/manga`}>
              <Button variant="outline" size="sm">漫画生成</Button>
            </Link>
            <Link href={`/projects/${projectId}/scraper`}>
              <Button variant="outline" size="sm">LP取込</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Palette */}
        {showPalette && (
          <div 
            className="border-r bg-card flex flex-col shrink-0 relative"
            style={{ width: paletteWidth }}
          >
            {/* Resize Handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart("palette", e)}
            />
            <div className="p-2 border-b">
              <h2 className="text-sm font-medium">パレット</h2>
              <p className="text-xs text-muted-foreground">ダブルクリックでセクション追加</p>
            </div>

            {/* Palette Images */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {palette.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  AIで生成した画像が<br />ここに追加されます
                </p>
              ) : (
                palette.map((img) => (
                  <div
                    key={img.id}
                    className={`relative group ${draggingPaletteId === img.id ? "opacity-50" : ""}`}
                    draggable
                    onDragStart={(e) => handlePaletteDragStart(e, img.id)}
                    onDragEnd={() => setDraggingPaletteId(null)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full rounded border cursor-grab hover:ring-2 hover:ring-primary active:cursor-grabbing"
                      onDoubleClick={() => addPaletteAsSection(img)}
                      title="ドラッグでセクションに適用 / ダブルクリックで新規追加"
                    />
                    <button
                      onClick={() => removeFromPalette(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <p className="text-xs text-muted-foreground truncate mt-1">{img.name}</p>
                  </div>
                ))
              )}
            </div>

            {/* Swipe Files */}
            {swipeFiles.length > 0 && (
              <div className="border-t p-2">
                <p className="text-xs font-medium mb-2">スワイプファイル</p>
                <div className="grid grid-cols-3 gap-1 max-h-24 overflow-y-auto">
                  {swipeFiles.slice(0, 9).map((sf) => {
                    const filename = sf.file_path.split("/").pop();
                    return (
                      <button
                        key={sf.id}
                        onClick={() => addSwipeFileToPalette(sf)}
                        className="aspect-square rounded overflow-hidden border hover:ring-2 hover:ring-primary"
                        title={`${sf.name} - クリックでパレットに追加`}
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
          </div>
        )}

        {/* Center: Main Preview */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto bg-muted/20">
            {sections.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg mb-2">セクションがありません</p>
                  <p className="text-sm">「+ 追加」から画像を追加するか</p>
                  <p className="text-sm">AIチャットで生成してください</p>
                </div>
              </div>
            ) : viewMode === "connected" ? (
              // Connected View
              <div className="max-w-3xl mx-auto py-4">
                {sections.map((section) => {
                  const imageUrl = getImageUrl(section.image_path);
                  const isSelected = selectedSectionId === section.id;
                  const isDragOver = draggingPaletteId !== null;
                  return (
                    <div
                      key={section.id}
                      onClick={() => setSelectedSectionId(isSelected ? null : section.id)}
                      onDragOver={handleSectionDragOver}
                      onDrop={(e) => handleSectionDrop(e, section.id)}
                      className={`relative cursor-pointer transition-all ${
                        isSelected ? "ring-4 ring-primary" : isDragOver ? "ring-2 ring-dashed ring-primary/50" : "hover:ring-2 hover:ring-primary/50"
                      }`}
                    >
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={section.name}
                          className="w-full"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground">{section.name}</span>
                        </div>
                      )}

                      {/* Drop Overlay */}
                      {isDragOver && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
                          <span className="text-lg font-bold text-primary bg-white/80 px-4 py-2 rounded">
                            ここにドロップして適用
                          </span>
                        </div>
                      )}

                      {/* Section Controls */}
                      {isSelected && imageUrl && !isDragOver && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              enterEditMode(section);
                            }}
                          >
                            Magic編集
                          </Button>
                          {palette.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMergeMode(true);
                                setMergeSectionId(section.id);
                              }}
                            >
                              マージ
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(section.id);
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      )}

                      {/* Section Name Badge */}
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {section.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Blocks View
              <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map((section) => {
                  const imageUrl = getImageUrl(section.image_path);
                  const isSelected = selectedSectionId === section.id;
                  const isDragOver = draggingPaletteId !== null;
                  return (
                    <div
                      key={section.id}
                      onClick={() => setSelectedSectionId(isSelected ? null : section.id)}
                      onDragOver={handleSectionDragOver}
                      onDrop={(e) => handleSectionDrop(e, section.id)}
                      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                        isSelected ? "ring-4 ring-primary" : isDragOver ? "ring-2 ring-dashed ring-primary/50" : "hover:ring-2 hover:ring-primary/50"
                      }`}
                    >
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={section.name}
                          className="w-full aspect-video object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">{section.name}</span>
                        </div>
                      )}

                      {/* Drop Overlay */}
                      {isDragOver && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
                          <span className="text-sm font-bold text-primary bg-white/80 px-2 py-1 rounded">
                            ドロップ
                          </span>
                        </div>
                      )}

                      {/* Section Controls */}
                      {isSelected && imageUrl && !isDragOver && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              enterEditMode(section);
                            }}
                          >
                            編集
                          </Button>
                          {palette.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMergeMode(true);
                                setMergeSectionId(section.id);
                              }}
                            >
                              マージ
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(section.id);
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      )}

                      {/* Section Name */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
                        {section.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Merge Modal */}
            {mergeMode && mergeSectionId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">パレットから選択</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMergeMode(false);
                        setMergeSectionId(null);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    セクションに適用する画像を選択してください
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {palette.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => replaceWithPaletteImage(mergeSectionId, img)}
                        className="aspect-video rounded overflow-hidden border hover:ring-2 hover:ring-primary"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reference LP Panel */}
        {showReference && (
          <div className="border-l bg-card flex flex-col shrink-0 w-[300px]">
            <ReferencePanel
              projectId={projectId}
              swipeFiles={swipeFiles}
              manuscript={project?.manuscript || null}
              onAddToPalette={addToPalette}
              onManuscriptChange={(m) => setProject((prev) => prev ? { ...prev, manuscript: m } : null)}
              onImportSections={async (sectionsToImport) => {
                for (const section of sectionsToImport) {
                  const img = new Image();
                  img.onload = async () => {
                    try {
                      const res = await fetch(`/api/projects/${projectId}/sections`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: section.name,
                          imageDataUrl: section.imageDataUrl,
                          width: img.naturalWidth,
                          height: img.naturalHeight,
                        }),
                      });
                      const data = await res.json();
                      if (data.ok) {
                        setSections((prev) => [...prev, data.section]);
                      }
                    } catch (err) {
                      console.error("Failed to import section:", err);
                    }
                  };
                  img.src = section.imageDataUrl;
                }
              }}
            />
          </div>
        )}

        {/* Right: AI Chat */}
        {showChat && (
          <div 
            className="border-l bg-card flex flex-col shrink-0 relative"
            style={{ width: chatWidth }}
          >
            {/* Resize Handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart("chat", e)}
            />
            <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm">🤖</span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold">AI アシスタント</h2>
                  <p className="text-[10px] text-muted-foreground">画像生成 • アイデア出し</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGenOptions(!showGenOptions)}
                className="text-xs"
              >
                設定
              </Button>
            </div>

            {/* Generation Options */}
            {showGenOptions && (
              <div className="p-2 border-b bg-muted/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16">スタイル:</span>
                  <select
                    value={genOptions.style}
                    onChange={(e) => setGenOptions((prev) => ({ ...prev, style: e.target.value as MangaStyle }))}
                    className="flex-1 text-xs p-1 rounded border bg-background"
                  >
                    <option value="banner">バナー</option>
                    <option value="hero">ヒーロー</option>
                    <option value="4koma">4コマ</option>
                    <option value="story">ストーリー</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16">比率:</span>
                  <select
                    value={genOptions.aspectRatio}
                    onChange={(e) => setGenOptions((prev) => ({ ...prev, aspectRatio: e.target.value as AspectRatio }))}
                    className="flex-1 text-xs p-1 rounded border bg-background"
                  >
                    <option value="16:9">16:9 横長</option>
                    <option value="9:16">9:16 縦長</option>
                    <option value="1:1">1:1 正方形</option>
                    <option value="4:3">4:3 標準</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16">カラー:</span>
                  <select
                    value={genOptions.colorMode}
                    onChange={(e) => setGenOptions((prev) => ({ ...prev, colorMode: e.target.value as "fullcolor" | "monochrome" }))}
                    className="flex-1 text-xs p-1 rounded border bg-background"
                  >
                    <option value="fullcolor">フルカラー</option>
                    <option value="monochrome">モノクロ</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16">品質:</span>
                  <select
                    value={genOptions.quality}
                    onChange={(e) => setGenOptions((prev) => ({ ...prev, quality: e.target.value as ImageQuality }))}
                    className="flex-1 text-xs p-1 rounded border bg-background"
                  >
                    <option value="1k">💨 1K (1024px) - 低コスト</option>
                    <option value="2k">⭐ 2K (2048px) - 推奨</option>
                    <option value="4k">💎 4K (4096px) - 高品質</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  ※高解像度ほどAPI料金が増加します</p>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <span className="text-xl">✨</span>
                  </div>
                  <p className="text-sm font-medium mb-2">AIアシスタント</p>
                  <p className="text-xs text-muted-foreground mb-4">画像生成やアイデア出しをサポート</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button 
                      onClick={() => setChatInput("バナー画像を生成して")}
                      className="px-2 py-1.5 bg-muted hover:bg-muted/80 rounded-md text-left transition-colors"
                    >
                      🎨 バナー生成
                    </button>
                    <button 
                      onClick={() => setChatInput("縦長のヒーロー画像を作って")}
                      className="px-2 py-1.5 bg-muted hover:bg-muted/80 rounded-md text-left transition-colors"
                    >
                      📱 ヒーロー画像
                    </button>
                    <button 
                      onClick={() => setChatInput("4コマ漫画を作って")}
                      className="px-2 py-1.5 bg-muted hover:bg-muted/80 rounded-md text-left transition-colors"
                    >
                      📖 4コマ漫画
                    </button>
                    <button 
                      onClick={() => setChatInput("商品紹介の素材を作成して")}
                      className="px-2 py-1.5 bg-muted hover:bg-muted/80 rounded-md text-left transition-colors"
                    >
                      📦 商品素材
                    </button>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-muted rounded-2xl rounded-bl-md"
                      } px-3 py-2 text-sm shadow-sm`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.imageUrl && (
                        <div className="mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.imageUrl}
                            alt="Generated"
                            className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              addToPalette(msg.imageUrl!, `再利用 ${new Date().toLocaleTimeString()}`);
                            }}
                            title="クリックでパレットに追加"
                          />
                          <p className="text-[10px] mt-1.5 opacity-60 text-center">クリックでパレットに追加</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {generating && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs font-medium">生成中</span>
                      <span className="text-xs text-muted-foreground">{Math.round(generateProgress)}%</span>
                    </div>
                    <div className="w-full bg-muted-foreground/20 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
                        style={{ width: `${generateProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="bg-background px-1.5 py-0.5 rounded border">{styleLabels[genOptions.style]}</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border">{aspectLabels[genOptions.aspectRatio]}</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border">{genOptions.colorMode === "fullcolor" ? "カラー" : "モノクロ"}</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border">{QUALITY_CONFIG[genOptions.quality].emoji} {QUALITY_CONFIG[genOptions.quality].label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">⌘+Enter 送信</span>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    // Macの日本語入力対応：composing中はEnterで送信しない
                    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                  placeholder="メッセージを入力... (Shift+Enter: 改行)"
                  className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background resize-none min-h-[44px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  disabled={generating}
                  rows={1}
                  style={{ height: 'auto', minHeight: '44px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleChatSubmit}
                  disabled={generating || !chatInput.trim()}
                  className="self-end h-10 w-10 rounded-lg shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
