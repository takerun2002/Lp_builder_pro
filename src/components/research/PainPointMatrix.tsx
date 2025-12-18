"use client";

/**
 * PainPointMatrix - ペインポイントマトリクス表示
 *
 * ペインポイントを深度×緊急性の4象限マトリクスで可視化
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, TrendingUp, Clock, MinusCircle } from "lucide-react";
import type {
  ClassifiedPainPoint,
  PainQuadrant,
} from "@/lib/research/analyzers/pain-classifier";

interface PainPointMatrixProps {
  painPoints: ClassifiedPainPoint[];
  onSelectPainPoint?: (painPoint: ClassifiedPainPoint) => void;
  selectedId?: string;
}

const QUADRANT_CONFIG: Record<
  PainQuadrant,
  {
    name: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    description: string;
  }
> = {
  priority: {
    name: "最優先",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: <AlertCircle className="w-4 h-4 text-red-600" />,
    description: "深い悩み × 高い緊急性 → メインコンセプトに採用",
  },
  important: {
    name: "重要",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: <TrendingUp className="w-4 h-4 text-orange-600" />,
    description: "深い悩み × 低い緊急性 → サブコンセプトに活用",
  },
  consider: {
    name: "検討",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: <Clock className="w-4 h-4 text-blue-600" />,
    description: "浅い悩み × 高い緊急性 → 限定訴求に活用",
  },
  ignore: {
    name: "低優先",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: <MinusCircle className="w-4 h-4 text-gray-400" />,
    description: "浅い悩み × 低い緊急性 → 優先度低",
  },
};

export function PainPointMatrix({
  painPoints,
  onSelectPainPoint,
  selectedId,
}: PainPointMatrixProps) {
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");

  // 象限ごとにグループ化
  const grouped = groupByQuadrant(painPoints);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">ペインポイント分類</h3>
          <p className="text-sm text-muted-foreground">
            深度（縦軸）× 緊急性（横軸）で4象限に分類
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "matrix" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("matrix")}
          >
            マトリクス
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            リスト
          </Button>
        </div>
      </div>

      {viewMode === "matrix" ? (
        <MatrixView
          grouped={grouped}
          onSelect={onSelectPainPoint}
          selectedId={selectedId}
        />
      ) : (
        <ListView
          painPoints={painPoints}
          onSelect={onSelectPainPoint}
          selectedId={selectedId}
        />
      )}

      {/* 統計 */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(QUADRANT_CONFIG) as PainQuadrant[]).map((q) => (
          <StatCard
            key={q}
            quadrant={q}
            count={grouped[q]?.length || 0}
          />
        ))}
      </div>
    </div>
  );
}

