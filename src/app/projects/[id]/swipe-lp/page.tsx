"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Project {
  id: string;
  name: string;
}

interface Section {
  id: string;
  project_id: string;
  name: string;
  section_type: string;
  order_index: number;
  image_path: string | null;
  width: number | null;
  height: number | null;
}

interface SwipeFile {
  id: string;
  name: string;
  file_path: string;
  width: number | null;
  height: number | null;
}

// image_path から画像URLを生成
function getImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  const filename = imagePath.split("/").pop();
  return `/api/images/${filename}`;
}

export default function SwipeLpPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // フレーム = swipeタイプのセクション
  const [frames, setFrames] = useState<Section[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // 素材タブ
  const [materialTab, setMaterialTab] = useState("swipe");
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);

  // スクレイパー
  const [scraperUrl, setScraperUrl] = useState("");
  const [scraping, setScraping] = useState(false);

  // AI生成
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  // エクスポート
  const [exporting, setExporting] = useState(false);

  // スマホプレビュー
  const previewRef = useRef<HTMLDivElement>(null);
  const [currentSnapIdx, setCurrentSnapIdx] = useState(0);

  // ファイル入力
  const fileInputRef = useRef<HTMLInputElement>(null);

  // プロジェクト取得
  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.ok) {
        setProject(data.project);
      } else {
        router.push("/projects");
        return;
      }
    } catch (err) {
      console.error("Failed to fetch project:", err);
    }
  }, [projectId, router]);

  // フレーム（swipeセクション）取得
  const fetchFrames = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/sections?type=swipe`);
      const data = await res.json();
      if (data.ok) {
        setFrames(data.sections);
      }
    } catch (err) {
      console.error("Failed to fetch frames:", err);
    }
  }, [projectId]);

  // スワイプファイル取得
  const fetchSwipeFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/swipe-files?projectId=${projectId}`);
      const data = await res.json();
      if (data.ok) {
        setSwipeFiles(data.swipeFiles);
      }
    } catch (err) {
      console.error("Failed to fetch swipe files:", err);
    }
  }, [projectId]);

  useEffect(() => {
    Promise.all([fetchProject(), fetchFrames(), fetchSwipeFiles()]).finally(() => {
      setLoading(false);
    });
  }, [fetchProject, fetchFrames, fetchSwipeFiles]);

  // フレーム追加（空）
  const addEmptyFrame = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `フレーム ${frames.length + 1}`,
          sectionType: "swipe",
          width: 1080,
          height: 1920,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFrames((prev) => [...prev, data.section]);
        setSelectedFrameId(data.section.id);
      }
    } catch (err) {
      console.error("Failed to add frame:", err);
    }
  };

  // 画像からフレーム追加
  const addFrameFromImage = async (dataUrl: string, name: string, width: number, height: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          imageDataUrl: dataUrl,
          width,
          height,
          sectionType: "swipe",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFrames((prev) => [...prev, data.section]);
        setSelectedFrameId(data.section.id);
      }
    } catch (err) {
      console.error("Failed to add frame:", err);
    }
  };

  // フレーム複製
  const duplicateFrame = async (frameId: string) => {
    const frame = frames.find((f) => f.id === frameId);
    if (!frame) return;

    // 画像を取得してコピー
    let imageDataUrl: string | null = null;
    const imageUrl = getImageUrl(frame.image_path);
    if (imageUrl) {
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        imageDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error("Failed to read image:", err);
      }
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${frame.name} (コピー)`,
          imageDataUrl,
          width: frame.width || 1080,
          height: frame.height || 1920,
          sectionType: "swipe",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // 元の位置の次に挿入
        const idx = frames.findIndex((f) => f.id === frameId);
        const newFrames = [...frames];
        newFrames.splice(idx + 1, 0, data.section);
        setFrames(newFrames);
        setSelectedFrameId(data.section.id);
        // 並び順を更新
        await fetch(`/api/projects/${projectId}/sections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order: newFrames.map((f) => f.id),
            type: "swipe",
          }),
        });
      }
    } catch (err) {
      console.error("Failed to duplicate frame:", err);
    }
  };

  // フレーム削除
  const deleteFrame = async (frameId: string) => {
    if (!confirm("このフレームを削除しますか？")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${frameId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setFrames((prev) => prev.filter((f) => f.id !== frameId));
        if (selectedFrameId === frameId) {
          setSelectedFrameId(frames.length > 1 ? frames[0].id : null);
        }
      }
    } catch (err) {
      console.error("Failed to delete frame:", err);
    }
  };

  // フレーム名変更
  const renameFrame = async (frameId: string, newName: string) => {
    // 楽観的更新
    setFrames((prev) =>
      prev.map((f) => (f.id === frameId ? { ...f, name: newName } : f))
    );
    try {
      await fetch(`/api/projects/${projectId}/sections/${frameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
    } catch (err) {
      console.error("Failed to rename frame:", err);
    }
  };

  // フレーム並び替え
  const handleReorder = async (fromIdx: number, toIdx: number) => {
    const newFrames = [...frames];
    const [item] = newFrames.splice(fromIdx, 1);
    newFrames.splice(toIdx, 0, item);
    setFrames(newFrames);

    try {
      await fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: newFrames.map((f) => f.id),
          type: "swipe",
        }),
      });
    } catch (err) {
      console.error("Failed to reorder frames:", err);
    }
  };

  // ファイル選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const img = new Image();
          img.onload = () => {
            addFrameFromImage(
              dataUrl,
              file.name.replace(/\.[^/.]+$/, ""),
              img.naturalWidth,
              img.naturalHeight
            );
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = "";
  };

  // スワイプファイルをフレームに追加
  const addSwipeFileToFrame = async (swipeFile: SwipeFile) => {
    try {
      const filename = swipeFile.file_path.split("/").pop();
      const res = await fetch(`/api/images/${filename}`);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        addFrameFromImage(
          dataUrl,
          swipeFile.name,
          swipeFile.width || 1080,
          swipeFile.height || 1920
        );
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to load swipe file:", err);
    }
  };

  // スクレイパー実行
  const runScraper = async () => {
    if (!scraperUrl.trim()) return;
    setScraping(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scraperUrl }),
      });
      const data = await res.json();
      if (data.ok && data.sections) {
        for (const section of data.sections) {
          if (section.imageDataUrl) {
            const img = new Image();
            img.onload = () => {
              addFrameFromImage(
                section.imageDataUrl,
                section.name || "Scraped",
                img.naturalWidth,
                img.naturalHeight
              );
            };
            img.src = section.imageDataUrl;
          }
        }
        setScraperUrl("");
      } else {
        alert(data.error || "スクレイピングに失敗しました");
      }
    } catch (err) {
      console.error("Scraper error:", err);
      alert("スクレイピングに失敗しました");
    } finally {
      setScraping(false);
    }
  };

  // AI画像生成
  const generateImage = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/assets/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (data.ok && data.imageDataUrl) {
        const img = new Image();
        img.onload = () => {
          addFrameFromImage(
            data.imageDataUrl,
            `AI: ${aiPrompt.substring(0, 20)}...`,
            img.naturalWidth,
            img.naturalHeight
          );
        };
        img.src = data.imageDataUrl;
        setAiPrompt("");
      } else {
        alert(data.error || "画像生成に失敗しました");
      }
    } catch (err) {
      console.error("Generate error:", err);
      alert("画像生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  // PNG一括書き出し
  const exportPngs = async () => {
    if (frames.length === 0) {
      alert("書き出すフレームがありません");
      return;
    }
    setExporting(true);
    try {
      // bodyなしでAPIを呼び出し（DBから取得）
      const res = await fetch(`/api/projects/${projectId}/swipe-lp/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`${data.exportedCount}枚のPNGを書き出しました\n${data.exportPath}`);
      } else {
        alert(data.error || "書き出しに失敗しました");
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("書き出しに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  // スクロール検知
  const handlePreviewScroll = () => {
    if (!previewRef.current) return;
    const container = previewRef.current;
    const scrollTop = container.scrollTop;
    const frameHeight = container.clientHeight;
    const idx = Math.round(scrollTop / frameHeight);
    setCurrentSnapIdx(idx);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const selectedFrame = frames.find((f) => f.id === selectedFrameId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ← 戻る
            </Link>
            <div>
              <h1 className="text-lg font-bold">縦スワイプLP</h1>
              <p className="text-xs text-muted-foreground">{project.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportPngs}
              disabled={exporting || frames.length === 0}
            >
              {exporting ? "書き出し中..." : "PNG一括書き出し"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Frame Management */}
        <div className="w-64 border-r bg-card flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium">フレーム</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                画像
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={addEmptyFrame}
              >
                +
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {frames.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                フレームがありません
                <br />
                「+」で追加
              </div>
            ) : (
              frames.map((frame, idx) => {
                const imageUrl = getImageUrl(frame.image_path);
                return (
                  <div
                    key={frame.id}
                    className={`group relative border rounded-lg p-2 cursor-pointer transition-colors ${
                      selectedFrameId === frame.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    } ${dragIdx === idx ? "opacity-50" : ""}`}
                    onClick={() => setSelectedFrameId(frame.id)}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragIdx !== null && dragIdx !== idx) {
                        handleReorder(dragIdx, idx);
                        setDragIdx(idx);
                      }
                    }}
                    onDragEnd={() => setDragIdx(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        value={frame.name}
                        onChange={(e) => renameFrame(frame.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-xs border-transparent hover:border-input focus:border-input px-1"
                      />
                    </div>
                    {imageUrl ? (
                      <div className="mt-2 aspect-[9/16] rounded overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={frame.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="mt-2 aspect-[9/16] rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        空
                      </div>
                    )}
                    {/* Actions */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateFrame(frame.id);
                        }}
                        className="w-5 h-5 rounded bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-xs"
                        title="複製"
                      >
                        +
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFrame(frame.id);
                        }}
                        className="w-5 h-5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center text-xs"
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {frames.length > 1 && (
            <div className="p-2 border-t text-xs text-muted-foreground text-center">
              ドラッグで並び替え
            </div>
          )}
        </div>

        {/* Center: Smartphone Preview */}
        <div className="flex-1 flex items-center justify-center bg-muted/30 p-8">
          <div className="relative">
            {/* Phone Frame */}
            <div className="w-[320px] h-[640px] bg-black rounded-[40px] p-3 shadow-2xl">
              <div className="w-full h-full bg-white rounded-[28px] overflow-hidden relative">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-10" />
                {/* Content */}
                {frames.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    フレームを追加してください
                  </div>
                ) : (
                  <div
                    ref={previewRef}
                    className="w-full h-full overflow-y-auto snap-y snap-mandatory"
                    onScroll={handlePreviewScroll}
                    style={{ scrollBehavior: "smooth" }}
                  >
                    {frames.map((frame) => {
                      const imageUrl = getImageUrl(frame.image_path);
                      return (
                        <div
                          key={frame.id}
                          className="w-full h-full snap-start snap-always shrink-0 flex items-center justify-center bg-gray-50"
                        >
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={frame.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              {frame.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {/* Page Indicator */}
            {frames.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
                {frames.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentSnapIdx ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Material Input */}
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="p-3 border-b">
            <span className="text-sm font-medium">素材を追加</span>
          </div>
          <Tabs value={materialTab} onValueChange={setMaterialTab} className="flex-1 flex flex-col">
            <TabsList className="mx-3 mt-2">
              <TabsTrigger value="swipe" className="text-xs">
                スワイプ
              </TabsTrigger>
              <TabsTrigger value="scraper" className="text-xs">
                LP取り込み
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">
                AI生成
              </TabsTrigger>
            </TabsList>

            <TabsContent value="swipe" className="flex-1 overflow-y-auto p-3">
              {swipeFiles.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">
                  スワイプファイルがありません
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {swipeFiles.map((sf) => {
                    const filename = sf.file_path.split("/").pop();
                    return (
                      <button
                        key={sf.id}
                        onClick={() => addSwipeFileToFrame(sf)}
                        className="border rounded-lg p-1 hover:border-primary transition-colors text-left"
                      >
                        <div className="aspect-[9/16] rounded overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/images/${filename}`}
                            alt={sf.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-xs truncate mt-1">{sf.name}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scraper" className="p-3 space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">LP取り込み</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    value={scraperUrl}
                    onChange={(e) => setScraperUrl(e.target.value)}
                    placeholder="https://example.com/lp"
                    className="text-sm"
                  />
                  <Button
                    onClick={runScraper}
                    disabled={scraping || !scraperUrl.trim()}
                    size="sm"
                    className="w-full"
                  >
                    {scraping ? "取り込み中..." : "LPを取り込む"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    URLからLPをスクレイピングしてフレームに追加します
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="p-3 space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AI画像生成</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="生成したい画像の説明を入力...&#10;&#10;例: スマートフォン向けの縦長LP、青とオレンジのグラデーション背景、中央に大きな「今すぐ始める」ボタン"
                    className="w-full h-32 p-2 text-sm border rounded-lg resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    onClick={generateImage}
                    disabled={generating || !aiPrompt.trim()}
                    size="sm"
                    className="w-full"
                  >
                    {generating ? "生成中..." : "画像を生成"}
                  </Button>
                </CardContent>
              </Card>

              {selectedFrame && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">選択中のフレーム</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      {selectedFrame.name}
                      <br />
                      {selectedFrame.width || 1080} × {selectedFrame.height || 1920}px
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
