"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ResearchContext,
  type ResearchResult,
  type Genre,
  type Mood,
  type Region,
  type DataSource,
  type SearchPeriod,
  type AgeGroup,
  GENRE_LABELS,
  MOOD_LABELS,
  REGION_LABELS,
  SOURCE_LABELS,
  PERIOD_LABELS,
} from "@/lib/research/types";

// ============================================
// コンポーネント
// ============================================

function CheckboxGroup<T extends string>({
  options,
  labels,
  selected,
  onChange,
}: {
  options: T[];
  labels: Record<T, string>;
  selected: T[];
  onChange: (selected: T[]) => void;
}) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            selected.includes(option)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-input hover:bg-muted"
          }`}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

// 悩みマトリックスコンポーネント
function PainPointMatrix({
  painPoints,
}: {
  painPoints: {
    content: string;
    depth: number;
    urgency: number;
    quadrant: string;
  }[];
}) {
  const quadrantColors: Record<string, string> = {
    priority: "bg-red-100 border-red-300 text-red-800",
    important: "bg-yellow-100 border-yellow-300 text-yellow-800",
    consider: "bg-green-100 border-green-300 text-green-800",
    ignore: "bg-gray-100 border-gray-300 text-gray-600",
  };

  const quadrantLabels: Record<string, string> = {
    priority: "🔴 最優先",
    important: "🟡 重要",
    consider: "🟢 検討",
    ignore: "⚪ 無視",
  };

  const grouped = painPoints.reduce(
    (acc, p) => {
      const q = p.quadrant || "ignore";
      if (!acc[q]) acc[q] = [];
      acc[q].push(p);
      return acc;
    },
    {} as Record<string, typeof painPoints>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {(["priority", "important", "consider", "ignore"] as const).map((q) => (
        <div key={q} className={`border rounded-lg p-4 ${quadrantColors[q]}`}>
          <h4 className="font-medium mb-2">{quadrantLabels[q]}</h4>
          <div className="space-y-2">
            {(grouped[q] || []).slice(0, 5).map((p, idx) => (
              <div
                key={idx}
                className="text-sm bg-white/50 rounded p-2 line-clamp-2"
              >
                {p.content}
              </div>
            ))}
            {(grouped[q]?.length || 0) > 5 && (
              <p className="text-xs opacity-70">
                他 {(grouped[q]?.length || 0) - 5}件
              </p>
            )}
            {!grouped[q]?.length && (
              <p className="text-sm opacity-50">データなし</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// キーワードバンクコンポーネント
function KeywordBank({
  keywords,
  powerWords,
  emotionalHooks,
}: {
  keywords: string[];
  powerWords: string[];
  emotionalHooks: string[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">パワーワード</h4>
        <div className="flex flex-wrap gap-2">
          {powerWords.slice(0, 20).map((word, idx) => (
            <Badge key={idx} variant="default">
              {word}
            </Badge>
          ))}
          {powerWords.length === 0 && (
            <span className="text-sm text-muted-foreground">データなし</span>
          )}
        </div>
      </div>
      <div>
        <h4 className="font-medium mb-2">エモーショナルフック</h4>
        <div className="flex flex-wrap gap-2">
          {emotionalHooks.slice(0, 15).map((hook, idx) => (
            <Badge key={idx} variant="secondary">
              {hook}
            </Badge>
          ))}
          {emotionalHooks.length === 0 && (
            <span className="text-sm text-muted-foreground">データなし</span>
          )}
        </div>
      </div>
      <div>
        <h4 className="font-medium mb-2">抽出キーワード</h4>
        <div className="flex flex-wrap gap-2">
          {keywords.slice(0, 30).map((kw, idx) => (
            <Badge key={idx} variant="outline">
              {kw}
            </Badge>
          ))}
          {keywords.length === 0 && (
            <span className="text-sm text-muted-foreground">データなし</span>
          )}
        </div>
      </div>
    </div>
  );
}

// 進捗ステップ
const RESEARCH_STEPS = [
  { id: "init", label: "初期化" },
  { id: "infotop", label: "Infotop" },
  { id: "competitor", label: "競合LP" },
  { id: "ads", label: "広告" },
  { id: "chiebukuro", label: "知恵袋" },
  { id: "amazon_books", label: "Amazon" },
  { id: "youtube", label: "YouTube" },
  { id: "deep_research", label: "Deep Research" },
  { id: "synthesis", label: "統合" },
  { id: "proposals", label: "提案" },
];

// データソースグループ
const SOURCE_GROUPS = {
  basic: {
    label: "基本ソース",
    sources: ["infotop", "competitor"] as DataSource[],
  },
  pain: {
    label: "悩み収集",
    sources: ["chiebukuro"] as DataSource[],
  },
  keyword: {
    label: "キーワード収集",
    sources: ["amazon_books", "youtube"] as DataSource[],
  },
  ads: {
    label: "広告分析",
    sources: ["ads"] as DataSource[],
  },
};

// ============================================
// メインコンポーネント
// ============================================

export default function ResearchPage() {
  // フォーム状態
  const [genre, setGenre] = useState<Genre>("beauty");
  const [subGenre, setSubGenre] = useState("");
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>(["30s", "40s"]);
  const [gender, setGender] = useState<"male" | "female" | "both">("female");
  const [problems, setProblems] = useState("");
  const [desires, setDesires] = useState("");
  const [moods, setMoods] = useState<Mood[]>(["trust", "professional"]);
  const [regions, setRegions] = useState<Region[]>(["japan"]);
  const [period, setPeriod] = useState<SearchPeriod>("6months");
  const [sources, setSources] = useState<DataSource[]>([
    "infotop",
    "competitor",
    "chiebukuro",
    "amazon_books",
    "youtube",
  ]);
  const [freeText, setFreeText] = useState("");
  const [referenceUrls, setReferenceUrls] = useState("");
  const [useAI, setUseAI] = useState(true);

  // リサーチ状態
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

  // 拡張結果（新スクレイパーからのデータ）
  interface ExtendedResult extends ResearchResult {
    chiebukuroAnalysis?: {
      priorityPainPoints?: { content: string; depth: number; urgency: number; quadrant: string }[];
      urgencyKeywords?: string[];
      severityKeywords?: string[];
    };
    amazonBooksAnalysis?: {
      powerWords?: string[];
      conceptPatterns?: { pattern: string }[];
    };
    youtubeAnalysis?: {
      popularTitleElements?: string[];
      powerWords?: string[];
      emotionalHooks?: string[];
    };
  }

  // リサーチ実行
  const handleResearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    setProgressPercent(0);

    const context: ResearchContext = {
      projectName: "リサーチ " + new Date().toLocaleString("ja-JP"),
      genre,
      subGenre: subGenre || undefined,
      target: {
        ageGroups,
        gender,
        problems,
        desires,
      },
      toneManner: {
        moods,
      },
      searchConfig: {
        regions,
        period,
        sources,
      },
      freeText: freeText || undefined,
      referenceUrls: referenceUrls
        ? referenceUrls.split("\n").filter((url) => url.trim())
        : undefined,
    };

    // 進捗アニメーション
    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3;
      });
      setCurrentStep((prev) => {
        const next = prev + 0.08;
        return next >= RESEARCH_STEPS.length - 1 ? prev : next;
      });
    }, 1000);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          options: {
            includeMetaAds: sources.includes("ads"),
            includeChiebukuro: sources.includes("chiebukuro"),
            includeAmazonBooks: sources.includes("amazon_books"),
            includeYouTube: sources.includes("youtube"),
            useAI,
          },
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setResult(data.result);
        setProgressPercent(100);
        setCurrentStep(RESEARCH_STEPS.length - 1);
      } else {
        setError(data.error || "リサーチに失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ネットワークエラー");
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  }, [
    genre,
    subGenre,
    ageGroups,
    gender,
    problems,
    desires,
    moods,
    regions,
    period,
    sources,
    freeText,
    referenceUrls,
    useAI,
  ]);

  // エクスポート
  const handleExport = (format: "json" | "yaml") => {
    if (!result) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      content = JSON.stringify(result, null, 2);
      filename = `research_${Date.now()}.json`;
      mimeType = "application/json";
    } else {
      // 簡易YAML変換
      content = convertToYaml(result);
      filename = `research_${Date.now()}.yaml`;
      mimeType = "text/yaml";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // クリップボードにコピー
  const handleCopyToClipboard = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError("クリップボードへのコピーに失敗しました");
    }
  };

  // 簡易YAML変換
  const convertToYaml = (obj: unknown, indent = 0): string => {
    const spaces = "  ".repeat(indent);
    if (obj === null || obj === undefined) return "null";
    if (typeof obj === "string") return `"${obj.replace(/"/g, '\\"')}"`;
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "[]";
      return obj.map((item) => `${spaces}- ${convertToYaml(item, indent + 1)}`).join("\n");
    }
    if (typeof obj === "object") {
      const entries = Object.entries(obj);
      if (entries.length === 0) return "{}";
      return entries
        .map(([key, value]) => {
          if (typeof value === "object" && value !== null) {
            return `${spaces}${key}:\n${convertToYaml(value, indent + 1)}`;
          }
          return `${spaces}${key}: ${convertToYaml(value, indent)}`;
        })
        .join("\n");
    }
    return String(obj);
  };

  // 拡張結果からデータ抽出
  const extResult = result as ExtendedResult | null;
  const painPoints = extResult?.chiebukuroAnalysis?.priorityPainPoints || [];
  const allKeywords = [
    ...(extResult?.chiebukuroAnalysis?.urgencyKeywords || []),
    ...(extResult?.chiebukuroAnalysis?.severityKeywords || []),
    ...(extResult?.amazonBooksAnalysis?.conceptPatterns?.map((c) => c.pattern) || []),
    ...(extResult?.youtubeAnalysis?.popularTitleElements || []),
  ];
  const powerWords = [
    ...(extResult?.amazonBooksAnalysis?.powerWords || []),
    ...(extResult?.youtubeAnalysis?.powerWords || []),
  ];
  const emotionalHooks = extResult?.youtubeAnalysis?.emotionalHooks || [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">リサーチエージェント</h1>
            <p className="text-sm text-muted-foreground">
              案件情報を入力すると、最適なLP構成・コピー・デザインを提案します
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dev">
              <Button variant="outline" size="sm">
                開発メニュー
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                ホーム
              </Button>
            </Link>
          </div>
        </div>

        {/* 入力フォーム */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">案件情報</CardTitle>
            <CardDescription>
              できるだけ詳しく入力すると、より精度の高い提案が得られます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ジャンル */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ジャンル</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GENRE_LABELS) as Genre[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenre(g)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      genre === g
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-muted"
                    }`}
                  >
                    {GENRE_LABELS[g]}
                  </button>
                ))}
              </div>
              <Input
                value={subGenre}
                onChange={(e) => setSubGenre(e.target.value)}
                placeholder="サブジャンル（例：エイジングケア、ダイエット）"
                className="mt-2"
              />
            </div>

            {/* ターゲット */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">年齢層</label>
                <CheckboxGroup
                  options={["20s", "30s", "40s", "50s", "60plus"] as AgeGroup[]}
                  labels={{
                    "20s": "20代",
                    "30s": "30代",
                    "40s": "40代",
                    "50s": "50代",
                    "60plus": "60代以上",
                  }}
                  selected={ageGroups}
                  onChange={setAgeGroups}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">性別</label>
                <div className="flex gap-2">
                  {(["female", "male", "both"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        gender === g
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {g === "female" ? "女性" : g === "male" ? "男性" : "両方"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">悩み・課題</label>
                <Textarea
                  value={problems}
                  onChange={(e) => setProblems(e.target.value)}
                  placeholder="ターゲットが抱えている悩みや課題"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">理想の状態</label>
                <Textarea
                  value={desires}
                  onChange={(e) => setDesires(e.target.value)}
                  placeholder="ターゲットが望む理想の状態"
                  rows={3}
                />
              </div>
            </div>

            {/* トンマナ */}
            <div className="space-y-2">
              <label className="text-sm font-medium">雰囲気・トンマナ</label>
              <CheckboxGroup
                options={Object.keys(MOOD_LABELS) as Mood[]}
                labels={MOOD_LABELS}
                selected={moods}
                onChange={setMoods}
              />
            </div>

            {/* データソース選択 */}
            <div className="space-y-4">
              <label className="text-sm font-medium">データソース</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(SOURCE_GROUPS).map(([key, group]) => (
                  <Card key={key} className="p-4">
                    <h4 className="font-medium text-sm mb-2">{group.label}</h4>
                    <div className="space-y-2">
                      {group.sources.map((source) => (
                        <div key={source} className="flex items-center space-x-2">
                          <Checkbox
                            id={source}
                            checked={sources.includes(source)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSources([...sources, source]);
                              } else {
                                setSources(sources.filter((s) => s !== source));
                              }
                            }}
                          />
                          <label
                            htmlFor={source}
                            className="text-sm cursor-pointer"
                          >
                            {SOURCE_LABELS[source]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 検索設定 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">地域</label>
                <CheckboxGroup
                  options={Object.keys(REGION_LABELS) as Region[]}
                  labels={REGION_LABELS}
                  selected={regions}
                  onChange={setRegions}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">期間</label>
                <Select value={period} onValueChange={(v) => setPeriod(v as SearchPeriod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PERIOD_LABELS) as SearchPeriod[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PERIOD_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI分析オプション */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useAI"
                checked={useAI}
                onCheckedChange={(checked) => setUseAI(!!checked)}
              />
              <label htmlFor="useAI" className="text-sm cursor-pointer">
                AI分析を有効にする（より詳細な分析、処理時間増加）
              </label>
            </div>

            {/* 自由入力 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">詳細指示（自由入力）</label>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="競合との差別化ポイント、こだわりたい点、避けたい表現など"
                rows={3}
              />
            </div>

            {/* 参考URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">参考URL（任意）</label>
              <Textarea
                value={referenceUrls}
                onChange={(e) => setReferenceUrls(e.target.value)}
                placeholder="参考にしたいLPのURLを1行に1つずつ入力"
                rows={2}
              />
            </div>

            {/* 実行ボタン */}
            <Button
              onClick={handleResearch}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "リサーチ中..." : "リサーチ開始"}
            </Button>
          </CardContent>
        </Card>

        {/* 進捗表示 */}
        {loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">リサーチ進捗</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {RESEARCH_STEPS[Math.floor(currentStep)]?.label || "処理中..."}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex gap-1">
                {RESEARCH_STEPS.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      idx <= Math.floor(currentStep) ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1 text-xs text-muted-foreground">
                {RESEARCH_STEPS.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`text-center ${
                      idx <= Math.floor(currentStep) ? "text-primary" : ""
                    }`}
                  >
                    {idx < Math.floor(currentStep)
                      ? "✅"
                      : idx === Math.floor(currentStep)
                        ? "🔄"
                        : "⏳"}
                    <br />
                    {step.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* エラー表示 */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive">{error}</div>
            </CardContent>
          </Card>
        )}

        {/* 結果表示 */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-green-600">
                    リサーチ完了
                  </CardTitle>
                  <CardDescription>
                    {result.elapsedMs
                      ? `${(result.elapsedMs / 1000).toFixed(1)}秒で完了`
                      : ""}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                  >
                    {copySuccess ? "コピーしました!" : "コピー"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("json")}
                  >
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("yaml")}
                  >
                    YAML
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="insights">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="insights">インサイト</TabsTrigger>
                  <TabsTrigger value="pain">悩み</TabsTrigger>
                  <TabsTrigger value="keywords">キーワード</TabsTrigger>
                  <TabsTrigger value="structure">構成</TabsTrigger>
                  <TabsTrigger value="copy">コピー</TabsTrigger>
                  <TabsTrigger value="raw">詳細</TabsTrigger>
                </TabsList>

                {/* インサイトタブ */}
                <TabsContent value="insights" className="mt-4 space-y-4">
                  {result.synthesis?.keyInsights &&
                  result.synthesis.keyInsights.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-medium">主要インサイト</h3>
                      {result.synthesis.keyInsights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 flex items-start gap-3"
                        >
                          <span className="text-lg">💡</span>
                          <p className="text-sm">{insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      インサイトデータがありません
                    </p>
                  )}

                  {result.synthesis?.differentiationPoints &&
                    result.synthesis.differentiationPoints.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-medium">差別化ポイント</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.synthesis.differentiationPoints.map(
                            (point, idx) => (
                              <Badge key={idx} variant="secondary">
                                {point}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </TabsContent>

                {/* 悩みマトリックスタブ */}
                <TabsContent value="pain" className="mt-4 space-y-4">
                  <h3 className="font-medium">悩みマトリックス（深さ×緊急性）</h3>
                  {painPoints.length > 0 ? (
                    <PainPointMatrix painPoints={painPoints} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>悩みデータがありません</p>
                      <p className="text-sm mt-2">
                        Yahoo知恵袋ソースを有効にしてリサーチを実行してください
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* キーワードバンクタブ */}
                <TabsContent value="keywords" className="mt-4 space-y-4">
                  <h3 className="font-medium">キーワードバンク</h3>
                  <KeywordBank
                    keywords={allKeywords}
                    powerWords={powerWords}
                    emotionalHooks={emotionalHooks}
                  />
                </TabsContent>

                {/* 構成提案タブ */}
                <TabsContent value="structure" className="mt-4 space-y-4">
                  {result.proposals?.structure ? (
                    <>
                      <div className="space-y-3">
                        <h3 className="font-medium">推奨LP構成</h3>
                        {result.proposals.structure.recommended.map(
                          (section) => (
                            <div
                              key={section.order}
                              className="border rounded-lg p-3 space-y-1"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center">
                                  {section.order}
                                </span>
                                <span className="font-medium">
                                  {section.name}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground ml-8">
                                {section.purpose}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">推奨理由</h4>
                        <p className="text-sm">
                          {result.proposals.structure.rationale}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      構成提案データがありません
                    </p>
                  )}
                </TabsContent>

                {/* コピー提案タブ */}
                <TabsContent value="copy" className="mt-4 space-y-4">
                  {result.proposals?.copy ? (
                    <>
                      <div className="space-y-3">
                        <h3 className="font-medium">ヘッドライン候補</h3>
                        {result.proposals.copy.headlines.map((hl, idx) => (
                          <div
                            key={idx}
                            className="border rounded-lg p-3 flex items-start gap-3"
                          >
                            <span className="text-lg">💡</span>
                            <div>
                              <p className="font-medium">{hl.text}</p>
                              <p className="text-xs text-muted-foreground">
                                タイプ: {hl.type} / スコア: {hl.score}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-medium">CTA候補</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.proposals.copy.ctaButtons.map((cta, idx) => (
                            <span
                              key={idx}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                            >
                              {cta.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      コピー提案データがありません
                    </p>
                  )}
                </TabsContent>

                {/* 詳細データタブ */}
                <TabsContent value="raw" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* フッター */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>※ リサーチには1〜3分程度かかります。</p>
          <p>
            ※ Gemini Deep Research + Firecrawl +
            各種スクレイパーを使用しています。
          </p>
        </div>
      </div>
    </div>
  );
}
