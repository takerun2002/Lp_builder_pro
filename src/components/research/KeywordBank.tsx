"use client";

/**
 * KeywordBank - キーワードバンク表示
 *
 * 収集・ランキングされたキーワードを表示・管理
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Copy,
  Star,
  TrendingUp,
  Zap,
  Target,
  Clock,
  ShieldCheck,
  ArrowRight,
  Filter,
} from "lucide-react";
import type {
  RankedKeyword,
  KeywordCategory,
  KeywordRankingResult,
} from "@/lib/research/analyzers/keyword-ranker";

interface KeywordBankProps {
  result: KeywordRankingResult;
  onSelectKeyword?: (keyword: RankedKeyword) => void;
  onCopyKeyword?: (keyword: string) => void;
  selectedKeywords?: string[];
}

const CATEGORY_CONFIG: Record<
  KeywordCategory,
  { name: string; icon: React.ReactNode; color: string }
> = {
  pain: {
    name: "悩み系",
    icon: <Target className="w-3 h-3" />,
    color: "bg-red-100 text-red-700",
  },
  desire: {
    name: "願望系",
    icon: <Star className="w-3 h-3" />,
    color: "bg-purple-100 text-purple-700",
  },
  benefit: {
    name: "ベネフィット",
    icon: <TrendingUp className="w-3 h-3" />,
    color: "bg-green-100 text-green-700",
  },
  action: {
    name: "行動喚起",
    icon: <Zap className="w-3 h-3" />,
    color: "bg-orange-100 text-orange-700",
  },
  trust: {
    name: "信頼系",
    icon: <ShieldCheck className="w-3 h-3" />,
    color: "bg-blue-100 text-blue-700",
  },
  urgency: {
    name: "緊急性",
    icon: <Clock className="w-3 h-3" />,
    color: "bg-yellow-100 text-yellow-700",
  },
  feature: {
    name: "機能系",
    icon: <ArrowRight className="w-3 h-3" />,
    color: "bg-cyan-100 text-cyan-700",
  },
  comparison: {
    name: "比較系",
    icon: <Filter className="w-3 h-3" />,
    color: "bg-indigo-100 text-indigo-700",
  },
  other: {
    name: "その他",
    icon: <ArrowRight className="w-3 h-3" />,
    color: "bg-gray-100 text-gray-700",
  },
};

export function KeywordBank({
  result,
  onSelectKeyword,
  onCopyKeyword,
  selectedKeywords = [],
}: KeywordBankProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"overall" | "frequency" | "emotion">(
    "overall"
  );
  const [filterCategory, setFilterCategory] = useState<KeywordCategory | "all">(
    "all"
  );

  // フィルタリング & ソート
  const filteredKeywords = useMemo(() => {
    let keywords = [...result.rankedKeywords];

    // 検索フィルタ
    if (searchQuery) {
      keywords = keywords.filter((k) =>
        k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // カテゴリフィルタ
    if (filterCategory !== "all") {
      keywords = keywords.filter((k) => k.category === filterCategory);
    }

    // ソート
    keywords.sort((a, b) => {
      switch (sortBy) {
        case "overall":
          return b.scores.overall - a.scores.overall;
        case "frequency":
          return b.frequency - a.frequency;
        case "emotion":
          return b.scores.emotionalIntensity - a.scores.emotionalIntensity;
        default:
          return 0;
      }
    });

    return keywords;
  }, [result.rankedKeywords, searchQuery, filterCategory, sortBy]);

  const handleCopy = (keyword: string) => {
    navigator.clipboard.writeText(keyword);
    onCopyKeyword?.(keyword);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">キーワードバンク</h3>
          <p className="text-sm text-muted-foreground">
            {result.rankedKeywords.length}件のキーワード
          </p>
        </div>
      </div>

      {/* トップキーワードカード */}
      <TopKeywordsCard
        topKeywords={result.topKeywords}
        onCopy={handleCopy}
      />

      {/* フィルター & 検索 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 検索 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="キーワードを検索..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* ソート */}
            <div className="flex gap-2">
              <Button
                variant={sortBy === "overall" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("overall")}
              >
                総合スコア
              </Button>
              <Button
                variant={sortBy === "emotion" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("emotion")}
              >
                感情強度
              </Button>
              <Button
                variant={sortBy === "frequency" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("frequency")}
              >
                出現回数
              </Button>
            </div>
          </div>

          {/* カテゴリフィルタ */}
          <div className="flex flex-wrap gap-1 mt-3">
            <Badge
              variant={filterCategory === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterCategory("all")}
            >
              すべて
            </Badge>
            {(Object.keys(CATEGORY_CONFIG) as KeywordCategory[]).map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const count = result.byCategory[cat]?.length || 0;
              if (count === 0) return null;
              return (
                <Badge
                  key={cat}
                  variant={filterCategory === cat ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilterCategory(cat)}
                >
                  {config.name} ({count})
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* キーワードリスト */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {filteredKeywords.map((kw) => (
          <KeywordCard
            key={kw.keyword}
            keyword={kw}
            isSelected={selectedKeywords.includes(kw.keyword)}
            onSelect={onSelectKeyword}
            onCopy={handleCopy}
          />
        ))}
      </div>

      {filteredKeywords.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          条件に一致するキーワードがありません
        </div>
      )}

      {/* インサイト */}
      {result.insights.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">インサイト</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ul className="space-y-1 text-sm">
              {result.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 組み合わせ提案 */}
      {result.suggestedCombinations.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">組み合わせ提案</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {result.suggestedCombinations.map((combo, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleCopy(combo)}
                >
                  {combo}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// トップキーワードカード
function TopKeywordsCard({
  topKeywords,
  onCopy,
}: {
  topKeywords: KeywordRankingResult["topKeywords"];
  onCopy: (keyword: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <Tabs defaultValue="headline">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="headline">ヘッドライン</TabsTrigger>
            <TabsTrigger value="subhead">サブヘッド</TabsTrigger>
            <TabsTrigger value="cta">CTA</TabsTrigger>
            <TabsTrigger value="power">パワーワード</TabsTrigger>
          </TabsList>

          <TabsContent value="headline" className="pt-3">
            <KeywordTagList
              keywords={topKeywords.forHeadline}
              onCopy={onCopy}
              emptyMessage="ヘッドライン向けキーワードなし"
            />
          </TabsContent>

          <TabsContent value="subhead" className="pt-3">
            <KeywordTagList
              keywords={topKeywords.forSubhead}
              onCopy={onCopy}
              emptyMessage="サブヘッド向けキーワードなし"
            />
          </TabsContent>

          <TabsContent value="cta" className="pt-3">
            <KeywordTagList
              keywords={topKeywords.forCTA}
              onCopy={onCopy}
              color="bg-orange-100 text-orange-800"
              emptyMessage="CTA向けキーワードなし"
            />
          </TabsContent>

          <TabsContent value="power" className="pt-3">
            <KeywordTagList
              keywords={topKeywords.powerWords}
              onCopy={onCopy}
              color="bg-red-100 text-red-800"
              emptyMessage="パワーワードなし"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// キーワードタグリスト
function KeywordTagList({
  keywords,
  onCopy,
  color = "bg-blue-100 text-blue-800",
  emptyMessage,
}: {
  keywords: string[];
  onCopy: (keyword: string) => void;
  color?: string;
  emptyMessage: string;
}) {
  if (keywords.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((kw, i) => (
        <Badge
          key={i}
          className={`${color} cursor-pointer hover:opacity-80`}
          onClick={() => onCopy(kw)}
        >
          {kw}
          <Copy className="w-3 h-3 ml-1" />
        </Badge>
      ))}
    </div>
  );
}

// キーワードカード
function KeywordCard({
  keyword,
  isSelected,
  onSelect,
  onCopy,
}: {
  keyword: RankedKeyword;
  isSelected: boolean;
  onSelect?: (kw: RankedKeyword) => void;
  onCopy: (keyword: string) => void;
}) {
  const config = CATEGORY_CONFIG[keyword.category];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-gray-500";
  };

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-blue-500" : "hover:shadow-md"
      }`}
      onClick={() => onSelect?.(keyword)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{keyword.keyword}</span>
              <span
                className={`text-sm font-bold ${getScoreColor(
                  keyword.scores.overall
                )}`}
              >
                {keyword.scores.overall}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs ${config.color}`}>
                {config.icon}
                <span className="ml-1">{config.name}</span>
              </Badge>
              {keyword.frequency > 1 && (
                <span className="text-xs text-muted-foreground">
                  {keyword.frequency}回出現
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(keyword.keyword);
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        {/* スコア詳細 */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span title="感情強度">感情: {keyword.scores.emotionalIntensity}</span>
          <span title="購買意欲">購買: {keyword.scores.commercialIntent}</span>
          <span title="推奨用途">{getUsageName(keyword.suggestedUsage)}</span>
        </div>

        {/* ソース */}
        {keyword.sources.length > 0 && (
          <div className="flex gap-1 mt-2">
            {keyword.sources.map((src) => (
              <Badge key={src} variant="outline" className="text-[10px]">
                {getSourceName(src)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ヘルパー関数
function getUsageName(usage: RankedKeyword["suggestedUsage"]): string {
  const names = {
    headline: "ヘッドライン向け",
    subhead: "サブヘッド向け",
    body: "本文向け",
    cta: "CTA向け",
    meta: "メタ情報向け",
  };
  return names[usage];
}

function getSourceName(source: string): string {
  const names: Record<string, string> = {
    amazon: "Amazon",
    yahoo_chiebukuro: "知恵袋",
    competitor: "競合LP",
    manual: "手動",
    ai_generated: "AI生成",
  };
  return names[source] || source;
}

// キーワードバンクサマリー
interface KeywordBankSummaryProps {
  result: KeywordRankingResult;
}

export function KeywordBankSummary({ result }: KeywordBankSummaryProps) {
  const totalCount = result.rankedKeywords.length;
  const highScoreCount = result.rankedKeywords.filter(
    (k) => k.scores.overall >= 80
  ).length;

  const topCategory = Object.entries(result.byCategory)
    .sort((a, b) => b[1].length - a[1].length)[0];

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">キーワードサマリー</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-xs text-muted-foreground">総キーワード数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {highScoreCount}
            </div>
            <div className="text-xs text-muted-foreground">高スコア(80+)</div>
          </div>
          {topCategory && (
            <div>
              <div className="text-2xl font-bold">{topCategory[1].length}</div>
              <div className="text-xs text-muted-foreground">
                {CATEGORY_CONFIG[topCategory[0] as KeywordCategory]?.name}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
