"use client";

/**
 * 参照LPパネル
 * スワイプファイル・取込LP・原稿をタブで切り替え表示
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileImage, FileText, ExternalLink, Plus, Import, Eye, Trash2 } from "lucide-react";

// ============================================================
// Types
// ============================================================

interface SwipeFile {
  id: string;
  name: string;
  file_path: string;
}

interface ScrapedLP {
  id: string;
  source_url: string;
  title: string;
  sections: ScrapedSection[];
  scraped_at: string;
}

interface ScrapedSection {
  id: string;
  image_path: string;
  order_index: number;
  extracted_text?: string;
}

interface ReferencePanelProps {
  projectId: string;
  swipeFiles: SwipeFile[];
  manuscript: string | null;
  onAddToPalette: (dataUrl: string, name: string) => void;
  onManuscriptChange: (manuscript: string) => void;
  onImportSections: (sections: { name: string; imageDataUrl: string }[]) => void;
}

// ============================================================
// Main Component
// ============================================================

export function ReferencePanel({
  projectId,
  swipeFiles,
  manuscript,
  onAddToPalette,
  onManuscriptChange,
  onImportSections,
}: ReferencePanelProps) {
  const [activeTab, setActiveTab] = useState<"swipe" | "scraped" | "manuscript">("swipe");
  const [scrapedLPs, setScrapedLPs] = useState<ScrapedLP[]>([]);
  const [loadingScraped, setLoadingScraped] = useState(false);
  const [viewingSwipe, setViewingSwipe] = useState<SwipeFile | null>(null);
  const [viewingScraped, setViewingScraped] = useState<ScrapedLP | null>(null);
  const [localManuscript, setLocalManuscript] = useState(manuscript || "");
  const [savingManuscript, setSavingManuscript] = useState(false);
  const [splitting, setSplitting] = useState(false);

  // Fetch scraped LPs
  useEffect(() => {
    const fetchScrapedLPs = async () => {
      setLoadingScraped(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/scraped-lps`);
        const data = await res.json();
        if (data.ok) {
          setScrapedLPs(data.scrapedLPs || []);
        }
      } catch (err) {
        console.error("Failed to fetch scraped LPs:", err);
      } finally {
        setLoadingScraped(false);
      }
    };

    if (activeTab === "scraped") {
      fetchScrapedLPs();
    }
  }, [projectId, activeTab]);

  // Sync manuscript
  useEffect(() => {
    setLocalManuscript(manuscript || "");
  }, [manuscript]);

  // Add swipe file to palette
  const handleAddSwipeToPalette = async (sf: SwipeFile) => {
    try {
      const filename = sf.file_path.split("/").pop();
      const res = await fetch(`/api/images/${filename}`);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onAddToPalette(dataUrl, sf.name);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to load swipe file:", err);
    }
  };

  // Import sections from scraped LP
  const handleImportScrapedSections = async (lp: ScrapedLP) => {
    try {
      const sectionsToImport: { name: string; imageDataUrl: string }[] = [];

      for (const section of lp.sections) {
        const filename = section.image_path.split("/").pop();
        const res = await fetch(`/api/images/${filename}`);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });
        sectionsToImport.push({
          name: `取込 ${section.order_index + 1}`,
          imageDataUrl: dataUrl,
        });
      }

      onImportSections(sectionsToImport);
      setViewingScraped(null);
    } catch (err) {
      console.error("Failed to import sections:", err);
      alert("セクションのインポートに失敗しました");
    }
  };

  // Save manuscript
  const handleSaveManuscript = async () => {
    setSavingManuscript(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript: localManuscript }),
      });
      const data = await res.json();
      if (data.ok) {
        onManuscriptChange(localManuscript);
      }
    } catch (err) {
      console.error("Failed to save manuscript:", err);
    } finally {
      setSavingManuscript(false);
    }
  };

  // Split manuscript by AI
  const handleSplitManuscript = async () => {
    if (!localManuscript.trim()) {
      alert("原稿を入力してください");
      return;
    }
    setSplitting(true);
    try {
      const res = await fetch("/api/ai/split-manuscript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscript: localManuscript,
        }),
      });
      const data = await res.json();
      if (data.ok && data.parts) {
        // Show split result
        alert(`${data.parts.length}セクションに分割しました。\n各セクションの「原稿」欄に適用されます。`);
      } else {
        throw new Error(data.error || "分割に失敗しました");
      }
    } catch (err) {
      console.error("Failed to split manuscript:", err);
      alert("原稿の分割に失敗しました");
    } finally {
      setSplitting(false);
    }
  };

  // Delete scraped LP
  const handleDeleteScrapedLP = async (lpId: string) => {
    if (!confirm("この取込LPを削除しますか？")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/scraped-lps/${lpId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setScrapedLPs((prev) => prev.filter((lp) => lp.id !== lpId));
      }
    } catch (err) {
      console.error("Failed to delete scraped LP:", err);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b bg-gradient-to-r from-orange-500/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <FileImage className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">参照LP / 原稿</h2>
              <p className="text-[10px] text-muted-foreground">スワイプ・取込LP・原稿</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
          <div className="p-2 border-b">
            <TabsList className="w-full h-8 grid grid-cols-3">
              <TabsTrigger value="swipe" className="text-xs">
                スワイプ
              </TabsTrigger>
              <TabsTrigger value="scraped" className="text-xs">
                LP取込
              </TabsTrigger>
              <TabsTrigger value="manuscript" className="text-xs">
                原稿
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Swipe Files Tab */}
          <TabsContent value="swipe" className="flex-1 overflow-y-auto p-2 m-0">
            {swipeFiles.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {swipeFiles.map((sf) => {
                  const filename = sf.file_path.split("/").pop();
                  return (
                    <div
                      key={sf.id}
                      className="aspect-[3/4] rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary relative group cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/images/${filename}`}
                        alt={sf.name}
                        className="w-full h-full object-cover"
                        onClick={() => setViewingSwipe(sf)}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSwipeToPalette(sf);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          パレット
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">
                        {sf.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileImage className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs mb-3">スワイプファイルがありません</p>
                <Link href="/swipe-files">
                  <Button size="sm" variant="outline">
                    <Plus className="h-3 w-3 mr-1" />
                    スワイプ追加
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          {/* Scraped LPs Tab */}
          <TabsContent value="scraped" className="flex-1 overflow-y-auto p-2 m-0">
            {loadingScraped ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scrapedLPs.length > 0 ? (
              <div className="space-y-2">
                {scrapedLPs.map((lp) => (
                  <div
                    key={lp.id}
                    className="p-2 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setViewingScraped(lp)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{lp.title || "無題"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{lp.source_url}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {lp.sections.length}セクション
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingScraped(lp);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScrapedLP(lp.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs mb-3">取り込んだLPがありません</p>
                <Link href={`/projects/${projectId}/scraper`}>
                  <Button size="sm" variant="outline">
                    <Import className="h-3 w-3 mr-1" />
                    LP取込
                  </Button>
                </Link>
              </div>
            )}
            <div className="mt-3">
              <Link href={`/projects/${projectId}/scraper`}>
                <Button size="sm" variant="outline" className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  新しいLPを取込
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* Manuscript Tab */}
          <TabsContent value="manuscript" className="flex-1 flex flex-col p-2 m-0">
            <div className="flex-1 flex flex-col gap-2">
              <Textarea
                value={localManuscript}
                onChange={(e) => setLocalManuscript(e.target.value)}
                placeholder="LP原稿を入力...&#10;&#10;例：&#10;【ヘッドライン】&#10;たった3ステップで売上2倍！&#10;&#10;【サブヘッド】&#10;初心者でも簡単に..."
                className="flex-1 min-h-[150px] text-xs resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSaveManuscript}
                  disabled={savingManuscript || localManuscript === (manuscript || "")}
                >
                  {savingManuscript ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <FileText className="h-3 w-3 mr-1" />
                  )}
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={handleSplitManuscript}
                  disabled={splitting || !localManuscript.trim()}
                >
                  {splitting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <FileImage className="h-3 w-3 mr-1" />
                  )}
                  AIで分割
                </Button>
              </div>

              {/* Usage Guide */}
              <div className="mt-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                <p className="text-[10px] font-medium text-primary mb-1">💡 原稿を保存すると:</p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                  <li>• AIアシスタントで「この原稿で画像生成」と指示可能</li>
                  <li>• 「AIで分割」でセクションごとに自動分割</li>
                  <li>• 構成作成時の参考として活用</li>
                </ul>
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  例: 「この原稿のファーストビューを生成して」
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Swipe File Detail Modal */}
      <Dialog open={!!viewingSwipe} onOpenChange={() => setViewingSwipe(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{viewingSwipe?.name}</DialogTitle>
          </DialogHeader>
          {viewingSwipe && (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/images/${viewingSwipe.file_path.split("/").pop()}`}
                alt={viewingSwipe.name}
                className="w-full rounded-lg"
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleAddSwipeToPalette(viewingSwipe);
                    setViewingSwipe(null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  パレットに追加
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scraped LP Detail Modal */}
      <Dialog open={!!viewingScraped} onOpenChange={() => setViewingScraped(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{viewingScraped?.title || "取込LP"}</DialogTitle>
          </DialogHeader>
          {viewingScraped && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground truncate">
                ソース: {viewingScraped.source_url}
              </p>
              <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {viewingScraped.sections.map((section) => {
                  const filename = section.image_path.split("/").pop();
                  return (
                    <div key={section.id} className="aspect-video rounded overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/images/${filename}`}
                        alt={`Section ${section.order_index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleImportScrapedSections(viewingScraped)}
                >
                  <Import className="h-4 w-4 mr-1" />
                  全セクションをインポート
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
