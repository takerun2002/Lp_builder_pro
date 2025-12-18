"use client";

/**
 * PromptFormatSelector - プロンプト形式選択
 *
 * テキスト / YAML / JSON形式の選択
 */

import { useWorkflowStore } from "@/stores/workflow-store";
import { PROMPT_FORMATS } from "@/lib/workflow/types";
import type { PromptFormat } from "@/lib/workflow/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface PromptFormatSelectorProps {
  onSelect?: (format: PromptFormat) => void;
  className?: string;
  showDetails?: boolean;
}

export function PromptFormatSelector({
  onSelect,
  className = "",
  showDetails = true,
}: PromptFormatSelectorProps) {
  const { promptFormat, setPromptFormat } = useWorkflowStore();

  const handleSelect = (format: PromptFormat) => {
    setPromptFormat(format);
    onSelect?.(format);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <h3 className="text-sm font-medium mb-1">プロンプト形式</h3>
        <p className="text-xs text-muted-foreground">
          生成するプロンプトの形式を選択してください
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PROMPT_FORMATS.map((format) => (
          <Card
            key={format.id}
            className={`cursor-pointer transition-all ${
              promptFormat === format.id
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground/50"
            }`}
            onClick={() => handleSelect(format.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{format.label}</span>
                {promptFormat === format.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>

              {format.recommended && (
                <Badge variant="secondary" className="text-xs mb-2">
                  推奨
                </Badge>
              )}

              {showDetails && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    {format.description}
                  </p>

                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {format.pros.map((pro, i) => (
                        <span
                          key={i}
                          className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded"
                        >
                          ✓ {pro}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {format.cons.map((con, i) => (
                        <span
                          key={i}
                          className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded"
                        >
                          △ {con}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
