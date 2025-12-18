"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Settings, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  SCRAPER_OPTIONS,
  SOURCE_API_MAPPINGS,
  API_FREE_QUOTAS,
  RESEARCH_PRESETS,
  type DataSource,
  type ResearchPreset,
  type ApiProvider,
  type ResearchPresetId,
} from "@/lib/research/types";

interface ApiStatusInfo {
  configured: boolean;
  name: string;
  freeQuota: number;
  quotaPeriod: string;
  costPerRequest: number;
  remainingQuota: number | null;
}

interface ResearchSourceSelectorProps {
  selectedSources: DataSource[];
  onSourcesChange: (sources: DataSource[]) => void;
  selectedPreset?: ResearchPresetId;
  onPresetChange?: (preset: ResearchPresetId) => void;
}

export function ResearchSourceSelector({
  selectedSources,
  onSourcesChange,
  selectedPreset: externalPreset,
  onPresetChange,
}: ResearchSourceSelectorProps) {
  const [apiStatus, setApiStatus] = useState<Record<ApiProvider, ApiStatusInfo>>({} as Record<ApiProvider, ApiStatusInfo>);
  const [selectedPreset, setSelectedPreset] = useState<ResearchPresetId>(externalPreset || "standard");
  const [loading, setLoading] = useState(true);

  // APIステータスを取得
  useEffect(() => {
    fetch("/api/settings/api-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setApiStatus(data.status);
        }
      })
      .catch(() => {
        // エラー時は空のステータス
      })
      .finally(() => setLoading(false));
  }, []);

  // 外部からのプリセット変更を反映
  useEffect(() => {
    if (externalPreset && externalPreset !== selectedPreset) {
      setSelectedPreset(externalPreset);
    }
  }, [externalPreset, selectedPreset]);

  // プリセット選択時
  const handlePresetSelect = useCallback((preset: ResearchPreset) => {
    setSelectedPreset(preset.id);
    onPresetChange?.(preset.id);
    if (preset.id !== "custom") {
      onSourcesChange(preset.enabledSources);
    }
  }, [onSourcesChange, onPresetChange]);

  // ソース切り替え
  const toggleSource = useCallback((source: DataSource) => {
    setSelectedPreset("custom");
    onPresetChange?.("custom");
    if (selectedSources.includes(source)) {
      onSourcesChange(selectedSources.filter((s) => s !== source));
    } else {
      onSourcesChange([...selectedSources, source]);
    }
  }, [selectedSources, onSourcesChange, onPresetChange]);

  // コスト計算
  const calculateCost = useCallback(() => {
    let totalCost = 0;
    const breakdown: { api: string; requests: number; cost: number; isFree: boolean }[] = [];
    const apiRequests: Record<string, number> = {};

    for (const source of selectedSources) {
      const mapping = SOURCE_API_MAPPINGS.find((m) => m.source === source);
      if (!mapping) continue;

      const quota = API_FREE_QUOTAS.find((q) => q.provider === mapping.primaryApi);
      if (!quota) continue;

      // API別にリクエスト数を集計
      apiRequests[quota.provider] = (apiRequests[quota.provider] || 0) + mapping.estimatedRequests;
    }

    // API別にコスト計算
    for (const [api, requests] of Object.entries(apiRequests)) {
      const quota = API_FREE_QUOTAS.find((q) => q.provider === api);
      if (!quota) continue;

      const isFree = quota.freeQuota > 0;
      const cost = isFree ? 0 : (quota.costPerRequest || 0) * requests;
      totalCost += cost;

      breakdown.push({
        api: quota.name,
        requests,
        cost,
        isFree,
      });
    }

    return { total: totalCost, breakdown };
  }, [selectedSources]);

  const { total, breakdown } = calculateCost();

  // ソースに必要なAPIが設定されているか
  const getSourceApiStatus = useCallback((source: DataSource) => {
    const mapping = SOURCE_API_MAPPINGS.find((m) => m.source === source);
    if (!mapping) return { available: false, api: "unknown" as ApiProvider, freeQuota: 0 };

    const status = apiStatus[mapping.primaryApi];
    return {
      available: status?.configured ?? false,
      api: mapping.primaryApi,
      freeQuota: status?.freeQuota ?? 0,
      remainingQuota: status?.remainingQuota,
    };
  }, [apiStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* プリセット選択 */}
      <div>
        <h3 className="text-sm font-semibold mb-3">クイックスタート</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {RESEARCH_PRESETS.map((preset) => (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all ${
                selectedPreset === preset.id
                  ? "border-2 border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handlePresetSelect(preset)}
            >
              <CardContent className="p-3 text-center">
                <div className="text-2xl mb-1">{preset.icon}</div>
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground">{preset.estimatedCost}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* API設定状況 */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          API設定状況
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Settings className="w-3 h-3 mr-1" />
              設定
            </Button>
          </Link>
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(apiStatus).map(([api, status]) => (
            <Badge
              key={api}
              variant={status.configured ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {status.configured ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-yellow-500" />
              )}
              {status.name}
              {status.freeQuota > 0 && status.configured && (
                <span className="text-[10px] opacity-70">
                  (無料{status.remainingQuota ?? status.freeQuota}/{status.quotaPeriod === "minute" ? "分" : status.quotaPeriod === "month" ? "月" : status.quotaPeriod})
                </span>
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* ソース選択 */}
      <div>
        <h3 className="text-sm font-semibold mb-3">リサーチソース</h3>
        <div className="space-y-2">
          {SCRAPER_OPTIONS.map((option) => {
            const apiInfo = getSourceApiStatus(option.id);
            const isSelected = selectedSources.includes(option.id);

            return (
              <Card
                key={option.id}
                className={`transition-all ${
                  isSelected ? "border-primary/50 bg-primary/5" : ""
                } ${!apiInfo.available && isSelected ? "border-yellow-500/50" : ""}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{option.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{option.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {apiInfo.api}
                          </Badge>
                          {apiInfo.freeQuota > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              無料枠
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                        {!apiInfo.available && (
                          <Link href="/settings" className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            APIキー未設定
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => toggleSource(option.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* コスト見積もり */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">推定コスト</h3>
          {breakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">ソースを選択してください</p>
          ) : (
            <div className="space-y-1 text-xs">
              {breakdown.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.api} ({item.requests}リクエスト)</span>
                  <span className={item.isFree ? "text-green-600" : ""}>
                    {item.isFree ? "無料枠内" : `$${item.cost.toFixed(2)}`}
                  </span>
                </div>
              ))}
              <div className="border-t pt-1 mt-2 flex justify-between font-semibold">
                <span>合計</span>
                <span className={total === 0 ? "text-green-600" : ""}>
                  {total === 0 ? "$0 (無料)" : `~$${total.toFixed(2)}`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
