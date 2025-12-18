"use client";

/**
 * コピー診断ページ
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Copy,
} from "lucide-react";
import {
  DIAGNOSIS_CATEGORIES,
  getCategoryName,
  getGradeDescription,
  getScoreColor,
} from "@/lib/copywriting/copy-diagnosis";

interface DiagnosisScore {
  category: string;
  score: number;
  maxScore: number;
  feedback: string;
  improvements: string[];
}

interface DiagnosisResult {
  success: boolean;
  overallScore?: number;
  grade?: "S" | "A" | "B" | "C" | "D";
  summary?: string;
  scores?: DiagnosisScore[];
  strengths?: string[];
  weaknesses?: string[];
  rewriteSuggestions?: string[];
  error?: string;
}

export default function CopyDiagnosisPage() {
  const [text, setText] = useState("");
  const [type, setType] = useState<"headline" | "body" | "cta" | "full_lp">("headline");
  const [target, setTarget] = useState("");
  const [product, setProduct] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const runDiagnosis = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/copy-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, type, target, product }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Diagnosis error:", error);
      setResult({ success: false, error: "診断に失敗しました" });
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      S: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
      A: "bg-green-500 text-white",
      B: "bg-blue-500 text-white",
      C: "bg-yellow-500 text-white",
      D: "bg-red-500 text-white",
    };
    return colors[grade] || "bg-gray-500";
  };

  const copySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">コピー診断AI</h1>
        <p className="text-muted-foreground">
          LPのコピーを多角的に診断し、改善提案を行います
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入力エリア */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>診断するコピー</CardTitle>
              <CardDescription>診断したいコピーを入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">コピヺ種別</label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="headline">ヘッドライン</SelectItem>
                    <SelectItem value="body">本文</SelectItem>
                    <SelectItem value="cta">CTA（行動喛起）</SelectItem>
                    <SelectItem value="full_lp">LP全体</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">コピー内容</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="例: たった3日でマイナス5kg！驅士が読める奇跳のダイエット法"
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">ターゲット（任意）</label>
                  <Input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="例: 30代奺性"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">商品名（任意）</label>
                  <Input
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="例: ダイエットサプリ"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={runDiagnosis}
                disabled={isLoading || !text.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    診断中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    診断を開始
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 評価カテゴリ説明 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">評価カテゴリ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DIAGNOSIS_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="flex justify-between text-sm">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">{cat.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 結果エリア */}
        <div className="space-y-4">
          {/* 総合スコア */}
          {result?.success && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold ${getGradeColor(
                      result.grade || "D"
                    )}`}
                  >
                    {result.grade}
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{result.overallScore}ಟ</div>
                    <p className="text-sm text-muted-foreground">
                      {getGradeDescription(result.grade || "D")}
                    </p>
                    <p className="text-sm mt-2">{result.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* カテゴリ別スコア */}
          {result?.scores && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">カテゴリ別評価</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.scores.map((score) => (
                  <div key={score.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{getCategoryName(score.category)}</span>
                      <span className={`font-bold ${getScoreColor(score.score)}`}>
                        {score.score}/{score.maxScore}
                      </span>
                    </div>
                    <Progress value={score.score} className="h-2" />
                    <p className="text-xs text-muted-foreground">{score.feedback}</p>
                    {score.improvements.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {score.improvements.map((imp, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Lightbulb className="w-3 h-3 mr-1" />
                            {imp}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 強み・弱み */}
          {result?.success && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-green-600">
                    <ThumbsUp className="w-4 h-4" />
                    強み
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.strengths?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600">
                    <ThumbsDown className="w-4 h-4" />
                    弱み
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.weaknesses?.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 改善提案 */}
          {result?.rewriteSuggestions && result.rewriteSuggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  改善コピー案
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.rewriteSuggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-50 rounded-lg flex items-start justify-between gap-2"
                  >
                    <p className="text-sm">{suggestion}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copySuggestion(suggestion)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* エラー表示 */}
          {result && !result.success && (
            <Card className="border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <p>{result.error || "診断に失敗しました"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 初期表示 */}
          {!result && !isLoading && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  コピーを入力して「診断を開始」をクリックしてください
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
