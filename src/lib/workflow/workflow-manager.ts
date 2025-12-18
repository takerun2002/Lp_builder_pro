/**
 * ワークフロー管理
 *
 * ワークフローステップの管理、スキップ機能、進捗管理
 */

import type {
  WorkflowStepId,
  UserMode,
  WorkflowState,
} from "./types";

// ============================================================
// ローカル型定義（workflow-manager専用）
// ============================================================

interface WorkflowStepLocal {
  id: WorkflowStepId;
  name: string;
  description: string;
  order: number;
  isOptional: boolean;
  estimatedTime: string;
}

// ============================================================
// ステップ定義
// ============================================================

export const WORKFLOW_STEPS: WorkflowStepLocal[] = [
  {
    id: "research",
    name: "リサーチ",
    description: "競合分析、ターゲット調査",
    order: 0,
    isOptional: true,
    estimatedTime: "30分〜1時間",
  },
  {
    id: "manuscript",
    name: "原稿作成",
    description: "コピーライティング、テキスト作成",
    order: 1,
    isOptional: true,
    estimatedTime: "1〜2時間",
  },
  {
    id: "structure",
    name: "構成設計",
    description: "LPのセクション構成を設計",
    order: 2,
    isOptional: false,
    estimatedTime: "15〜30分",
  },
  {
    id: "wireframe",
    name: "ワイヤーフレーム",
    description: "レイアウト・配置を設計",
    order: 3,
    isOptional: true,
    estimatedTime: "30分〜1時間",
  },
  {
    id: "prompts",
    name: "プロンプト",
    description: "画像生成用プロンプト作成",
    order: 4,
    isOptional: false,
    estimatedTime: "15〜30分",
  },
  {
    id: "design",
    name: "デザイン生成",
    description: "AIによるデザイン生成",
    order: 5,
    isOptional: false,
    estimatedTime: "5〜15分",
  },
];

// ============================================================
// ステップ順序管理
// ============================================================

const STEP_ORDER: WorkflowStepId[] = [
  "research",
  "manuscript",
  "structure",
  "wireframe",
  "prompts",
  "design",
];

/**
 * 次のステップを取得
 */
export function getNextStep(
  currentStep: WorkflowStepId,
  mode: UserMode = "guided"
): WorkflowStepId | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return null;
  }

  // ガイドモードでは全ステップを順番に
  if (mode === "guided") {
    return STEP_ORDER[currentIndex + 1];
  }

  // エキスパートモードではオプショナルをスキップ可能
  for (let i = currentIndex + 1; i < STEP_ORDER.length; i++) {
    const step = WORKFLOW_STEPS.find((s) => s.id === STEP_ORDER[i]);
    if (step && !step.isOptional) {
      return STEP_ORDER[i];
    }
  }

  return STEP_ORDER[currentIndex + 1];
}

/**
 * 前のステップを取得
 */
export function getPreviousStep(
  currentStep: WorkflowStepId
): WorkflowStepId | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return STEP_ORDER[currentIndex - 1];
}

/**
 * ステップがスキップ可能かチェック
 */
export function canSkipStep(stepId: WorkflowStepId): boolean {
  const step = WORKFLOW_STEPS.find((s) => s.id === stepId);
  return step?.isOptional ?? false;
}

/**
 * ステップ間の依存関係をチェック
 */
export function checkStepDependencies(
  targetStep: WorkflowStepId,
  completedSteps: Set<WorkflowStepId>
): { canProceed: boolean; missingSteps: WorkflowStepId[] } {
  const missingSteps: WorkflowStepId[] = [];

  // 必須の前提ステップをチェック
  const dependencies: Record<WorkflowStepId, WorkflowStepId[]> = {
    research: [],
    manuscript: [],
    structure: [],
    wireframe: ["structure"],
    prompts: ["structure"],
    design: ["prompts"],
  };

  const requiredSteps = dependencies[targetStep] || [];
  for (const requiredStep of requiredSteps) {
    if (!completedSteps.has(requiredStep)) {
      const step = WORKFLOW_STEPS.find((s) => s.id === requiredStep);
      if (step && !step.isOptional) {
        missingSteps.push(requiredStep);
      }
    }
  }

  return {
    canProceed: missingSteps.length === 0,
    missingSteps,
  };
}

// ============================================================
// 進捗管理
// ============================================================

/**
 * 全体の進捗率を計算
 */
export function calculateProgress(completedSteps: Set<WorkflowStepId>): number {
  const requiredSteps = WORKFLOW_STEPS.filter((s) => !s.isOptional);
  const completedRequired = requiredSteps.filter((s) =>
    completedSteps.has(s.id)
  ).length;
  return Math.round((completedRequired / requiredSteps.length) * 100);
}

/**
 * 現在のステップを推測
 */
export function getCurrentStep(
  completedSteps: Set<WorkflowStepId>
): WorkflowStepId {
  // 完了していない最初のステップを返す
  for (const stepId of STEP_ORDER) {
    if (!completedSteps.has(stepId)) {
      return stepId;
    }
  }
  return "design"; // 全て完了している場合
}

