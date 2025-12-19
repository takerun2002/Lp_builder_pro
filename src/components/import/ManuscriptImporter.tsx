"use client";

/**
 * ManuscriptImporter - 原稿インポートコンポーネント
 *
 * テキスト/Markdown/Wordファイルのドラッグ&ドロップインポート
 * 自動セクション分割オプション付き
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type ManuscriptFormat = "text" | "markdown" | "word";

interface ManuscriptImporterProps {
  onImport: (content: string, format: ManuscriptFormat) => void;
  onAutoSplit?: (content: string) => Promise<string[]>;
}

export function ManuscriptImporter({
  onImport,
  onAutoSplit,
}: ManuscriptImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<ManuscriptFormat>("text");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSplitEnabled, setAutoSplitEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectFormat = (fileName: string): ManuscriptFormat => {
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext === "md" || ext === "markdown") return "markdown";
    if (ext === "docx" || ext === "doc") return "word";
    return "text";
  };

  const readFile = async (file: File): Promise<string> => {
    const detectedFormat = detectFormat(file.name);
    setFormat(detectedFormat);
    setFileName(file.name);

    if (detectedFormat === "word") {
      // Word形式はサポート外として警告
      throw new Error(
        "Word形式は現在サポートされていません。テキストまたはMarkdown形式で保存し直してください。"
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsText(file);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    setIsProcessing(true);

    try {
      const text = await readFile(file);
      setContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ファイルの読み込みに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsProcessing(true);

    try {
      const text = await readFile(files[0]);
      setContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ファイルの読み込みに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!content.trim()) {
      setError("原稿を入力またはファイルをアップロードしてください");
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      if (autoSplitEnabled && onAutoSplit) {
        // AIで自動分割
        await onAutoSplit(content);
      }
      onImport(content, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "インポートに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ドラッグ&ドロップエリア */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">
              {fileName ? fileName : "ファイルをドラッグ&ドロップ"}
            </p>
            <p className="text-sm text-muted-foreground">
              または
              <button
                type="button"
                className="text-primary hover:underline mx-1"
                onClick={() => fileInputRef.current?.click()}
              >
                ファイルを選択
              </button>
              （.txt, .md対応）
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* 直接入力エリア */}
      <div className="space-y-2">
        <Label>または直接入力</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="原稿テキストを貼り付け..."
          className="min-h-[200px] font-mono text-sm"
        />
      </div>

      {/* フォーマット表示 */}
      {content && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              <span>検出フォーマット: {format}</span>
              <span className="text-muted-foreground">
                ({content.length.toLocaleString()}文字)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 自動分割オプション */}
      {onAutoSplit && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <Label htmlFor="auto-split">AIでセクション自動分割</Label>
          </div>
          <Switch
            id="auto-split"
            checked={autoSplitEnabled}
            onCheckedChange={setAutoSplitEnabled}
          />
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* インポートボタン */}
      <Button
        className="w-full"
        onClick={handleImport}
        disabled={!content.trim() || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            処理中...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            原稿をインポート
          </>
        )}
      </Button>
    </div>
  );
}

export default ManuscriptImporter;
