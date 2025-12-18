"use client";

/**
 * 画像品質セレクター
 * ツールバー用のコンパクトな品質選択UI
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ImageQuality = "1k" | "2k" | "4k";

export const QUALITY_CONFIG: Record<
  ImageQuality,
  { width: number; height: number; label: string; cost: string; emoji: string }
> = {
  "1k": { width: 1024, height: 1024, label: "1K", cost: "低", emoji: "💨" },
  "2k": { width: 2048, height: 2048, label: "2K", cost: "中", emoji: "⭐" },
  "4k": { width: 4096, height: 4096, label: "4K", cost: "高", emoji: "💎" },
};

interface QualitySelectorProps {
  value: ImageQuality;
  onChange: (value: ImageQuality) => void;
  compact?: boolean;
}

export function QualitySelector({ value, onChange, compact = false }: QualitySelectorProps) {
  if (compact) {
    return (
      <Select value={value} onValueChange={(v) => onChange(v as ImageQuality)}>
        <SelectTrigger className="w-[85px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1k">
            <span className="flex items-center gap-1">
              <span>💨</span>
              <span>1K</span>
            </span>
          </SelectItem>
          <SelectItem value="2k">
            <span className="flex items-center gap-1">
              <span>⭐</span>
              <span>2K</span>
            </span>
          </SelectItem>
          <SelectItem value="4k">
            <span className="flex items-center gap-1">
              <span>💎</span>
              <span>4K</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ImageQuality)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1k">
          <div className="flex items-center gap-2">
            <span>💨</span>
            <div>
              <p className="font-medium">1K (1024px)</p>
              <p className="text-xs text-muted-foreground">低コスト・高速</p>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="2k">
          <div className="flex items-center gap-2">
            <span>⭐</span>
            <div>
              <p className="font-medium">2K (2048px)</p>
              <p className="text-xs text-muted-foreground">推奨・バランス型</p>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="4k">
          <div className="flex items-center gap-2">
            <span>💎</span>
            <div>
              <p className="font-medium">4K (4096px)</p>
              <p className="text-xs text-muted-foreground">高品質・印刷向け</p>
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
