"use client";

/**
 * WireframeCanvas - ワイヤーフレームキャンバス
 *
 * セクション一覧とワイヤーフレームのメインエリア
 */

import { useState, useRef } from "react";
import type {
  Wireframe,
  WireframeSection,
  WireframeElement as WireframeElementType,
  WireframeSettings,
} from "@/lib/wireframe/types";
import {
  createWireframeElement,
  createWireframeSection,
  ELEMENT_TEMPLATES,
  DEFAULT_WIREFRAME_SETTINGS,
} from "@/lib/wireframe/types";
import type { ContentElementType } from "@/lib/structure/types";
import { WireframeElement } from "./WireframeElement";
import { WireframeToolbar } from "./WireframeToolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface WireframeCanvasProps {
  wireframe: Wireframe;
  onChange: (wireframe: Wireframe) => void;
}

export function WireframeCanvas({ wireframe, onChange }: WireframeCanvasProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [settings, setSettings] = useState<WireframeSettings>(
    wireframe.settings || DEFAULT_WIREFRAME_SETTINGS
  );
  const canvasRef = useRef<HTMLDivElement>(null);

  // セクション追加
  const handleAddSection = () => {
    const newSection = createWireframeSection(
      `セクション ${wireframe.sections.length + 1}`,
      wireframe.sections.length
    );
    onChange({
      ...wireframe,
      sections: [...wireframe.sections, newSection],
    });
  };

  // セクション削除
  const handleDeleteSection = (sectionId: string) => {
    onChange({
      ...wireframe,
      sections: wireframe.sections.filter((s) => s.id !== sectionId),
    });
  };

  // セクション更新
  const handleUpdateSection = (sectionId: string, updates: Partial<WireframeSection>) => {
    onChange({
      ...wireframe,
      sections: wireframe.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    });
  };

  // 要素追加
  const handleAddElement = (sectionId: string, type: ContentElementType) => {
    const section = wireframe.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newElement = createWireframeElement(type, sectionId, {
      x: 20,
      y: section.elements.length * 80 + 20,
    });

    handleUpdateSection(sectionId, {
      elements: [...section.elements, newElement],
    });

    setSelectedElementId(newElement.id);
  };

  // 要素更新
  const handleUpdateElement = (
    sectionId: string,
    elementId: string,
    updates: Partial<WireframeElementType>
  ) => {
    const section = wireframe.sections.find((s) => s.id === sectionId);
    if (!section) return;

    handleUpdateSection(sectionId, {
      elements: section.elements.map((e) =>
        e.id === elementId ? { ...e, ...updates } : e
      ),
    });
  };

  // 要素削除
  const handleDeleteElement = (sectionId: string, elementId: string) => {
    const section = wireframe.sections.find((s) => s.id === sectionId);
    if (!section) return;

    handleUpdateSection(sectionId, {
      elements: section.elements.filter((e) => e.id !== elementId),
    });

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  // 設定更新
  const handleSettingsChange = (newSettings: Partial<WireframeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    onChange({ ...wireframe, settings: updated });
  };

  // キャンバスクリックで選択解除
  const handleCanvasClick = () => {
    setSelectedElementId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ツールバー */}
      <WireframeToolbar
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onDeleteSelected={() => {
          if (!selectedElementId) return;
          for (const section of wireframe.sections) {
            const element = section.elements.find((e) => e.id === selectedElementId);
            if (element) {
              handleDeleteElement(section.id, selectedElementId);
              break;
            }
          }
        }}
        hasSelection={!!selectedElementId}
      />

      {/* メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* 要素パレット */}
        <div className="w-48 border-r bg-muted/30 p-2 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            要素を追加
          </div>
          <div className="grid grid-cols-2 gap-1">
            {ELEMENT_TEMPLATES.map((template) => (
              <button
                key={template.type}
                className="p-2 text-xs border rounded hover:bg-muted text-center"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("elementType", template.type);
                }}
              >
                <div className="font-mono text-lg mb-1">{template.icon}</div>
                <div>{template.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* キャンバスエリア */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto bg-gray-100 p-4"
          onClick={handleCanvasClick}
        >
          <div
            className="mx-auto bg-white shadow-lg"
            style={{
              width: wireframe.canvasWidth,
              minHeight: "100%",
            }}
          >
            {wireframe.sections.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="mb-4">セクションがありません</p>
                <Button onClick={handleAddSection}>
                  <Plus className="w-4 h-4 mr-1" />
                  セクションを追加
                </Button>
              </div>
            ) : (
              wireframe.sections.map((section) => (
                <WireframeSectionView
                  key={section.id}
                  section={section}
                  settings={settings}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onUpdateSection={(updates) => handleUpdateSection(section.id, updates)}
                  onDeleteSection={() => handleDeleteSection(section.id)}
                  onAddElement={(type) => handleAddElement(section.id, type)}
                  onUpdateElement={(elementId, updates) =>
                    handleUpdateElement(section.id, elementId, updates)
                  }
                  onDeleteElement={(elementId) =>
                    handleDeleteElement(section.id, elementId)
                  }
                />
              ))
            )}

            {/* セクション追加ボタン */}
            {wireframe.sections.length > 0 && (
              <div className="p-4 border-t border-dashed">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAddSection}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  セクションを追加
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// セクション表示コンポーネント
interface WireframeSectionViewProps {
  section: WireframeSection;
  settings: WireframeSettings;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateSection: (updates: Partial<WireframeSection>) => void;
  onDeleteSection: () => void;
  onAddElement: (type: ContentElementType) => void;
  onUpdateElement: (elementId: string, updates: Partial<WireframeElementType>) => void;
  onDeleteElement: (elementId: string) => void;
}

function WireframeSectionView({
  section,
  settings,
  selectedElementId,
  onSelectElement,
  onUpdateSection,
  onDeleteSection,
  onUpdateElement,
  onDeleteElement,
}: WireframeSectionViewProps) {
  // ドロップハンドラ
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const elementType = e.dataTransfer.getData("elementType") as ContentElementType;
    if (!elementType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newElement = createWireframeElement(elementType, section.id, { x, y });
    onUpdateSection({
      elements: [...section.elements, newElement],
    });
    onSelectElement(newElement.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Card className="m-2">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdateSection({ collapsed: !section.collapsed })}
          >
            {section.collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>
          <span className="font-medium text-sm">{section.name}</span>
          <span className="text-xs text-muted-foreground">
            ({section.elements.length}要素)
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-600"
          onClick={onDeleteSection}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* セクションコンテンツ */}
      {!section.collapsed && (
        <div
          className="relative"
          style={{
            height: section.height,
            backgroundColor: section.backgroundColor || "#fff",
            backgroundImage: settings.showGrid
              ? `linear-gradient(to right, #f0f0f0 1px, transparent 1px),
                 linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)`
              : undefined,
            backgroundSize: settings.showGrid
              ? `${settings.gridSize}px ${settings.gridSize}px`
              : undefined,
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {section.elements.map((element) => (
            <WireframeElement
              key={element.id}
              element={element}
              isSelected={selectedElementId === element.id}
              showLabels={settings.showLabels}
              onSelect={() => onSelectElement(element.id)}
              onUpdate={(updates) => onUpdateElement(element.id, updates)}
              onDelete={() => onDeleteElement(element.id)}
              snapToGrid={settings.snapToGrid}
              gridSize={settings.gridSize}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
