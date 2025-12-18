"use client";

/**
 * ResearchWizard - リサーチウィザード
 *
 * リサーチ工程をステップバイステップでガイド
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Play,
  SkipForward,
  AlertCircle,
} from "lucide-react";

// ============================================================
// 型定義
// ============================================================

export type ResearchStep =
  | "init"
  | "competitor_search"
  | "competitor_analysis"
  | "pain_classification"
  | "keyword_ranking"
  | "concept_generation"
  | "complete";

export interface StepConfig {
  id: ResearchStep;
  title: string;
  description: string;
  estimatedTime: string;
  isOptional?: boolean;
}

export interface StepStatus {
  step: ResearchStep;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  progress?: number;
  message?: string;
  error?: string;
  result?: unknown;
}

interface ResearchWizardProps {
  currentStep: ResearchStep;
  stepStatuses: StepStatus[];
  onRunStep: (step: ResearchStep) => Promise<void>;
  onSkipStep?: (step: ResearchStep) => void;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  isRunning: boolean;
  children?: React.ReactNode;
}

// ============================================================
// ステップ設定
// ============================================================

export const RESEARCH_STEPS: StepConfig[] = [
  {
    id: "init",
    title: "リサーチ設定",
    description: "ジャンル・ターゲット・キーワードを設定",
    estimatedTime: "1-2分",
  },
  {
    id: "competitor_search",
    title: "競合LP発見",
    description: "Google検索で競合LPを自動発見",
    estimatedTime: "2-3分",
    isOptional: true,
  },
  {
    id: "competitor_analysis",
    title: "競合LP分析",
    description: "競合LPからコンセプト・キーワードを抽出",
    estimatedTime: "3-5分",
  },
  {
    id: "pain_classification",
    title: "ペインポイント分類",
    description: "悩みを深度×緊急性で4象限に分類",
    estimatedTime: "1-2分",
  },
  {
    id: "keyword_ranking",
    title: "キーワードランキング",
    description: "収集キーワードをスコアリング・ランキング",
    estimatedTime: "1-2分",
  },
  {
    id: "concept_generation",
    title: "コンセプト生成",
    description: "たけるん式メソッドでコンセプト候補を生成",
    estimatedTime: "2-3分",
  },
  {
    id: "complete",
    title: "完了",
    description: "リサーチ結果のサマリーを確認",
    estimatedTime: "-",
  },
];

// ============================================================
// メインコンポーネント
// ============================================================

export function ResearchWizard({
  currentStep,
  stepStatuses,
  onRunStep,
  onSkipStep,
  onPrevStep,
  onNextStep,
  isRunning,
  children,
}: ResearchWizardProps) {
  const currentStepIndex = RESEARCH_STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / RESEARCH_STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* プログレスバー */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            ステップ {currentStepIndex + 1} / {RESEARCH_STEPS.length}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}% 完了
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* ステップナビゲーション */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {RESEARCH_STEPS.map((step, index) => {
          const status = getStepStatus(stepStatuses, step.id);
          const isCurrent = currentStep === step.id;
          const isPast = currentStepIndex > index;

          return (
            <StepIndicator
              key={step.id}
              step={step}
              status={status}
              isCurrent={isCurrent}
              isPast={isPast}
              isLast={index === RESEARCH_STEPS.length - 1}
            />
          );
        })}
      </div>

      {/* 現在のステップ詳細 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {RESEARCH_STEPS[currentStepIndex]?.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {RESEARCH_STEPS[currentStepIndex]?.description}
              </p>
            </div>
            <StepStatusBadge
              status={getStepStatus(stepStatuses, currentStep)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* ステップコンテンツ */}
          {children}

          {/* アクションボタン */}
          <StepActions
            currentStep={currentStep}
            stepStatus={getStepStatus(stepStatuses, currentStep)}
            isOptional={RESEARCH_STEPS[currentStepIndex]?.isOptional}
            isRunning={isRunning}
            onRun={() => onRunStep(currentStep)}
            onSkip={onSkipStep ? () => onSkipStep(currentStep) : undefined}
            onPrev={onPrevStep}
            onNext={onNextStep}
            canGoPrev={currentStepIndex > 0}
            canGoNext={currentStepIndex < RESEARCH_STEPS.length - 1}
          />
        </CardContent>
      </Card>

      {/* ステップ一覧（サイドバー用） */}
      <StepList
        steps={RESEARCH_STEPS}
        currentStep={currentStep}
        stepStatuses={stepStatuses}
      />
    </div>
  );
}

// ============================================================
// サブコンポーネント
// ============================================================

