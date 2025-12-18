"use client";

/**
 * SectionPlanCard - セクション計画カード
 *
 * 個別セクションの表示・編集用カード
 */

import { useState } from "react";
import type { SectionPlan, ContentElement } from "@/lib/structure/types";
import { SECTION_TYPE_LABELS, ELEMENT_TYPE_LABELS } from "@/lib/structure/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  Plus,
  Edit2,
  Check,
  X,
} from "lucide-react";

interface SectionPlanCardProps {
  section: SectionPlan;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (section: SectionPlan) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function SectionPlanCard({
  section,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: SectionPlanCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [editPurpose, setEditPurpose] = useState(section.purpose);

  const handleSaveEdit = () => {
    onUpdate({
      ...section,
      name: editName,
      purpose: editPurpose,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(section.name);
    setEditPurpose(section.purpose);
    setIsEditing(false);
  };

  const handleUpdateElement = (elementIndex: number, updates: Partial<ContentElement>) => {
    const newElements = [...section.elements];
    newElements[elementIndex] = { ...newElements[elementIndex], ...updates };
    onUpdate({ ...section, elements: newElements });
  };

  const handleDeleteElement = (elementIndex: number) => {
    const newElements = section.elements.filter((_, i) => i !== elementIndex);
    onUpdate({ ...section, elements: newElements });
  };

  return (
    <Card className={`transition-all ${isExpanded ? "ring-2 ring-primary/20" : ""}`}>
      <CardHeader className="p-3">
        <div className="flex items-center gap-2">
          {/* ドラッグハンドル */}
          <div className="cursor-grab text-muted-foreground">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* 順番 */}
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={!canMoveUp}
              onClick={onMoveUp}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={!canMoveDown}
              onClick={onMoveDown}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>

          {/* セクション番号 */}
          <span className="text-sm font-bold text-muted-foreground w-6">
            {String(index + 1).padStart(2, "0")}
          </span>

          {/* セクション情報 */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8"
                  placeholder="セクション名"
                />
                <Textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  className="text-sm resize-none"
                  rows={2}
                  placeholder="このセクションの目的"
                />
              </div>
            ) : (
              <div className="cursor-pointer" onClick={onToggleExpand}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{section.name}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                    {SECTION_TYPE_LABELS[section.type]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {section.purpose}
                </p>
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-600"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* 展開/折りたたみ */}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {/* 展開時の要素一覧 */}
      {isExpanded && (
        <CardContent className="pt-0 pb-3 px-3">
          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              コンテンツ要素 ({section.elements.length})
            </div>

            {section.elements.map((element, elementIndex) => (
              <ElementRow
                key={element.id}
                element={element}
                onUpdate={(updates) => handleUpdateElement(elementIndex, updates)}
                onDelete={() => handleDeleteElement(elementIndex)}
              />
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                const newElement: ContentElement = {
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  type: "body",
                  content: "",
                };
                onUpdate({
                  ...section,
                  elements: [...section.elements, newElement],
                });
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              要素を追加
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// 要素行コンポーネント
interface ElementRowProps {
  element: ContentElement;
  onUpdate: (updates: Partial<ContentElement>) => void;
  onDelete: () => void;
}

function ElementRow({ element, onUpdate, onDelete }: ElementRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(element.content);

  return (
    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
      <span className="text-xs px-1.5 py-0.5 bg-background rounded border shrink-0">
        {ELEMENT_TYPE_LABELS[element.type] || element.type}
      </span>

      {isEditing ? (
        <div className="flex-1 flex gap-1">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="text-sm flex-1 min-h-[60px]"
          />
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                onUpdate({ content: editContent });
                setIsEditing(false);
              }}
            >
              <Check className="w-3 h-3 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setEditContent(element.content);
                setIsEditing(false);
              }}
            >
              <X className="w-3 h-3 text-red-600" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p
            className="flex-1 text-sm cursor-pointer hover:bg-muted rounded px-1"
            onClick={() => setIsEditing(true)}
          >
            {element.content || "(空)"}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3 text-red-600" />
          </Button>
        </>
      )}
    </div>
  );
}
