"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwipeFile {
  id: string;
  name: string;
  file_path: string;
  category?: string;
  tone_manner?: string;
}

interface ReferenceLPSelectorProps {
  swipeFiles: SwipeFile[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  compact?: boolean;
}

/**
 * 参考LP選択コンポーネント
 *
 * AIアシスタントやマジックペンで参考LPを指定するためのUI
 * 選択するとそのLPのトンマナに合わせた生成が可能
 */
export function ReferenceLPSelector({
  swipeFiles,
  selectedId,
  onSelect,
  compact = false,
}: ReferenceLPSelectorProps) {
  const [showInfo, setShowInfo] = useState(false);

  const selectedSwipe = swipeFiles.find((sf) => sf.id === selectedId);

  if (compact) {
    // コンパクト表示（AIチャット用）
    return (
      <div className="flex items-center gap-2">
        <Select
          value={selectedId || "none"}
          onValueChange={(v) => onSelect(v === "none" ? null : v)}
        >
          <SelectTrigger className="h-7 text-xs w-[140px]">
            <SelectValue placeholder="参考LP..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">指定なし</span>
            </SelectItem>
            {swipeFiles.map((sf) => (
              <SelectItem key={sf.id} value={sf.id}>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate max-w-[100px]">{sf.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onSelect(null)}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  // 通常表示（設定パネル用）
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1">
          参考LP（トンマナ）
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </label>
        {selectedId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => onSelect(null)}
          >
            クリア
          </Button>
        )}
      </div>

      {showInfo && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md space-y-1">
          <p className="font-medium text-foreground">参考LPを選択すると：</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>選択したLPの色・フォント・スタイルに合わせて生成</li>
            <li>トンマナ（トーン＆マナー）を統一</li>
            <li>ブランドイメージを維持した画像生成</li>
          </ul>
        </div>
      )}

      <Select
        value={selectedId || "none"}
        onValueChange={(v) => onSelect(v === "none" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="参考LPを選択（オプション）" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">指定なし（デフォルト）</span>
          </SelectItem>
          {swipeFiles.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              スワイプファイルがありません
            </div>
          ) : (
            swipeFiles.map((sf) => (
              <SelectItem key={sf.id} value={sf.id}>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{sf.name}</span>
                    {sf.tone_manner && (
                      <span className="text-xs text-muted-foreground">
                        {sf.tone_manner}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* 選択中のLP プレビュー */}
      {selectedSwipe && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
          <div className="w-12 h-12 rounded overflow-hidden border shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/images/${selectedSwipe.file_path.split("/").pop()}`}
              alt={selectedSwipe.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedSwipe.name}</p>
            <p className="text-xs text-primary">
              このLPのトンマナで生成します
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReferenceLPSelector;