function StepIndicator({
  step,
  status,
  isCurrent,
  isPast,
  isLast,
}: {
  step: StepConfig;
  status: StepStatus["status"];
  isCurrent: boolean;
  isPast: boolean;
  isLast: boolean;
}) {
  const getIcon = () => {
    if (status === "completed") {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    }
    if (status === "running") {
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
    if (status === "error") {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    if (status === "skipped") {
      return <SkipForward className="w-5 h-5 text-gray-400" />;
    }
    return (
      <Circle
        className={`w-5 h-5 ${
          isCurrent ? "text-blue-600" : "text-gray-300"
        }`}
      />
    );
  };

  return (
    <>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isCurrent
            ? "bg-blue-50 border border-blue-200"
            : isPast
            ? "bg-gray-50"
            : "bg-white"
        }`}
      >
        {getIcon()}
        <span
          className={`text-sm whitespace-nowrap ${
            isCurrent ? "font-medium text-blue-700" : "text-gray-600"
          }`}
        >
          {step.title}
        </span>
      </div>
      {!isLast && (
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      )}
    </>
  );
}

function StepStatusBadge({ status }: { status: StepStatus["status"] }) {
  const config: Record<
    StepStatus["status"],
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    pending: { label: "未実行", variant: "outline" },
    running: { label: "実行中", variant: "default" },
    completed: { label: "完了", variant: "secondary" },
    error: { label: "エラー", variant: "destructive" },
    skipped: { label: "スキップ", variant: "outline" },
  };

  const { label, variant } = config[status];

  return (
    <Badge variant={variant}>
      {status === "running" && (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      )}
      {label}
    </Badge>
  );
}

function StepActions({
  currentStep,
  stepStatus,
  isOptional,
  isRunning,
  onRun,
  onSkip,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: {
  currentStep: ResearchStep;
  stepStatus: StepStatus["status"];
  isOptional?: boolean;
  isRunning: boolean;
  onRun: () => void;
  onSkip?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}) {
  const isComplete = stepStatus === "completed" || stepStatus === "skipped";

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t">
      <div>
        {canGoPrev && onPrev && (
          <Button variant="outline" onClick={onPrev} disabled={isRunning}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            戻る
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {/* スキップボタン（オプショナルステップのみ） */}
        {isOptional && !isComplete && onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={isRunning}
          >
            <SkipForward className="w-4 h-4 mr-1" />
            スキップ
          </Button>
        )}

        {/* 実行ボタン */}
        {currentStep !== "init" && currentStep !== "complete" && !isComplete && (
          <Button onClick={onRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                実行中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                実行
              </>
            )}
          </Button>
        )}

        {/* 次へボタン */}
        {isComplete && canGoNext && onNext && (
          <Button onClick={onNext}>
            次へ
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

function StepList({
  steps,
  currentStep,
  stepStatuses,
}: {
  steps: StepConfig[];
  currentStep: ResearchStep;
  stepStatuses: StepStatus[];
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">全ステップ</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-2">
          {steps.map((step, index) => {
            const status = getStepStatus(stepStatuses, step.id);
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-2 rounded ${
                  isCurrent ? "bg-blue-50" : ""
                }`}
              >
                <StepNumber number={index + 1} status={status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${
                        isCurrent ? "font-medium" : ""
                      }`}
                    >
                      {step.title}
                    </span>
                    {step.isOptional && (
                      <Badge variant="outline" className="text-[10px]">
                        任意
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {step.estimatedTime}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StepNumber({
  number,
  status,
}: {
  number: number;
  status: StepStatus["status"];
}) {
  if (status === "completed") {
    return (
      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle className="w-4 h-4 text-red-600" />
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
        <SkipForward className="w-3 h-3 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
      {number}
    </div>
  );
}

// ============================================================
// ヘルパー関数
// ============================================================

function getStepStatus(
  statuses: StepStatus[],
  stepId: ResearchStep
): StepStatus["status"] {
  const found = statuses.find((s) => s.step === stepId);
  return found?.status || "pending";
}

// ============================================================
// フック
// ============================================================

export function useResearchWizard() {
  const [currentStep, setCurrentStep] = useState<ResearchStep>("init");
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    RESEARCH_STEPS.map((s) => ({ step: s.id, status: "pending" }))
  );
  const [isRunning, setIsRunning] = useState(false);

  const updateStepStatus = (
    step: ResearchStep,
    update: Partial<StepStatus>
  ) => {
    setStepStatuses((prev) =>
      prev.map((s) => (s.step === step ? { ...s, ...update } : s))
    );
  };

  const runStep = async (
    step: ResearchStep,
    executor: () => Promise<unknown>
  ) => {
    setIsRunning(true);
    updateStepStatus(step, { status: "running", progress: 0 });

    try {
      const result = await executor();
      updateStepStatus(step, { status: "completed", result, progress: 100 });
      return result;
    } catch (error) {
      updateStepStatus(step, {
        status: "error",
        error: error instanceof Error ? error.message : "エラーが発生しました",
      });
      throw error;
    } finally {
      setIsRunning(false);
    }
  };

  const skipStep = (step: ResearchStep) => {
    updateStepStatus(step, { status: "skipped" });
  };

  const goToStep = (step: ResearchStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const currentIndex = RESEARCH_STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex < RESEARCH_STEPS.length - 1) {
      setCurrentStep(RESEARCH_STEPS[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = RESEARCH_STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(RESEARCH_STEPS[currentIndex - 1].id);
    }
  };

  const reset = () => {
    setCurrentStep("init");
    setStepStatuses(
      RESEARCH_STEPS.map((s) => ({ step: s.id, status: "pending" }))
    );
    setIsRunning(false);
  };

  return {
    currentStep,
    stepStatuses,
    isRunning,
    runStep,
    skipStep,
    goToStep,
    nextStep,
    prevStep,
    reset,
    updateStepStatus,
  };
}

// ============================================================
// エクスポート
// ============================================================

export { getStepStatus };
