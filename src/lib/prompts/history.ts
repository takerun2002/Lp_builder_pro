/**
 * プロンプト履歴管理
 *
 * プロンプトの変更履歴を管理
 */

import type { GeneratedPrompt } from "./types";
import type { PromptFormat } from "@/lib/workflow/types";

export interface PromptHistoryEntry {
  id: string;
  timestamp: Date;
  prompts: GeneratedPrompt[];
  format: PromptFormat;
  description?: string;
  metadata?: {
    source?: "manual" | "ai-generated" | "template" | "imported";
    version?: number;
  };
}

export interface PromptHistory {
  entries: PromptHistoryEntry[];
  maxEntries: number;
  currentIndex: number;
}

const MAX_HISTORY_ENTRIES = 50;

function generateId(): string {
  return `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 初期化
export function createPromptHistory(): PromptHistory {
  return {
    entries: [],
    maxEntries: MAX_HISTORY_ENTRIES,
    currentIndex: -1,
  };
}

// エントリ追加
export function addHistoryEntry(
  history: PromptHistory,
  prompts: GeneratedPrompt[],
  format: PromptFormat,
  description?: string
): PromptHistory {
  const newEntry: PromptHistoryEntry = {
    id: generateId(),
    timestamp: new Date(),
    prompts: JSON.parse(JSON.stringify(prompts)), // Deep copy
    format,
    description,
    metadata: {
      version: history.entries.length + 1,
    },
  };

  // 現在位置より後ろのエントリを削除（Undo後に新しい変更をした場合）
  const entries = history.entries.slice(0, history.currentIndex + 1);
  entries.push(newEntry);

  // 最大数を超えたら古いものを削除
  while (entries.length > history.maxEntries) {
    entries.shift();
  }

  return {
    ...history,
    entries,
    currentIndex: entries.length - 1,
  };
}

// Undo
export function undoHistory(history: PromptHistory): {
  history: PromptHistory;
  entry: PromptHistoryEntry | null;
} {
  if (history.currentIndex <= 0) {
    return { history, entry: null };
  }

  const newIndex = history.currentIndex - 1;
  return {
    history: { ...history, currentIndex: newIndex },
    entry: history.entries[newIndex],
  };
}

// Redo
export function redoHistory(history: PromptHistory): {
  history: PromptHistory;
  entry: PromptHistoryEntry | null;
} {
  if (history.currentIndex >= history.entries.length - 1) {
    return { history, entry: null };
  }

  const newIndex = history.currentIndex + 1;
  return {
    history: { ...history, currentIndex: newIndex },
    entry: history.entries[newIndex],
  };
}

// 特定バージョンに戻す
export function restoreHistoryEntry(
  history: PromptHistory,
  entryId: string
): {
  history: PromptHistory;
  entry: PromptHistoryEntry | null;
} {
  const index = history.entries.findIndex((e) => e.id === entryId);
  if (index === -1) {
    return { history, entry: null };
  }

  return {
    history: { ...history, currentIndex: index },
    entry: history.entries[index],
  };
}

// 現在のエントリ取得
export function getCurrentEntry(history: PromptHistory): PromptHistoryEntry | null {
  if (history.currentIndex < 0 || history.currentIndex >= history.entries.length) {
    return null;
  }
  return history.entries[history.currentIndex];
}

// Undo可能かチェック
export function canUndo(history: PromptHistory): boolean {
  return history.currentIndex > 0;
}

// Redo可能かチェック
export function canRedo(history: PromptHistory): boolean {
  return history.currentIndex < history.entries.length - 1;
}

// 履歴をクリア
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function clearHistory(history: PromptHistory): PromptHistory {
  return createPromptHistory();
}

// LocalStorageに保存
export function saveHistoryToStorage(history: PromptHistory, projectId: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = `prompt-history-${projectId}`;
    const data = JSON.stringify({
      entries: history.entries,
      currentIndex: history.currentIndex,
    });
    localStorage.setItem(key, data);
  } catch (error) {
    console.error("Failed to save history:", error);
  }
}

// LocalStorageから読み込み
export function loadHistoryFromStorage(projectId: string): PromptHistory | null {
  if (typeof window === "undefined") return null;

  try {
    const key = `prompt-history-${projectId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data);
    return {
      entries: parsed.entries.map((e: PromptHistoryEntry) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      })),
      maxEntries: MAX_HISTORY_ENTRIES,
      currentIndex: parsed.currentIndex,
    };
  } catch (error) {
    console.error("Failed to load history:", error);
    return null;
  }
}

// 履歴のサマリー取得
export function getHistorySummary(history: PromptHistory): {
  totalVersions: number;
  currentVersion: number;
  canUndo: boolean;
  canRedo: boolean;
} {
  return {
    totalVersions: history.entries.length,
    currentVersion: history.currentIndex + 1,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
  };
}
