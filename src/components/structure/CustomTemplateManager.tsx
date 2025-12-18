"use client";

/**
 * CustomTemplateManager - カスタムテンプレート管理
 *
 * LocalStorageへのテンプレート保存・読み込み
 */

import { useState, useEffect } from "react";
import type { SectionPlan, GlobalDesignRules, LPStructure } from "@/lib/structure/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save,
  FolderOpen,
  Trash2,
  LayoutTemplate,
  Check,
  Layers,
} from "lucide-react";

// カスタムテンプレート型
interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  sections: SectionPlan[];
  globalRules: GlobalDesignRules;
  createdAt: string;
  updatedAt: string;
}

interface CustomTemplateManagerProps {
  currentStructure?: LPStructure;
  onLoadTemplate: (sections: SectionPlan[], globalRules: GlobalDesignRules) => void;
  className?: string;
}

const STORAGE_KEY = "lp-builder-custom-templates";

export function CustomTemplateManager({
  currentStructure,
  onLoadTemplate,
  className,
}: CustomTemplateManagerProps) {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  // LocalStorageからテンプレートを読み込み
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setTemplates(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    };
    loadTemplates();
  }, []);

  // LocalStorageにテンプレートを保存
  const saveToStorage = (updatedTemplates: CustomTemplate[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
      setTemplates(updatedTemplates);
    } catch (error) {
      console.error("Failed to save templates:", error);
    }
  };

  // 新規テンプレート保存
  const handleSaveTemplate = () => {
    if (!currentStructure || !newTemplateName.trim()) return;

    const newTemplate: CustomTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName.trim(),
      description: newTemplateDescription.trim(),
      sections: currentStructure.sections.map((s) => ({
        ...s,
        id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      globalRules: currentStructure.globalRules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveToStorage([...templates, newTemplate]);
    setSaveDialogOpen(false);
    setNewTemplateName("");
    setNewTemplateDescription("");
  };

  // テンプレートを読み込み
  const handleLoadTemplate = () => {
    if (!selectedTemplate) return;

    // IDを再生成
    const sections = selectedTemplate.sections.map((s, i) => ({
      ...s,
      id: `section-${Date.now()}-${i}`,
      elements: s.elements.map((e, j) => ({
        ...e,
        id: `element-${Date.now()}-${i}-${j}`,
      })),
    }));

    onLoadTemplate(sections, selectedTemplate.globalRules);
    setLoadDialogOpen(false);
    setSelectedTemplate(null);
  };

  // テンプレートを削除
  const handleDeleteTemplate = () => {
    if (!selectedTemplate) return;

    const updatedTemplates = templates.filter((t) => t.id !== selectedTemplate.id);
    saveToStorage(updatedTemplates);
    setDeleteDialogOpen(false);
    setSelectedTemplate(null);
  };

  // 削除確認ダイアログを開く
  const openDeleteDialog = (template: CustomTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  // テンプレート選択
  const selectTemplate = (template: CustomTemplate) => {
    setSelectedTemplate(template);
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="w-5 h-5 text-green-500" />
            マイテンプレート
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 保存ボタン */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!currentStructure || currentStructure.sections.length === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            現在の構成を保存
          </Button>

          {/* 読み込みボタン */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLoadDialogOpen(true)}
            disabled={templates.length === 0}
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            テンプレートを読み込み
          </Button>

          {/* 保存数表示 */}
          {templates.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {templates.length}件のテンプレートを保存中
            </p>
          )}
        </CardContent>
      </Card>

      {/* 保存ダイアログ */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              テンプレートとして保存
            </DialogTitle>
            <DialogDescription>
              現在の構成をマイテンプレートとして保存します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">テンプレート名 *</Label>
              <Input
                id="templateName"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="例: 美容サロン向けLP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateDescription">説明（任意）</Label>
              <Textarea
                id="templateDescription"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="このテンプレートの特徴や用途など"
                rows={2}
              />
            </div>

            {currentStructure && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">保存内容</div>
                <div className="text-xs text-muted-foreground">
                  {currentStructure.sections.length}セクション
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!newTemplateName.trim()}
            >
              <Check className="w-4 h-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 読み込みダイアログ */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              テンプレートを読み込み
            </DialogTitle>
            <DialogDescription>
              保存したテンプレートから構成を読み込みます
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate?.id === template.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{template.name}</div>
                      {template.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {template.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <Layers className="w-3 h-3 mr-1" />
                          {template.sections.length}セクション
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(template.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(template);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleLoadTemplate} disabled={!selectedTemplate}>
              <Check className="w-4 h-4 mr-1" />
              読み込み
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テンプレートを削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{selectedTemplate?.name}」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
