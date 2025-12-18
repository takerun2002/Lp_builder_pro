"use client";

/**
 * WorkflowNav - ワークフローナビゲーション
 *
 * ガイドモード: ステップバイステップナビゲーション
 * エキスパートモード: タブ形式で自由に移動
 */

import { useWorkflowStore } from "@/stores/workflow-store";
import { WORKFLOW_STEPS, canSkipStep } from "@/lib/workflow/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Check,
  Circle,
  CircleDot,
} from "lucide-react";

interface WorkflowNavProps {
  projectId: string;
  className?: string;
}

export function WorkflowNav({ projectId, className = "" }: WorkflowNavProps) {
  void projectId; // 将来使用予定

  const {
    mode,
    currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    skipCurrentStep,
    isStepCompleted,
    isStepSkipped,
    isStepAccessible,
    getProgress,
  } = useWorkflowStore();

  const progress = getProgress();
  const currentStepInfo = WORKFLOW_STEPS.find((s) => s.id === currentStep);
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStep);

  // エキスパートモード: タブ形式
  if (mode === "expert") {
    return (
      <div className={`border-b ${className}`}>
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
          {WORKFLOW_STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => goToStep(step.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : isStepCompleted(step.id)
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{step.icon}</span>
              <span>{step.name}</span>
              {isStepCompleted(step.id) && (
                <Check className="w-3 h-3 text-green-600" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ガイドモード: ステップバイステップ
  return (
    <div className={`border-b ${className}`}>
      {/* 進捗バー */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>
            ステップ {currentIndex + 1}/{WORKFLOW_STEPS.length}
          </span>
          <span>{progress.percent}% 完了</span>
        </div>
        <Progress value={progress.percent} className="h-1.5" />
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {WORKFLOW_STEPS.map((step, index) => (
          <StepIndicator
            key={step.id}
            step={step}
            index={index}
            isCurrent={currentStep === step.id}
            isCompleted={isStepCompleted(step.id)}
            isSkipped={isStepSkipped(step.id)}
            isAccessible={isStepAccessible(step.id)}
            onClick={() => isStepAccessible(step.id) && goToStep(step.id)}
          />
        ))}
      </div>

      {/* 現在のステップ情報 */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>{currentStepInfo?.icon}</span>
              {currentStepInfo?.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentStepInfo?.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* 戻るボタン */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousStep}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>

            {/* スキップボタン */}
            {canSkipStep(currentStep) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skipCurrentStep}
                className="text-muted-foreground"
              >
                スキップ
                <SkipForward className="w-4 h-4 ml-1" />
              </Button>
            )}

            {/* 次へボタン */}
            <Button
              size="sm"
              onClick={goToNextStep}
              disabled={currentIndex === WORKFLOW_STEPS.length - 1}
            >
              次へ
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ステップインジケーター
interface StepIndicatorProps {
  step: (typeof WORKFLOW_STEPS)[0];
  index: number;
  isCurrent: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  isAccessible: boolean;
  onClick: () => void;
}

function StepIndicator({
  step,
  isCurrent,
  isCompleted,
  isSkipped,
  isAccessible,
  onClick,
}: StepIndicatorProps) {
  return (
    <button
      onClick={onClick}
      disabled={!isAccessible}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
        isCurrent
          ? "bg-primary/10 text-primary"
          : isCompleted
            ? "text-green-600"
            : isSkipped
              ? "text-yellow-600"
              : isAccessible
                ? "text-muted-foreground hover:bg-muted"
                : "text-muted-foreground/40 cursor-not-allowed"
      }`}
      title={step.name}
    >
      <div className="relative">
        {isCompleted ? (
          <Check className="w-5 h-5" />
        ) : isCurrent ? (
          <CircleDot className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </div>
      <span className="text-xs font-medium hidden md:block">{step.name}</span>
    </button>
  );
}
