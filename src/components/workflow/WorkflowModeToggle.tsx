"use client";

/**
 * WorkflowModeToggle - ガイドモード/エキスパートモード切り替え
 */

import { useWorkflowStore } from "@/stores/workflow-store";
import { USER_MODE_LABELS } from "@/lib/workflow/types";
import { Sparkles, Zap } from "lucide-react";

interface WorkflowModeToggleProps {
  className?: string;
  showDescription?: boolean;
}

export function WorkflowModeToggle({
  className = "",
  showDescription = false,
}: WorkflowModeToggleProps) {
  const { mode, toggleMode } = useWorkflowStore();

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        {/* ガイドモード */}
        <button
          onClick={() => mode !== "guided" && toggleMode()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-sm font-medium transition-all ${
            mode === "guided"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {USER_MODE_LABELS.guided.name}
        </button>

        {/* エキスパートモード */}
        <button
          onClick={() => mode !== "expert" && toggleMode()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-r-full text-sm font-medium transition-all ${
            mode === "expert"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Zap className="w-4 h-4" />
          {USER_MODE_LABELS.expert.name}
        </button>
      </div>

      {showDescription && (
        <p className="text-xs text-muted-foreground">
          {USER_MODE_LABELS[mode].description}
        </p>
      )}
    </div>
  );
}
