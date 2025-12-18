"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProductOffer {
  title: string;
  price: number;
  concept: string;
}

interface ProductSet {
  setId: string;
  theme: string;
  offers: {
    front: ProductOffer;
    middle: ProductOffer;
    back: ProductOffer;
    downsell?: ProductOffer;
    orderBump?: ProductOffer;
  };
  recommendedTriggers?: string[];
}

interface DRMFunnelStep {
  step: number;
  label: string;
  asset: string;
  triggerIds: string[];
  goal: string;
  suggestedContent?: string;
}

interface LTVStrategy {
  type: string;
  mechanism: string;
  expectedLiftPct: number;
  implementation?: string;
}

interface PricingRationale {
  tier: string;
  suggestedPrice: number;
  rationale: string;
  anchoring: string;
  comparisonValue: string;
}

interface OfferDesignResult {
  productSet: ProductSet;
  drmFunnel: { steps: DRMFunnelStep[]; totalSteps: number };
  ltvStrategies: LTVStrategy[];
  pricingRationales: PricingRationale[];
  implementationSteps: string[];
  model: string;
}

interface RevenueEstimate {
  monthlyLeads: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  breakdown: Record<string, number>;
}

export default function OfferDesignPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OfferDesignResult | null>(null);
  const [revenueEstimate, setRevenueEstimate] = useState<RevenueEstimate | null>(null);

  // Form state
  const [productType, setProductType] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [mainBenefit, setMainBenefit] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Revenue simulation state
  const [monthlyTraffic, setMonthlyTraffic] = useState("10000");
  const [leadRate, setLeadRate] = useState("0.05");
  const [frontRate, setFrontRate] = useState("0.03");
  const [middleRate, setMiddleRate] = useState("0.1");
  const [backRate, setBackRate] = useState("0.05");

  const handleDesign = async () => {
    if (!productType || !targetAudience || !mainBenefit) {
      setError("商品タイプ、ターゲット、主なベネフィットは必須です");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRevenueEstimate(null);

    try {
      const res = await fetch("/api/dev/offer-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType,
          targetAudience,
          mainBenefit,
          priceRange:
            priceMin && priceMax
              ? { min: parseInt(priceMin), max: parseInt(priceMax) }
              : undefined,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to generate offer design");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRevenue = async () => {
    if (!result) return;

    try {
      const res = await fetch("/api/dev/offer-design?action=revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSet: result.productSet,
          assumptions: {
            monthlyTraffic: parseInt(monthlyTraffic),
            leadConversionRate: parseFloat(leadRate),
            frontConversionRate: parseFloat(frontRate),
            middleConversionRate: parseFloat(middleRate),
            backConversionRate: parseFloat(backRate),
          },
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setRevenueEstimate(data.estimate);
      }
    } catch {
      // ignore
    }
  };

  const formatPrice = (price: number) => `¥${price.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">オファー設計アシスタント</h1>
        <p className="text-sm text-muted-foreground">
          ナレッジベースを活用して、商品セット・ファネル・価格設定を自動設計
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">商品情報入力</CardTitle>
          <CardDescription>
            設計したい商品の基本情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">商品タイプ *</label>
              <Input
                placeholder="例: オンラインコース、コンサルティング、電子書籍"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ターゲット *</label>
              <Input
                placeholder="例: 副業を始めたい30代会社員"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">主なベネフィット *</label>
            <Textarea
              placeholder="例: 3ヶ月で月収10万円の副収入を得られる"
              value={mainBenefit}
              onChange={(e) => setMainBenefit(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">最低価格（円）</label>
              <Input
                type="number"
                placeholder="例: 1000"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">最高価格（円）</label>
              <Input
                type="number"
                placeholder="例: 100000"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleDesign} disabled={loading} className="w-full">
            {loading ? "設計中..." : "オファー設計を生成"}
          </Button>

          {error && (
            <div className="text-sm text-red-500 rounded-md border border-red-200 bg-red-50 p-3">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Product Set */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">商品セット設計</CardTitle>
              <CardDescription>
                テーマ: {result.productSet.theme}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Front */}
                <div className="rounded-lg border bg-blue-50 p-4">
                  <div className="text-xs font-medium text-blue-600 mb-1">
                    FRONT（入口商品）
                  </div>
                  <div className="font-bold">{result.productSet.offers.front.title}</div>
                  <div className="text-lg font-bold text-blue-700 mt-1">
                    {formatPrice(result.productSet.offers.front.price)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.productSet.offers.front.concept}
                  </p>
                </div>

                {/* Middle */}
                <div className="rounded-lg border bg-green-50 p-4">
                  <div className="text-xs font-medium text-green-600 mb-1">
                    MIDDLE（実践商品）
                  </div>
                  <div className="font-bold">{result.productSet.offers.middle.title}</div>
                  <div className="text-lg font-bold text-green-700 mt-1">
                    {formatPrice(result.productSet.offers.middle.price)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.productSet.offers.middle.concept}
                  </p>
                </div>

                {/* Back */}
                <div className="rounded-lg border bg-purple-50 p-4">
                  <div className="text-xs font-medium text-purple-600 mb-1">
                    BACK（本命商品）
                  </div>
                  <div className="font-bold">{result.productSet.offers.back.title}</div>
                  <div className="text-lg font-bold text-purple-700 mt-1">
                    {formatPrice(result.productSet.offers.back.price)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.productSet.offers.back.concept}
                  </p>
                </div>
              </div>

              {/* Optional products */}
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                {result.productSet.offers.downsell && (
                  <div className="rounded-lg border bg-orange-50 p-4">
                    <div className="text-xs font-medium text-orange-600 mb-1">
                      DOWNSELL
                    </div>
                    <div className="font-bold">{result.productSet.offers.downsell.title}</div>
                    <div className="text-lg font-bold text-orange-700 mt-1">
                      {formatPrice(result.productSet.offers.downsell.price)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {result.productSet.offers.downsell.concept}
                    </p>
                  </div>
                )}
                {result.productSet.offers.orderBump && (
                  <div className="rounded-lg border bg-pink-50 p-4">
                    <div className="text-xs font-medium text-pink-600 mb-1">
                      ORDER BUMP
                    </div>
                    <div className="font-bold">{result.productSet.offers.orderBump.title}</div>
                    <div className="text-lg font-bold text-pink-700 mt-1">
                      {formatPrice(result.productSet.offers.orderBump.price)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {result.productSet.offers.orderBump.concept}
                    </p>
                  </div>
                )}
              </div>

              {result.productSet.recommendedTriggers &&
                result.productSet.recommendedTriggers.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">推奨心理トリガー</div>
                    <div className="flex flex-wrap gap-2">
                      {result.productSet.recommendedTriggers.map((trigger) => (
                        <span
                          key={trigger}
                          className="px-2 py-1 text-xs bg-muted rounded-full"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* DRM Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">DRMファネル設計</CardTitle>
              <CardDescription>
                {result.drmFunnel.totalSteps}ステップのセールスファネル
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.drmFunnel.steps.map((step) => (
                  <div
                    key={step.step}
                    className="flex items-start gap-4 p-3 rounded-lg border"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {step.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{step.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {step.asset}
                      </div>
                      {step.suggestedContent && (
                        <div className="text-sm mt-1 text-blue-600">
                          {step.suggestedContent}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        目標: {step.goal}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {step.triggerIds.map((id) => (
                        <span
                          key={id}
                          className="px-1.5 py-0.5 text-xs bg-muted rounded"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* LTV Strategies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">LTV最大化戦略</CardTitle>
              <CardDescription>
                顧客生涯価値を高める施策
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {result.ltvStrategies.map((strategy, i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">
                        {strategy.type.replace("_", " ")}
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        +{strategy.expectedLiftPct}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {strategy.mechanism}
                    </p>
                    {strategy.implementation && (
                      <p className="text-xs text-blue-600 mt-2">
                        {strategy.implementation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Rationales */}
          {result.pricingRationales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">価格設定の根拠</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.pricingRationales.map((pr, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium uppercase">
                          {pr.tier}
                        </span>
                        <span className="font-bold">
                          {formatPrice(pr.suggestedPrice)}
                        </span>
                      </div>
                      <p className="text-sm">{pr.rationale}</p>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="p-2 bg-muted rounded">
                          <div className="text-muted-foreground">アンカリング</div>
                          <div>{pr.anchoring}</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-muted-foreground">比較価値</div>
                          <div>{pr.comparisonValue}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Implementation Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">実装ステップ</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {result.implementationSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Revenue Simulation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">収益シミュレーション</CardTitle>
              <CardDescription>
                想定トラフィックから月間収益を試算
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium">月間トラフィック</label>
                  <Input
                    type="number"
                    value={monthlyTraffic}
                    onChange={(e) => setMonthlyTraffic(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">リード獲得率</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={leadRate}
                    onChange={(e) => setLeadRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Front CVR</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={frontRate}
                    onChange={(e) => setFrontRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Middle CVR</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={middleRate}
                    onChange={(e) => setMiddleRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Back CVR</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={backRate}
                    onChange={(e) => setBackRate(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleCalculateRevenue} variant="outline">
                収益を計算
              </Button>

              {revenueEstimate && (
                <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground">月間リード数</div>
                    <div className="text-2xl font-bold">
                      {revenueEstimate.monthlyLeads.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50">
                    <div className="text-sm text-green-600">月間収益</div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatPrice(revenueEstimate.monthlyRevenue)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50">
                    <div className="text-sm text-blue-600">平均注文単価</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatPrice(revenueEstimate.averageOrderValue)}
                    </div>
                  </div>
                </div>
              )}

              {revenueEstimate && (
                <div className="pt-4">
                  <div className="text-sm font-medium mb-2">収益内訳</div>
                  <div className="space-y-2">
                    {Object.entries(revenueEstimate.breakdown).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{key}</span>
                        <span className="font-medium">{formatPrice(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model info */}
          <div className="text-xs text-muted-foreground text-right">
            使用モデル: {result.model}
          </div>
        </>
      )}
    </div>
  );
}
