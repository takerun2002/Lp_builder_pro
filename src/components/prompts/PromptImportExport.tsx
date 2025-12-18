"use client";

/**
 * PromptImportExport - プロンプトのインポート/エクスポート
 *
 * .yaml, .json, .txt形式でのダウンロード/アップロード
 */

import { useState, useRef } from "react";
import type { GeneratedPrompt } from "@/lib/prompts/types";
import type { PromptFormat } from "@/lib/workflow/types";
import {
  exportPromptsToString,
  getFileExtension,
  getMimeType,
} from "@/lib/prompts/prompt-converter";
import { importPromptsFromFile } from "@/lib/workflow/import-handlers";
import { validatePromptContent } from "@/lib/prompts/prompt-validator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Upload,
  FileText,
  FileJson,
  File,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

interface PromptImportExportProps {
  prompts: GeneratedPrompt[];
  onImport: (prompts: GeneratedPrompt[]) => void;
  className?: string;
}

export function PromptImportExport({
  prompts,
  onImport,
  className,
}: PromptImportExportProps) {
  const [exportFormat, setExportFormat] = useState<PromptFormat>("yaml");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    prompts: GeneratedPrompt[];
    warnings: string[];
    errors: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // エクスポート
  const handleExport = () => {
    if (prompts.length === 0) return;

    const content = exportPromptsToString(prompts, exportFormat);
    const blob = new Blob([content], { type: getMimeType(exportFormat) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompts.${getFileExtension(exportFormat)}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ファイル選択
  const handleFileSelect = async (file: File) => {
    try {
      const content = await file.text();

      // バリデーション
      const validation = validatePromptContent(content);

      // インポート
      const result = importPromptsFromFile(content, file.name);

      setImportResult({
        success: result.success,
        prompts: result.data || [],
        warnings: [...result.warnings, ...(validation.warnings.map((w) => w.message))],
        errors: [...result.errors, ...(validation.errors.map((e) => e.message))],
      });
    } catch (error) {
      setImportResult({
        success: false,
        prompts: [],
        warnings: [],
        errors: [`ファイル読み込みエラー: ${error instanceof Error ? error.message : "不明なエラー"}`],
      });
    }
  };

  // ドロップ処理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // インプット変更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // インポート確定
  const handleConfirmImport = () => {
    if (importResult?.success && importResult.prompts.length > 0) {
      onImport(importResult.prompts);
      setImportDialogOpen(false);
      setImportResult(null);
    }
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setImportDialogOpen(false);
    setImportResult(null);
  };

  // 形式アイコン
  const FormatIcon = ({ format }: { format: PromptFormat }) => {
    switch (format) {
      case "yaml":
        return <FileText className="w-4 h-4" />;
      case "json":
        return <FileJson className="w-4 h-4" />;
      case "text":
        return <File className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">インポート / エクスポート</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* エクスポート */}
          <div className="space-y-2">
            <label className="text-sm font-medium">エクスポート</label>
            <div className="flex items-center gap-2">
              <Select
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as PromptFormat)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yaml">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> YAML
                    </span>
                  </SelectItem>
                  <SelectItem value="json">
                    <span className="flex items-center gap-1">
                      <FileJson className="w-3 h-3" /> JSON
                    </span>
                  </SelectItem>
                  <SelectItem value="text">
                    <span className="flex items-center gap-1">
                      <File className="w-3 h-3" /> Text
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExport}
                disabled={prompts.length === 0}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                ダウンロード
              </Button>
            </div>
            {prompts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                エクスポートするプロンプトがありません
              </p>
            )}
          </div>

          {/* インポート */}
          <div className="space-y-2">
            <label className="text-sm font-medium">インポート</label>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="w-4 h-4 mr-1" />
              ファイルからインポート
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* インポートダイアログ */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              プロンプトをインポート
            </DialogTitle>
            <DialogDescription>
              .yaml, .json, .txt形式のファイルをインポートできます
            </DialogDescription>
          </DialogHeader>

          {/* ドロップエリア */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              ファイルをドロップまたはクリックして選択
            </p>
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant="outline">.yaml</Badge>
              <Badge variant="outline">.json</Badge>
              <Badge variant="outline">.txt</Badge>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,.json,.txt"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          {/* 結果表示 */}
          {importResult && (
            <div className="space-y-3">
              {/* エラー */}
              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {importResult.errors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {/* 警告 */}
              {importResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {importResult.warnings.map((warn, i) => (
                      <div key={i}>{warn}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {/* 成功 */}
              {importResult.success && importResult.prompts.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    インポート準備完了
                  </div>
                  <div className="text-sm text-green-700">
                    {importResult.prompts.length}件のプロンプトをインポートします
                  </div>
                  <div className="mt-2 space-y-1">
                    {importResult.prompts.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 text-xs text-green-600"
                      >
                        <FormatIcon format={p.format} />
                        <span>{p.sectionName}</span>
                      </div>
                    ))}
                    {importResult.prompts.length > 5 && (
                      <div className="text-xs text-green-600">
                        ...他 {importResult.prompts.length - 5}件
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              キャンセル
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!importResult?.success || importResult.prompts.length === 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              インポート
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
