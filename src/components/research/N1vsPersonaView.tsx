"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { GeneratedPersona } from "@/lib/research/persona-generator";
import type { LabeledData, DataLevel } from "@/lib/research/n1-manager";
import { getLevelLabel, getLevelColorClass } from "@/lib/research/n1-manager";

interface N1vsPersonaViewProps {
  persona: GeneratedPersona;
  reliability: {
    score: number;
    warnings: string[];
    recommendations: string[];
  };
}

export function N1vsPersonaView({ persona, reliability }: N1vsPersonaViewProps) {
  const renderLabeledData = (items: LabeledData[], title: string) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">{title}</h4>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">データなし</p>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${getLevelColorClass(item.level)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm flex-1">{item.content}</p>
                <LevelBadge level={item.level} />
              </div>
              {item.source && item.source !== "ai_generated" && (
                <p className="text-xs mt-1 opacity-70">
                  ソース: N1 #{item.source.slice(-6)}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Reliability Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">データ信頼度</CardTitle>
          <CardDescription>
            N1データに基づく信頼度スコア
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={reliability.score} className="h-3" />
            </div>
            <div className="text-2xl font-bold">
              {reliability.score}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
          </div>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span>事実（N1）: {persona.sourceN1Ids.length}件</span>
            </div>
            <div className="flex items-center gap-2">
              <DataLevelIndicator level={persona.dataLevel} />
              <span>全体レベル: {getLevelLabel(persona.dataLevel)}</span>
            </div>
          </div>

          {reliability.warnings.length > 0 && (
            <div className="space-y-2">
              {reliability.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800"
                >
                  <span>⚠️</span>
                  <span className="text-sm">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {reliability.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">推奨アクション:</p>
              {reliability.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800"
                >
                  <span>💡</span>
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Persona Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {persona.name}
            <LevelBadge level={persona.dataLevel} />
          </CardTitle>
          <CardDescription>{persona.tagline}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demographics */}
          <div className="grid gap-4 md:grid-cols-3">
            <InfoItem label="年齢" value={persona.demographics.ageRange} />
            <InfoItem label="性別" value={persona.demographics.gender} />
            <InfoItem label="職業" value={persona.demographics.occupation} />
            <InfoItem label="収入" value={persona.demographics.income} />
            <InfoItem label="居住地" value={persona.demographics.location} />
            <InfoItem label="家族構成" value={persona.demographics.familyStatus} />
          </div>

          {/* Psychographics */}
          {persona.psychographics && (
            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm mb-3">サイコグラフィクス</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {persona.psychographics.values.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">価値観</p>
                    <div className="flex flex-wrap gap-1">
                      {persona.psychographics.values.map((v, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {persona.psychographics.interests.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">興味関心</p>
                    <div className="flex flex-wrap gap-1">
                      {persona.psychographics.interests.map((i, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {i}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labeled Data Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">悩み・ペインポイント</CardTitle>
          </CardHeader>
          <CardContent>
            {renderLabeledData(persona.painPoints, "")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">購入の決め手</CardTitle>
          </CardHeader>
          <CardContent>
            {renderLabeledData(persona.decisionTriggers, "")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">反論・躊躇</CardTitle>
          </CardHeader>
          <CardContent>
            {renderLabeledData(persona.objections, "")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">願望・変化</CardTitle>
          </CardHeader>
          <CardContent>
            {renderLabeledData(persona.desires, "")}
          </CardContent>
        </Card>
      </div>

      {/* Ideal Message */}
      {persona.idealMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">理想的なメッセージ</CardTitle>
            <CardDescription>
              このペルソナに最も響くメッセージ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <blockquote className="border-l-4 border-primary pl-4 py-2 italic text-lg">
              {persona.idealMessage}
            </blockquote>
          </CardContent>
        </Card>
      )}

      {/* Buying Journey */}
      {persona.buyingJourney.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">購買ジャーニー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {persona.buyingJourney.map((stage, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{stage.stage}</h4>
                    <p className="text-sm text-muted-foreground">{stage.mindset}</p>
                    {stage.questions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground">疑問:</p>
                        <ul className="text-sm list-disc list-inside">
                          {stage.questions.map((q, qIdx) => (
                            <li key={qIdx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {stage.triggers.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground">トリガー:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {stage.triggers.map((t, tIdx) => (
                            <Badge key={tIdx} variant="secondary" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">データレベル凡例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <span className="text-xl">🟢</span>
              <div>
                <p className="font-medium text-green-800">事実（N1データ）</p>
                <p className="text-sm text-green-700">
                  実在顧客のインタビューから得た情報。最も信頼性が高い。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <span className="text-xl">🟡</span>
              <div>
                <p className="font-medium text-yellow-800">高確度仮説（N1ベース）</p>
                <p className="text-sm text-yellow-700">
                  N1データを元にAIが拡張した推定。比較的信頼性が高い。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="text-xl">🔴</span>
              <div>
                <p className="font-medium text-red-800">仮説（AI生成）</p>
                <p className="text-sm text-red-700">
                  AIによる推測。参考程度に。N1データで検証を推奨。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function LevelBadge({ level }: { level: DataLevel }) {
  const config = {
    fact: { emoji: "🟢", text: "事実", className: "bg-green-100 text-green-800" },
    n1_based: { emoji: "🟡", text: "N1ベース", className: "bg-yellow-100 text-yellow-800" },
    hypothesis: { emoji: "🔴", text: "仮説", className: "bg-red-100 text-red-800" },
  };

  const c = config[level];

  return (
    <Badge variant="outline" className={`text-xs ${c.className}`}>
      {c.emoji} {c.text}
    </Badge>
  );
}

function DataLevelIndicator({ level }: { level: DataLevel }) {
  const colors = {
    fact: "bg-green-500",
    n1_based: "bg-yellow-500",
    hypothesis: "bg-red-500",
  };

  return <span className={`w-3 h-3 rounded-full ${colors[level]}`} />;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "不明"}</p>
    </div>
  );
}
