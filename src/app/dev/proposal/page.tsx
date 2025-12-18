"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// =============================================================================
// Types
// =============================================================================

type Template = "simple" | "detailed" | "presentation";
type ExportFormat = "docs" | "slides" | "pdf";

interface ResearchItem {
  id: string;
  project_name: string;
  status: string;
  created_at: string;
}

interface GeneratedProposal {
  id: string;
  metadata: {
    projectName: string;
    createdAt: string;
    template: Template;
    pageCount: number;
    wordCount: number;
  };
  rawMarkdown: string;
  htmlContent: string;
  sectionCount: number;
}

interface DriveFolder {
  id: string;
  name: string;
}

// =============================================================================
// Constants
// =============================================================================

const TEMPLATE_INFO: Record<Template, { label: string; description: string }> = {
  simple: {
    label: "シンプル",
    description: "基本的な5セクション構成。短時間で概要を把握できます",
  },
  detailed: {
    label: "詳細",
    description: "10セクションの詳細構成。深い分析結果を含みます",
  },
  presentation: {
    label: "プレゼン",
    description: "スライド向け構成。クライアント提案に最適",
  },
};

const FORMAT_INFO: Record<ExportFormat, { label: string; icon: string }> = {
  docs: { label: "Googleドキュメント", icon: "📄" },
  slides: { label: "Googleスライド", icon: "📊" },
  pdf: { label: "PDF", icon: "📑" },
};

// =============================================================================
// Component
// =============================================================================

