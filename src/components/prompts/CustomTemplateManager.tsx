"use client";

/**
 * CustomTemplateManager - カスタムテンプレート管理コンポーネント
 *
 * ユーザーが保存したプロンプトテンプレートの管理
 * 新規作成・編集・削除・インポート/エクスポート
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  type PromptTemplate,
  type TemplateCategory,
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  exportTemplateToYaml,
  parseTemplateYaml,
} from "@/lib/prompts/templates";

interface CustomTemplateManagerProps {
  onSelect?: (template: PromptTemplate) => void;
}

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "firstview", label: "ファーストビュー" },
  { value: "problem", label: "悩み・課題" },
  { value: "solution", label: "解決策" },
  { value: "benefit", label: "ベネフィット" },
  { value: "proof", label: "実績・信頼" },
  { value: "cta", label: "CTA" },
];

export function CustomTemplateManager({ onSelect }: CustomTemplateManagerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<TemplateCategory>("firstview");
  const [formGlobalRules, setFormGlobalRules] = useState("");
  const [formElements, setFormElements] = useState("");

  // テンプレート一覧を読み込み
  useEffect(() => {
    setTemplates(getCustomTemplates());
  }, []);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormCategory("firstview");
    setFormGlobalRules("");
    setFormElements("");
    setError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormCategory(template.category as TemplateCategory);
    setFormGlobalRules(template.globalRulesTemplate);
    setFormElements(
      Object.entries(template.elementTemplates)
        .map(([key, val]) => `${key}:\n${val.template}`)
        .join("\n\n")
    );
    setError(null);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      setError("テンプレート名を入力してください");
      return;
    }
    if (!formGlobalRules.trim()) {
      setError("グローバルルールを入力してください");
      return;
    }

    // 要素テンプレートをパース
    const elementTemplates: Record<string, { template: string }> = {};
    if (formElements.trim()) {
      const elementParts = formElements.split(/\n\n+/);
      for (const part of elementParts) {
        const lines = part.split("\n");
        const firstLine = lines[0];
        if (firstLine && firstLine.includes(":")) {
          const key = firstLine.split(":")[0].trim();
          const template = lines.slice(1).join("\n").trim();
          if (key && template) {
            elementTemplates[key] = { template };
          }
        }
      }
    }

    const template: PromptTemplate = {
      id: editingTemplate?.id || `custom_${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      format: "yaml",
      globalRulesTemplate: formGlobalRules.trim(),
      elementTemplates,
      styleModifiers: editingTemplate?.styleModifiers || {},
    };

    saveCustomTemplate(template);
    setTemplates(getCustomTemplates());
    setIsDialogOpen(false);
  };

  const handleDelete = (templateId: string) => {
    if (confirm("このテンプレートを削除しますか？")) {
      deleteCustomTemplate(templateId);
      setTemplates(getCustomTemplates());
    }
  };

  const handleExport = (template: PromptTemplate) => {
    const yaml = exportTemplateToYaml(template);
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.id}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const template = parseTemplateYaml(text);

      // IDが重複しないようにする
      template.id = `custom_${Date.now()}`;

      saveCustomTemplate(template);
      setTemplates(getCustomTemplates());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "テンプレートのインポートに失敗しました"
      );
    }

    // inputをリセット
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">カスタムテンプレート</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="w-3 h-3 mr-1" />
              インポート
              <input
                type="file"
                accept=".yaml,.yml"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="w-3 h-3 mr-1" />
            新規作成
          </Button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* テンプレート一覧 */}
      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              カスタムテンプレートがありません
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              「新規作成」でテンプレートを作成できます
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {template.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {
                        CATEGORY_OPTIONS.find((c) => c.value === template.category)
                          ?.label
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {onSelect && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7"
                        onClick={() => onSelect(template)}
                      >
                        使用
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleExport(template)}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(template)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* 作成/編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "テンプレートを編集" : "新規テンプレート作成"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* テンプレート名 */}
            <div>
              <Label>テンプレート名</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例: ファーストビュー - 高級サロン向け"
              />
            </div>

            {/* カテゴリ */}
            <div>
              <Label>カテゴリ</Label>
              <Select
                value={formCategory}
                onValueChange={(v) => setFormCategory(v as TemplateCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* グローバルルール */}
            <div>
              <Label>グローバルルールテンプレート</Label>
              <Textarea
                value={formGlobalRules}
                onChange={(e) => setFormGlobalRules(e.target.value)}
                placeholder={`#ルール
以下を画像にそのまま描画する
サイズは{{aspectRatio}}
{{sectionName}}セクション`}
                className="min-h-[150px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {"{{変数名}}"} で変数を埋め込めます
              </p>
            </div>

            {/* 要素テンプレート */}
            <div>
              <Label>要素テンプレート</Label>
              <Textarea
                value={formElements}
                onChange={(e) => setFormElements(e.target.value)}
                placeholder={`headline:
| タイトル：
{{content}}

subheadline:
| サブタイトル：
{{content}}`}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                「要素名:」の後に改行してテンプレートを記述
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomTemplateManager;
