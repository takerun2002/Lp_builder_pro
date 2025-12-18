"use client";

/**
 * 編集ツールパネル
 * テキストレイヤーの編集オプション
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  useBannerEditorStore,
  selectSelectedLayer,
} from "@/lib/editor/banner-editor";
import { JAPANESE_FONTS, TextLayer } from "@/lib/editor/text-layer";

export function EditToolPanel() {
  const selectedLayer = useBannerEditorStore(selectSelectedLayer);
  const { updateLayer, removeLayer, duplicateLayer, moveLayer, saveToHistory } =
    useBannerEditorStore();

  if (!selectedLayer) {
    return (
      <div className="w-72 border-l bg-white p-4">
        <p className="text-sm text-gray-500 text-center">
          レイヤーを選択してください
        </p>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<TextLayer>) => {
    updateLayer(selectedLayer.id, updates);
  };

  const handleBlur = () => {
    saveToHistory();
  };

  return (
    <div className="w-72 border-l bg-white overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">編集ツール</h3>
      </div>

      <div className="p-4 space-y-6">
        {/* テキスト内容 */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">テキスト</Label>
          <Textarea
            value={selectedLayer.text}
            onChange={(e) => handleUpdate({ text: e.target.value })}
            onBlur={handleBlur}
            className="text-sm min-h-[80px]"
            placeholder="テキストを入力..."
          />
        </div>

        {/* フォントサイズ */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs font-medium">フォントサイズ</Label>
            <span className="text-xs text-gray-500">{selectedLayer.fontSize}px</span>
          </div>
          <Slider
            value={[selectedLayer.fontSize]}
            onValueChange={([v]) => handleUpdate({ fontSize: v })}
            onValueCommit={handleBlur}
            min={12}
            max={200}
            step={1}
          />
        </div>

        {/* フォントファミリー */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">フォント</Label>
          <select
            className="w-full p-2 border rounded-md text-sm"
            value={selectedLayer.fontFamily}
            onChange={(e) => {
              handleUpdate({ fontFamily: e.target.value });
              handleBlur();
            }}
          >
            {JAPANESE_FONTS.map((font) => (
              <option key={font.id} value={font.family}>
                {font.name}
              </option>
            ))}
          </select>
        </div>

        {/* テキスト色 */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">テキスト色</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={selectedLayer.color}
              onChange={(e) => handleUpdate({ color: e.target.value })}
              onBlur={handleBlur}
              className="w-10 h-10 rounded border cursor-pointer"
            />
            <Input
              value={selectedLayer.color}
              onChange={(e) => handleUpdate({ color: e.target.value })}
              onBlur={handleBlur}
              className="flex-1 text-sm"
              placeholder="#ffffff"
            />
          </div>
        </div>

        {/* 揃え */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">揃え</Label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((align) => (
              <Button
                key={align}
                variant={selectedLayer.align === align ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  handleUpdate({ align });
                  handleBlur();
                }}
              >
                {align === "left" ? "左" : align === "center" ? "中央" : "右"}
              </Button>
            ))}
          </div>
        </div>

        {/* フォントスタイル */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">スタイル</Label>
          <div className="flex gap-1">
            <Button
              variant={selectedLayer.bold ? "default" : "outline"}
              size="sm"
              className="flex-1 font-bold"
              onClick={() => {
                handleUpdate({ bold: !selectedLayer.bold });
                handleBlur();
              }}
            >
              B
            </Button>
            <Button
              variant={selectedLayer.italic ? "default" : "outline"}
              size="sm"
              className="flex-1 italic"
              onClick={() => {
                handleUpdate({ italic: !selectedLayer.italic });
                handleBlur();
              }}
            >
              I
            </Button>
            <Button
              variant={selectedLayer.underline ? "default" : "outline"}
              size="sm"
              className="flex-1 underline"
              onClick={() => {
                handleUpdate({ underline: !selectedLayer.underline });
                handleBlur();
              }}
            >
              U
            </Button>
          </div>
        </div>

        {/* 不透明度 */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs font-medium">不透明度</Label>
            <span className="text-xs text-gray-500">
              {Math.round(selectedLayer.opacity * 100)}%
            </span>
          </div>
          <Slider
            value={[selectedLayer.opacity * 100]}
            onValueChange={([v]) => handleUpdate({ opacity: v / 100 })}
            onValueCommit={handleBlur}
            min={0}
            max={100}
            step={1}
          />
        </div>

        {/* シャドウ */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="shadow-enabled"
              checked={selectedLayer.shadow.enabled}
              onChange={(e) => {
                handleUpdate({
                  shadow: { ...selectedLayer.shadow, enabled: e.target.checked },
                });
                handleBlur();
              }}
              className="rounded"
            />
            <Label htmlFor="shadow-enabled" className="text-xs font-medium">
              シャドウ
            </Label>
          </div>
          {selectedLayer.shadow.enabled && (
            <div className="space-y-2 pl-4 border-l-2">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedLayer.shadow.color}
                  onChange={(e) =>
                    handleUpdate({
                      shadow: { ...selectedLayer.shadow, color: e.target.value },
                    })
                  }
                  onBlur={handleBlur}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <div className="flex-1">
                  <Label className="text-xs">ぼかし: {selectedLayer.shadow.blur}px</Label>
                  <Slider
                    value={[selectedLayer.shadow.blur]}
                    onValueChange={([v]) =>
                      handleUpdate({
                        shadow: { ...selectedLayer.shadow, blur: v },
                      })
                    }
                    onValueCommit={handleBlur}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ストローク（縁取り） */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="stroke-enabled"
              checked={selectedLayer.stroke.enabled}
              onChange={(e) => {
                handleUpdate({
                  stroke: { ...selectedLayer.stroke, enabled: e.target.checked },
                });
                handleBlur();
              }}
              className="rounded"
            />
            <Label htmlFor="stroke-enabled" className="text-xs font-medium">
              縁取り
            </Label>
          </div>
          {selectedLayer.stroke.enabled && (
            <div className="space-y-2 pl-4 border-l-2">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedLayer.stroke.color}
                  onChange={(e) =>
                    handleUpdate({
                      stroke: { ...selectedLayer.stroke, color: e.target.value },
                    })
                  }
                  onBlur={handleBlur}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <div className="flex-1">
                  <Label className="text-xs">太さ: {selectedLayer.stroke.width}px</Label>
                  <Slider
                    value={[selectedLayer.stroke.width]}
                    onValueChange={([v]) =>
                      handleUpdate({
                        stroke: { ...selectedLayer.stroke, width: v },
                      })
                    }
                    onValueCommit={handleBlur}
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 区切り線 */}
        <hr className="my-4" />

        {/* レイヤー操作 */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">レイヤー操作</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveLayer(selectedLayer.id, "up")}
            >
              前面へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveLayer(selectedLayer.id, "down")}
            >
              背面へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => duplicateLayer(selectedLayer.id)}
            >
              複製
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeLayer(selectedLayer.id)}
            >
              削除
            </Button>
          </div>
        </div>

        {/* 位置 */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">位置</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">X</Label>
              <Input
                type="number"
                value={Math.round(selectedLayer.x)}
                onChange={(e) => handleUpdate({ x: Number(e.target.value) })}
                onBlur={handleBlur}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Y</Label>
              <Input
                type="number"
                value={Math.round(selectedLayer.y)}
                onChange={(e) => handleUpdate({ y: Number(e.target.value) })}
                onBlur={handleBlur}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
