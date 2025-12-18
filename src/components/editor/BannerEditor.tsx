"use client";

/**
 * バナーエディター メインコンポーネント
 * AI生成画像の微調整とテキスト追加
 */

import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useBannerEditorStore,
  selectCanUndo,
  selectCanRedo,
} from "@/lib/editor/banner-editor";
import {
  exportCanvas,
  canvasToDataURL,
  downloadImage,
  copyImageToClipboard,
} from "@/lib/editor/canvas-renderer";
import { CanvasArea } from "./CanvasArea";
import { EditToolPanel } from "./EditToolPanel";

interface BannerEditorProps {
  initialImage?: string;
  initialWidth?: number;
  initialHeight?: number;
  onSave?: (dataUrl: string) => void;
  onClose?: () => void;
}

export function BannerEditor({
  initialImage,
  initialWidth = 1280,
  initialHeight = 720,
  onSave,
  onClose,
}: BannerEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    backgroundImage,
    canvasWidth,
    canvasHeight,
    zoom,
    layers,
    setBackgroundImage,
    setCanvasSize,
    setZoom,
    addLayer,
    undo,
    redo,
    saveToHistory,
  } = useBannerEditorStore();

  const canUndo = useBannerEditorStore(selectCanUndo);
  const canRedo = useBannerEditorStore(selectCanRedo);

  // 初期化
  useEffect(() => {
    if (initialImage) {
      setBackgroundImage(initialImage);
    }
    setCanvasSize(initialWidth, initialHeight);
    saveToHistory();

    return () => {
      // クリーンアップ時にリセット（オプション）
      // reset();
    };
  }, [initialImage, initialWidth, initialHeight, setBackgroundImage, setCanvasSize, saveToHistory]);

  // 画像読み込み
  const handleImageLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        // 画像サイズを取得してキャンバスサイズを設定
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(dataUrl);
          setCanvasSize(img.width, img.height);
          saveToHistory();
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);

      // inputをリセット
      e.target.value = "";
    },
    [setBackgroundImage, setCanvasSize, saveToHistory]
  );

  // エクスポート
  const handleExport = useCallback(
    async (format: "png" | "jpeg") => {
      // Canvas要素を取得
      const canvas = document.querySelector("canvas");
      if (!canvas) return;

      // 背景画像を取得
      let bgImg: HTMLImageElement | null = null;
      if (backgroundImage) {
        bgImg = new Image();
        await new Promise<void>((resolve) => {
          bgImg!.onload = () => resolve();
          bgImg!.src = backgroundImage;
        });
      }

      try {
        const blob = await exportCanvas(canvas, bgImg, layers, {
          format,
          quality: format === "jpeg" ? 92 : undefined,
        });

        const filename = `banner_${Date.now()}.${format}`;
        downloadImage(blob, filename);
      } catch (error) {
        console.error("Export failed:", error);
      }
    },
    [backgroundImage, layers]
  );

  // クリップボードにコピー
  const handleCopyToClipboard = useCallback(async () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    let bgImg: HTMLImageElement | null = null;
    if (backgroundImage) {
      bgImg = new Image();
      await new Promise<void>((resolve) => {
        bgImg!.onload = () => resolve();
        bgImg!.src = backgroundImage;
      });
    }

    try {
      const blob = await exportCanvas(canvas, bgImg, layers, { format: "png" });
      await copyImageToClipboard(blob);
      alert("画像をクリップボードにコピーしました");
    } catch (error) {
      console.error("Copy to clipboard failed:", error);
      alert("クリップボードへのコピーに失敗しました");
    }
  }, [backgroundImage, layers]);

  // 保存してコールバック
  const handleSave = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas || !onSave) return;

    let bgImg: HTMLImageElement | null = null;
    if (backgroundImage) {
      bgImg = new Image();
      bgImg.src = backgroundImage;
    }

    const dataUrl = canvasToDataURL(canvas, bgImg, layers, { format: "png" });
    onSave(dataUrl);
  }, [backgroundImage, layers, onSave]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case "y":
            e.preventDefault();
            redo();
            break;
          case "s":
            e.preventDefault();
            handleSave();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, handleSave]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ツールバー */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">バナーエディター</h2>

          {/* 画像読み込み */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageLoad}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            画像を読込
          </Button>

          {/* テキスト追加 */}
          <Button variant="outline" size="sm" onClick={() => addLayer()}>
            テキスト追加
          </Button>

          {/* Undo/Redo */}
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              title="元に戻す (Ctrl+Z)"
            >
              ↩
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              title="やり直す (Ctrl+Y)"
            >
              ↪
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ズーム */}
          <div className="flex items-center gap-2">
            <Label className="text-sm">ズーム:</Label>
            <select
              className="p-1 border rounded text-sm"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={0.25}>25%</option>
              <option value={0.5}>50%</option>
              <option value={0.75}>75%</option>
              <option value={1}>100%</option>
              <option value={1.5}>150%</option>
              <option value={2}>200%</option>
            </select>
          </div>

          {/* キャンバスサイズ */}
          <div className="flex items-center gap-1 ml-2">
            <Input
              type="number"
              value={canvasWidth}
              onChange={(e) => setCanvasSize(Number(e.target.value), canvasHeight)}
              className="w-16 h-8 text-sm"
            />
            <span className="text-gray-500">×</span>
            <Input
              type="number"
              value={canvasHeight}
              onChange={(e) => setCanvasSize(canvasWidth, Number(e.target.value))}
              className="w-16 h-8 text-sm"
            />
          </div>

          {/* エクスポート */}
          <Button variant="outline" size="sm" onClick={() => handleExport("png")}>
            PNG保存
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("jpeg")}>
            JPEG保存
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
            コピー
          </Button>

          {/* 保存/閉じる */}
          {onSave && (
            <Button size="sm" onClick={handleSave}>
              保存
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              閉じる
            </Button>
          )}
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* キャンバスエリア */}
        <CanvasArea />

        {/* 編集ツールパネル */}
        <EditToolPanel />
      </div>

      {/* レイヤー一覧（下部） */}
      <div className="bg-white border-t p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-sm text-gray-500 whitespace-nowrap">
            レイヤー ({layers.length}):
          </span>
          {layers.map((layer, index) => (
            <button
              key={layer.id}
              className={`px-3 py-1 text-xs rounded border whitespace-nowrap ${
                useBannerEditorStore.getState().selectedLayerId === layer.id
                  ? "bg-blue-100 border-blue-500"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => useBannerEditorStore.getState().selectLayer(layer.id)}
            >
              {index + 1}. {layer.text.slice(0, 15)}
              {layer.text.length > 15 ? "..." : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
