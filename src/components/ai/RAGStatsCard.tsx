"use client";

/**
 * RAGStatsCard - RAG+CAGコスト削減効果表示コンポーネント
 *
 * キャッシュヒット率、節約トークン数、コスト削減額を可視化
 * 30秒ごとに自動更新
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  TrendingUp,
  Database,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HybridStats {
  totalQueries: number;
  cacheHits: number;
  cacheHitRate: number;
  totalTokensSaved: number;
  estimatedCostSaved: number;
}

interface RAGStatsCardProps {
  projectId?: string;
  className?: string;
  compact?: boolean;
}

export function RAGStatsCard({
  projectId,
  className,
  compact = false,
}: RAGStatsCardProps) {
  const [stats, setStats] = useState<HybridStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const url = projectId
        ? `/api/hybrid-stats?projectId=${projectId}`
        : "/api/hybrid-stats";
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setStats(data.stats);
        setError(null);
        setLastUpdated(new Date());
      } else {
        setError(data.error || "統計の取得に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続エラー");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStats();

    // 30秒ごとに更新
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // ローディング状態
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-yellow-500" />
            RAG+CAG 統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // エラー状態
  if (error) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="w-5 h-5 text-destructive" />
            RAG+CAG 統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            再読み込み
          </button>
        </CardContent>
      </Card>
    );
  }

  // データなし
  if (!stats || stats.totalQueries === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-yellow-500" />
            RAG+CAG コスト削減効果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Database className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              まだデータがありません
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              AIを使用すると統計が記録されます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 円換算 (1USD = 150円として計算)
  const costSavedYen = Math.round(stats.estimatedCostSaved * 150);

  // コンパクト表示
  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">キャッシュヒット率</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {stats.cacheHitRate.toFixed(1)}%
              </Badge>
              <span className="text-sm font-bold text-green-600">
                ¥{costSavedYen.toLocaleString()} 節約
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 通常表示
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-yellow-500" />
            RAG+CAG コスト削減効果
          </CardTitle>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {lastUpdated.toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              更新
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* キャッシュヒット率 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              キャッシュヒット率
            </span>
            <Badge
              variant={stats.cacheHitRate >= 50 ? "default" : "secondary"}
              className={cn(
                stats.cacheHitRate >= 70 && "bg-green-500 hover:bg-green-600"
              )}
            >
              {stats.cacheHitRate.toFixed(1)}%
            </Badge>
          </div>
          <Progress value={stats.cacheHitRate} className="h-2" />
        </div>

        {/* 統計情報グリッド */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Database className="w-3 h-3" />
              総クエリ数
            </div>
            <div className="text-2xl font-bold">
              {stats.totalQueries.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              キャッシュヒット
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.cacheHits.toLocaleString()}
            </div>
          </div>
        </div>

        {/* コスト削減セクション */}
        <div className="pt-4 border-t bg-green-50 dark:bg-green-950/20 -mx-6 -mb-6 px-6 pb-4 rounded-b-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <span className="text-sm font-medium">推定コスト削減</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">
                ¥{costSavedYen.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                (${stats.estimatedCostSaved.toFixed(3)} USD)
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.totalTokensSaved.toLocaleString()} トークン節約
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RAGStatsCard;
