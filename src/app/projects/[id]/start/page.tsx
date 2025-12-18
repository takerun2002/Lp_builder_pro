"use client";

/**
 * プロジェクト開始ページ
 *
 * エントリーポイント選択とクイックアクション
 */

import { useParams, useRouter } from "next/navigation";
import { useWorkflowStore } from "@/stores/workflow-store";
import {
  WorkflowModeToggle,
  EntryPointSelector,
  QuickActions,
} from "@/components/workflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowStepId } from "@/lib/workflow/types";
import type { QuickAction } from "@/lib/workflow/types";

export default function ProjectStartPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { mode } = useWorkflowStore();

  // エントリーポイント選択時のハンドラ
  const handleEntryPointSelect = (stepId: WorkflowStepId) => {
    const stepRoutes: Record<WorkflowStepId, string> = {
      research: `/projects/${projectId}/workspace?tab=research`,
      manuscript: `/projects/${projectId}/workspace?tab=manuscript`,
      structure: `/projects/${projectId}/structure`,
      wireframe: `/projects/${projectId}/wireframe`,
      prompts: `/projects/${projectId}/prompts`,
      design: `/projects/${projectId}/workspace`,
    };

    router.push(stepRoutes[stepId]);
  };

  // クイックアクション実行時のハンドラ
  const handleQuickAction = (action: QuickAction["action"]) => {
    switch (action) {
      case "paste_manuscript":
        router.push(`/projects/${projectId}/structure?action=paste`);
        break;
      case "import_reference":
        router.push(`/projects/${projectId}/scraper`);
        break;
      case "direct_prompt":
        router.push(`/projects/${projectId}/prompts`);
        break;
      case "from_swipe":
        router.push(`/projects/${projectId}/swipe-lp`);
        break;
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">LP制作を始める</h1>
          <p className="text-muted-foreground mt-1">
            あなたの状況に合わせて開始方法を選択してください
          </p>
        </div>
        <WorkflowModeToggle showDescription />
      </div>

      {/* エントリーポイント選択 */}
      <EntryPointSelector onSelect={handleEntryPointSelect} className="mb-8" />

      {/* クイックアクション */}
      {mode === "expert" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">クイックアクション</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions onAction={handleQuickAction} />
          </CardContent>
        </Card>
      )}

      {/* ヒント */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">ヒント</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>ガイドモード</strong>:
                ステップバイステップで進めたい方に最適
              </li>
              <li>
                <strong>エキスパートモード</strong>:
                自由に各機能にアクセスしたい方に最適
              </li>
              <li>
                クライアントから原稿がある場合は「原稿から」を選択
              </li>
              <li>
                参考にしたいLPがある場合は「参考LP取り込み」が便利
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
