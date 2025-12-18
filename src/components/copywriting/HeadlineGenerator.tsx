"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  type HeadlineType,
  type HeadlineStatus,
  type HeadlineBatchItem,
  HEADLINE_TYPE_LABELS,
  PSYCHOLOGICAL_TRIGGERS,
} from "@/lib/copywriting/headline-generator";

// =============================================================================
// Headline Card Component
// =============================================================================

interface HeadlineCardProps {
  headline: HeadlineBatchItem;
  onStatusChange: (id: string, status: HeadlineStatus) => void;
  showScore?: boolean;
}

export function HeadlineCard({ headline, onStatusChange, showScore = true }: HeadlineCardProps) {
  const statusColors: Record<HeadlineStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    generating: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-800",
    error: "bg-red-100 text-red-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-200 text-red-900",
  };

  const statusLabels: Record<HeadlineStatus, string> = {
    pending: "保留",
    generating: "生成中",
    completed: "完了",
    error: "エラー",
    approved: "採用",
    rejected: "没",
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        headline.status === "approved"
          ? "border-green-300 bg-green-50"
          : headline.status === "rejected"
            ? "border-red-200 bg-red-50 opacity-60"
            : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-lg leading-tight mb-2">{headline.content || headline.text}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{headline.style}</Badge>
            {headline.triggers?.length > 0 && (
              <Badge variant="secondary">{headline.triggers[0]}</Badge>
            )}
            {showScore && headline.score !== undefined && (
              <Badge
                variant="outline"
                className={
                  headline.score >= 70
                    ? "bg-green-50 text-green-700"
                    : headline.score >= 50
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-red-50 text-red-700"
                }
              >
                スコア: {headline.score}
              </Badge>
            )}
          </div>
        </div>
        <Badge className={statusColors[headline.status]}>
          {statusLabels[headline.status]}
        </Badge>
      </div>

      {/* Status Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t">
        {headline.status !== "approved" && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => onStatusChange(headline.id, "approved")}
          >
            採用
          </Button>
        )}
        {headline.status !== "pending" && (
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            onClick={() => onStatusChange(headline.id, "pending")}
          >
            保留
          </Button>
        )}
        {headline.status !== "rejected" && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => onStatusChange(headline.id, "rejected")}
          >
            没
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Headline Type Selector
// =============================================================================

interface HeadlineTypeSelectorProps {
  selectedTypes: HeadlineType[];
  onSelectionChange: (types: HeadlineType[]) => void;
}

export function HeadlineTypeSelector({
  selectedTypes,
  onSelectionChange,
}: HeadlineTypeSelectorProps) {
  const allTypes = Object.keys(HEADLINE_TYPE_LABELS) as HeadlineType[];

  const handleToggle = (type: HeadlineType) => {
    if (selectedTypes.includes(type)) {
      onSelectionChange(selectedTypes.filter((t) => t !== type));
    } else {
      onSelectionChange([...selectedTypes, type]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === allTypes.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allTypes);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">セクション選択</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            {selectedTypes.length === allTypes.length ? "すべて解除" : "すべて選択"}
          </Button>
        </div>
        <CardDescription>
          生成するヘッドラインのセクションを選択
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => handleToggle(type)}
              />
              <Label htmlFor={type} className="text-sm cursor-pointer">
                {HEADLINE_TYPE_LABELS[type]}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Psychological Trigger Selector
// =============================================================================

interface TriggerSelectorProps {
  selectedTriggers: string[];
  onSelectionChange: (triggers: string[]) => void;
}

export function TriggerSelector({
  selectedTriggers,
  onSelectionChange,
}: TriggerSelectorProps) {
  const handleToggle = (triggerId: string) => {
    if (selectedTriggers.includes(triggerId)) {
      onSelectionChange(selectedTriggers.filter((t) => t !== triggerId));
    } else {
      onSelectionChange([...selectedTriggers, triggerId]);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">心理トリガー選択</CardTitle>
        <CardDescription>
          使用する心理トリガーを選択（選択なしは全て使用）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {PSYCHOLOGICAL_TRIGGERS.map((trigger) => (
            <Badge
              key={trigger.id}
              variant={selectedTriggers.includes(trigger.name) ? "default" : "outline"}
              className="cursor-pointer hover:opacity-80"
              onClick={() => handleToggle(trigger.name)}
            >
              {trigger.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Generation Progress
// =============================================================================

interface GenerationProgressProps {
  current: number;
  total: number;
  currentType?: HeadlineType;
}

export function GenerationProgress({
  current,
  total,
  currentType,
}: GenerationProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              生成中{currentType && `（${HEADLINE_TYPE_LABELS[currentType]}）`}
            </span>
            <span>
              {current}/{total}
            </span>
          </div>
          <Progress value={percentage} />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Headline Stats
// =============================================================================

interface HeadlineStatsProps {
  headlines: HeadlineBatchItem[];
}

export function HeadlineStats({ headlines }: HeadlineStatsProps) {
  const stats = {
    total: headlines.length,
    approved: headlines.filter((h) => h.status === "approved").length,
    pending: headlines.filter((h) => h.status === "pending").length,
    rejected: headlines.filter((h) => h.status === "rejected").length,
    completed: headlines.filter((h) => h.status === "completed").length,
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">生成済み</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <p className="text-xs text-muted-foreground">採用</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">保留</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <p className="text-xs text-muted-foreground">没</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
          <p className="text-xs text-muted-foreground">完了</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Headline List
// =============================================================================

interface HeadlineListProps {
  headlines: HeadlineBatchItem[];
  onStatusChange: (id: string, status: HeadlineStatus) => void;
  filterStatus?: HeadlineStatus | "all";
  sortByScore?: boolean;
}

export function HeadlineList({
  headlines,
  onStatusChange,
  filterStatus = "all",
  sortByScore = false,
}: HeadlineListProps) {
  let filteredHeadlines = headlines;

  if (filterStatus !== "all") {
    filteredHeadlines = headlines.filter((h) => h.status === filterStatus);
  }

  if (sortByScore) {
    filteredHeadlines = [...filteredHeadlines].sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );
  }

  if (filteredHeadlines.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        ヘッドラインがありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredHeadlines.map((headline) => (
        <HeadlineCard
          key={headline.id}
          headline={headline}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
