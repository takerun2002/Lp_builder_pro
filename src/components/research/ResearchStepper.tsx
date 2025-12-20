"use client";

/**
 * ResearchStepper - リサーチステップ進捗表示コンポーネント
 *
 * 機能:
 * - 全体進捗バー（%表示）
 * - 各ステップのステータス表示（pending/running/completed/error/skipped）
 * - 結果件数・所要時間の表示
 */

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  SkipForward,
} from "lucide-react";

export interface ResearchStepInfo {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  estimatedTime?: string;
  actualTime?: number; // ms
  resultCount?: number;
}

interface ResearchStepperProps {
  steps: ResearchStepInfo[];
  currentStepIndex: number;
}

export function ResearchStepper({ steps, currentStepIndex }: ResearchStepperProps) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progressPercent = steps.length > 0
    ? Math.round((completedCount / steps.length) * 100)
    : 0;

  // 残り時間の推定（簡易版）
  const runningStep = steps.find((s) => s.status === "running");
  const remainingSteps = steps.filter(
    (s) => s.status === "pending" || s.status === "running"
  );

  return (
    <div className="space-y-4">
      {/* 全体プログレスバー */}
      <div className="flex items-center gap-4">
        <Progress value={progressPercent} className="flex-1 h-2" />
        <span className="text-sm font-medium whitespace-nowrap">
          {progressPercent}%
        </span>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {completedCount}/{steps.length} 完了
        </span>
      </div>

      {/* ステップリスト */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              index === currentStepIndex && step.status === "running" && "border-primary bg-primary/5",
              step.status === "completed" && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
              step.status === "error" && "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
              step.status === "skipped" && "border-muted bg-muted/30 opacity-60"
            )}
          >
            {/* ステータスアイコン */}
            <div className="shrink-0">
              {step.status === "completed" && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {step.status === "running" && (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
              {step.status === "error" && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              {step.status === "pending" && (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
              {step.status === "skipped" && (
                <SkipForward className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {/* ステップ情報 */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{step.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {step.description}
              </div>
            </div>

            {/* 結果カウント・時間 */}
            <div className="shrink-0 text-right space-y-1">
              {step.resultCount !== undefined && step.status === "completed" && (
                <span className="inline-block text-xs bg-muted px-2 py-0.5 rounded-full">
                  {step.resultCount}件
                </span>
              )}
              {step.status === "running" && step.estimatedTime && (
                <div className="text-xs text-muted-foreground">
                  〜{step.estimatedTime}
                </div>
              )}
              {step.actualTime !== undefined && step.status === "completed" && (
                <div className="text-xs text-muted-foreground">
                  {Math.round(step.actualTime / 1000)}秒
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 残りステップ情報 */}
      {runningStep && remainingSteps.length > 1 && (
        <div className="text-xs text-muted-foreground text-center">
          残り {remainingSteps.length - 1} ステップ
        </div>
      )}
    </div>
  );
}

export default ResearchStepper;
