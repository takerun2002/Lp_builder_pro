"use client";

/**
 * ナレッジビルダー UI
 * テキスト/URL → AI構造化 → YAMLナレッジ自動生成
 */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Link as LinkIcon,
  Download,
  Copy,
  CheckCircle2,
  Sparkles,
  FolderOpen,
} from "lucide-react";

interface BuildResult {
  success: boolean;
  yaml?: string;
  json?: string;
  error?: string;
  stats?: {
    totalCategories: number;
    totalItems: number;
    processingTime: number;
  };
  savedTo?: string;
}

interface KnowledgeFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

export default function KnowledgeBuilderPage() {
  // 入力状態
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  // 処理状態
  const [isBuilding, setIsBuilding] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [copied, setCopied] = useState(false);

  // ファイル一覧
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // ナレッジ構築実行
  const handleBuild = async (save = false) => {
    if (!name.trim()) {
      alert("ナレッジ名を入力してください");
      return;
    }

    if (inputMode === "text" && !content.trim()) {
      alert("テキストコンテンツを入力してください");
      return;
    }

    if (inputMode === "url" && !url.trim()) {
      alert("URLを入力してください");
      return;
    }

    setIsBuilding(true);
    setResult(null);

    try {
      const response = await fetch("/api/knowledge/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: inputMode === "text" ? content : undefined,
          url: inputMode === "url" ? url : undefined,
          name: name.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          save,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success && save) {
        // ファイル一覧を更新
        loadFiles();
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsBuilding(false);
    }
  };

  // ファイル一覧を読み込み
  const loadFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch("/api/knowledge/build");
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // クリップボードにコピー
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ダウンロード
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dev">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">ナレッジビルダー</h1>
          <p className="text-sm text-muted-foreground">
            テキストやURLからAIでナレッジベースを自動構築
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* 入力セクション */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              入力ソース
            </CardTitle>
            <CardDescription>
              ナレッジ化したいテキストまたはURLを入力
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 入力モード切替 */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "text" | "url")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="w-4 h-4" />
                  テキスト入力
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <LinkIcon className="w-4 h-4" />
                  URL入力
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="ナレッジ化したいテキストを貼り付け（ノウハウ、教材、メモなど）..."
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {content.length.toLocaleString()} 文字 (100〜100,000文字)
                </p>
              </TabsContent>

              <TabsContent value="url" className="mt-4">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  type="url"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Webページのテキストを自動抽出してナレッジ化します
                </p>
              </TabsContent>
            </Tabs>

            {/* メタ情報 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">ナレッジ名 *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: マーケティング戦略集"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">カテゴリ</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="例: marketing, copywriting"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">説明</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="このナレッジの用途や目的"
              />
            </div>

            {/* 実行ボタン */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleBuild(false)}
                disabled={isBuilding}
                className="flex-1"
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI構造化中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    プレビュー生成
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleBuild(true)}
                disabled={isBuilding}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 結果セクション */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    構築完了
                  </>
                ) : (
                  <>エラー</>
                )}
              </CardTitle>
              {result.stats && (
                <CardDescription>
                  {result.stats.totalCategories}カテゴリ・{result.stats.totalItems}アイテム・
                  {(result.stats.processingTime / 1000).toFixed(1)}秒
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {result.success ? (
                <div className="space-y-4">
                  {result.savedTo && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                      保存先: <code className="text-xs">{result.savedTo}</code>
                    </div>
                  )}

                  <Tabs defaultValue="yaml">
                    <TabsList>
                      <TabsTrigger value="yaml">YAML</TabsTrigger>
                      <TabsTrigger value="json">JSON</TabsTrigger>
                    </TabsList>

                    <TabsContent value="yaml" className="mt-4">
                      <div className="relative">
                        <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-96 text-xs font-mono">
                          {result.yaml}
                        </pre>
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyToClipboard(result.yaml || "")}
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              downloadFile(
                                result.yaml || "",
                                `${name || "knowledge"}.yaml`
                              )
                            }
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="json" className="mt-4">
                      <div className="relative">
                        <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-96 text-xs font-mono">
                          {result.json}
                        </pre>
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyToClipboard(result.json || "")}
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                  {result.error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 既存ファイル一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                既存ナレッジファイル
              </span>
              <Button variant="outline" size="sm" onClick={loadFiles} disabled={isLoadingFiles}>
                {isLoadingFiles ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "更新"
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                ファイルを読み込むには「更新」ボタンをクリック
              </p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB・
                        {new Date(file.modifiedAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
