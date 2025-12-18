"use client";

/**
 * QuickActions - クイックアクション
 *
 * 頻繁に使う操作へのショートカット
 * - 原稿ペースト
 * - 参考LP取り込み
 * - プロンプト直接入力
 * - スワイプから開始
 */

import { QUICK_ACTIONS } from "@/lib/workflow/types";
import type { QuickAction } from "@/lib/workflow/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClipboardPaste, ImageIcon, FileEdit, FolderOpen } from "lucide-react";

interface QuickActionsProps {
  onAction?: (action: QuickAction["action"]) => void;
  className?: string;
  variant?: "default" | "compact";
}

// アイコンマッピング
const ACTION_ICONS: Record<QuickAction["action"], React.ReactNode> = {
  paste_manuscript: <ClipboardPaste className="w-4 h-4" />,
  import_reference: <ImageIcon className="w-4 h-4" />,
  direct_prompt: <FileEdit className="w-4 h-4" />,
  from_swipe: <FolderOpen className="w-4 h-4" />,
};

export function QuickActions({
  onAction,
  className = "",
  variant = "default",
}: QuickActionsProps) {
  const handleAction = (action: QuickAction["action"]) => {
    onAction?.(action);
  };

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div className={`flex items-center gap-1 ${className}`}>
          {QUICK_ACTIONS.map((qa) => (
            <Tooltip key={qa.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleAction(qa.action)}
                >
                  {ACTION_ICONS[qa.action]}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{qa.name}</p>
                <p className="text-xs text-muted-foreground">
                  {qa.description}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-muted-foreground">
        クイックアクション
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((qa) => (
          <Button
            key={qa.id}
            variant="outline"
            className="h-auto py-3 px-4 flex flex-col items-start gap-1 text-left"
            onClick={() => handleAction(qa.action)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{qa.icon}</span>
              <span className="font-medium text-sm">{qa.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {qa.description}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
