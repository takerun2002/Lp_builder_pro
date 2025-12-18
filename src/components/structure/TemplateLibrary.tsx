"use client";

/**
 * TemplateLibrary - テンプレートライブラリ
 *
 * LP構成テンプレートを選択できるUI
 */

import { useState } from "react";
import type { SectionPlan, GlobalDesignRules } from "@/lib/structure/types";
import {
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  type StructureTemplate,
} from "@/lib/structure/templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoutTemplate, Check, Layers, Star } from "lucide-react";

interface TemplateLibraryProps {
  onSelect: (sections: SectionPlan[], globalRules: GlobalDesignRules) => void;
  className?: string;
}

export function TemplateLibrary({ onSelect, className }: TemplateLibraryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<StructureTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleSelectTemplate = (template: StructureTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      // IDを再生成して適用
      const sections = selectedTemplate.sections.map((s, i) => ({
        ...s,
        id: `section-${Date.now()}-${i}`,
        elements: s.elements.map((e, j) => ({
          ...e,
          id: `element-${Date.now()}-${i}-${j}`,
        })),
      }));
      onSelect(sections, selectedTemplate.globalRules);
      setPreviewOpen(false);
      setSelectedTemplate(null);
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="w-5 h-5 text-blue-500" />
            テンプレートから選ぶ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">基本</TabsTrigger>
              <TabsTrigger value="sales">セールス</TabsTrigger>
              <TabsTrigger value="other">その他</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3">
              {getTemplatesByCategory("basic").map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </TabsContent>

            <TabsContent value="sales" className="space-y-3">
              {getTemplatesByCategory("sales").map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
              {getTemplatesByCategory("lead").map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </TabsContent>

            <TabsContent value="other" className="space-y-3">
              {getTemplatesByCategory("event").map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
              {getTemplatesByCategory("product").map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
              {getTemplatesByCategory("brand").map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* プレビューダイアログ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5" />
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* カテゴリ・業界 */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {TEMPLATE_CATEGORIES[selectedTemplate.category]}
                </Badge>
                {selectedTemplate.industry && (
                  <Badge variant="secondary">{selectedTemplate.industry}</Badge>
                )}
              </div>

              {/* セクション一覧 */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  セクション構成（{selectedTemplate.sections.length}セクション）
                </h4>
                <div className="space-y-2">
                  {selectedTemplate.sections.map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-2 p-2 bg-muted rounded-md"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{section.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {section.purpose}
                        </div>
                      </div>
                      {section.isRequired && (
                        <Badge variant="outline" className="text-xs">
                          必須
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* デザインルール */}
              <div>
                <h4 className="text-sm font-medium mb-2">デザイン設定</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-muted rounded-md">
                    <span className="text-muted-foreground">カラー:</span>{" "}
                    {selectedTemplate.globalRules.colorScheme?.type || "minimal"}
                  </div>
                  <div className="p-2 bg-muted rounded-md">
                    <span className="text-muted-foreground">雰囲気:</span>{" "}
                    {selectedTemplate.globalRules.overallMood}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleApplyTemplate}>
              <Check className="w-4 h-4 mr-1" />
              このテンプレートを使用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// テンプレートカードコンポーネント
function TemplateCard({
  template,
  onSelect,
}: {
  template: StructureTemplate;
  onSelect: (template: StructureTemplate) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="w-full text-left p-3 border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-sm flex items-center gap-1">
            {template.name}
            {template.popularity && template.popularity >= 90 && (
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {template.description}
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {template.sections.length}セクション
        </Badge>
      </div>
    </button>
  );
}