export default function ProposalPage() {
  // State
  const [activeTab, setActiveTab] = useState("generate");
  const [template, setTemplate] = useState<Template>("simple");
  const [useAI, setUseAI] = useState(true);
  const [researchList, setResearchList] = useState<ResearchItem[]>([]);
  const [selectedResearchId, setSelectedResearchId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState<GeneratedProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>("docs");
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [shareEmails, setShareEmails] = useState("");
  const [makePublic, setMakePublic] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    url?: string;
  } | null>(null);

  // リサーチ一覧を取得
  useEffect(() => {
    async function fetchResearchList() {
      try {
        const response = await fetch("/api/proposal?action=research-list");
        const data = await response.json();
        if (data.ok) {
          setResearchList(data.results || []);
        }
      } catch (err) {
        console.error("Failed to fetch research list:", err);
      }
    }
    fetchResearchList();
  }, []);

  // フォルダ一覧を取得
  useEffect(() => {
    async function fetchFolders() {
      try {
        const response = await fetch("/api/proposal?action=folders");
        const data = await response.json();
        if (data.ok) {
          setFolders(data.folders || []);
        }
      } catch (err) {
        console.error("Failed to fetch folders:", err);
      }
    }
    fetchFolders();
  }, []);

  // 提案書生成
  const handleGenerate = useCallback(async () => {
    if (!selectedResearchId) {
      setError("リサーチ結果を選択してください");
      return;
    }

    setGenerating(true);
    setError(null);
    setProposal(null);

    try {
      const response = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchId: selectedResearchId,
          template,
          useAI,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setProposal(data.proposal);
        setActiveTab("preview");
      } else {
        setError(data.error || "生成に失敗しました");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError("生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  }, [selectedResearchId, template, useAI]);

  // Googleエクスポート
  const handleExport = useCallback(async () => {
    if (!proposal) return;

    setExporting(true);
    setExportResult(null);

    try {
      const emails = shareEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const response = await fetch("/api/proposal?action=export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalMarkdown: proposal.rawMarkdown,
          projectName: proposal.metadata.projectName,
          format: exportFormat,
          folderId: selectedFolderId || undefined,
          shareWithEmails: emails.length > 0 ? emails : undefined,
          makePublic,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setExportResult({
          success: true,
          url: data.documentUrl || data.pdfUrl,
        });
      } else {
        setError(data.error || "エクスポートに失敗しました");
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("エクスポート中にエラーが発生しました");
    } finally {
      setExporting(false);
    }
  }, [proposal, exportFormat, selectedFolderId, shareEmails, makePublic]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">提案書自動生成</h1>
        <p className="text-muted-foreground">
          リサーチ結果から提案書を自動生成し、Googleドキュメント/スライドにエクスポート
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="generate">生成</TabsTrigger>
          <TabsTrigger value="preview" disabled={!proposal}>
            プレビュー
          </TabsTrigger>
          <TabsTrigger value="export" disabled={!proposal}>
            エクスポート
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">リサーチ結果を選択</CardTitle>
              <CardDescription>
                提案書を生成するリサーチ結果を選択してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedResearchId}
                onValueChange={setSelectedResearchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="リサーチ結果を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {researchList.length === 0 ? (
                    <SelectItem value="none" disabled>
                      リサーチ結果がありません
                    </SelectItem>
                  ) : (
                    researchList.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.project_name} ({new Date(r.created_at).toLocaleDateString("ja-JP")})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">テンプレート選択</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(Object.entries(TEMPLATE_INFO) as [Template, typeof TEMPLATE_INFO[Template]][]).map(
                  ([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setTemplate(key)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        template === key
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium mb-1">{info.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {info.description}
                      </div>
                    </button>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">オプション</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="use-ai">AI改善</Label>
                  <p className="text-xs text-muted-foreground">
                    AIを使って文章を改善します
                  </p>
                </div>
                <Switch
                  id="use-ai"
                  checked={useAI}
                  onCheckedChange={setUseAI}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={generating || !selectedResearchId}
              className="px-8"
            >
              {generating ? "生成中..." : "提案書を生成"}
            </Button>
          </div>

          {generating && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-center">AIが提案書を生成中...</p>
                  <Progress value={undefined} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {proposal && (
            <>
              {/* Metadata */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">
                        {proposal.metadata.projectName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {TEMPLATE_INFO[proposal.metadata.template].label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {proposal.sectionCount}セクション ・{" "}
                          {proposal.metadata.wordCount.toLocaleString()}文字 ・ 約
                          {proposal.metadata.pageCount}ページ
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("export")}>
                      エクスポート
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">プレビュー</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-6 bg-white max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {proposal.rawMarkdown}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Copy Button */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(proposal.rawMarkdown);
                  }}
                >
                  Markdownをコピー
                </Button>
                <Button onClick={() => setActiveTab("export")}>
                  Googleにエクスポート
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          {proposal && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">エクスポート形式</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {(Object.entries(FORMAT_INFO) as [ExportFormat, typeof FORMAT_INFO[ExportFormat]][]).map(
                      ([key, info]) => (
                        <button
                          key={key}
                          onClick={() => setExportFormat(key)}
                          className={`p-4 border rounded-lg text-center transition-colors ${
                            exportFormat === key
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-2xl mb-1">{info.icon}</div>
                          <div className="font-medium">{info.label}</div>
                        </button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">保存先・共有設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>保存先フォルダ（任意）</Label>
                    <Select
                      value={selectedFolderId}
                      onValueChange={setSelectedFolderId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="マイドライブに保存" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">マイドライブ（ルート）</SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            📁 {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="share-emails">
                      共有先メールアドレス（カンマ区切り）
                    </Label>
                    <Input
                      id="share-emails"
                      value={shareEmails}
                      onChange={(e) => setShareEmails(e.target.value)}
                      placeholder="example@gmail.com, another@example.com"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="make-public">リンクを知っている全員に公開</Label>
                      <p className="text-xs text-muted-foreground">
                        URLを知っている人が閲覧可能になります
                      </p>
                    </div>
                    <Switch
                      id="make-public"
                      checked={makePublic}
                      onCheckedChange={setMakePublic}
                    />
                  </div>
                </CardContent>
              </Card>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {exportResult?.success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium mb-2">
                    エクスポートが完了しました
                  </p>
                  {exportResult.url && (
                    <a
                      href={exportResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {exportResult.url}
                    </a>
                  )}
                </div>
              )}

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-8"
                >
                  {exporting ? "エクスポート中..." : "Googleにエクスポート"}
                </Button>
              </div>

              {exporting && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-center">
                        {FORMAT_INFO[exportFormat].label}を作成中...
                      </p>
                      <Progress value={undefined} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
