"use client";

/**
 * デザインプロンプトジェネレーター UI
 *
 * 60+カテゴリのテンプレートから目的に合ったプロンプトを生成
 */

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================
// 型定義（クライアント用）
// ============================================

interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  targetPersona?: string;
  description?: string;
  variables: string[];
  examples?: Array<Record<string, string>>;
}

interface CategoryInfo {
  id: string;
  label: string;
}

interface LpSectionInfo {
  id: string;
  label: string;
  keywords: string[];
}

interface GeneratedPrompt {
  prompt: string;
  templateName: string;
  category: string;
  suggestedTool: "gemini" | "dalle" | "midjourney";
  aspectRatio: string;
  resolution: string;
  variables: Record<string, string>;
}

// ============================================
// コンポーネント
// ============================================

export default function DesignPromptPage() {
  // カテゴリ・テンプレートデータ
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [lpSections, setLpSections] = useState<LpSectionInfo[]>([]);

  // 選択状態
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(
    null
  );
  const [selectedLpSection, setSelectedLpSection] = useState<string>("");

  // 変数入力
  const [variables, setVariables] = useState<Record<string, string>>({});

  // 検索
  const [searchQuery, setSearchQuery] = useState("");

  // 生成結果
  const [generatedPrompt, setGeneratedPrompt] =
    useState<GeneratedPrompt | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // ローディング
  const [loading, setLoading] = useState(true);

  // ============================================
  // データ読み込み
  // ============================================

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/design-prompt/templates");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setTemplates(data.templates || []);
        setLpSections(data.lpSections || []);
      }
    } catch (error) {
      console.error("Failed to load design prompts:", error);
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // フィルタリング
  // ============================================

  const filteredTemplates = useMemo(() => {
    let result = templates;

    // カテゴリフィルター
    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // 検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.categoryLabel.toLowerCase().includes(query) ||
          t.targetPersona?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [templates, selectedCategory, searchQuery]);

  // LPセクション推奨テンプレート
  const recommendedTemplates = useMemo(() => {
    if (!selectedLpSection) return [];

    const section = lpSections.find((s) => s.id === selectedLpSection);
    if (!section) return [];

    // キーワードでフィルタリング
    return templates.filter((t) =>
      section.keywords.some(
        (keyword) =>
          t.name.includes(keyword) || t.id.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }, [selectedLpSection, lpSections, templates]);

  // ============================================
  // テンプレート選択
  // ============================================

  function handleSelectTemplate(template: TemplateInfo) {
    setSelectedTemplate(template);

    // 変数の初期値を設定
    const initialVars: Record<string, string> = {};
    for (const v of template.variables) {
      initialVars[v] = "";
    }
    setVariables(initialVars);
    setGeneratedPrompt(null);
  }

  // ============================================
  // プロンプト生成
  // ============================================

  async function handleGenerate() {
    if (!selectedTemplate) return;

    try {
      const res = await fetch("/api/design-prompt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedTemplate.category,
          templateId: selectedTemplate.id,
          variables,
          lpSection: selectedLpSection || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPrompt(data.result);
      }
    } catch (error) {
      console.error("Failed to generate prompt:", error);
    }
  }

  // ============================================
  // コピー機能
  // ============================================

  async function handleCopyPrompt() {
    if (!generatedPrompt) return;

    try {
      await navigator.clipboard.writeText(generatedPrompt.prompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  // ============================================
  // サンプル適用
  // ============================================

  function applyExample(example: Record<string, string>) {
    setVariables((prev) => ({ ...prev, ...example }));
  }

  // ============================================
  // レンダリング
  // ============================================

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">デザインプロンプトジェネレーター</h1>
        <p className="text-gray-600 mt-1">
          60+カテゴリのテンプレートからLP画像・バナー・SNS素材用のプロンプトを生成
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム: テンプレート選択 */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">テンプレート選択</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 検索 */}
              <div>
                <Input
                  placeholder="テンプレートを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* カテゴリ選択 */}
              <div>
                <Label className="text-sm font-medium">カテゴリ</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">すべてのカテゴリ</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* LPセクション選択 */}
              <div>
                <Label className="text-sm font-medium">
                  LPセクションから選ぶ
                </Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  value={selectedLpSection}
                  onChange={(e) => setSelectedLpSection(e.target.value)}
                >
                  <option value="">選択しない</option>
                  {lpSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.label}
                    </option>
                  ))}
                </select>
                {selectedLpSection && recommendedTemplates.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    推奨: {recommendedTemplates.length}件のテンプレート
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* テンプレート一覧 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                テンプレート一覧
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredTemplates.length}件)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredTemplates.map((template) => (
                  <button
                    key={`${template.category}-${template.id}`}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === template.id &&
                      selectedTemplate?.category === template.category
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {template.categoryLabel}
                      {template.targetPersona && (
                        <span className="ml-2">
                          | {template.targetPersona}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      変数: {template.variables.length}個
                    </div>
                  </button>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    テンプレートが見つかりません
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: 変数入力・生成結果 */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTemplate ? (
            <>
              {/* 変数入力 */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedTemplate.name}</CardTitle>
                  <CardDescription>
                    {selectedTemplate.categoryLabel}
                    {selectedTemplate.targetPersona && (
                      <span className="ml-2">
                        | 対象: {selectedTemplate.targetPersona}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* サンプル */}
                  {selectedTemplate.examples &&
                    selectedTemplate.examples.length > 0 && (
                      <div className="mb-4">
                        <Label className="text-sm font-medium">
                          サンプルを適用
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedTemplate.examples.map((example, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => applyExample(example)}
                            >
                              サンプル {idx + 1}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 変数入力フォーム */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTemplate.variables.map((variable) => (
                      <div key={variable}>
                        <Label className="text-sm">{variable}</Label>
                        <Input
                          className="mt-1"
                          placeholder={`[${variable}]`}
                          value={variables[variable] || ""}
                          onChange={(e) =>
                            setVariables((prev) => ({
                              ...prev,
                              [variable]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {selectedTemplate.variables.length === 0 && (
                    <p className="text-gray-500 text-sm">
                      このテンプレートには変数がありません
                    </p>
                  )}

                  <Button
                    className="w-full mt-4"
                    onClick={handleGenerate}
                    disabled={
                      selectedTemplate.variables.length > 0 &&
                      Object.values(variables).every((v) => !v)
                    }
                  >
                    プロンプトを生成
                  </Button>
                </CardContent>
              </Card>

              {/* 生成結果 */}
              {generatedPrompt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>生成結果</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPrompt}
                      >
                        {copySuccess ? "コピーしました!" : "コピー"}
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      推奨ツール: {generatedPrompt.suggestedTool.toUpperCase()} |
                      アスペクト比: {generatedPrompt.aspectRatio} |
                      解像度: {generatedPrompt.resolution}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="prompt">
                      <TabsList>
                        <TabsTrigger value="prompt">プロンプト</TabsTrigger>
                        <TabsTrigger value="settings">設定情報</TabsTrigger>
                      </TabsList>

                      <TabsContent value="prompt" className="mt-4">
                        <Textarea
                          className="min-h-[300px] font-mono text-sm"
                          value={generatedPrompt.prompt}
                          readOnly
                        />
                      </TabsContent>

                      <TabsContent value="settings" className="mt-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">テンプレート</span>
                            <span className="font-medium">
                              {generatedPrompt.templateName}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">カテゴリ</span>
                            <span className="font-medium">
                              {generatedPrompt.category}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">推奨ツール</span>
                            <span className="font-medium">
                              {generatedPrompt.suggestedTool.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">アスペクト比</span>
                            <span className="font-medium">
                              {generatedPrompt.aspectRatio}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">解像度</span>
                            <span className="font-medium">
                              {generatedPrompt.resolution}
                            </span>
                          </div>

                          <div className="pt-2">
                            <span className="text-gray-600">使用した変数</span>
                            <div className="mt-2 space-y-1">
                              {Object.entries(generatedPrompt.variables).map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex justify-between text-xs bg-gray-50 p-2 rounded"
                                  >
                                    <span className="text-gray-500">{key}</span>
                                    <span className="font-medium truncate ml-2 max-w-[200px]">
                                      {value || "(未入力)"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <p className="text-lg">テンプレートを選択してください</p>
                  <p className="text-sm mt-2">
                    左のリストからテンプレートを選ぶか、
                    <br />
                    LPセクションから推奨テンプレートを選択できます
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
