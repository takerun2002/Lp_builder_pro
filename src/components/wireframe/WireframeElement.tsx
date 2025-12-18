"use client";

/**
 * WireframeElement - ワイヤーフレーム要素
 *
 * 個別要素の表示とドラッグ/リサイズ
 */

import { useState, useRef, useCallback } from "react";
import type { WireframeElement as WireframeElementType } from "@/lib/wireframe/types";
import { ELEMENT_TYPE_LABELS } from "@/lib/structure/types";

interface WireframeElementProps {
  element: WireframeElementType;
  isSelected: boolean;
  showLabels: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<WireframeElementType>) => void;
  onDelete: () => void;
  snapToGrid: boolean;
  gridSize: number;
}

export function WireframeElement({
  element,
  isSelected,
  showLabels,
  onSelect,
  onUpdate,
  snapToGrid,
  gridSize,
}: WireframeElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // グリッドにスナップ
  const snap = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  // ドラッグ開始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (element.locked) return;
    e.stopPropagation();
    onSelect();

    setIsDragging(true);
    setDragStart({
      x: e.clientX - element.x,
      y: e.clientY - element.y,
    });
  };

  // ドラッグ中
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newX = snap(e.clientX - dragStart.x);
        const newY = snap(e.clientY - dragStart.y);
        onUpdate({ x: Math.max(0, newX), y: Math.max(0, newY) });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = snap(Math.max(50, resizeStart.width + deltaX));
        const newHeight = snap(Math.max(30, resizeStart.height + deltaY));
        onUpdate({ width: newWidth, height: newHeight });
      }
    },
    [isDragging, isResizing, dragStart, resizeStart, snap, onUpdate]
  );

  // ドラッグ終了
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // リサイズ開始
  const handleResizeStart = (e: React.MouseEvent) => {
    if (element.locked) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: element.width,
      height: element.height,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // イベントリスナー登録
  useState(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  });

  const style = element.style;

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move transition-shadow ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""
      } ${element.locked ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        backgroundColor: style.backgroundColor || "#f0f0f0",
        borderWidth: style.borderWidth || 1,
        borderStyle: "solid",
        borderColor: style.borderColor || "#ccc",
        borderRadius: style.borderRadius || 0,
        opacity: style.opacity || 1,
        zIndex: element.zIndex,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* ラベル */}
      {showLabels && (
        <div className="absolute -top-5 left-0 text-xs bg-gray-800 text-white px-1 rounded whitespace-nowrap">
          {ELEMENT_TYPE_LABELS[element.type] || element.type}
        </div>
      )}

      {/* コンテンツ */}
      <div
        className="w-full h-full flex items-center justify-center p-2 overflow-hidden"
        style={{
          fontSize: style.fontSize || 14,
          fontWeight: style.fontWeight || "normal",
          textAlign: style.textAlign || "center",
        }}
      >
        {element.content || (
          <span className="text-gray-400 text-xs">
            {ELEMENT_TYPE_LABELS[element.type]}
          </span>
        )}
      </div>

      {/* リサイズハンドル */}
      {isSelected && !element.locked && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}
