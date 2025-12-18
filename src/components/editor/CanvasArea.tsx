"use client";

/**
 * Canvas描画エリア
 * バナーエディターのメインCanvas
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useBannerEditorStore, selectSelectedLayer } from "@/lib/editor/banner-editor";
import { renderCanvas, getTextBounds } from "@/lib/editor/canvas-renderer";
import { TextLayer, preloadFont } from "@/lib/editor/text-layer";

interface CanvasAreaProps {
  onLayerSelect?: (layerId: string | null) => void;
}

export function CanvasArea({ onLayerSelect }: CanvasAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);

  const {
    backgroundImage,
    canvasWidth,
    canvasHeight,
    zoom,
    layers,
    selectedLayerId,
    isDragging,
    dragStartX,
    dragStartY,
    selectLayer,
    updateLayer,
    setDragging,
    setEditing,
    saveToHistory,
  } = useBannerEditorStore();

  const selectedLayer = useBannerEditorStore(selectSelectedLayer);

  // 背景画像をロード
  useEffect(() => {
    if (!backgroundImage) {
      setBackgroundImg(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setBackgroundImg(img);
    };
    img.src = backgroundImage;
  }, [backgroundImage]);

  // フォントをプリロード
  useEffect(() => {
    const fonts = new Set(layers.map((l) => l.fontFamily));
    fonts.forEach((font) => preloadFont(font));
  }, [layers]);

  // キャンバスを描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderCanvas(ctx, backgroundImg, layers, selectedLayerId, canvasWidth, canvasHeight);
  }, [backgroundImg, layers, selectedLayerId, canvasWidth, canvasHeight]);

  // クリック位置のレイヤーを検出
  const findLayerAtPosition = useCallback(
    (x: number, y: number): TextLayer | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // 上から下（前面から背面）へ検索
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible || layer.locked) continue;

        const bounds = getTextBounds(ctx, layer);
        if (
          x >= bounds.x - 10 &&
          x <= bounds.x + bounds.width + 10 &&
          y >= bounds.y - 10 &&
          y <= bounds.y + bounds.height + 10
        ) {
          return layer;
        }
      }

      return null;
    },
    [layers]
  );

  // マウスダウン
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      const clickedLayer = findLayerAtPosition(x, y);

      if (clickedLayer) {
        selectLayer(clickedLayer.id);
        onLayerSelect?.(clickedLayer.id);

        // ドラッグ開始
        setDragging(true, x - clickedLayer.x, y - clickedLayer.y);
      } else {
        selectLayer(null);
        onLayerSelect?.(null);
        setEditing(false);
      }
    },
    [findLayerAtPosition, selectLayer, setDragging, setEditing, onLayerSelect, zoom]
  );

  // マウス移動
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !selectedLayerId) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      updateLayer(selectedLayerId, {
        x: x - dragStartX,
        y: y - dragStartY,
      });
    },
    [isDragging, selectedLayerId, dragStartX, dragStartY, updateLayer, zoom]
  );

  // マウスアップ
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setDragging(false);
      saveToHistory();
    }
  }, [isDragging, setDragging, saveToHistory]);

  // ダブルクリック（テキスト編集モード）
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      const clickedLayer = findLayerAtPosition(x, y);

      if (clickedLayer) {
        setEditing(true, clickedLayer.id);
      }
    },
    [findLayerAtPosition, setEditing, zoom]
  );

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedLayer) return;

      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          updateLayer(selectedLayer.id, { x: selectedLayer.x - step });
          break;
        case "ArrowRight":
          e.preventDefault();
          updateLayer(selectedLayer.id, { x: selectedLayer.x + step });
          break;
        case "ArrowUp":
          e.preventDefault();
          updateLayer(selectedLayer.id, { y: selectedLayer.y - step });
          break;
        case "ArrowDown":
          e.preventDefault();
          updateLayer(selectedLayer.id, { y: selectedLayer.y + step });
          break;
        case "Delete":
        case "Backspace":
          // テキスト編集中でなければ削除
          if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
            e.preventDefault();
            useBannerEditorStore.getState().removeLayer(selectedLayer.id);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayer, updateLayer]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4"
    >
      <div
        className="relative shadow-xl"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="cursor-crosshair"
          style={{
            display: "block",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
    </div>
  );
}
