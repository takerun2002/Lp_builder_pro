"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

// =============================================================================
// Types
// =============================================================================

export interface PDFFile {
  name: string;
  size: number;
  base64: string;
  type: "local" | "google-drive";
  googleDriveId?: string;
}

interface PDFUploaderProps {
  /** ファイルがアップロードされた時のコールバック */
  onFileSelect: (file: PDFFile) => void;
  /** 複数ファイル対応 */
  multiple?: boolean;
  /** Google Drive連携有効 */
  enableGoogleDrive?: boolean;
  /** 最大ファイルサイズ（MB） */
  maxSizeMB?: number;
  /** ドラッグ中の状態 */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function PDFUploader({
  onFileSelect,
  multiple = false,
  enableGoogleDrive = true,
  maxSizeMB = 50,
  className = "",
}: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル選択ハンドラ
  const handleFileChange = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);
      setLoading(true);

      try {
        const fileArray = Array.from(files);

        for (const file of fileArray) {
          // バリデーション
          if (file.type !== "application/pdf") {
            throw new Error(`${file.name} はPDFファイルではありません`);
          }

          if (file.size > maxSizeMB * 1024 * 1024) {
            throw new Error(
              `${file.name} が大きすぎます（最大${maxSizeMB}MB）`
            );
          }

          // Base64に変換
          const base64 = await fileToBase64(file);

          onFileSelect({
            name: file.name,
            size: file.size,
            base64,
            type: "local",
          });

          if (!multiple) break;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "ファイル読み込みに失敗");
      } finally {
        setLoading(false);
      }
    },
    [onFileSelect, multiple, maxSizeMB]
  );

  // ドラッグ&ドロップハンドラ
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileChange(e.dataTransfer.files);
    },
    [handleFileChange]
  );

  // Google Drive URLからファイル取得
  const handleGoogleDriveLoad = useCallback(async () => {
    if (!googleDriveUrl.trim()) {
      setError("Google Drive URLを入力してください");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 共有リンクを解析
      const response = await fetch("/api/pdf/process?action=parse-share-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareLink: googleDriveUrl }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "リンク解析に失敗しました");
      }

      onFileSelect({
        name: data.fileInfo?.name || "Google Drive PDF",
        size: data.fileInfo?.size || 0,
        base64: "", // Google Driveの場合はIDで取得
        type: "google-drive",
        googleDriveId: data.fileId,
      });

      setGoogleDriveUrl("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google Driveからの読み込みに失敗"
      );
    } finally {
      setLoading(false);
    }
  }, [googleDriveUrl, onFileSelect]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ドラッグ&ドロップエリア */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="py-8 text-center">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-muted-foreground mb-2">
            PDFファイルをドラッグ&ドロップ
            <br />
            またはクリックして選択
          </p>
          <p className="text-xs text-muted-foreground">
            最大 {maxSizeMB}MB まで
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple={multiple}
            onChange={(e) => handleFileChange(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Google Drive連携 */}
      {enableGoogleDrive && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm font-medium mb-2 block">
              Google Driveから読み込み
            </Label>
            <div className="flex gap-2">
              <Input
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                placeholder="Google Drive共有リンクを貼り付け"
                className="flex-1"
              />
              <Button
                onClick={handleGoogleDriveLoad}
                disabled={loading || !googleDriveUrl.trim()}
                variant="outline"
              >
                {loading ? "読み込み中..." : "読み込み"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              例: https://drive.google.com/file/d/xxx/view
            </p>
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="text-center text-sm text-muted-foreground">
          ファイルを読み込み中...
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Utilities
// =============================================================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
