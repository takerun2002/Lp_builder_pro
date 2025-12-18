"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { N1InputForm } from "@/components/research/N1InputForm";
import { N1vsPersonaView } from "@/components/research/N1vsPersonaView";
import { N1WarningModal } from "@/components/research/N1WarningModal";
import type { N1Data } from "@/lib/research/n1-manager";
import type { GeneratedPersona } from "@/lib/research/persona-generator";

// Temporary project ID for demo
const DEMO_PROJECT_ID = "demo_project_001";

export default function N1Page() {
  const [n1List, setN1List] = useState<N1Data[]>([]);
  const [selectedN1, setSelectedN1] = useState<N1Data | null>(null);
  const [persona, setPersona] = useState<GeneratedPersona | null>(null);
  const [reliability, setReliability] = useState<{
    score: number;
    warnings: string[];
    recommendations: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setShowForm] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  // Fetch N1 data
  const fetchN1Data = useCallback(async () => {
    try {
      const response = await fetch(`/api/n1?projectId=${DEMO_PROJECT_ID}`);
      const data = await response.json();
      setN1List(data.data || []);
    } catch (error) {
      console.error("Failed to fetch N1 data:", error);
    }
  }, []);

  useEffect(() => {
    fetchN1Data();
  }, [fetchN1Data]);

  // Handle N1 form submit
  const handleN1Submit = async (formData: {
    basic: N1Data["basic"];
    beforePurchase: N1Data["beforePurchase"];
    decisionPoint: N1Data["decisionPoint"];
    afterPurchase: N1Data["afterPurchase"];
    meta: N1Data["meta"];
  }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/n1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: DEMO_PROJECT_ID,
          ...formData,
        }),
      });

      if (response.ok) {
        await fetchN1Data();
        setShowForm(false);
        setActiveTab("list");
      }
    } catch (error) {
      console.error("Failed to save N1 data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate persona from N1 data
  const handleGeneratePersona = async () => {
    // Check if N1 data exists
    if (n1List.length === 0) {
      setShowWarningModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/n1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-persona",
          projectId: DEMO_PROJECT_ID,
          useAI: true,
        }),
      });

      const data = await response.json();
      if (data.persona) {
        setPersona(data.persona);
        setReliability(data.reliability);
        setActiveTab("persona");
      }
    } catch (error) {
      console.error("Failed to generate persona:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI-only persona (proceed anyway from warning)
  const handleProceedWithAI = async () => {
    setShowWarningModal(false);
    setLoading(true);
    try {
      const response = await fetch("/api/n1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-persona",
          projectId: DEMO_PROJECT_ID,
          useAI: true,
        }),
      });

      const data = await response.json();
      if (data.persona) {
        setPersona(data.persona);
        setReliability(data.reliability);
        setActiveTab("persona");
      }
    } catch (error) {
      console.error("Failed to generate persona:", error);
    } finally {
      setLoading(false);
    }
  };

  // Delete N1 data
  const handleDeleteN1 = async (id: string) => {
    if (!confirm("このN1データを削除しますか？")) return;

    try {
      await fetch(`/api/n1?id=${id}`, { method: "DELETE" });
      await fetchN1Data();
      if (selectedN1?.id === id) {
        setSelectedN1(null);
      }
    } catch (error) {
      console.error("Failed to delete N1 data:", error);
    }
  };

  // Download interview template
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/n1?action=template");
      const data = await response.json();

      const blob = new Blob([data.template], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "n1_interview_template.md";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download template:", error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">N1データ管理</h1>
        <p className="text-muted-foreground">
          実在顧客（N1）のインタビューデータを管理し、信頼性の高いペルソナを生成します。
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{n1List.length}</div>
            <p className="text-sm text-muted-foreground">N1データ数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {n1List.length >= 3 ? "🟢" : n1List.length >= 1 ? "🟡" : "🔴"}
            </div>
            <p className="text-sm text-muted-foreground">データレベル</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {persona ? `${reliability?.score || 0}%` : "-"}
            </div>
            <p className="text-sm text-muted-foreground">ペルソナ信頼度</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              📋 テンプレートDL
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="list">N1一覧</TabsTrigger>
            <TabsTrigger value="input">N1入力</TabsTrigger>
            <TabsTrigger value="persona">ペルソナ</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(true);
                setActiveTab("input");
              }}
            >
              + N1を追加
            </Button>
            <Button onClick={handleGeneratePersona} disabled={loading}>
              {loading ? "生成中..." : "ペルソナ生成"}
            </Button>
          </div>
        </div>

        {/* N1 List Tab */}
        <TabsContent value="list">
          {n1List.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium mb-2">N1データがありません</h3>
                <p className="text-muted-foreground mb-4">
                  実在顧客へのインタビュー結果を入力してください。
                  <br />
                  たった1人の深い理解が、強力なマーケティングの源泉になります。
                </p>
                <Button
                  onClick={() => {
                    setShowForm(true);
                    setActiveTab("input");
                  }}
                >
                  N1データを入力する
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {n1List.map((n1) => (
                <Card
                  key={n1.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedN1?.id === n1.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedN1(n1)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            🟢 事実
                          </Badge>
                          {n1.basic.name}（{n1.basic.age}歳）
                        </CardTitle>
                        <CardDescription>
                          {n1.basic.occupation} | {n1.basic.purchasedProduct}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteN1(n1.id);
                        }}
                      >
                        削除
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">悩み:</p>
                        <p className="line-clamp-2">{n1.beforePurchase.painPoint}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">決め手:</p>
                        <p className="line-clamp-2">{n1.decisionPoint.triggerMoment}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Selected N1 Detail */}
          {selectedN1 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedN1.basic.name}さん 詳細
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-green-700">
                      🟢 購入前の悩み
                    </h4>
                    <p className="text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                      {selectedN1.beforePurchase.painPoint}
                    </p>
                    {selectedN1.beforePurchase.whyNotWorked && (
                      <p className="text-xs text-muted-foreground mt-2">
                        他の解決策がダメだった理由: {selectedN1.beforePurchase.whyNotWorked}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-green-700">
                      🟢 購入の決め手
                    </h4>
                    <p className="text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                      {selectedN1.decisionPoint.triggerMoment}
                    </p>
                    {selectedN1.decisionPoint.hesitation && (
                      <p className="text-xs text-muted-foreground mt-2">
                        躊躇した点: {selectedN1.decisionPoint.hesitation}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-green-700">
                      🟢 購入後の変化
                    </h4>
                    <p className="text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                      {selectedN1.afterPurchase.transformation}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-green-700">
                      🟢 推薦コメント
                    </h4>
                    <p className="text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                      {selectedN1.afterPurchase.recommendation || "未入力"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* N1 Input Tab */}
        <TabsContent value="input">
          <N1InputForm
            projectId={DEMO_PROJECT_ID}
            onSubmit={handleN1Submit}
            onCancel={() => {
              setShowForm(false);
              setActiveTab("list");
            }}
            loading={loading}
          />
        </TabsContent>

        {/* Persona Tab */}
        <TabsContent value="persona">
          {persona && reliability ? (
            <N1vsPersonaView persona={persona} reliability={reliability} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-lg font-medium mb-2">ペルソナ未生成</h3>
                <p className="text-muted-foreground mb-4">
                  N1データからペルソナを生成してください。
                  <br />
                  N1データがある場合は高信頼度のペルソナが生成されます。
                </p>
                <Button onClick={handleGeneratePersona} disabled={loading}>
                  {loading ? "生成中..." : "ペルソナを生成"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* N1 Warning Modal */}
      <N1WarningModal
        open={showWarningModal}
        onOpenChange={setShowWarningModal}
        onProceedAnyway={handleProceedWithAI}
        onAddN1Data={() => {
          setShowWarningModal(false);
          setActiveTab("input");
        }}
        context="persona"
      />
    </div>
  );
}
