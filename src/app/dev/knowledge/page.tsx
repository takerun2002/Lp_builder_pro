"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  KNOWLEDGE_CATEGORIES,
  SECTION_TYPE_LABELS,
  type KnowledgeOutput,
  type SectionType,
} from "@/lib/knowledge/converter";

export default function KnowledgePage() {
  // Input state
  const [inputType, setInputType] = useState<"text" | "file" | "url">("text");
  const [textContent, setTextContent] = useState("");
  const [urlContent, setUrlContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  // Options
  const [name, setName] = useState("");
  const [category, setCategory] = useState("copywriting");

  // Result state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<KnowledgeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState("preview");
  const [copySuccess, setCopySuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "text/plain",
      "text/markdown",
      "application/octet-stream",
    ];
    const allowedExtensions = [".txt", ".md"];
    const extension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(extension)
    ) {
      setError("サポートされているファイル形式: .txt, .md");
      return;
    }

    try {
      const text = await file.text();
      setFileName(file.name);
      setFileContent(text);
      setError(null);
    } catch {
      setError("ファイルの読み込みに失敗しました");
    }
  };

  // Conversion
  const handleConvert = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Progress simulation
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 90));
    }, 500);

    try {
      let content = "";
      const type: "text" | "file" | "url" = inputType;

      switch (inputType) {
        case "text":
          content = textContent;
          break;
        case "file":
          content = fileContent || "";
          break;
        case "url":
          content = urlContent;
          break;
      }

      if (!content.trim()) {
        throw new Error("コンテンツを入力してください");
      }

      const response = await fetch("/api/knowledge/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { type, content },
          options: {
            name: name || undefined,
            category,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "変換に失敗しました");
      }

      setResult(data.result);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  // Download YAML
  const handleDownload = () => {
    if (!result?.yaml) return;

    const blob = new Blob([result.yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.meta.name.replace(/\s+/g, "_")}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!result?.yaml) return;

    try {
      await navigator.clipboard.writeText(result.yaml);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError("クリップボードへのコピーに失敗しました");
    }
  };

  // Section type badge color
  const getSectionTypeColor = (type: SectionType): string => {
    switch (type) {
      case "pain":
        return "bg-red-100 text-red-800";
      case "benefit":
        return "bg-green-100 text-green-800";
      case "evidence":
        return "bg-blue-100 text-blue-800";
      case "cta":
        return "bg-orange-100 text-orange-800";
      case "story":
        return "bg-purple-100 text-purple-800";
      case "technique":
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ナレッジ構築</h1>
            <p className="text-sm text-gray-500">
              テキスト/URL からナレッジを構造化しYAML形式に変換
            </p>
          </div>
          <Link href="/dev">
            <Button variant="outline">開発メニューに戻る</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>入力</CardTitle>
            <CardDescription>
              変換するコンテンツを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input Type Tabs */}
            <Tabs
              value={inputType}
              onValueChange={(v) => setInputType(v as "text" | "file" | "url")}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">テキスト入力</TabsTrigger>
                <TabsTrigger value="file">ファイル</TabsTrigger>
                <TabsTrigger value="url">URL</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <Textarea
                  placeholder="変換するテキストを入力してください..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  {textContent.length.toLocaleString()} 文字
                </p>
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".txt,.md"
                    className="hidden"
                  />
                  {fileName ? (
                    <div className="space-y-2">
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-gray-500">
                        {fileContent?.length.toLocaleString()} 文字
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        別のファイルを選択
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-500">
                        .txt または .md ファイルをアップロード
                      </p>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        ファイルを選択
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <Input
                  type="url"
                  placeholder="https://example.com/article"
                  value={urlContent}
                  onChange={(e) => setUrlContent(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  URLからコンテンツを取得して構造化します
                </p>
              </TabsContent>
            </Tabs>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">ナレッジ名</label>
                <Input
                  placeholder="自動生成"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">カテゴリ</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Convert Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleConvert}
                disabled={loading}
                className="w-40"
              >
                {loading ? "変換中..." : "変換する"}
              </Button>
            </div>

            {/* Progress */}
            {loading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-gray-500">
                  AIで構造化中... {progress}%
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result Section */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{result.meta.name}</CardTitle>
                  <CardDescription>
                    カテゴリ: {result.meta.category} | セクション:{" "}
                    {result.sections.length}個
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copySuccess ? "コピーしました!" : "YAMLをコピー"}
                  </Button>
                  <Button onClick={handleDownload}>
                    YAMLをダウンロード
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeResultTab}
                onValueChange={setActiveResultTab}
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="preview">プレビュー</TabsTrigger>
                  <TabsTrigger value="sections">セクション</TabsTrigger>
                  <TabsTrigger value="words">パワーワード</TabsTrigger>
                  <TabsTrigger value="yaml">YAML</TabsTrigger>
                </TabsList>

                {/* Preview Tab */}
                <TabsContent value="preview" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">セクション</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">
                          {result.sections.length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">パワーワード</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">
                          {result.powerWords.length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">キーフレーズ</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">
                          {result.keyPhrases.length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Section type breakdown */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        セクションタイプ分布
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(
                          result.sections.reduce(
                            (acc, s) => {
                              acc[s.type] = (acc[s.type] || 0) + 1;
                              return acc;
                            },
                            {} as Record<string, number>
                          )
                        ).map(([type, count]) => (
                          <Badge
                            key={type}
                            className={getSectionTypeColor(type as SectionType)}
                          >
                            {SECTION_TYPE_LABELS[type as SectionType]}: {count}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sections Tab */}
                <TabsContent value="sections" className="space-y-4">
                  {result.sections.map((section, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getSectionTypeColor(section.type)}
                          >
                            {SECTION_TYPE_LABELS[section.type]}
                          </Badge>
                          <CardTitle className="text-lg">
                            {section.name}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 whitespace-pre-wrap">
                          {section.content}
                        </p>
                        {section.subSections &&
                          section.subSections.length > 0 && (
                            <div className="mt-4 pl-4 border-l-2 space-y-2">
                              {section.subSections.map((sub, subIdx) => (
                                <div key={subIdx}>
                                  <p className="font-medium text-sm">
                                    {sub.name}
                                  </p>
                                  <p className="text-gray-500 text-sm">
                                    {sub.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Power Words Tab */}
                <TabsContent value="words" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">パワーワード</CardTitle>
                      <CardDescription>
                        感情を動かす強い言葉
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.powerWords.map((word, idx) => (
                          <Badge key={idx} variant="secondary">
                            {word}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">キーフレーズ</CardTitle>
                      <CardDescription>
                        重要な概念やコンセプト
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.keyPhrases.map((phrase, idx) => (
                          <Badge key={idx} variant="outline">
                            {phrase}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* YAML Tab */}
                <TabsContent value="yaml">
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-[600px]">
                      <code>{result.yaml}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
