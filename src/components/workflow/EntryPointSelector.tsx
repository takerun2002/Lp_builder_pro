"use client";

/**
 * EntryPointSelector - エントリーポイント選択
 *
 * ワークフローの開始地点を選択するUI
 * 「何から始めますか？」
 */

import { useWorkflowStore } from "@/stores/workflow-store";
import { ENTRY_POINTS } from "@/lib/workflow/types";
import type { WorkflowStepId } from "@/lib/workflow/types";
import { Card, CardContent } from "@/components/ui/card";

interface EntryPointSelectorProps {
  onSelect?: (startStep: WorkflowStepId) => void;
  className?: string;
}

export function EntryPointSelector({
  onSelect,
  className = "",
}: EntryPointSelectorProps) {
  const { goToStep, markStepCompleted, mode } = useWorkflowStore();

  const handleSelect = (startStep: WorkflowStepId) => {
    // 選択したステップの前のステップをすべてスキップ扱いにする
    const stepOrder: WorkflowStepId[] = [
      "research",
      "manuscript",
      "structure",
      "wireframe",
      "prompts",
      "design",
    ];
    const startIndex = stepOrder.indexOf(startStep);

    // エキスパートモードの場合、前のステップを完了扱いに
    if (mode === "expert" && startIndex > 0) {
      for (let i = 0; i < startIndex; i++) {
        markStepCompleted(stepOrder[i]);
      }
    }

    // 選択したステップへ移動
    goToStep(startStep);

    // コールバック呼び出し
    onSelect?.(startStep);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">何から始めますか？</h2>
        <p className="text-sm text-muted-foreground">
          あなたの状況に合わせてスタート地点を選べます
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ENTRY_POINTS.map((entry) => (
          <Card
            key={entry.id}
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
            onClick={() => handleSelect(entry.startStep)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                {entry.icon}
              </div>
              <h3 className="font-medium text-sm mb-1">{entry.name}</h3>
              <p className="text-xs text-muted-foreground">
                {entry.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
