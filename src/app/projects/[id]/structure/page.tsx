"use client";

/**
 * 構成作成ページ
 *
 * LPのセクション構成を編集
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkflowStore } from "@/stores/workflow-store";
import { WorkflowNav } from "@/components/workflow";
import { StructureEditor } from "@/components/structure";
import type { LPStructure } from "@/lib/structure/types";
import { DEFAULT_GLOBAL_RULES } from "@/lib/structure/types";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function StructurePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { setStepData, markStepCompleted } = useWorkflowStore();

  // 初期構成データ
  const [structure, setStructure] = useState<LPStructure>({
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
  });

  // 保存ハンドラ
  const handleSave = (updatedStructure: LPStructure) => {
    setStructure(updatedStructure);
    setStepData("structure", updatedStructure);
  };

  // プロンプト生成へ進む
  const handleGeneratePrompts = (updatedStructure: LPStructure) => {
    setStructure(updatedStructure);
    setStepData("structure", updatedStructure);
    markStepCompleted("structure");
    router.push(`/projects/${projectId}/prompts`);
  };

  // エクスポート
  const handleExport = (updatedStructure: LPStructure) => {
    const json = JSON.stringify(updatedStructure, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `structure-${projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ワークフローナビ */}
      <WorkflowNav projectId={projectId} />

      {/* メインコンテンツ */}
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <StructureEditor
          structure={structure}
          onSave={handleSave}
          onExport={handleExport}
          onGeneratePrompts={handleGeneratePrompts}
        />

        {/* 次へボタン */}
        <div className="mt-6 flex justify-end">
          <Button onClick={() => handleGeneratePrompts(structure)}>
            プロンプト編集へ
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
