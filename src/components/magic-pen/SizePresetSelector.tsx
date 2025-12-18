"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type SizePreset,
  type PresetCategory,
  SIZE_PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  createCustomPreset,
  validateSize,
} from "@/lib/image/size-presets";
import {
  generateBlankCanvas,
  createReferenceCanvas,
  type GeneratedCanvas,
} from "@/lib/image/blank-canvas-generator";

// =============================================================================
// Types
// =============================================================================

interface SizePresetSelectorProps {
  selectedPreset?: SizePreset;
  onPresetSelect: (preset: SizePreset) => void;
  onBlankCanvasGenerate?: (canvas: GeneratedCanvas) => void;
  showBlankCanvasOption?: boolean;
  defaultUseBlankCanvas?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function SizePresetSelector({
  selectedPreset,
  onPresetSelect,
  onBlankCanvasGenerate,
  showBlankCanvasOption = true,
  defaultUseBlankCanvas = true,
}: SizePresetSelectorProps) {
  // State
  const [activeCategory, setActiveCategory] = useState<PresetCategory>("lp");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [useBlankCanvas, setUseBlankCanvas] = useState(defaultUseBlankCanvas);
  const [canvasStyle, setCanvasStyle] = useState<"clean" | "manga" | "photo" | "illustration">("clean");
  const [customError, setCustomError] = useState<string | null>(null);

  // Memoized presets by category
  const presetsByCategory = useMemo(() => {
    return PRESET_CATEGORIES.reduce(
      (acc, cat) => {
        if (cat.id !== "custom") {
          acc[cat.id] = getPresetsByCategory(cat.id);
        }
        return acc;
      },
      {} as Record<PresetCategory, SizePreset[]>
    );
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (preset: SizePreset) => {
      onPresetSelect(preset);

      // Generate blank canvas if option is enabled
      if (useBlankCanvas && onBlankCanvasGenerate) {
        try {
          const canvas = createReferenceCanvas(preset.width, preset.height, canvasStyle);
          onBlankCanvasGenerate(canvas);
        } catch (error) {
          console.error("Failed to generate blank canvas:", error);
        }
      }
    },
    [onPresetSelect, onBlankCanvasGenerate, useBlankCanvas, canvasStyle]
  );

  // Handle custom size
  const handleCustomApply = useCallback(() => {
    const width = parseInt(customWidth);
    const height = parseInt(customHeight);

    if (isNaN(width) || isNaN(height)) {
      setCustomError("数値を入力してください");
      return;
    }

    const validation = validateSize(width, height);
    if (!validation.valid) {
      setCustomError(validation.error || "無効なサイズです");
      return;
    }

    setCustomError(null);
    const customPreset = createCustomPreset(width, height);
    handlePresetSelect(customPreset);
  }, [customWidth, customHeight, handlePresetSelect]);

  // Handle blank canvas toggle
  const handleBlankCanvasChange = useCallback(
    (checked: boolean) => {
      setUseBlankCanvas(checked);

      // If enabled and a preset is already selected, generate canvas
      if (checked && selectedPreset && onBlankCanvasGenerate) {
        try {
          const canvas = createReferenceCanvas(
            selectedPreset.width,
            selectedPreset.height,
            canvasStyle
          );
          onBlankCanvasGenerate(canvas);
        } catch (error) {
          console.error("Failed to generate blank canvas:", error);
        }
      }
    },
    [selectedPreset, onBlankCanvasGenerate, canvasStyle]
  );

  // Generate blank canvas preview
  const generatePreview = useCallback(() => {
    if (!selectedPreset) return;

    try {
      const canvas = generateBlankCanvas({
        width: Math.min(selectedPreset.width, 400),
        height: Math.min(selectedPreset.height, 300),
        guideLine: canvasStyle === "manga" || canvasStyle === "photo",
        border: canvasStyle === "manga" ? { width: 1, color: "#000" } : undefined,
      });
      return canvas.dataUrl;
    } catch {
      return undefined;
    }
  }, [selectedPreset, canvasStyle]);

  const previewDataUrl = useMemo(() => generatePreview(), [generatePreview]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">サイズプリセット</CardTitle>
        <CardDescription>
          画像生成サイズを選択してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as PresetCategory)}>
          <TabsList className="w-full flex-wrap h-auto">
            {PRESET_CATEGORIES.filter((c) => c.id !== "custom").map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="flex-1">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Preset Lists */}
          {PRESET_CATEGORIES.filter((c) => c.id !== "custom").map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-4">
              <div className="space-y-2">
                {presetsByCategory[category.id]?.map((preset) => (
                  <PresetOption
                    key={preset.id}
                    preset={preset}
                    isSelected={selectedPreset?.id === preset.id}
                    onClick={() => handlePresetSelect(preset)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Custom Size */}
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium">カスタムサイズ</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              placeholder="幅"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              placeholder="高さ"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              className="w-24"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCustomApply}
              disabled={!customWidth || !customHeight}
            >
              適用
            </Button>
          </div>
          {customError && (
            <p className="text-sm text-red-500 mt-1">{customError}</p>
          )}
        </div>

        {/* Blank Canvas Option */}
        {showBlankCanvasOption && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="useBlankCanvas"
                checked={useBlankCanvas}
                onCheckedChange={(checked) => handleBlankCanvasChange(!!checked)}
              />
              <div className="space-y-1">
                <Label htmlFor="useBlankCanvas" className="cursor-pointer font-medium">
                  白紙キャンバスを参考画像に設定
                </Label>
                <p className="text-sm text-muted-foreground">
                  白紙を参考画像にすると出力精度が向上します（推奨）
                </p>
              </div>
            </div>

            {useBlankCanvas && (
              <div className="space-y-3 pl-6">
                {/* Canvas Style Selection */}
                <div className="space-y-2">
                  <Label className="text-sm">キャンバススタイル</Label>
                  <div className="flex flex-wrap gap-2">
                    {(["clean", "manga", "photo", "illustration"] as const).map((style) => (
                      <Button
                        key={style}
                        variant={canvasStyle === style ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCanvasStyle(style)}
                      >
                        {style === "clean" && "クリーン"}
                        {style === "manga" && "漫画"}
                        {style === "photo" && "写真"}
                        {style === "illustration" && "イラスト"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {selectedPreset && previewDataUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm">プレビュー</Label>
                    <div className="border rounded-lg p-2 bg-gray-50 inline-block">
                      <img
                        src={previewDataUrl}
                        alt="Canvas preview"
                        className="max-w-[200px] max-h-[150px] border"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedPreset.width} × {selectedPreset.height}px
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Preset Display */}
        {selectedPreset && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">選択中</Label>
            <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedPreset.name}</span>
                <Badge variant="secondary">
                  {selectedPreset.width}×{selectedPreset.height}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                アスペクト比: {selectedPreset.aspectRatio}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Preset Option Component
// =============================================================================

interface PresetOptionProps {
  preset: SizePreset;
  isSelected: boolean;
  onClick: () => void;
}

function PresetOption({ preset, isSelected, onClick }: PresetOptionProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            isSelected ? "border-primary" : "border-muted-foreground"
          }`}
        >
          {isSelected && (
            <div className="w-2 h-2 rounded-full bg-primary" />
          )}
        </div>
        <div>
          <p className="font-medium text-sm">{preset.name}</p>
          {preset.description && (
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <Badge variant="outline" className="text-xs">
          {preset.width}×{preset.height}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">{preset.aspectRatio}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Compact Version for Inline Use
// =============================================================================

interface CompactSizePresetSelectorProps {
  selectedPreset?: SizePreset;
  onPresetSelect: (preset: SizePreset) => void;
}

export function CompactSizePresetSelector({
  selectedPreset,
  onPresetSelect,
}: CompactSizePresetSelectorProps) {
  const popularPresets = [
    SIZE_PRESETS.find((p) => p.id === "lp-hero-pc"),
    SIZE_PRESETS.find((p) => p.id === "lp-hero-mobile"),
    SIZE_PRESETS.find((p) => p.id === "youtube-thumbnail"),
    SIZE_PRESETS.find((p) => p.id === "instagram-feed"),
    SIZE_PRESETS.find((p) => p.id === "instagram-story"),
  ].filter(Boolean) as SizePreset[];

  return (
    <div className="flex flex-wrap gap-2">
      {popularPresets.map((preset) => (
        <Button
          key={preset.id}
          variant={selectedPreset?.id === preset.id ? "default" : "outline"}
          size="sm"
          onClick={() => onPresetSelect(preset)}
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}
