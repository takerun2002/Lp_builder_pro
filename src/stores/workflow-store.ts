/**
 * ワークフロー状態管理 Zustand Store
 *
 * ガイドモード/エキスパートモードの状態管理
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UserMode,
  WorkflowStepId,
  PromptFormat,
  WorkflowState,
} from "@/lib/workflow/types";
import {
  DEFAULT_WORKFLOW_STATE,
  getNextStep,
  getPreviousStep,
  canSkipStep,
  getStepIndex,
} from "@/lib/workflow/types";

interface WorkflowActions {
  // モード切り替え
  setMode: (mode: UserMode) => void;
  toggleMode: () => void;

  // ステップ移動
  goToStep: (stepId: WorkflowStepId) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  skipCurrentStep: () => void;

  // ステップ完了
  markStepCompleted: (stepId: WorkflowStepId) => void;
  markStepIncomplete: (stepId: WorkflowStepId) => void;

  // ステップデータ管理
  setStepData: <T>(stepId: WorkflowStepId, data: T) => void;
  getStepData: <T>(stepId: WorkflowStepId) => T | undefined;
  clearStepData: (stepId: WorkflowStepId) => void;

  // プロンプト形式
  setPromptFormat: (format: PromptFormat) => void;

  // カスタマイズモード
  setCustomizationMode: (mode: "template" | "custom") => void;

  // リセット
  resetWorkflow: () => void;
  resetToStep: (stepId: WorkflowStepId) => void;

  // ユーティリティ
  isStepCompleted: (stepId: WorkflowStepId) => boolean;
  isStepSkipped: (stepId: WorkflowStepId) => boolean;
  isStepAccessible: (stepId: WorkflowStepId) => boolean;
  getProgress: () => { current: number; total: number; percent: number };
}

type WorkflowStore = WorkflowState & WorkflowActions;

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_WORKFLOW_STATE,

      // Mode management
      setMode: (mode) => set({ mode }),

      toggleMode: () =>
        set((state) => ({
          mode: state.mode === "guided" ? "expert" : "guided",
        })),

      // Step navigation
      goToStep: (stepId) => {
        const state = get();
        // エキスパートモードなら制限なし
        if (state.mode === "expert") {
          set({ currentStep: stepId });
          return;
        }
        // ガイドモードでもアクセス可能なステップなら移動
        if (get().isStepAccessible(stepId)) {
          set({ currentStep: stepId });
        }
      },

      goToNextStep: () => {
        const nextStep = getNextStep(get().currentStep);
        if (nextStep) {
          // 現在のステップを完了としてマーク
          get().markStepCompleted(get().currentStep);
          set({ currentStep: nextStep });
        }
      },

      goToPreviousStep: () => {
        const prevStep = getPreviousStep(get().currentStep);
        if (prevStep) {
          set({ currentStep: prevStep });
        }
      },

      skipCurrentStep: () => {
        const { currentStep } = get();
        if (canSkipStep(currentStep)) {
          set((state) => ({
            skippedSteps: [...state.skippedSteps, currentStep],
          }));
          get().goToNextStep();
        }
      },

      // Step completion
      markStepCompleted: (stepId) =>
        set((state) => {
          if (state.completedSteps.includes(stepId)) return state;
          return {
            completedSteps: [...state.completedSteps, stepId],
            skippedSteps: state.skippedSteps.filter((s) => s !== stepId),
          };
        }),

      markStepIncomplete: (stepId) =>
        set((state) => ({
          completedSteps: state.completedSteps.filter((s) => s !== stepId),
        })),

      // Step data management
      setStepData: <T>(stepId: WorkflowStepId, data: T) =>
        set((state) => ({
          stepData: { ...state.stepData, [stepId]: data },
        })),

      getStepData: <T>(stepId: WorkflowStepId): T | undefined => {
        return get().stepData[stepId] as T | undefined;
      },

      clearStepData: (stepId) =>
        set((state) => {
          const newData = { ...state.stepData };
          delete newData[stepId];
          return { stepData: newData };
        }),

      // Prompt format
      setPromptFormat: (format) => set({ promptFormat: format }),

      // Customization mode
      setCustomizationMode: (mode) => set({ customizationMode: mode }),

      // Reset
      resetWorkflow: () => set(DEFAULT_WORKFLOW_STATE),

      resetToStep: (stepId) => {
        const stepIndex = getStepIndex(stepId);
        set((state) => ({
          currentStep: stepId,
          completedSteps: state.completedSteps.filter(
            (s) => getStepIndex(s) < stepIndex
          ),
          skippedSteps: state.skippedSteps.filter(
            (s) => getStepIndex(s) < stepIndex
          ),
        }));
      },

      // Utilities
      isStepCompleted: (stepId) => get().completedSteps.includes(stepId),

      isStepSkipped: (stepId) => get().skippedSteps.includes(stepId),

      isStepAccessible: (stepId) => {
        const state = get();
        // エキスパートモードなら全てアクセス可能
        if (state.mode === "expert") return true;

        const stepIndex = getStepIndex(stepId);
        const currentIndex = getStepIndex(state.currentStep);

        // 現在のステップより前、または完了/スキップ済みならアクセス可能
        return (
          stepIndex <= currentIndex ||
          state.completedSteps.includes(stepId) ||
          state.skippedSteps.includes(stepId)
        );
      },

      getProgress: () => {
        const state = get();
        const total = 6; // Total steps
        const current =
          state.completedSteps.length + state.skippedSteps.length;
        return {
          current,
          total,
          percent: Math.round((current / total) * 100),
        };
      },
    }),
    {
      name: "lp-builder-workflow",
      partialize: (state) => ({
        mode: state.mode,
        promptFormat: state.promptFormat,
        customizationMode: state.customizationMode,
      }),
    }
  )
);

// プロジェクト別のワークフロー状態を管理するためのヘルパー
export function getProjectWorkflowKey(projectId: string): string {
  return `workflow-${projectId}`;
}
