"use client";

/**
 * CompetitorCard - 競合LP分析結果表示カード
 *
 * 競合LPの分析結果を表示し、コンセプト・パワーワード等を確認できる
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
  Shield,
  Clock,
  MessageSquare,
  DollarSign,
  ImageOff,
} from "lucide-react";
import type { CompetitorAnalysis } from "@/lib/research/analyzers/concept-extractor";

interface CompetitorCardProps {
  competitor: CompetitorAnalysis;
  onCopyKeyword?: (keyword: string) => void;
  onOpenUrl?: (url: string) => void;
}

export function CompetitorCard({
  competitor,
  onCopyKeyword,
  onOpenUrl,
}: CompetitorCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    onCopyKeyword?.(text);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          {/* サムネイル */}
          <div className="w-20 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
            {competitor.thumbnailUrl ? (
              <img
                src={competitor.thumbnailUrl}
                alt={competitor.concept || "LP"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`w-full h-full flex items-center justify-center ${competitor.thumbnailUrl ? "hidden" : ""}`}>
              <ImageOff className="w-6 h-6 text-muted-foreground/50" />
            </div>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight line-clamp-2">
              {competitor.concept || "コンセプト未検出"}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                {getDomain(competitor.url)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => onOpenUrl?.(competitor.url)}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ターゲットの痛み & ベネフィット */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Target className="w-3 h-3" />
              ターゲットの痛み
            </div>
            <p className="text-xs line-clamp-2">
              {competitor.targetPain || "-"}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Shield className="w-3 h-3" />
              ベネフィット
            </div>
            <p className="text-xs line-clamp-2">{competitor.benefit || "-"}</p>
          </div>
        </div>

        {/* パワーワード */}
        {competitor.powerWords.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">パワーワード</div>
            <div className="flex flex-wrap gap-1">
              {competitor.powerWords.slice(0, expanded ? 20 : 5).map((pw, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleCopy(pw)}
                >
                  {pw}
                </Badge>
              ))}
              {!expanded && competitor.powerWords.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{competitor.powerWords.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        {competitor.ctaTexts.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">CTA文言</div>
            <div className="flex flex-wrap gap-1">
              {competitor.ctaTexts.slice(0, 3).map((cta, i) => (
                <Badge
                  key={i}
                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                  onClick={() => handleCopy(cta)}
                >
                  {cta}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 詳細情報（展開時） */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {/* メトリクス */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {competitor.pricePoint && (
                <MetricItem
                  icon={<DollarSign className="w-3 h-3" />}
                  label="価格"
                  value={`¥${competitor.pricePoint.toLocaleString()}`}
                />
              )}
              {competitor.testimonialCount && (
                <MetricItem
                  icon={<MessageSquare className="w-3 h-3" />}
                  label="お客様の声"
                  value={`${competitor.testimonialCount}件`}
                />
              )}
              {competitor.guaranteeType && (
                <MetricItem
                  icon={<Shield className="w-3 h-3" />}
                  label="保証"
                  value={competitor.guaranteeType}
                />
              )}
            </div>

            {/* 緊急性戦術 */}
            {competitor.urgencyTactics.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  緊急性戦術
                </div>
                <div className="flex flex-wrap gap-1">
                  {competitor.urgencyTactics.map((tactic, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tactic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 信頼要素 */}
            {competitor.trustElements.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">信頼要素</div>
                <ul className="text-xs space-y-1">
                  {competitor.trustElements.map((elem, i) => (
                    <li key={i} className="text-muted-foreground">
                      • {elem}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 感情トリガー */}
            {competitor.emotionalTriggers.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  感情トリガー
                </div>
                <div className="flex flex-wrap gap-1">
                  {competitor.emotionalTriggers.map((trigger, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* USP */}
            {competitor.uniqueSellingPoints.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">USP（独自性）</div>
                <ul className="text-xs space-y-1">
                  {competitor.uniqueSellingPoints.map((usp, i) => (
                    <li key={i} className="text-muted-foreground">
                      • {usp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* セクション構成 */}
            {competitor.sections.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">LP構成</div>
                <div className="text-xs text-muted-foreground">
                  {competitor.sections.join(" → ")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 展開ボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              閉じる
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              詳細を表示
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// メトリクス表示コンポーネント
function MetricItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1 p-2 bg-muted rounded">
      {icon}
      <div>
        <div className="text-muted-foreground text-[10px]">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

// 競合リスト表示用コンポーネント
interface CompetitorListProps {
  competitors: CompetitorAnalysis[];
  onCopyKeyword?: (keyword: string) => void;
}

export function CompetitorList({
  competitors,
  onCopyKeyword,
}: CompetitorListProps) {
  const handleOpenUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {competitors.map((competitor, index) => (
        <CompetitorCard
          key={`${competitor.url}-${index}`}
          competitor={competitor}
          onCopyKeyword={onCopyKeyword}
          onOpenUrl={handleOpenUrl}
        />
      ))}
    </div>
  );
}

// 競合分析サマリーコンポーネント
interface CompetitorSummaryProps {
  competitors: CompetitorAnalysis[];
}

export function CompetitorSummary({ competitors }: CompetitorSummaryProps) {
  const allPowerWords = competitors.flatMap((c) => c.powerWords);
  const allCTAs = competitors.flatMap((c) => c.ctaTexts);

  const topPowerWords = getTopItems(allPowerWords, 10);
  const topCTAs = getTopItems(allCTAs, 5);

  const avgPrice =
    competitors
      .map((c) => c.pricePoint)
      .filter((p): p is number => p !== undefined)
      .reduce((a, b) => a + b, 0) /
    competitors.filter((c) => c.pricePoint).length;

  const avgTestimonials =
    competitors
      .map((c) => c.testimonialCount)
      .filter((t): t is number => t !== undefined)
      .reduce((a, b) => a + b, 0) /
    competitors.filter((c) => c.testimonialCount).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">競合分析サマリー</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 統計 */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{competitors.length}</div>
            <div className="text-xs text-muted-foreground">分析LP数</div>
          </div>
          {avgPrice > 0 && (
            <div>
              <div className="text-2xl font-bold">
                ¥{Math.round(avgPrice).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">平均価格</div>
            </div>
          )}
          {avgTestimonials > 0 && (
            <div>
              <div className="text-2xl font-bold">
                {Math.round(avgTestimonials)}
              </div>
              <div className="text-xs text-muted-foreground">平均お客様の声数</div>
            </div>
          )}
        </div>

        {/* よく使われるパワーワード */}
        {topPowerWords.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              よく使われるパワーワード
            </div>
            <div className="flex flex-wrap gap-1">
              {topPowerWords.map(([word, count], i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {word} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* よく使われるCTA */}
        {topCTAs.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">よく使われるCTA</div>
            <div className="flex flex-wrap gap-1">
              {topCTAs.map(([cta, count], i) => (
                <Badge
                  key={i}
                  className="text-xs bg-blue-100 text-blue-800"
                >
                  {cta} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ヘルパー関数
function getTopItems(items: string[], limit: number): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const normalized = item.toLowerCase().trim();
    if (normalized) {
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
