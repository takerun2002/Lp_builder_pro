"use client";

/**
 * WireframeImporter - ワイヤーフレームインポートコンポーネント
 *
 * 画像ファイルのインポートとAIによる要素自動認識
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Eye,
} from "lucide-react";

export interface WireframeData {
  imageDataUrl: string;
  width: number;
  height: number;
  elements?: WireframeElement[];
}

export interface WireframeElement {
  id: string;
  type: "headline" | "text" | "image" | "button" | "logo" | "unknown";
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content?: string;
}

interface WireframeImporterProps {
  onImport: (wireframe: WireframeData) => void;
  onAutoDetect?: (imageDataUrl: string) => Promise<WireframeElement[]>;
}

export function WireframeImporter({
  onImport,
  onAutoDetect,
}: WireframeImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [detectedElements, setDetectedElements] = useState<WireframeElement[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readImageFile = async (
    file: File
  ): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        // 画像の寸法を取得
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl,
            width: img.width,
            height: img.height,
          });
        };
        img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsDataURL(file);
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
    setDetectedElements([]);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルをアップロードしてください");
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const { dataUrl, width, height } = await readImageFile(file);
      setImageDataUrl(dataUrl);
      setImageDimensions({ width, height });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "画像の読み込みに失敗しました"
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルをアップロードしてください");
      return;
    }

    setError(null);
    setDetectedElements([]);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const { dataUrl, width, height } = await readImageFile(file);
      setImageDataUrl(dataUrl);
      setImageDimensions({ width, height });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "画像の読み込みに失敗しました"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoDetect = async () => {
    if (!imageDataUrl || !onAutoDetect) return;

    setIsProcessing(true);
    setError(null);

    try {
      const elements = await onAutoDetect(imageDataUrl);
      setDetectedElements(elements);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "要素の自動認識に失敗しました"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!imageDataUrl || !imageDimensions) {
      setError("画像をアップロードしてください");
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      let elements = detectedElements;

      // 自動検出が有効で、まだ検出されていない場合
      if (autoDetectEnabled && onAutoDetect && elements.length === 0) {
        elements = await onAutoDetect(imageDataUrl);
        setDetectedElements(elements);
      }

      onImport({
        imageDataUrl,
        width: imageDimensions.width,
        height: imageDimensions.height,
        elements: elements.length > 0 ? elements : undefined,
      });
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
          ) : imageDataUrl ? (
            <ImageIcon className="w-10 h-10 text-green-500" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">
              {fileName ? fileName : "ワイヤーフレーム画像をドラッグ&ドロップ"}
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
              （PNG, JPG, WebP対応）
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* プレビュー */}
      {imageDataUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              プレビュー
              {imageDimensions && (
                <span>
                  ({imageDimensions.width} × {imageDimensions.height}px)
                </span>
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt="Wireframe preview"
              className="w-full max-h-[300px] object-contain rounded border"
            />
          </CardContent>
        </Card>
      )}

      {/* AI自動認識オプション */}
      {onAutoDetect && imageDataUrl && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <Label htmlFor="auto-detect">AIで要素を自動認識</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="auto-detect"
              checked={autoDetectEnabled}
              onCheckedChange={setAutoDetectEnabled}
            />
            {autoDetectEnabled && detectedElements.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoDetect}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "今すぐ認識"
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 検出結果 */}
      {detectedElements.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Check className="w-4 h-4" />
              <span>{detectedElements.length}個の要素を検出</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {detectedElements.map((el) => (
                <span
                  key={el.id}
                  className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded"
                >
                  {el.type}
                </span>
              ))}
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
        disabled={!imageDataUrl || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            処理中...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            ワイヤーフレームをインポート
          </>
        )}
      </Button>
    </div>
  );
}

export default WireframeImporter;