/**
 * ステップのステータスを取得
 */
export function getStepStatus(
  stepId: WorkflowStepId,
  completedSteps: Set<WorkflowStepId>,
  currentStep: WorkflowStepId
): "completed" | "current" | "upcoming" | "skipped" {
  if (completedSteps.has(stepId)) {
    return "completed";
  }
  if (stepId === currentStep) {
    return "current";
  }
  return "upcoming";
}

/**
 * ワークフロー状態のサマリーを生成
 */
export function getWorkflowSummary(state: WorkflowState): {
  progress: number;
  completedCount: number;
  totalRequired: number;
  currentStepName: string;
  nextStepName: string | null;
} {
  const completedSet = new Set(state.completedSteps);
  const requiredSteps = WORKFLOW_STEPS.filter((s) => !s.isOptional);
  const currentStepDef = WORKFLOW_STEPS.find((s) => s.id === state.currentStep);
  const nextStep = getNextStep(state.currentStep, state.mode);
  const nextStepDef = nextStep
    ? WORKFLOW_STEPS.find((s) => s.id === nextStep)
    : null;

  return {
    progress: calculateProgress(completedSet),
    completedCount: state.completedSteps.length,
    totalRequired: requiredSteps.length,
    currentStepName: currentStepDef?.name || "",
    nextStepName: nextStepDef?.name || null,
  };
}

// ============================================================
// スキップ機能
// ============================================================

/**
 * ステップをスキップ
 */
export function skipStep(
  state: WorkflowState,
  stepId: WorkflowStepId
): WorkflowState | null {
  // スキップ可能かチェック
  if (!canSkipStep(stepId)) {
    return null;
  }

  const nextStep = getNextStep(stepId, state.mode);
  if (!nextStep) {
    return null;
  }

  return {
    ...state,
    currentStep: nextStep,
    skippedSteps: [...(state.skippedSteps || []), stepId],
  };
}

/**
 * スキップしたステップに戻る
 */
export function goBackToSkippedStep(
  state: WorkflowState,
  stepId: WorkflowStepId
): WorkflowState | null {
  if (!state.skippedSteps?.includes(stepId)) {
    return null;
  }

  return {
    ...state,
    currentStep: stepId,
    skippedSteps: state.skippedSteps.filter((s) => s !== stepId),
  };
}

// ============================================================
// ショートカット
// ============================================================

/**
 * クイックスタート：構成から開始
 */
export function quickStartFromStructure(): Partial<WorkflowState> {
  return {
    currentStep: "structure",
    skippedSteps: ["research", "manuscript"],
  };
}

/**
 * クイックスタート：プロンプトから開始
 */
export function quickStartFromPrompts(): Partial<WorkflowState> {
  return {
    currentStep: "prompts",
    skippedSteps: ["research", "manuscript", "structure", "wireframe"],
  };
}

/**
 * フルワークフロー：リサーチから開始
 */
export function fullWorkflowFromResearch(): Partial<WorkflowState> {
  return {
    currentStep: "research",
    skippedSteps: [],
  };
}

// ============================================================
// バリデーション
// ============================================================

/**
 * ステップに進む前の検証
 */
export function validateStepTransition(
  fromStep: WorkflowStepId,
  toStep: WorkflowStepId,
  stepData: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 前方への移動の場合、現在のステップのデータがあるかチェック
  const fromIndex = STEP_ORDER.indexOf(fromStep);
  const toIndex = STEP_ORDER.indexOf(toStep);

  if (toIndex > fromIndex) {
    // 構成からプロンプトへ進む場合
    if (fromStep === "structure" && !stepData.structure) {
      const step = WORKFLOW_STEPS.find((s) => s.id === "structure");
      if (step && !step.isOptional) {
        errors.push("構成データがありません。先に構成を作成してください。");
      }
    }

    // プロンプトからデザインへ進む場合
    if (fromStep === "prompts" && !stepData.prompts) {
      errors.push("プロンプトデータがありません。先にプロンプトを作成してください。");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ワークフロー完了チェック
 */
export function isWorkflowComplete(state: WorkflowState): boolean {
  const requiredSteps = WORKFLOW_STEPS.filter((s) => !s.isOptional);
  const completedSet = new Set(state.completedSteps);

  return requiredSteps.every((step) => completedSet.has(step.id));
}

// ============================================================
// ステップ情報取得
// ============================================================

/**
 * ステップの詳細情報を取得
 */
export function getStepInfo(stepId: WorkflowStepId): WorkflowStepLocal | undefined {
  return WORKFLOW_STEPS.find((s) => s.id === stepId);
}

/**
 * 全ステップを取得
 */
export function getAllSteps(): WorkflowStepLocal[] {
  return [...WORKFLOW_STEPS];
}

/**
 * 必須ステップのみ取得
 */
export function getRequiredSteps(): WorkflowStepLocal[] {
  return WORKFLOW_STEPS.filter((s) => !s.isOptional);
}

/**
 * オプショナルステップのみ取得
 */
export function getOptionalSteps(): WorkflowStepLocal[] {
  return WORKFLOW_STEPS.filter((s) => s.isOptional);
}
