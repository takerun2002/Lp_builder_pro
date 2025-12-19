"use client";

/**
 * RegionChatBox - インラインチャットボックス
 *
 * 塗った領域の近くに表示されるチャットボックス
 * 編集指示を入力し、その領域のみ生成できる
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, Sparkles, RotateCcw, Check } from "lucide-react";
import type { MaskRegion } from "./utils/region-detection";

interface RegionChatBoxProps {
  region: MaskRegion;
  position: { x: number; y: number };
  scale: number;
  containerOffset: { x: number; y: number };
  isActive: boolean;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onDelete: () => void;
  onApply: () => void;
  onRegenerate: () => void;
  onSelect: () => void;
}

export function RegionChatBox({
  region,
  position,
  scale,
  containerOffset,
  isActive,
  onPromptChange,
  onGenerate,
  onDelete,
  onApply,
  onRegenerate,
  onSelect,
}: RegionChatBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // アクティブ時に展開
  useEffect(() => {
    if (isActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isActive, isExpanded]);

  // 展開時にフォーカス
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  // 位置計算（領域の右側に配置）
  const boxLeft = position.x * scale + containerOffset.x + 30;
  const boxTop = position.y * scale + containerOffset.y - 20;

  // コンパクト表示（番号バッジのみ）
  if (!isExpanded) {
    return (
      <div
        className={`absolute cursor-pointer transition-all duration-200 hover:scale-110 ${
          isActive ? "z-20" : "z-10"
        }`}
        style={{
          left: position.x * scale + containerOffset.x - 12,
          top: position.y * scale + containerOffset.y - 12,
        }}
        onClick={() => {
          onSelect();
          setIsExpanded(true);
        }}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
            region.status === "done"
              ? "bg-green-500 text-white"
              : region.status === "generating"
              ? "bg-yellow-500 text-white animate-pulse"
              : region.status === "error"
              ? "bg-red-500 text-white"
              : isActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted-foreground text-white"
          }`}
        >
          {region.status === "generating" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : region.status === "done" ? (
            <Check className="w-3 h-3" />
          ) : (
            region.number
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute bg-card border rounded-lg shadow-xl transition-all duration-200 ${
        isActive ? "z-30 ring-2 ring-primary" : "z-20"
      }`}
      style={{
        left: boxLeft,
        top: boxTop,
        width: 280,
        maxWidth: "calc(100vw - 400px)",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              region.status === "done"
                ? "bg-green-500 text-white"
                : region.status === "generating"
                ? "bg-yellow-500 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {region.number}
          </div>
          <span className="text-xs font-medium">
            領域 {region.number}
            {region.status === "generating" && " - 生成中..."}
            {region.status === "done" && " - 完了"}
            {region.status === "error" && " - エラー"}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* コンテンツ */}
      <div className="p-3 space-y-3">
        {/* プロンプト入力 */}
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">
            この部分をどう変更しますか？
          </label>
          <textarea
            ref={textareaRef}
            value={region.prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="例: 青いボタンに変更して"
            className="w-full h-16 p-2 text-xs border rounded resize-none focus:ring-1 focus:ring-primary focus:outline-none"
            disabled={region.status === "generating"}
          />
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onGenerate();
            }}
            disabled={region.status === "generating" || !region.prompt.trim()}
          >
            {region.status === "generating" ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                生成中
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                生成
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs px-2"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            削除
          </Button>
        </div>

        {/* 生成結果 */}
        {region.resultDataUrl && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-[10px] text-muted-foreground">生成結果:</p>
            <div className="border rounded overflow-hidden bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={region.resultDataUrl}
                alt="Generated result"
                className="w-full h-auto"
                style={{ maxHeight: 150 }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply();
                }}
              >
                <Check className="w-3 h-3 mr-1" />
                適用
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate();
                }}
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {region.status === "error" && (
          <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
            生成に失敗しました。再度お試しください。
          </div>
        )}
      </div>
    </div>
  );
}

export default RegionChatBox;
