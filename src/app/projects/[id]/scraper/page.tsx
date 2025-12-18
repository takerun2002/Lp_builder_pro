"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface SectionInfo {
  index: number;
  name: string;
  startY: number;
  endY: number;
  description: string;
}

interface ScrapeResult {
  ok: true;
  scrapeId: string;
  url: string;
  fullImageUrl: string;
  pageHeight: number;
  pageWidth: number;
  sections: SectionInfo[];
  ocrText: string;
  elapsedMs: number;
}

export default function ProjectScraperPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [importingIdx, setImportingIdx] = useState<number | null>(null);
  const [importedIdxs, setImportedIdxs] = useState<Set<number>>(new Set());
  const [importAllLoading, setImportAllLoading] = useState(false);

  // Fetch project info
  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (data.ok) {
          setProject(data.project);
        } else {
          router.push("/projects");
        }
      } catch {
        router.push("/projects");
      }
    }
    fetchProject();
  }, [projectId, router]);

  const handleScrape = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setImportedIdxs(new Set());

    try {
      const res = await fetch("/api/dev/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (data.ok) {
        setResult(data);
      } else {
        setError(data.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  // Crop and import a section
  const importSection = useCallback(
    async (section: SectionInfo) => {
      if (!result) return;

      setImportingIdx(section.index);

      try {
        // Load full image
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = result.fullImageUrl;
        });

        // Crop section using canvas
        const canvas = document.createElement("canvas");
        const sectionHeight = section.endY - section.startY;
        canvas.width = result.pageWidth;
        canvas.height = sectionHeight;

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          img,
          0,
          section.startY,
          result.pageWidth,
          sectionHeight,
          0,
          0,
          result.pageWidth,
          sectionHeight
        );

        const dataUrl = canvas.toDataURL("image/png");

        // Add section to project
        const res = await fetch(`/api/projects/${projectId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: section.name,
            imageDataUrl: dataUrl,
            width: result.pageWidth,
            height: sectionHeight,
          }),
        });

        const data = await res.json();

        if (data.ok) {
          setImportedIdxs((prev) => new Set([...Array.from(prev), section.index]));
        } else {
          alert(`インポート失敗: ${data.error || "Unknown error"}`);
        }
      } catch (err) {
        console.error("Import error:", err);
        alert("インポート中にエラーが発生しました");
      } finally {
        setImportingIdx(null);
      }
    },
    [result, projectId]
  );

  // Import all sections at once
  const importAllSections = useCallback(async () => {
    if (!result || result.sections.length === 0) return;

    setImportAllLoading(true);

    try {
      // Load full image once
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = result.fullImageUrl;
      });

      for (const section of result.sections) {
        if (importedIdxs.has(section.index)) continue;

        // Crop section
        const canvas = document.createElement("canvas");
        const sectionHeight = section.endY - section.startY;
        canvas.width = result.pageWidth;
        canvas.height = sectionHeight;

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          img,
          0,
          section.startY,
          result.pageWidth,
          sectionHeight,
          0,
          0,
          result.pageWidth,
          sectionHeight
        );

        const dataUrl = canvas.toDataURL("image/png");

        // Add section to project
        const res = await fetch(`/api/projects/${projectId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: section.name,
            imageDataUrl: dataUrl,
            width: result.pageWidth,
            height: sectionHeight,
          }),
        });

        const data = await res.json();

        if (data.ok) {
          setImportedIdxs((prev) => new Set([...Array.from(prev), section.index]));
        }
      }
    } catch (err) {
      console.error("Import all error:", err);
      alert("一括インポート中にエラーが発生しました");
    } finally {
      setImportAllLoading(false);
    }
  }, [result, projectId, importedIdxs]);

  if (!project) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">LP取り込み（スクレイパー）</h1>
            <p className="text-sm text-muted-foreground">
              URLからLPを取得 → セクション検出 → 「{project.name}」に取り込み
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}`}>
              <Button variant="outline" size="sm">← プロジェクト</Button>
            </Link>
          </div>
        </div>

        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">URL入力</CardTitle>
            <CardDescription>取り込みたいLPのURLを入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/lp"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              />
              <Button onClick={handleScrape} disabled={loading || !url.trim()}>
                {loading ? "取得中..." : "取得"}
              </Button>
            </div>
            {loading && (
              <div className="text-sm text-muted-foreground">
                ページを読み込み中...（30秒〜1分程度かかります）
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive">{error}</div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-green-600">取得完了</CardTitle>
                  <CardDescription>
                    {result.pageWidth}×{result.pageHeight}px • {result.sections.length}セクション検出 • {result.elapsedMs}ms
                  </CardDescription>
                </div>
                {result.sections.length > 0 && (
                  <Button
                    onClick={importAllSections}
                    disabled={importAllLoading || importedIdxs.size === result.sections.length}
                  >
                    {importAllLoading
                      ? "インポート中..."
                      : importedIdxs.size === result.sections.length
                      ? "全てインポート済み"
                      : `全セクションをインポート (${result.sections.length - importedIdxs.size}件)`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="preview">プレビュー</TabsTrigger>
                  <TabsTrigger value="sections">セクション ({result.sections.length})</TabsTrigger>
                  <TabsTrigger value="ocr">OCRテキスト</TabsTrigger>
                </TabsList>

                {/* Preview */}
                <TabsContent value="preview" className="mt-4">
                  <div className="border rounded-lg overflow-auto bg-muted/20" style={{ maxHeight: 600 }}>
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.fullImageUrl}
                        alt="Full page screenshot"
                        className="w-full h-auto"
                      />
                      {/* Section overlays */}
                      {result.sections.map((section, idx) => (
                        <div
                          key={idx}
                          className="absolute left-0 right-0 border-t-2 border-dashed border-primary/50"
                          style={{ top: section.startY * (100 / result.pageHeight) + "%" }}
                        >
                          <div className="absolute left-2 -top-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                            {section.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Sections */}
                <TabsContent value="sections" className="mt-4">
                  {result.sections.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      セクションが検出されませんでした
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {result.sections.map((section, idx) => (
                        <div
                          key={idx}
                          className={`border rounded-lg p-3 ${
                            importedIdxs.has(section.index) ? "bg-green-50 border-green-200" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center">
                              {section.index + 1}
                            </span>
                            <span className="font-medium">{section.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Y: {section.startY} - {section.endY}px ({section.endY - section.startY}px)
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                              {importedIdxs.has(section.index) ? (
                                <span className="text-xs text-green-600 font-medium">インポート済み</span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => importSection(section)}
                                  disabled={importingIdx !== null}
                                >
                                  {importingIdx === section.index ? "取り込み中..." : "プロジェクトに取り込む"}
                                </Button>
                              )}
                            </div>
                          </div>
                          {section.description && (
                            <p className="text-sm text-muted-foreground mt-1 ml-8">
                              {section.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* OCR */}
                <TabsContent value="ocr" className="mt-4">
                  {result.ocrText ? (
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap overflow-auto max-h-96">
                        {result.ocrText}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => navigator.clipboard.writeText(result.ocrText)}
                      >
                        コピー
                      </Button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      テキストが抽出されませんでした
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Imported count */}
        {importedIdxs.size > 0 && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="text-green-700">
                {importedIdxs.size}件のセクションをインポートしました
              </div>
              <Link href={`/projects/${projectId}`}>
                <Button variant="outline" size="sm">
                  プロジェクトを確認 →
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>※ 動的なLPや認証が必要なページには対応していません。</p>
          <p>※ 取り込み後、Magic Penで各セクションを編集できます。</p>
        </div>
      </div>
    </div>
  );
}
