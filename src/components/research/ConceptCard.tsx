"use client";

/**
 * ConceptCard - コンセプト候補表示カード
 *
 * 生成されたコンセプト候補を表示し、スコアや詳細を確認できる
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Star,
  Lightbulb,
  Target,
  Zap,
} from "lucide-react";
import type { ConceptCandidate } from "@/lib/research/concept-generator";

interface ConceptCardProps {
  concept: ConceptCandidate;
  rank?: number;
  isSelected?: boolean;
  onSelect?: (concept: ConceptCandidate) => void;
  onCopy?: (text: string) => void;
  showDetails?: boolean;
}

export function ConceptCard({
  concept,
  rank,
  isSelected,
  onSelect,
  onCopy,
  showDetails = false,
}: ConceptCardProps) {
  const [expanded, setExpanded] = useState(showDetails);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    onCopy?.(text);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-gray-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-gray-100";
  };

  return (
    <Card
      className={`relative transition-all ${
        isSelected
          ? "ring-2 ring-blue-500 shadow-lg"
          : "hover:shadow-md"
      }`}
    >
      {/* ランク表示 */}
      {rank && (
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
          {rank}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-tight pr-8">
            {concept.headline}
          </CardTitle>
          <div
            className={`px-2 py-1 rounded-full text-sm font-bold ${getScoreBg(
              concept.scores.overall
            )} ${getScoreColor(concept.scores.overall)}`}
          >
            {concept.scores.overall}
          </div>
        </div>
        {concept.headlineLong && (
          <p className="text-sm text-muted-foreground mt-1">
            {concept.headlineLong}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ターゲットの痛み & ベネフィット */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>ターゲットの痛み</span>
            </div>
            <p className="text-xs">{concept.targetPain}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>ベネフィット</span>
            </div>
            <p className="text-xs">{concept.benefit}</p>
          </div>
        </div>

        {/* 使用キーワード */}
        {concept.usedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {concept.usedKeywords.slice(0, 5).map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
            {concept.usedKeywords.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{concept.usedKeywords.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* スコア詳細（展開時） */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {/* スコア内訳 */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <ScoreItem
                label="明確さ"
                value={concept.scores.benefitClarity}
              />
              <ScoreItem label="具体性" value={concept.scores.specificity} />
              <ScoreItem label="インパクト" value={concept.scores.impact} />
              <ScoreItem label="独自性" value={concept.scores.uniqueness} />
            </div>

            {/* 具体的ベネフィット */}
            {concept.benefitConcrete && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lightbulb className="w-3 h-3" />
                  <span>具体的ベネフィット</span>
                </div>
                <p className="text-sm bg-muted p-2 rounded">
                  {concept.benefitConcrete}
                </p>
              </div>
            )}

            {/* 心理トリガー */}
            {concept.psychologyTriggers.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">心理トリガー</div>
                <div className="flex flex-wrap gap-1">
                  {concept.psychologyTriggers.map((trigger, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 提案セクション */}
            {concept.suggestedSections.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  推奨LP構成
                </div>
                <div className="text-xs text-muted-foreground">
                  {concept.suggestedSections.join(" → ")}
                </div>
              </div>
            )}

            {/* 理由 */}
            {concept.rationale && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  このコンセプトの根拠
                </div>
                <p className="text-xs text-muted-foreground italic">
                  {concept.rationale}
                </p>
              </div>
            )}

            {/* 参考競合 */}
            {concept.referenceCompetitor && (
              <div className="text-xs text-muted-foreground">
                参考: {concept.referenceCompetitor}
              </div>
            )}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                閉じる
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                詳細
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(concept.headline)}
            >
              <Copy className="w-4 h-4 mr-1" />
              コピー
            </Button>
            {onSelect && (
              <Button
                variant={isSelected ? "default" : "secondary"}
                size="sm"
                onClick={() => onSelect(concept)}
              >
                <Star
                  className={`w-4 h-4 mr-1 ${isSelected ? "fill-current" : ""}`}
                />
                {isSelected ? "選択中" : "選択"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// スコアアイテムコンポーネント
function ScoreItem({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 80) return "text-green-600";
    if (v >= 60) return "text-yellow-600";
    return "text-gray-500";
  };

  return (
    <div className="text-center">
      <div className="text-muted-foreground">{label}</div>
      <div className={`font-bold ${getColor(value)}`}>{value}</div>
    </div>
  );
}

// コンセプトリスト表示用コンポーネント
interface ConceptListProps {
  concepts: ConceptCandidate[];
  selectedId?: string;
  onSelect?: (concept: ConceptCandidate) => void;
}

export function ConceptList({
  concepts,
  selectedId,
  onSelect,
}: ConceptListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {concepts.map((concept, index) => (
        <ConceptCard
          key={concept.id}
          concept={concept}
          rank={index + 1}
          isSelected={concept.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
