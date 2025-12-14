"use client";

/**
 * オファー設計アシスタント UI
 *
 * 商品セット・ファネル・価格設定を自動設計
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================
// 型定義
// ============================================

type OfferTier = "front" | "middle" | "back" | "downsell" | "order_bump";

interface Offer {
  tier: OfferTier;
  title: string;
  price: number;
  concept: string;
  triggers?: string[];
}

interface ProductSet {
  set_id: string;
  theme: string;
  offers: Record<OfferTier, Offer>;
}

interface DrmFunnelStep {
  step: number;
  label: string;
  asset: string;
  trigger_ids: string[];
  goal: string;
}

interface LtvStrategy {
  type: string;
  mechanism: string;
  expected_lift_pct: number;
}

interface PersonaTemplate {
  id: string;
  label: string;
  core_pain: string;
  trigger_ids: string[];
  primary_offer_tier: string;
}

interface OfferDesignResult {
  productSet: ProductSet;
  funnel: DrmFunnelStep[];
  ltvStrategies: LtvStrategy[];
  pricingRationale: string;
  personas: PersonaTemplate[];
  yaml: string;
}

// ============================================
// 定数
// ============================================

const GENRES = [
  "ビジネス・起業",
  "マーケティング",
  "プログラミング",
  "デザイン",
  "健康・ダイエット",
  "美容・スキンケア",
  "恋愛・婚活",
  "投資・資産運用",
  "語学学習",
  "スピリチュアル",
  "子育て・教育",
  "趣味・スキル",
];

const BRAND_ARCHETYPES = [
  { id: "Hero", label: "Hero（挑戦・勝利・成長）" },
  { id: "Sage", label: "Sage（知恵・真実・教育）" },
  { id: "Creator", label: "Creator（革新・想像力・表現）" },
  { id: "Caregiver", label: "Caregiver（共感・保護・サポート）" },
];

const TIER_LABELS: Record<OfferTier, string> = {
  front: "フロント商品",
  middle: "ミドル商品",
  back: "バック商品",
  downsell: "ダウンセル",
  order_bump: "オーダーバンプ",
};

const TIER_COLORS: Record<OfferTier, string> = {
  front: "bg-green-100 border-green-300",
  middle: "bg-blue-100 border-blue-300",
  back: "bg-purple-100 border-purple-300",
  downsell: "bg-yellow-100 border-yellow-300",
  order_bump: "bg-orange-100 border-orange-300",
};

// ============================================
// コンポーネント
// ============================================

export default function OfferDesignPage() {
  // フォーム状態
  const [genre, setGenre] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [corePain, setCorePain] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [minPrice, setMinPrice] = useState(1000);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [brandArchetype, setBrandArchetype] = useState("");

  // 結果状態
  const [result, setResult] = useState<OfferDesignResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // ============================================
  // ハンドラー
  // ============================================

  async function handleGenerate() {
    const selectedGenre = genre === "other" ? customGenre : genre;

    if (!selectedGenre || !targetAudience || !corePain || !desiredOutcome) {
      setError("必須項目を入力してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/offer-design/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre: selectedGenre,
          targetAudience,
          corePain,
          desiredOutcome,
          priceRange: { min: minPrice, max: maxPrice },
          brandArchetype: brandArchetype || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("オファー設計の生成に失敗しました");
      }

      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyYaml() {
    if (!result?.yaml) return;

    try {
      await navigator.clipboard.writeText(result.yaml);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError("コピーに失敗しました");
    }
  }

  function handleDownloadYaml() {
    if (!result?.yaml) return;

    const blob = new Blob([result.yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offer-design-${Date.now()}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">オファー設計アシスタント</h1>
        <p className="text-gray-600 mt-1">
          商品セット・ファネル・価格設定をAIで自動設計
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左カラム: 入力フォーム */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ビジネス情報</CardTitle>
              <CardDescription>
                オファーを設計するための基本情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ジャンル選択 */}
              <div>
                <Label>ジャンル *</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="other">その他（自由入力）</option>
                </select>
                {genre === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="ジャンルを入力"
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                  />
                )}
              </div>

              {/* ターゲット */}
              <div>
                <Label>ターゲット *</Label>
                <Input
                  className="mt-1"
                  placeholder="例: 30代の働く女性、副業を始めたい会社員"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>

              {/* 主な悩み */}
              <div>
                <Label>主な悩み・課題 *</Label>
                <Textarea
                  className="mt-1"
                  placeholder="例: 時間がない、何から始めればいいかわからない"
                  value={corePain}
                  onChange={(e) => setCorePain(e.target.value)}
                />
              </div>

              {/* 理想の状態 */}
              <div>
                <Label>理想の状態・ゴール *</Label>
                <Textarea
                  className="mt-1"
                  placeholder="例: 月収10万円の副収入、自由な働き方"
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                />
              </div>

              {/* 価格帯 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>最小価格</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>最大価格</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* ブランドアーキタイプ */}
              <div>
                <Label>ブランドアーキタイプ（任意）</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={brandArchetype}
                  onChange={(e) => setBrandArchetype(e.target.value)}
                >
                  <option value="">選択しない</option>
                  {BRAND_ARCHETYPES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* エラー表示 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* 生成ボタン */}
              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "生成中..." : "オファーを設計"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: 結果表示 */}
        <div className="space-y-4">
          {result ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>設計結果</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyYaml}>
                      {copySuccess ? "コピーしました!" : "YAMLコピー"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadYaml}
                    >
                      ダウンロード
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {result.productSet.theme}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="products">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="products">商品</TabsTrigger>
                    <TabsTrigger value="funnel">ファネル</TabsTrigger>
                    <TabsTrigger value="ltv">LTV戦略</TabsTrigger>
                    <TabsTrigger value="yaml">YAML</TabsTrigger>
                  </TabsList>

                  {/* 商品セット */}
                  <TabsContent value="products" className="mt-4 space-y-3">
                    {(
                      Object.entries(result.productSet.offers) as [
                        OfferTier,
                        Offer
                      ][]
                    ).map(([tier, offer]) => (
                      <div
                        key={tier}
                        className={`p-4 rounded-lg border ${TIER_COLORS[tier]}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              {TIER_LABELS[tier]}
                            </span>
                            <h4 className="font-bold">{offer.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {offer.concept}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">
                              ¥{offer.price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {offer.triggers && offer.triggers.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {offer.triggers.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 bg-white/50 rounded text-xs"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 価格設定の根拠 */}
                    {result.pricingRationale && (
                      <div className="p-4 bg-gray-50 rounded-lg mt-4">
                        <h4 className="font-medium text-sm mb-2">
                          価格設定の根拠
                        </h4>
                        <p className="text-sm text-gray-600">
                          {result.pricingRationale}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ファネル */}
                  <TabsContent value="funnel" className="mt-4">
                    <div className="space-y-3">
                      {result.funnel.map((step) => (
                        <div
                          key={step.step}
                          className="flex items-start gap-4 p-3 border rounded-lg"
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                            {step.step}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{step.label}</h4>
                            <p className="text-sm text-gray-600">{step.asset}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              目標: {step.goal}
                            </p>
                            {step.trigger_ids.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {step.trigger_ids.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* LTV戦略 */}
                  <TabsContent value="ltv" className="mt-4">
                    <div className="space-y-3">
                      {result.ltvStrategies.map((strategy) => (
                        <div
                          key={strategy.type}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium capitalize">
                              {strategy.type}
                            </h4>
                            <span className="text-green-600 font-bold">
                              +{strategy.expected_lift_pct}%
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {strategy.mechanism}
                          </p>
                        </div>
                      ))}

                      {/* ペルソナ */}
                      {result.personas.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-3">ターゲットペルソナ</h4>
                          <div className="space-y-2">
                            {result.personas.map((persona) => (
                              <div
                                key={persona.id}
                                className="p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex justify-between">
                                  <span className="font-medium">
                                    {persona.label}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {persona.primary_offer_tier}向け
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {persona.core_pain}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* YAML */}
                  <TabsContent value="yaml" className="mt-4">
                    <Textarea
                      className="min-h-[400px] font-mono text-sm"
                      value={result.yaml}
                      readOnly
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <p className="text-lg">
                    左のフォームに情報を入力して
                    <br />
                    オファーを設計してください
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
