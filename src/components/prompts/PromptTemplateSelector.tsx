"use client";

/**
 * PromptTemplateSelector - テンプレート選択コンポーネント
 *
 * カテゴリ別のプロンプトテンプレートを表示・選択
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Check,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  type PromptTemplate,
  type TemplateCategory,
  getTemplatesByCategory,
} from "@/lib/prompts/templates";

interface PromptTemplateSelectorProps {
  category: TemplateCategory;
  onSelect: (template: PromptTemplate) => void;
  currentTemplateId?: string;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  firstview: "ファーストビュー",
  problem: "悩み・課題",
  solution: "解決策",
  benefit: "ベネフィット",
  proof: "実績・信頼",
  cta: "CTA",
};

export function PromptTemplateSelector({
  category,
  onSelect,
  currentTemplateId,
}: PromptTemplateSelectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const templates = useMemo(() => {
    return getTemplatesByCategory(category);
  }, [category]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (templates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            「{CATEGORY_LABELS[category]}」のテンプレートがありません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        {CATEGORY_LABELS[category]}テンプレート
      </Label>

      <div className="space-y-2">
        {templates.map((template) => {
          const isSelected = template.id === currentTemplateId;
          const isExpanded = expandedId === template.id;

          return (
            <Card
              key={template.id}
              className={`transition-all ${
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              }`}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <CardTitle className="text-sm font-medium">
                      {template.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => toggleExpand(template.id)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={isSelected ? "secondary" : "default"}
                      className="h-7"
                      onClick={() => onSelect(template)}
                    >
                      {isSelected ? "選択中" : "使用する"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* プレビュー（展開時） */}
              {isExpanded && (
                <CardContent className="py-3 px-4 border-t bg-muted/30">
                  {/* スタイル修飾子 */}
                  {Object.keys(template.styleModifiers).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1.5">
                        利用可能なスタイル:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(template.styleModifiers).map((style) => (
                          <span
                            key={style}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                          >
                            {style}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 要素テンプレート */}
                  {Object.keys(template.elementTemplates).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1.5">含まれる要素:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(template.elementTemplates).map(
                          (element) => (
                            <span
                              key={element}
                              className="text-xs bg-muted px-2 py-0.5 rounded"
                            >
                              {element}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* グローバルルールプレビュー */}
                  <div>
                    <p className="text-xs font-medium mb-1.5">ルールテンプレート:</p>
                    <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {template.globalRulesTemplate.substring(0, 200)}
                      {template.globalRulesTemplate.length > 200 && "..."}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * カテゴリセレクター付きPromptTemplateSelector
 */
interface PromptTemplateSelectorWithCategoryProps {
  onSelect: (template: PromptTemplate) => void;
  currentTemplateId?: string;
  defaultCategory?: TemplateCategory;
}

export function PromptTemplateSelectorWithCategory({
  onSelect,
  currentTemplateId,
  defaultCategory = "firstview",
}: PromptTemplateSelectorWithCategoryProps) {
  const [category, setCategory] = useState<TemplateCategory>(defaultCategory);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm mb-1.5 block">セクションカテゴリ</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as TemplateCategory)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PromptTemplateSelector
        category={category}
        onSelect={onSelect}
        currentTemplateId={currentTemplateId}
      />
    </div>
  );
}

export default PromptTemplateSelector;
