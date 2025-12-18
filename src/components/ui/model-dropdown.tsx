/**
 * Model Dropdown Component
 * AIモデル選択用ドロップダウンコンポーネント
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ModelConfig, ModelCategory, CostTier } from "@/lib/ai/model-selector";

// =============================================================================
// Types
// =============================================================================

export interface ModelDropdownProps {
  models: ModelConfig[];
  value?: string;
  onValueChange?: (modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showCostTier?: boolean;
  showProvider?: boolean;
  className?: string;
  filterCategory?: ModelCategory;
  filterCostTier?: CostTier;
}

// =============================================================================
// Cost Tier Badge
// =============================================================================

function CostTierBadge({ tier }: { tier: CostTier }) {
  const colors = {
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const labels = {
    low: "低コスト",
    medium: "中コスト",
    high: "高コスト",
  };

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 text-xs rounded-full font-medium",
        colors[tier]
      )}
    >
      {labels[tier]}
    </span>
  );
}

// =============================================================================
// Provider Badge
// =============================================================================

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    gemini: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    openrouter: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    fal: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 text-xs rounded-full font-medium",
        colors[provider] || "bg-gray-100 text-gray-800"
      )}
    >
      {provider}
    </span>
  );
}

// =============================================================================
// Model Dropdown
// =============================================================================

export function ModelDropdown({
  models,
  value,
  onValueChange,
  placeholder = "モデルを選択",
  disabled = false,
  showCostTier = true,
  showProvider = true,
  className,
  filterCategory,
  filterCostTier,
}: ModelDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter models
  const filteredModels = React.useMemo(() => {
    let result = models;

    if (filterCategory) {
      result = result.filter((m) => m.category === filterCategory);
    }

    if (filterCostTier) {
      const tierOrder: Record<CostTier, number> = { low: 1, medium: 2, high: 3 };
      result = result.filter(
        (m) => tierOrder[m.costTier] <= tierOrder[filterCostTier]
      );
    }

    return result;
  }, [models, filterCategory, filterCostTier]);

  // Selected model
  const selectedModel = React.useMemo(
    () => filteredModels.find((m) => m.id === value),
    [filteredModels, value]
  );

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle selection
  const handleSelect = (modelId: string) => {
    onValueChange?.(modelId);
    setIsOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className="flex items-center gap-2">
          {selectedModel ? (
            <>
              <span className="font-medium">{selectedModel.label}</span>
              {showProvider && <ProviderBadge provider={selectedModel.provider} />}
              {showCostTier && <CostTierBadge tier={selectedModel.costTier} />}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md",
            "max-h-60 overflow-auto"
          )}
        >
          {filteredModels.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              利用可能なモデルがありません
            </div>
          ) : (
            <div className="p-1">
              {filteredModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleSelect(model.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-sm px-2 py-2 text-left text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    value === model.id && "bg-accent"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{model.label}</span>
                      {showProvider && <ProviderBadge provider={model.provider} />}
                      {showCostTier && <CostTierBadge tier={model.costTier} />}
                      {model.default && (
                        <span className="text-xs text-muted-foreground">(デフォルト)</span>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {model.description}
                      </p>
                    )}
                  </div>
                  {value === model.id && <CheckIcon className="h-4 w-4 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Model Selector Group
// =============================================================================

export interface ModelSelectorGroupProps {
  models: ModelConfig[];
  value: Record<string, string>;
  onValueChange: (presets: Record<string, string>) => void;
  disabled?: boolean;
}

export function ModelSelectorGroup({
  models,
  value,
  onValueChange,
  disabled = false,
}: ModelSelectorGroupProps) {
  const handleChange = (key: string, modelId: string) => {
    onValueChange({
      ...value,
      [key]: modelId,
    });
  };

  const presetLabels: Record<string, string> = {
    research: "リサーチ",
    copywriting: "コピーライティング",
    image: "画像生成",
    test: "テスト/下書き",
    embedding: "埋め込み/RAG",
  };

  const presetCategories: Record<string, ModelCategory | undefined> = {
    research: "llm",
    copywriting: "llm",
    image: "image",
    test: "llm",
    embedding: "embedding",
  };

  return (
    <div className="space-y-4">
      {Object.entries(presetLabels).map(([key, label]) => (
        <div key={key} className="space-y-1.5">
          <label className="text-sm font-medium">{label}</label>
          <ModelDropdown
            models={models}
            value={value[key]}
            onValueChange={(modelId) => handleChange(key, modelId)}
            filterCategory={presetCategories[key]}
            disabled={disabled}
            showCostTier
            showProvider
          />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
