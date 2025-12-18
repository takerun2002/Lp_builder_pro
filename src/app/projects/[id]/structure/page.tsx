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
import { StructureEditor, AIStructureGenerator, TemplateLibrary, FigmaImporter } from "@/components/structure";
import type { LPStructure, SectionPlan, GlobalDesignRules } from "@/lib/structure/types";
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

  // AI生成完了ハンドラ
  const handleAIGenerated = (sections: SectionPlan[], globalRules: GlobalDesignRules) => {
    const updatedStructure: LPStructure = {
      ...structure,
      sections,
      globalRules: { ...structure.globalRules, ...globalRules },
      metadata: {
        ...structure.metadata,
        sourceType: "ai-generated",
      },
      updatedAt: new Date(),
    };
    setStructure(updatedStructure);
    setStepData("structure", updatedStructure);
  };

  // テンプレート選択ハンドラ
  const handleTemplateSelect = (sections: SectionPlan[], globalRules: GlobalDesignRules) => {
    const updatedStructure: LPStructure = {
      ...structure,
      sections,
      globalRules: { ...structure.globalRules, ...globalRules },
      metadata: {
        ...structure.metadata,
        sourceType: "template",
      },
      updatedAt: new Date(),
    };
    setStructure(updatedStructure);
    setStepData("structure", updatedStructure);
  };

  // Figmaインポートハンドラ
  const handleFigmaImport = (sections: SectionPlan[], globalRules: GlobalDesignRules) => {
    const updatedStructure: LPStructure = {
      ...structure,
      sections,
      globalRules: { ...structure.globalRules, ...globalRules },
      metadata: {
        ...structure.metadata,
        sourceType: "imported",
      },
      updatedAt: new Date(),
    };
    setStructure(updatedStructure);
    setStepData("structure", updatedStructure);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ワークフローナビ */}
      <WorkflowNav projectId={projectId} />

      {/* メインコンテンツ */}
      <div className="container max-w-6xl mx-auto py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左: AI生成パネル & テンプレート & インポート */}
          <div className="lg:col-span-1 space-y-4">
            <AIStructureGenerator onGenerated={handleAIGenerated} />
            <TemplateLibrary onSelect={handleTemplateSelect} />
            <FigmaImporter onImport={handleFigmaImport} />
          </div>

          {/* 右: 構成エディタ */}
          <div className="lg:col-span-2">
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
      </div>
    </div>
  );
}
