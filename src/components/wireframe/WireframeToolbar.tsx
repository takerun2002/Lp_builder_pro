"use client";

/**
 * WireframeToolbar - ワイヤーフレームツールバー
 *
 * 表示設定、ズーム、削除などのツールバー
 */

import type { WireframeSettings } from "@/lib/wireframe/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Grid3X3,
  Tag,
  Square,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";

interface WireframeToolbarProps {
  settings: WireframeSettings;
  onSettingsChange: (settings: Partial<WireframeSettings>) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
}

export function WireframeToolbar({
  settings,
  onSettingsChange,
  onDeleteSelected,
  hasSelection,
}: WireframeToolbarProps) {
  const zoomOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="flex items-center gap-4 p-2 border-b bg-background">
      {/* グリッド表示 */}
      <div className="flex items-center gap-2">
        <Grid3X3 className="w-4 h-4 text-muted-foreground" />
        <Switch
          checked={settings.showGrid}
          onCheckedChange={(checked) => onSettingsChange({ showGrid: checked })}
        />
        <Label className="text-xs">グリッド</Label>
      </div>

      {/* グリッドにスナップ */}
      <div className="flex items-center gap-2">
        <Switch
          checked={settings.snapToGrid}
          onCheckedChange={(checked) => onSettingsChange({ snapToGrid: checked })}
        />
        <Label className="text-xs">スナップ</Label>
      </div>

      {/* グリッドサイズ */}
      <div className="flex items-center gap-2">
        <Label className="text-xs">サイズ</Label>
        <Select
          value={String(settings.gridSize)}
          onValueChange={(v) => onSettingsChange({ gridSize: Number(v) })}
        >
          <SelectTrigger className="w-16 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5px</SelectItem>
            <SelectItem value="10">10px</SelectItem>
            <SelectItem value="20">20px</SelectItem>
            <SelectItem value="25">25px</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* ラベル表示 */}
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-muted-foreground" />
        <Switch
          checked={settings.showLabels}
          onCheckedChange={(checked) => onSettingsChange({ showLabels: checked })}
        />
        <Label className="text-xs">ラベル</Label>
      </div>

      {/* 枠線表示 */}
      <div className="flex items-center gap-2">
        <Square className="w-4 h-4 text-muted-foreground" />
        <Switch
          checked={settings.showBorders}
          onCheckedChange={(checked) => onSettingsChange({ showBorders: checked })}
        />
        <Label className="text-xs">枠線</Label>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* ズーム */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            const currentIndex = zoomOptions.indexOf(settings.zoom);
            if (currentIndex > 0) {
              onSettingsChange({ zoom: zoomOptions[currentIndex - 1] });
            }
          }}
          disabled={settings.zoom <= zoomOptions[0]}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs w-12 text-center">
          {Math.round(settings.zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            const currentIndex = zoomOptions.indexOf(settings.zoom);
            if (currentIndex < zoomOptions.length - 1) {
              onSettingsChange({ zoom: zoomOptions[currentIndex + 1] });
            }
          }}
          disabled={settings.zoom >= zoomOptions[zoomOptions.length - 1]}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onSettingsChange({ zoom: 1 })}
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* 削除ボタン */}
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600"
        onClick={onDeleteSelected}
        disabled={!hasSelection}
      >
        <Trash2 className="w-4 h-4 mr-1" />
        削除
      </Button>
    </div>
  );
}