// マトリクスビュー
function MatrixView({
  grouped,
  onSelect,
  selectedId,
}: {
  grouped: Record<PainQuadrant, ClassifiedPainPoint[]>;
  onSelect?: (pp: ClassifiedPainPoint) => void;
  selectedId?: string;
}) {
  return (
    <div className="relative">
      {/* 軸ラベル */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground whitespace-nowrap">
        深度（深い ↑）
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-xs text-muted-foreground">
        緊急性（高い →）
      </div>

      {/* 2x2 グリッド */}
      <div className="grid grid-cols-2 gap-2 ml-4 mb-4">
        {/* 重要（左上） */}
        <QuadrantCell
          quadrant="important"
          painPoints={grouped.important || []}
          onSelect={onSelect}
          selectedId={selectedId}
        />
        {/* 最優先（右上） */}
        <QuadrantCell
          quadrant="priority"
          painPoints={grouped.priority || []}
          onSelect={onSelect}
          selectedId={selectedId}
        />
        {/* 低優先（左下） */}
        <QuadrantCell
          quadrant="ignore"
          painPoints={grouped.ignore || []}
          onSelect={onSelect}
          selectedId={selectedId}
        />
        {/* 検討（右下） */}
        <QuadrantCell
          quadrant="consider"
          painPoints={grouped.consider || []}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      </div>
    </div>
  );
}

// 象限セル
function QuadrantCell({
  quadrant,
  painPoints,
  onSelect,
  selectedId,
}: {
  quadrant: PainQuadrant;
  painPoints: ClassifiedPainPoint[];
  onSelect?: (pp: ClassifiedPainPoint) => void;
  selectedId?: string;
}) {
  const config = QUADRANT_CONFIG[quadrant];

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2 min-h-[200px]`}>
      <CardHeader className="py-2 px-3">
        <CardTitle className={`text-sm flex items-center gap-1 ${config.color}`}>
          {config.icon}
          {config.name}
          <Badge variant="outline" className="ml-auto text-xs">
            {painPoints.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3 space-y-1 max-h-[250px] overflow-y-auto">
        {painPoints.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">なし</p>
        ) : (
          <TooltipProvider>
            {painPoints.map((pp) => (
              <Tooltip key={pp.original}>
                <TooltipTrigger asChild>
                  <div
                    className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                      selectedId === pp.original
                        ? "bg-white ring-2 ring-blue-500"
                        : "bg-white/60 hover:bg-white"
                    }`}
                    onClick={() => onSelect?.(pp)}
                  >
                    <div className="font-medium line-clamp-2">{pp.summary}</div>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <span>深度: {pp.depth}</span>
                      <span>緊急性: {pp.urgency}</span>
                      <EmotionBadge intensity={pp.emotionalIntensity} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">{pp.original}</p>
                  {pp.keywords.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {pp.keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

// リストビュー
function ListView({
  painPoints,
  onSelect,
  selectedId,
}: {
  painPoints: ClassifiedPainPoint[];
  onSelect?: (pp: ClassifiedPainPoint) => void;
  selectedId?: string;
}) {
  // 優先度順にソート
  const sorted = [...painPoints].sort((a, b) => {
    const order: PainQuadrant[] = ["priority", "important", "consider", "ignore"];
    return order.indexOf(a.quadrant) - order.indexOf(b.quadrant);
  });

  return (
    <div className="space-y-2">
      {sorted.map((pp) => {
        const config = QUADRANT_CONFIG[pp.quadrant];
        return (
          <Card
            key={pp.original}
            className={`cursor-pointer transition-all ${
              selectedId === pp.original
                ? "ring-2 ring-blue-500"
                : "hover:shadow-md"
            }`}
            onClick={() => onSelect?.(pp)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded ${config.bgColor}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={`${config.bgColor} ${config.color} text-xs`}>
                      {config.name}
                    </Badge>
                    <EmotionBadge intensity={pp.emotionalIntensity} />
                    <PayWillingnessBadge level={pp.willingness_to_pay} />
                  </div>
                  <p className="font-medium mt-1">{pp.summary}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {pp.original}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>深度: {pp.depth}/5</span>
                    <span>緊急性: {pp.urgency}/5</span>
                    {pp.frequency > 1 && <span>出現: {pp.frequency}回</span>}
                  </div>
                  {pp.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pp.keywords.slice(0, 5).map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// 統計カード
function StatCard({
  quadrant,
  count,
}: {
  quadrant: PainQuadrant;
  count: number;
}) {
  const config = QUADRANT_CONFIG[quadrant];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`p-2 rounded text-center ${config.bgColor} ${config.borderColor} border`}
          >
            <div className={`text-lg font-bold ${config.color}`}>{count}</div>
            <div className={`text-xs ${config.color}`}>{config.name}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// 感情強度バッジ
function EmotionBadge({
  intensity,
}: {
  intensity: "low" | "medium" | "high";
}) {
  const colors = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };
  const labels = {
    low: "感情:弱",
    medium: "感情:中",
    high: "感情:強",
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[intensity]}`}>
      {labels[intensity]}
    </span>
  );
}

// 支払い意欲バッジ
function PayWillingnessBadge({
  level,
}: {
  level: "low" | "medium" | "high";
}) {
  const colors = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-green-100 text-green-700",
    high: "bg-emerald-100 text-emerald-700",
  };
  const labels = {
    low: "支払:低",
    medium: "支払:中",
    high: "支払:高",
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[level]}`}>
      {labels[level]}
    </span>
  );
}

// ヘルパー関数
function groupByQuadrant(
  painPoints: ClassifiedPainPoint[]
): Record<PainQuadrant, ClassifiedPainPoint[]> {
  const result: Record<PainQuadrant, ClassifiedPainPoint[]> = {
    priority: [],
    important: [],
    consider: [],
    ignore: [],
  };

  for (const pp of painPoints) {
    result[pp.quadrant].push(pp);
  }

  return result;
}

// ペインポイント選択サマリー
interface PainPointSummaryProps {
  selectedPainPoints: ClassifiedPainPoint[];
}

export function PainPointSummary({ selectedPainPoints }: PainPointSummaryProps) {
  const priorityCount = selectedPainPoints.filter(
    (pp) => pp.quadrant === "priority"
  ).length;
  const importantCount = selectedPainPoints.filter(
    (pp) => pp.quadrant === "important"
  ).length;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">選択中のペインポイント</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="flex items-center gap-4 text-sm">
          <span>合計: {selectedPainPoints.length}件</span>
          <span className="text-red-600">最優先: {priorityCount}件</span>
          <span className="text-orange-600">重要: {importantCount}件</span>
        </div>
      </CardContent>
    </Card>
  );
}
