"use client";

/**
 * StructureImporter - 構成インポートコンポーネント
 *
 * JSON/YAML形式のLP構成をインポート
 * バリデーション付き
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Loader2,
  Check,
  AlertCircle,
  FileJson,
  FileCode,
} from "lucide-react";
import yaml from "js-yaml";
import type { LPStructure } from "@/lib/structure/types";

interface StructureImporterProps {
  onImport: (structure: LPStructure) => void;
}

export function StructureImporter({ onImport }: StructureImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"json" | "yaml" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedStructure, setParsedStructure] = useState<LPStructure | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectFormat = (fileName: string): "json" | "yaml" => {
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext === "yaml" || ext === "yml") return "yaml";
    return "json";
  };

  const parseContent = (text: string, fmt: "json" | "yaml"): LPStructure => {
    let parsed: unknown;

    if (fmt === "yaml") {
      parsed = yaml.load(text);
    } else {
      parsed = JSON.parse(text);
    }

    // 基本的なバリデーション
    if (!parsed || typeof parsed !== "object") {
      throw new Error("無効な構成データです");
    }

    const structure = parsed as Record<string, unknown>;

    // 必須フィールドのチェック
    if (!structure.sections || !Array.isArray(structure.sections)) {
      throw new Error("sections配列が必要です");
    }

    // セクションのバリデーション
    for (const section of structure.sections) {
      if (!section || typeof section !== "object") {
        throw new Error("各セクションはオブジェクトである必要があります");
      }
      const s = section as Record<string, unknown>;
      if (!s.id || !s.type) {
        throw new Error("各セクションにはidとtypeが必要です");
      }
    }

    return structure as unknown as LPStructure;
  };

  const readFile = async (file: File): Promise<string> => {
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
    setParsedStructure(null);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const detectedFormat = detectFormat(file.name);
    setFormat(detectedFormat);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const text = await readFile(file);
      setContent(text);

      // パースとバリデーション
      const structure = parseContent(text, detectedFormat);
      setParsedStructure(structure);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ファイルの読み込みに失敗しました"
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setParsedStructure(null);
    setIsProcessing(true);

    const file = files[0];
    const detectedFormat = detectFormat(file.name);
    setFormat(detectedFormat);
    setFileName(file.name);

    try {
      const text = await readFile(file);
      setContent(text);

      // パースとバリデーション
      const structure = parseContent(text, detectedFormat);
      setParsedStructure(structure);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ファイルの読み込みに失敗しました"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setError(null);
    setParsedStructure(null);

    if (!text.trim()) return;

    // 自動フォーマット検出
    const trimmed = text.trim();
    const detectedFormat = trimmed.startsWith("{") ? "json" : "yaml";
    setFormat(detectedFormat);

    try {
      const structure = parseContent(text, detectedFormat);
      setParsedStructure(structure);
    } catch (err) {
      setError(err instanceof Error ? err.message : "パースエラー");
    }
  };

  const handleImport = () => {
    if (!parsedStructure) {
      setError("有効な構成データを入力してください");
      return;
    }

    onImport(parsedStructure);
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
              {fileName ? fileName : "構成ファイルをドラッグ&ドロップ"}
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
              （.json, .yaml対応）
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml"
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
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={`{
  "sections": [
    { "id": "fv", "type": "firstview", "title": "ファーストビュー" }
  ]
}`}
          className="min-h-[200px] font-mono text-sm"
        />
      </div>

      {/* パース結果表示 */}
      {parsedStructure && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              {format === "json" ? (
                <FileJson className="w-4 h-4" />
              ) : (
                <FileCode className="w-4 h-4" />
              )}
              <span>
                {format?.toUpperCase()}形式 •{" "}
                {parsedStructure.sections?.length || 0}セクション
              </span>
              <Check className="w-4 h-4 ml-auto" />
            </div>
            <div className="mt-2 text-xs text-green-600">
              セクション:{" "}
              {parsedStructure.sections
                ?.map((s) => s.type || s.id)
                .join(" → ")}
            </div>
          </CardContent>
        </Card>
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
        disabled={!parsedStructure || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            処理中...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            構成をインポート
          </>
        )}
      </Button>
    </div>
  );
}

export default StructureImporter;
