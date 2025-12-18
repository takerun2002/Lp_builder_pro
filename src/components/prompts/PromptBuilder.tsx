"use client";

/**
 * PromptBuilder - プロンプトビルダー
 *
 * 構成からプロンプトを生成・編集するメインコンポーネント
 */

import { useState, useEffect } from "react";
import type { PromptFormat } from "@/lib/workflow/types";
import type { LPStructure } from "@/lib/structure/types";
import type { GeneratedPrompt } from "@/lib/prompts/types";
import {
  generateSectionPrompt,
  generateAllSectionPrompts,
  convertPromptFormat,
  combinePrompts,
} from "@/lib/prompts/prompt-generator";
import { PromptFormatSelector } from "@/components/workflow/PromptFormatSelector";
import { PromptEditor } from "./PromptEditor";
import { SectionPromptCard } from "./SectionPromptCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wand2,
  Download,
  Copy,
  Check,
  FileText,
  Layers,
} from "lucide-react";

interface PromptBuilderProps {
  structure: LPStructure;
  initialPrompts?: GeneratedPrompt[];
  onPromptsGenerated?: (prompts: GeneratedPrompt[]) => void;
  onExport?: (content: string, format: PromptFormat) => void;
}

export function PromptBuilder({
  structure,
  initialPrompts,
  onPromptsGenerated,
  onExport,
}: PromptBuilderProps) {
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>(initialPrompts || []);
  const [format, setFormat] = useState<PromptFormat>("yaml");
  const [viewMode, setViewMode] = useState<"sections" | "combined">("sections");
  const [combinedContent, setCombinedContent] = useState("");
  const [copied, setCopied] = useState(false);

  // プロンプト生成
  const handleGenerateAll = () => {
    const generated = generateAllSectionPrompts(
      structure.sections,
      structure.globalRules,
      {
        format,
        includeRules: true,
        includeMetadata: false,
      }
    );
    setPrompts(generated);
    onPromptsGenerated?.(generated);
  };

  // 形式変更時に全プロンプトを変換
  const handleFormatChange = (newFormat: PromptFormat) => {
    if (newFormat === format) return;

    const converted = prompts.map((prompt) => {
      try {
        const newContent = convertPromptFormat(prompt.content, prompt.format, newFormat);
        return { ...prompt, content: newContent, format: newFormat };
      } catch {
        return prompt;
      }
    });

    setPrompts(converted);
    setFormat(newFormat);
  };

  // 個別プロンプト更新
  const handleUpdatePrompt = (index: number, content: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = {
      ...newPrompts[index],
      content,
      metadata: { ...newPrompts[index].metadata, isCustomized: true },
      updatedAt: new Date(),
    };
    setPrompts(newPrompts);
  };

  // 個別プロンプト再生成
  const handleRegeneratePrompt = (index: number) => {
    const section = structure.sections[index];
    if (!section) return;

    const regenerated = generateSectionPrompt(section, structure.globalRules, {
      format,
      includeRules: true,
      includeMetadata: false,
    });

    const newPrompts = [...prompts];
    newPrompts[index] = regenerated;
    setPrompts(newPrompts);
  };

  // 結合コンテンツの更新
  useEffect(() => {
    setCombinedContent(combinePrompts(prompts));
  }, [prompts]);

  // コピー
  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(combinedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // エクスポート
  const handleExport = () => {
    onExport?.(combinedContent, format);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">プロンプトビルダー</h2>
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerateAll}>
            <Wand2 className="w-4 h-4 mr-1" />
            全セクション生成
          </Button>
          <Button variant="outline" onClick={handleCopyAll}>
            {copied ? (
              <Check className="w-4 h-4 mr-1 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            全てコピー
          </Button>
          {onExport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              エクスポート
            </Button>
          )}
        </div>
      </div>

      {/* 形式選択 */}
      <PromptFormatSelector
        onSelect={handleFormatChange}
        showDetails={false}
        className="max-w-xl"
      />

      {/* タブ切り替え */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
        <TabsList>
          <TabsTrigger value="sections" className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            セクション別
          </TabsTrigger>
          <TabsTrigger value="combined" className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            結合表示
          </TabsTrigger>
        </TabsList>

        {/* セクション別表示 */}
        <TabsContent value="sections" className="space-y-3 mt-4">
          {prompts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="mb-4">プロンプトがまだ生成されていません</p>
                <Button onClick={handleGenerateAll}>
                  <Wand2 className="w-4 h-4 mr-1" />
                  プロンプトを生成
                </Button>
              </CardContent>
            </Card>
          ) : (
            prompts.map((prompt, index) => (
              <SectionPromptCard
                key={prompt.id}
                prompt={prompt}
                sectionIndex={index}
                onUpdate={(content) => handleUpdatePrompt(index, content)}
                onRegenerate={() => handleRegeneratePrompt(index)}
              />
            ))
          )}
        </TabsContent>

        {/* 結合表示 */}
        <TabsContent value="combined" className="mt-4">
          <PromptEditor
            content={combinedContent}
            format={format}
            onChange={setCombinedContent}
            readOnly={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
