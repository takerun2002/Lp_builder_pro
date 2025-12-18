"use client";

/**
 * FigmaImporter - Figma/XDインポート
 *
 * Figma/XDのエクスポートデータをインポート
 */

import { useState, useRef } from "react";
import type { SectionPlan, GlobalDesignRules } from "@/lib/structure/types";
import { DEFAULT_GLOBAL_RULES } from "@/lib/structure/types";
import { parseImportFile } from "@/lib/import/figma-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileUp,
  Figma,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
} from "lucide-react";

interface FigmaImporterProps {
  onImport: (sections: SectionPlan[], globalRules: GlobalDesignRules) => void;
  className?: string;
}

export function FigmaImporter({ onImport, className }: FigmaImporterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    sections: SectionPlan[];
    warnings: string[];
    errors: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setImportResult(null);

    try {
      const content = await file.text();
      const result = parseImportFile(content, file.name);
      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        sections: [],
        warnings: [],
        errors: [`ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".json")) {
      handleFileSelect(file);
    } else {
      setImportResult({
        success: false,
        sections: [],
        warnings: [],
        errors: ["JSONファイルのみ対応しています"],
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleApplyImport = () => {
    if (importResult?.success && importResult.sections.length > 0) {
      onImport(importResult.sections, DEFAULT_GLOBAL_RULES);
      setIsDialogOpen(false);
      setImportResult(null);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setImportResult(null);
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Figma className="w-5 h-5 text-purple-500" />
            外部ファイルから読込
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Figma/XDのエクスポートファイル（JSON）をインポートできます
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsDialogOpen(true)}
          >
            <FileUp className="w-4 h-4 mr-2" />
            ファイルをインポート
          </Button>
        </CardContent>
      </Card>

      {/* インポートダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Figma className="w-5 h-5" />
              Figma/XDインポート
            </DialogTitle>
            <DialogDescription>
              JSONファイルをドラッグ&ドロップまたは選択してください
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
              {isLoading
                ? "読み込み中..."
                : "JSONファイルをドロップまたはクリックして選択"}
            </p>
            <p className="text-xs text-muted-foreground">
              対応形式: Figma JSON, XD JSON, カスタムJSON
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
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
              {importResult.success && importResult.sections.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    インポート準備完了
                  </div>
                  <div className="space-y-1">
                    {importResult.sections.map((section, i) => (
                      <div
                        key={section.id}
                        className="flex items-center gap-2 text-sm text-green-700"
                      >
                        <Layers className="w-3 h-3" />
                        <span>
                          {i + 1}. {section.name}
                        </span>
                        <span className="text-xs text-green-600">
                          ({section.elements.length}要素)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button
              onClick={handleApplyImport}
              disabled={!importResult?.success || importResult.sections.length === 0}
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
