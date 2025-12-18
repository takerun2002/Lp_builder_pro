"use client";

/**
 * GlobalRulesEditor - グローバルデザインルール編集
 *
 * アスペクト比、カラースキーム、フォントスタイルなど
 */

import type {
  GlobalDesignRules,
  AspectRatio,
  FontStyle,
  ColorSchemeType,
} from "@/lib/structure/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GlobalRulesEditorProps {
  rules: GlobalDesignRules;
  onChange: (rules: GlobalDesignRules) => void;
}

const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "2:3", label: "2:3 (縦長)" },
  { value: "3:4", label: "3:4 (縦長)" },
  { value: "9:16", label: "9:16 (スマホ縦)" },
  { value: "1:1", label: "1:1 (正方形)" },
  { value: "4:3", label: "4:3 (横長)" },
  { value: "16:9", label: "16:9 (横長)" },
];

const FONT_STYLE_OPTIONS: { value: FontStyle; label: string }[] = [
  { value: "formal", label: "フォーマル" },
  { value: "casual", label: "カジュアル" },
  { value: "elegant", label: "エレガント" },
  { value: "pop", label: "ポップ" },
  { value: "modern", label: "モダン" },
  { value: "traditional", label: "伝統的" },
];

const COLOR_SCHEME_OPTIONS: { value: ColorSchemeType; label: string }[] = [
  { value: "luxury", label: "ラグジュアリー" },
  { value: "natural", label: "ナチュラル" },
  { value: "corporate", label: "コーポレート" },
  { value: "warm", label: "ウォーム" },
  { value: "cool", label: "クール" },
  { value: "vibrant", label: "ビビッド" },
  { value: "minimal", label: "ミニマル" },
];

export function GlobalRulesEditor({ rules, onChange }: GlobalRulesEditorProps) {
  const updateRules = (updates: Partial<GlobalDesignRules>) => {
    onChange({ ...rules, ...updates });
  };

  const updateColorScheme = (updates: Partial<GlobalDesignRules["colorScheme"]>) => {
    onChange({
      ...rules,
      colorScheme: { ...rules.colorScheme, ...updates },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">グローバルデザインルール</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* アスペクト比 */}
        <div className="space-y-2">
          <Label>アスペクト比</Label>
          <Select
            value={rules.aspectRatio}
            onValueChange={(v) => updateRules({ aspectRatio: v as AspectRatio })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* フォントスタイル */}
        <div className="space-y-2">
          <Label>フォントスタイル</Label>
          <Select
            value={rules.fontStyle}
            onValueChange={(v) => updateRules({ fontStyle: v as FontStyle })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_STYLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* カラースキームタイプ */}
        <div className="space-y-2">
          <Label>カラースキーム</Label>
          <Select
            value={rules.colorScheme.type}
            onValueChange={(v) => updateColorScheme({ type: v as ColorSchemeType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_SCHEME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 背景スタイル */}
        <div className="space-y-2 md:col-span-2">
          <Label>背景スタイル</Label>
          <Input
            value={rules.backgroundStyle}
            onChange={(e) => updateRules({ backgroundStyle: e.target.value })}
            placeholder="例: シルク素材のテクスチャを薄く敷く"
          />
        </div>

        {/* 全体のムード */}
        <div className="space-y-2 md:col-span-2 lg:col-span-3">
          <Label>全体のムード・雰囲気</Label>
          <Textarea
            value={rules.overallMood}
            onChange={(e) => updateRules({ overallMood: e.target.value })}
            placeholder="例: 上品で洗練された、信頼感のある雰囲気"
            rows={2}
          />
        </div>

        {/* カラー設定（折りたたみ可能にしても良い） */}
        <div className="space-y-2">
          <Label>プライマリカラー</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={rules.colorScheme.primary}
              onChange={(e) => updateColorScheme({ primary: e.target.value })}
              className="w-12 h-9 p-1"
            />
            <Input
              value={rules.colorScheme.primary}
              onChange={(e) => updateColorScheme({ primary: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>セカンダリカラー</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={rules.colorScheme.secondary}
              onChange={(e) => updateColorScheme({ secondary: e.target.value })}
              className="w-12 h-9 p-1"
            />
            <Input
              value={rules.colorScheme.secondary}
              onChange={(e) => updateColorScheme({ secondary: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>アクセントカラー</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={rules.colorScheme.accent}
              onChange={(e) => updateColorScheme({ accent: e.target.value })}
              className="w-12 h-9 p-1"
            />
            <Input
              value={rules.colorScheme.accent}
              onChange={(e) => updateColorScheme({ accent: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
