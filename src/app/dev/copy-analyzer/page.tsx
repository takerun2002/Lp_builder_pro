"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// =============================================================================
// Types (クライアント用)
// =============================================================================

interface CheckpointResult {
  checkpointId: string;
  question: string;
  score: number;
  maxScore: number;
  found: boolean;
  evidence?: string;
  suggestion?: string;
}

interface CategoryResult {
  categoryId: string;
  categoryName: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: CheckpointResult[];
}

interface Improvement {
  priority: "high" | "medium" | "low";
  category: string;
  issue: string;
  suggestion: string;
  lessonRef?: string;
}

interface DiagnosisResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: "S" | "A" | "B" | "C" | "D";
  categories: CategoryResult[];
  improvements: Improvement[];
  strengths: string[];
}

// =============================================================================
// Constants
// =============================================================================

const GRADE_COLORS: Record<string, string> = {
  S: "bg-purple-500",
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-yellow-500",
  D: "bg-red-500",
};

const GRADE_DESCRIPTIONS: Record<string, string> = {
  S: "素晴らしい！プロレベルのコピーです",
  A: "良いコピーです。微調整でさらに効果的に",
  B: "改善の余地があります",
  C: "基本的な要素が不足しています",
  D: "根本的な見直しが必要です",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

// =============================================================================
// Component
// =============================================================================

export default function CopyAnalyzerPage() {
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("input");

  // 分析を実行
  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError("分析するテキストを入力してください");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/copy-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          useAI: true,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setResult(data.result);
        setActiveTab("result");
      } else {
        setError(data.error || "分析に失敗しました");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("分析中にエラーが発生しました");
    } finally {
      setAnalyzing(false);
    }
  }, [text]);

  // サンプルテキストを読み込み
  const loadSample = () => {
    setText(`あなたは今、こんな悩みを抱えていませんか？

「LPを作りたいけど、何を書けばいいかわからない...」
「外注すると高いし、自分で作ると時間がかかる...」
「せっかく作っても、成約率が上がらない...」

私も以前は同じ悩みを抱えていました。

LP制作会社に50万円払って作ってもらっても、思うような結果が出ない。自分で勉強しても、何が正解かわからない。

そんな時、ある「秘密」を発見しました。

それは、売れるLPには共通する「型」があるということ。

この型を知ってから、私のLPの成約率は3倍に。クライアントのLPも次々と結果を出すようになりました。

今回、その秘密を全て詰め込んだツールを開発しました。

【LP Builder Pro】

AIがあなたの代わりに、売れるLPを自動生成。
N1データを入力するだけで、心理トリガーを活用した訴求が完成します。

今なら特別価格で提供中。
さらに、30日間の返金保証付き。

今すぐ下のボタンをクリックして、売れるLPを手に入れてください。`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">コピー診断AI</h1>
        <p className="text-muted-foreground">
          ファン化哲学（21レッスン）に基づいてLP・セールスレターを自動診断
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="input">入力</TabsTrigger>
          <TabsTrigger value="result" disabled={!result}>
            結果
          </TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">診断するコピーを入力</CardTitle>
              <CardDescription>
                LP、セールスレター、広告文など、診断したいテキストを貼り付けてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="コピーテキストを入力..."
                rows={15}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {text.length}文字
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadSample}>
                    サンプルを読み込み
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setText("")}>
                    クリア
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={analyzing || !text.trim()}
              className="px-8"
            >
              {analyzing ? "分析中..." : "診断を開始"}
            </Button>
          </div>

          {analyzing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-center">AIが分析中...</p>
                  <Progress value={undefined} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Result Tab */}
        <TabsContent value="result" className="space-y-6">
          {result && (
            <>
              {/* Overall Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-20 h-20 rounded-full ${GRADE_COLORS[result.grade]} flex items-center justify-center text-white text-3xl font-bold`}
                      >
                        {result.grade}
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{result.percentage}点</div>
                        <p className="text-muted-foreground">
                          {GRADE_DESCRIPTIONS[result.grade]}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("input")}>
                      再診断
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Category Scores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">カテゴリ別スコア</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {result.categories.map((cat) => (
                      <div key={cat.categoryId} className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{cat.percentage}%</div>
                        <p className="text-sm text-muted-foreground">{cat.categoryName}</p>
                        <Progress value={cat.percentage} className="h-2 mt-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-green-700">良い点</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Improvements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">改善提案</CardTitle>
                  <CardDescription>優先度順に改善ポイントを表示</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.improvements.slice(0, 10).map((imp, i) => (
                      <div
                        key={i}
                        className={`p-3 border rounded-lg ${PRIORITY_COLORS[imp.priority]}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {imp.priority === "high" ? "高" : imp.priority === "medium" ? "中" : "低"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{imp.category}</span>
                          {imp.lessonRef && (
                            <span className="text-xs text-blue-600">
                              レッスン{imp.lessonRef}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{imp.issue}</p>
                        <p className="text-sm text-muted-foreground mt-1">{imp.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">詳細診断結果</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {result.categories.map((cat) => (
                      <AccordionItem key={cat.categoryId} value={cat.categoryId}>
                        <AccordionTrigger>
                          <div className="flex items-center justify-between w-full pr-4">
                            <span>{cat.categoryName}</span>
                            <Badge variant={cat.percentage >= 70 ? "default" : "secondary"}>
                              {cat.score}/{cat.maxScore}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {cat.details.map((detail) => (
                              <div
                                key={detail.checkpointId}
                                className={`p-3 rounded-lg border ${
                                  detail.found
                                    ? "bg-green-50 border-green-200"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={detail.found ? "text-green-500" : "text-gray-400"}>
                                    {detail.found ? "✓" : "○"}
                                  </span>
                                  <span className="text-sm">{detail.question}</span>
                                  <Badge variant="outline" className="ml-auto text-xs">
                                    {detail.score}/{detail.maxScore}
                                  </Badge>
                                </div>
                                {detail.evidence && (
                                  <p className="text-xs text-muted-foreground mt-2 pl-6 italic">
                                    &quot;{detail.evidence}&quot;
                                  </p>
                                )}
                                {!detail.found && detail.suggestion && (
                                  <p className="text-xs text-blue-600 mt-2 pl-6">
                                    提案: {detail.suggestion}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
