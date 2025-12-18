"use client";

/**
 * StructureEditor - 構成エディター
 *
 * LP全体の構成を編集するメインコンポーネント
 */

import { useState } from "react";
import type {
  LPStructure,
  SectionPlan,
  SectionType,
  GlobalDesignRules,
} from "@/lib/structure/types";
import {
  SECTION_TYPE_LABELS,
  DEFAULT_GLOBAL_RULES,
} from "@/lib/structure/types";
import { getSectionTemplate } from "@/lib/structure/section-templates";
import { SectionPlanCard } from "./SectionPlanCard";
import { GlobalRulesEditor } from "./GlobalRulesEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Wand2, Save, FileDown } from "lucide-react";

interface StructureEditorProps {
  structure?: LPStructure;
  onSave?: (structure: LPStructure) => void;
  onExport?: (structure: LPStructure) => void;
  onGeneratePrompts?: (structure: LPStructure) => void;
}

export function StructureEditor({
  structure: initialStructure,
  onSave,
  onExport,
  onGeneratePrompts,
}: StructureEditorProps) {
  const [sections, setSections] = useState<SectionPlan[]>(
    initialStructure?.sections || []
  );
  const [globalRules, setGlobalRules] = useState<GlobalDesignRules>(
    initialStructure?.globalRules || DEFAULT_GLOBAL_RULES
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedSectionType, setSelectedSectionType] = useState<SectionType>("firstview");

  // セクション追加
  const handleAddSection = () => {
    const template = getSectionTemplate(selectedSectionType);
    const newSection: SectionPlan = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: selectedSectionType,
      name: template?.name || SECTION_TYPE_LABELS[selectedSectionType],
      order: sections.length,
      purpose: template?.description || "",
      elements: template?.defaultElements || [],
      estimatedHeight: "medium",
      isRequired: false,
    };

    setSections([...sections, newSection]);
    setExpandedSections(new Set([...Array.from(expandedSections), newSection.id]));
  };

  // セクション更新
  const handleUpdateSection = (index: number, updatedSection: SectionPlan) => {
    const newSections = [...sections];
    newSections[index] = updatedSection;
    setSections(newSections);
  };

  // セクション削除
  const handleDeleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  // セクション移動
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [
      newSections[newIndex],
      newSections[index],
    ];

    // orderを更新
    newSections.forEach((s, i) => {
      s.order = i;
    });

    setSections(newSections);
  };

  // 展開/折りたたみ切り替え
  const toggleExpand = (sectionId: string) => {
    const currentExpanded = Array.from(expandedSections);
    if (expandedSections.has(sectionId)) {
      setExpandedSections(new Set(currentExpanded.filter(id => id !== sectionId)));
    } else {
      setExpandedSections(new Set([...currentExpanded, sectionId]));
    }
  };

  // 構成データの構築
  const buildStructure = (): LPStructure => ({
    id: initialStructure?.id || `structure-${Date.now()}`,
    projectId: initialStructure?.projectId || "",
    name: initialStructure?.name || "新規構成",
    sections,
    globalRules,
    metadata: initialStructure?.metadata || {
      version: 1,
      sourceType: "scratch",
    },
    createdAt: initialStructure?.createdAt || new Date(),
    updatedAt: new Date(),
  });

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">構成エディター</h2>
        <div className="flex items-center gap-2">
          {onSave && (
            <Button variant="outline" size="sm" onClick={() => onSave(buildStructure())}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={() => onExport(buildStructure())}>
              <FileDown className="w-4 h-4 mr-1" />
              エクスポート
            </Button>
          )}
          {onGeneratePrompts && (
            <Button size="sm" onClick={() => onGeneratePrompts(buildStructure())}>
              <Wand2 className="w-4 h-4 mr-1" />
              プロンプト生成
            </Button>
          )}
        </div>
      </div>

      {/* グローバルルール */}
      <GlobalRulesEditor rules={globalRules} onChange={setGlobalRules} />

      {/* セクション一覧 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">セクション一覧</CardTitle>
            <span className="text-sm text-muted-foreground">
              {sections.length}セクション
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">セクションがありません</p>
              <p className="text-sm">下のボタンからセクションを追加してください</p>
            </div>
          ) : (
            sections.map((section, index) => (
              <SectionPlanCard
                key={section.id}
                section={section}
                index={index}
                isExpanded={expandedSections.has(section.id)}
                onToggleExpand={() => toggleExpand(section.id)}
                onUpdate={(updated) => handleUpdateSection(index, updated)}
                onDelete={() => handleDeleteSection(index)}
                onMoveUp={() => handleMoveSection(index, "up")}
                onMoveDown={() => handleMoveSection(index, "down")}
                canMoveUp={index > 0}
                canMoveDown={index < sections.length - 1}
              />
            ))
          )}

          {/* セクション追加 */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Select
              value={selectedSectionType}
              onValueChange={(v) => setSelectedSectionType(v as SectionType)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SECTION_TYPE_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddSection}>
              <Plus className="w-4 h-4 mr-1" />
              追加
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
