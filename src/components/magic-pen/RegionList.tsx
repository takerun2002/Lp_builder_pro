"use client";

/**
 * RegionList - 右パネル領域リスト
 *
 * 塗った領域の一覧を表示
 * クリックで領域を選択、一括生成も可能
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, Play, Check, AlertCircle, Sparkles } from "lucide-react";
import type { MaskRegion } from "./utils/region-detection";

interface RegionListProps {
  regions: MaskRegion[];
  activeRegionId: string | null;
  onSelectRegion: (id: string) => void;
  onDeleteRegion: (id: string) => void;
  onGenerateAll: () => void;
  onApplyAll: () => void;
  onClearAll: () => void;
}

export function RegionList({
  regions,
  activeRegionId,
  onSelectRegion,
  onDeleteRegion,
  onGenerateAll,
  onApplyAll,
  onClearAll,
}: RegionListProps) {
  const isGenerating = regions.some((r) => r.status === "generating");
  const hasPrompts = regions.some((r) => r.prompt.trim());
  const allDone = regions.length > 0 && regions.every((r) => r.status === "done");
  const doneCount = regions.filter((r) => r.status === "done").length;

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">編集領域</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {regions.length === 0
            ? "ブラシで領域を塗ってください"
            : `${regions.length}個の領域 • ${doneCount}個完了`}
        </p>
      </div>

      {/* 領域リスト */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {regions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="w-6 h-6 opacity-50" />
            </div>
            <p className="text-xs">編集したい箇所を</p>
            <p className="text-xs">ブラシで塗ってください</p>
          </div>
        ) : (
          regions.map((region) => (
            <Card
              key={region.id}
              className={`cursor-pointer transition-all duration-150 ${
                region.id === activeRegionId
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => onSelectRegion(region.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  {/* 番号バッジ */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      region.status === "done"
                        ? "bg-green-500 text-white"
                        : region.status === "generating"
                        ? "bg-yellow-500 text-white"
                        : region.status === "error"
                        ? "bg-red-500 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {region.status === "generating" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : region.status === "done" ? (
                      <Check className="w-3 h-3" />
                    ) : region.status === "error" ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      region.number
                    )}
                  </div>

                  {/* コンテンツ */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium mb-0.5">
                      領域 {region.number}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {region.prompt || "（プロンプト未入力）"}
                    </p>
                    {region.status === "done" && (
                      <p className="text-[10px] text-green-600 mt-0.5">
                        生成完了 - 適用待ち
                      </p>
                    )}
                    {region.status === "error" && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        エラー - 再生成してください
                      </p>
                    )}
                  </div>

                  {/* 削除ボタン */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRegion(region.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* サムネイル（生成結果がある場合） */}
                {region.resultDataUrl && (
                  <div className="mt-2 border rounded overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={region.resultDataUrl}
                      alt={`Region ${region.number} result`}
                      className="w-full h-auto"
                      style={{ maxHeight: 80 }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* アクションボタン */}
      {regions.length > 0 && (
        <div className="p-4 border-t space-y-2">
          {/* 一括生成 */}
          <Button
            className="w-full"
            onClick={onGenerateAll}
            disabled={isGenerating || !hasPrompts}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                全領域を一括生成
              </>
            )}
          </Button>

          {/* 全て適用 */}
          {allDone && (
            <Button className="w-full" variant="secondary" onClick={onApplyAll}>
              <Check className="w-4 h-4 mr-2" />
              全て適用して完了
            </Button>
          )}

          {/* クリア */}
          <Button
            variant="outline"
            className="w-full"
            onClick={onClearAll}
            disabled={isGenerating}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            全領域をクリア
          </Button>
        </div>
      )}
    </div>
  );
}

export default RegionList;
