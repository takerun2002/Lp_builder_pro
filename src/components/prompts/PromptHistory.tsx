"use client";

/**
 * PromptHistory - プロンプト履歴パネル
 *
 * プロンプトの変更履歴を表示・復元
 */

import { useState } from "react";
import type { PromptHistory as PromptHistoryType, PromptHistoryEntry } from "@/lib/prompts/history";
import { getHistorySummary, canUndo, canRedo } from "@/lib/prompts/history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History, Undo2, Redo2, RotateCcw, Clock, Check } from "lucide-react";

interface PromptHistoryProps {
  history: PromptHistoryType;
  onUndo: () => void;
  onRedo: () => void;
  onRestore: (entryId: string) => void;
  className?: string;
}

export function PromptHistoryPanel({
  history,
  onUndo,
  onRedo,
  onRestore,
  className,
}: PromptHistoryProps) {
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PromptHistoryEntry | null>(null);

  const summary = getHistorySummary(history);

  const handleRestoreClick = (entry: PromptHistoryEntry) => {
    setSelectedEntry(entry);
    setRestoreDialogOpen(true);
  };

  const handleConfirmRestore = () => {
    if (selectedEntry) {
      onRestore(selectedEntry.id);
      setRestoreDialogOpen(false);
      setSelectedEntry(null);
    }
  };

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              履歴
            </span>
            <Badge variant="secondary">
              {summary.currentVersion}/{summary.totalVersions}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Undo/Redo ボタン */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo(history)}
              className="flex-1"
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo(history)}
              className="flex-1"
            >
              <Redo2 className="w-4 h-4 mr-1" />
              Redo
            </Button>
          </div>

          {/* 履歴リスト */}
          {history.entries.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              履歴はありません
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {history.entries
                  .slice()
                  .reverse()
                  .map((entry, reverseIndex) => {
                    const index = history.entries.length - 1 - reverseIndex;
                    const isCurrent = index === history.currentIndex;

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => !isCurrent && handleRestoreClick(entry)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isCurrent
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted hover:border-muted-foreground/20"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                v{entry.metadata?.version || index + 1}
                              </span>
                              {isCurrent && (
                                <Badge
                                  variant="default"
                                  className="text-xs px-1.5 py-0"
                                >
                                  現在
                                </Badge>
                              )}
                            </div>
                            {entry.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {entry.description}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(entry.timestamp)}
                              <Badge variant="outline" className="text-xs">
                                {entry.prompts.length}件
                              </Badge>
                            </div>
                          </div>
                          {!isCurrent && (
                            <RotateCcw className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 復元確認ダイアログ */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              バージョンを復元
            </DialogTitle>
            <DialogDescription>
              v{selectedEntry?.metadata?.version} に戻しますか？
              現在の変更は履歴に保存されます。
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">
                  {formatTimestamp(selectedEntry.timestamp)}
                </div>
                {selectedEntry.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedEntry.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {selectedEntry.prompts.length}件のプロンプト（
                  {selectedEntry.format}形式）
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmRestore}>
              <Check className="w-4 h-4 mr-1" />
              復元する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
