"use client";

/**
 * プロンプト編集ページ
 *
 * 構成からプロンプトを生成・編集
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkflowStore } from "@/stores/workflow-store";
import { WorkflowNav } from "@/components/workflow";
import { PromptBuilder } from "@/components/prompts";
import type { LPStructure } from "@/lib/structure/types";
import type { GeneratedPrompt } from "@/lib/prompts/types";
import type { PromptFormat } from "@/lib/workflow/types";
import { DEFAULT_GLOBAL_RULES } from "@/lib/structure/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";

export default function PromptsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { getStepData, setStepData, markStepCompleted } = useWorkflowStore();

  // 構成データを取得
  const [structure, setStructure] = useState<LPStructure | null>(null);
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);

  useEffect(() => {
    const savedStructure = getStepData<LPStructure>("structure");
    if (savedStructure) {
      setStructure(savedStructure);
    }
  }, [getStepData]);

  // プロンプト生成完了ハンドラ
  const handlePromptsGenerated = (generated: GeneratedPrompt[]) => {
    setPrompts(generated);
    setStepData("prompts", generated);
  };

  // エクスポート
  const handleExport = (content: string, format: PromptFormat) => {
    const ext = format === "json" ? "json" : format === "yaml" ? "yaml" : "txt";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompts-${projectId}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // デザイン生成へ進む
  const handleGoToDesign = () => {
    markStepCompleted("prompts");
    router.push(`/projects/${projectId}/workspace`);
  };

  // 構成がない場合
  if (!structure) {
    return (
      <div className="min-h-screen bg-background">
        <WorkflowNav projectId={projectId} />
        <div className="container max-w-4xl mx-auto py-12 px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-lg font-bold mb-2">構成データがありません</h2>
              <p className="text-muted-foreground mb-4">
                プロンプトを生成するには、まず構成を作成してください
              </p>
              <Button onClick={() => router.push(`/projects/${projectId}/structure`)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                構成作成へ戻る
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 構成がある場合は空の構成でプロンプトビルダーを表示可能にする
  const effectiveStructure: LPStructure = structure || {
    id: `structure-${projectId}`,
    projectId,
    name: "LP構成",
    sections: [],
    globalRules: DEFAULT_GLOBAL_RULES,
    metadata: {
      version: 1,
      sourceType: "scratch",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ワークフローナビ */}
      <WorkflowNav projectId={projectId} />

      {/* メインコンテンツ */}
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <PromptBuilder
          structure={effectiveStructure}
          initialPrompts={prompts}
          onPromptsGenerated={handlePromptsGenerated}
          onExport={handleExport}
        />

        {/* ナビゲーションボタン */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/structure`)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            構成編集へ戻る
          </Button>
          <Button onClick={handleGoToDesign} disabled={prompts.length === 0}>
            デザイン生成へ
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
