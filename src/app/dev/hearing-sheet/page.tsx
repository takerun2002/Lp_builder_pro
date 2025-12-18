"use client";

/**
 * ヒアリングシート生成ページ
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Download,
  FileText,
  Star,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Copy,
  FileJson,
  FileCode,
} from "lucide-react";
import {
  getDefaultTemplate,
  exportToMarkdown,
  exportToHtml,
  exportToJson,
  exportToNotion,
  analyzeN1Insights,
  calculateCompleteness,
  validateRequiredResponses,
  type HearingResponse,
  type N1InsightAnalysis,
} from "@/lib/documents/hearing-sheet-generator";

export default function HearingSheetPage() {
  const template = getDefaultTemplate();
  const [responses, setResponses] = useState<Map<string, string | string[]>>(new Map());
  const [activeSection, setActiveSection] = useState(template.sections[0].id);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [n1Analysis, setN1Analysis] = useState<N1InsightAnalysis | null>(null);
  const [exportFormat, setExportFormat] = useState<"markdown" | "html" | "json" | "notion">("markdown");

  const updateResponse = useCallback((questionId: string, value: string | string[]) => {
    setResponses((prev) => {
      const next = new Map(prev);
      next.set(questionId, value);
      return next;
    });
  }, []);

  const toggleMultiSelect = useCallback((questionId: string, option: string) => {
    setResponses((prev) => {
      const next = new Map(prev);
      const current = (next.get(questionId) as string[]) || [];
      if (current.includes(option)) {
        next.set(questionId, current.filter((o) => o !== option));
      } else {
        next.set(questionId, [...current, option]);
      }
      return next;
    });
  }, []);

  const responsesArray: HearingResponse[] = Array.from(responses.entries()).map(([questionId, value]) => ({
    questionId,
    value,
  }));
  const completeness = calculateCompleteness(responsesArray);
  const validation = validateRequiredResponses(responsesArray);

  const runN1Analysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeN1Insights(responsesArray);
      setN1Analysis(result);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = () => {
    let exported;
    switch (exportFormat) {
      case "markdown":
        exported = exportToMarkdown(template, responsesArray);
        break;
      case "html":
        exported = exportToHtml(template, responsesArray);
        break;
      case "json":
        exported = exportToJson(template, responsesArray);
        break;
      case "notion":
        exported = exportToNotion(template, responsesArray);
        break;
    }

    const blob = new Blob([exported.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exported.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const exported = exportFormat === "html" 
      ? exportToHtml(template, responsesArray)
      : exportToMarkdown(template, responsesArray);
    navigator.clipboard.writeText(exported.content);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ヒェリングシート</h1>
        <p className="text-muted-foreground">{template.description}</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">回答進捷</span>
            <span className="text-sm text-muted-foreground">
              {completeness.answered}/{completeness.total} ({completeness.percentage}%)
            </span>
          </div>
          <Progress value={completeness.percentage} className="mb-4" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">N1質問</span>
            </div>
            <span className="text-sm text-muted-foreground">{completeness.n1Percentage}%完了</span>
          </div>
          <Progress value={completeness.n1Percentage} className="bg-yellow-100" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
              {template.sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="text-xs sm:text-sm"
                >
                  {section.icon} {section.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {template.sections.map((section) => (
              <TabsContent key={section.id} value={section.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {section.icon} {section.title}
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {section.questions.map((question) => (
                      <div
                        key={question.id}
                        className={`p4 rounded-lg border ${
                          question.n1Related ? "bg-yellow-50 border-yellow-200" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <label className="font-medium text-sm">
                            {question.question}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {question.n1Related && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                              <Star className="w-3 h-3 mr-1" />
                              N1
                            </Badge>
                          )}
                        </div>
                        {question.description && (
                          <p className="text-xs text-muted-foreground mb-3">{question.description}</p>
                        )}

                        {question.type === "text" && (
                          <Input
                            value={(responses.get(question.id) as string) || ""}
                            onChange={(e) => updateResponse(question.id, e.target.value)}
                            placeholder={question.placeholder}
                          />
                        )}

                        {question.type === "textarea" && (
                          <Textarea
                            value={(responses.get(question.id) as string) || ""}
                            onChange={(e) => updateResponse(question.id, e.target.value)}
                            placeholder={question.placeholder}
                            rows={4}
                          />
                        )}

                        {question.type === "url" && (
                          <Input
                            type="url"
                            value={(responses.get(question.id) as string) || ""}
                            onChange={(e) => updateResponse(question.id, e.target.value)}
                            placeholder={question.placeholder || "https://"}
                          />
                        )}

                        {question.type === "number" && (
                          <Input
                            type="number"
                            value={(responses.get(question.id) as string) || ""}
                            onChange={(e) => updateResponse(question.id, e.target.value)}
                            placeholder={question.placeholder}
                          />
                        )}

                        {question.type === "select" && (
                          <Select
                            value={(responses.get(question.id) as string) || ""}
                            onValueChange={(value) => updateResponse(question.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                              {question.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {question.type === "multiselect" && (
                          <div className="flex flex-wrap gap-2">
                            {question.options?.map((option) => {
                              const selected = ((responses.get(question.id) as string[]) || []).includes(option);
                              return (
                                <Button
                                  key={option}
                                  variant={selected ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleMultiSelect(question.id, option)}
                                >
                                  {selected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {option}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">入力チェック</CardTitle>
            </CardHeader>
            <CardContent>
              {validation.valid ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm">必須項目は全て入力済み</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">未入力の必須項目</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {validation.missingQuestions.slice(0, 5).map((q, i) => (
                      <li key={i}>・{q}</li>
                    ))}
                    {validation.missingQuestions.length > 5 && (
                      <li>他 {validation.missingQuestions.length - 5} 件</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                N1インサイト分析
              </CardTitle>
              <CardDescription className="text-xs">
                AIがN1顧客像を分析し、LP制作に活用できる情報を抽出します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={runN1Analysis}
                disabled={isAnalyzing || completeness.n1Percentage < 50}
                className="w-full"
                variant="outline"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    分析を実行
                  </>
                )}
              </Button>
              {completeness.n1Percentage < 50 && (
                <p className="text-xs text-muted-foreground mt-2">
                  N1質問を50%以上回答すると分析できます
                </p>
              )}

              {n1Analysis && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">ペルソナ要約</p>
                    <p className="text-sm">{n1Analysis.persona.summary}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">推奨ヘッドライン</p>
                    <p className="text-sm font-medium">{n1Analysis.copywritingAngle.headline}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">感情フック</p>
                    <div className="flex flex-wrap gap-1">
                      {n1Analysis.copywritingAngle.emotionalHooks.map((hook, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {hook}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">エクスポート</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as typeof exportFormat)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Markdown
                    </div>
                  </SelectItem>
                  <SelectItem value="html">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4" />
                      HTML（印刷用）
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="notion">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Notion
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button onClick={handleExport} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  ダウンロード
                </Button>
                <Button variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
