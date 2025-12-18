"use client";

/**
 * ワイヤーフレームページ
 *
 * ワイヤーフレームの作成・編集
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkflowStore } from "@/stores/workflow-store";
import { WorkflowNav } from "@/components/workflow";
import { WireframeCanvas } from "@/components/wireframe";
import type { Wireframe } from "@/lib/wireframe/types";
import { DEFAULT_WIREFRAME_SETTINGS, DEFAULT_CANVAS_WIDTH } from "@/lib/wireframe/types";
import { wireframeToPrompts, sectionPlanToWireframeSection } from "@/lib/wireframe/wireframe-to-prompt";
import type { LPStructure } from "@/lib/structure/types";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Wand2 } from "lucide-react";

export default function WireframePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { getStepData, setStepData, markStepCompleted } = useWorkflowStore();

  // ワイヤーフレームデータ
  const [wireframe, setWireframe] = useState<Wireframe>(() => {
    // 構成データがあればそこからワイヤーフレームを生成
    const structure = getStepData<LPStructure>("structure");

    if (structure && structure.sections.length > 0) {
      return {
        id: `wireframe-${projectId}`,
        projectId,
        name: "ワイヤーフレーム",
        canvasWidth: DEFAULT_CANVAS_WIDTH,
        canvasHeight: 0,
        sections: structure.sections.map((section) =>
          sectionPlanToWireframeSection(section, DEFAULT_CANVAS_WIDTH)
        ),
        settings: DEFAULT_WIREFRAME_SETTINGS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      id: `wireframe-${projectId}`,
      projectId,
      name: "ワイヤーフレーム",
      canvasWidth: DEFAULT_CANVAS_WIDTH,
      canvasHeight: 0,
      sections: [],
      settings: DEFAULT_WIREFRAME_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  // ワイヤーフレーム更新
  const handleWireframeChange = (updated: Wireframe) => {
    setWireframe(updated);
    setStepData("wireframe", updated);
  };

  // プロンプト生成へ進む
  const handleGeneratePrompts = () => {
    const structure = getStepData<LPStructure>("structure");
    const prompts = wireframeToPrompts(wireframe, structure?.globalRules);
    setStepData("prompts", prompts);
    markStepCompleted("wireframe");
    router.push(`/projects/${projectId}/prompts`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ワークフローナビ */}
      <WorkflowNav projectId={projectId} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h1 className="text-lg font-bold">ワイヤーフレーム</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/structure`)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            構成編集
          </Button>
          <Button onClick={handleGeneratePrompts}>
            <Wand2 className="w-4 h-4 mr-1" />
            プロンプト生成
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* ワイヤーフレームキャンバス */}
      <div className="flex-1 overflow-hidden">
        <WireframeCanvas
          wireframe={wireframe}
          onChange={handleWireframeChange}
        />
      </div>
    </div>
  );
}
