# Claude Code 指示書: リサーチレベル詳細カスタマイズ機能

## 概要

リサーチエージェントの設定をより柔軟にカスタマイズできるように改善する。
現在の「ライト/スタンダード/フル」の3プリセットでは不十分であり、
ユーザーが所有するAPIキーや予算に応じて細かく調整できる仕組みが必要。

## 現状の問題点

1. **プリセットが固定的すぎる**
   - 3つのレベルしか選べない
   - スタンダードでもBrightDataを使いたい場面がある

2. **コスト表示が不正確**
   - Firecrawl: 月500リクエスト無料 → 実質無料で使える
   - Gemini: 無料枠あり → ライトモードはほぼ0円
   - 現在の「~$0.10」「~$0.50」は誤解を招く

3. **APIキーとの連携がない**
   - どのAPIキーが設定されているかわからない
   - 未設定のAPIを使うソースを選んでもエラーになるだけ

## 実装要件

### 1. リサーチ設定UIの再設計

```
┌─────────────────────────────────────────────────────────────────┐
│ リサーチ設定                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 【クイックスタート】プリセットを選択                                │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│ │ ⚡ 無料  │ │ 🔍 標準  │ │ 🚀 徹底  │ │ ⚙️ カスタム│              │
│ │ 0円     │ │ 0円〜   │ │ $1〜    │ │ 自由設定  │               │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                 │
│                                                                   │
│ 【API利用状況】                                                    │
│ ✅ Gemini API (設定済み・無料枠: 60回/分)                          │
│ ✅ Firecrawl API (設定済み・無料枠: 500回/月, 残り432回)            │
│ ⚠️ BrightData API (未設定) → 設定する                             │
│ ⚠️ Perplexity API (未設定) → 設定する                             │
│ ✅ OpenRouter API (設定済み)                                       │
│                                                                   │
│ 【リサーチソース選択】                                              │
│ 各ソースをON/OFFで切り替え。使用するAPIも表示。                      │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 🏪 Infotopランキング                    [Firecrawl] ✅ ON   │  │
│ │ 売れている情報商材のタイトル・価格帯を分析                      │  │
│ │ コスト: 無料 (Firecrawl無料枠内)                              │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 🎯 競合LP分析                          [Firecrawl] ✅ ON    │  │
│ │ Google検索上位の競合LPをスクレイピング                         │  │
│ │ コスト: 無料 (Firecrawl無料枠内)                              │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 𝕏 X (Twitter)                    [BrightData] ⚠️ 未設定    │  │
│ │ Xのトレンド・インフルエンサーを分析                            │  │
│ │ コスト: ~$0.50/100件 → API設定が必要です                      │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ 【コスト見積もり】                                                  │
│ ├── Gemini API: 約10リクエスト → 無料枠内                         │
│ ├── Firecrawl: 約15リクエスト → 無料枠内 (残り432→417)            │
│ ├── BrightData: 0リクエスト → $0.00                              │
│ ├── Perplexity: 0リクエスト → $0.00                              │
│ └── 合計推定コスト: $0.00 (無料枠内)                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 型定義の更新

`src/lib/research/types.ts` に以下を追加:

```typescript
// API種別
export type ApiProvider = 
  | "gemini"
  | "firecrawl"
  | "brightdata"
  | "perplexity"
  | "openrouter"
  | "manus";

// APIの無料枠情報
export interface ApiFreeQuota {
  provider: ApiProvider;
  name: string;
  freeQuota: number;        // 無料枠の回数
  quotaPeriod: "minute" | "hour" | "day" | "month";
  costPerRequest?: number;  // 無料枠超過時の1リクエストあたりコスト
}

export const API_FREE_QUOTAS: ApiFreeQuota[] = [
  { provider: "gemini", name: "Gemini API", freeQuota: 60, quotaPeriod: "minute", costPerRequest: 0.0001 },
  { provider: "firecrawl", name: "Firecrawl API", freeQuota: 500, quotaPeriod: "month", costPerRequest: 0.01 },
  { provider: "brightdata", name: "BrightData API", freeQuota: 0, quotaPeriod: "month", costPerRequest: 0.005 },
  { provider: "perplexity", name: "Perplexity API", freeQuota: 0, quotaPeriod: "month", costPerRequest: 0.005 },
  { provider: "openrouter", name: "OpenRouter", freeQuota: 0, quotaPeriod: "month", costPerRequest: 0 }, // モデルによる
  { provider: "manus", name: "Manus AI", freeQuota: 0, quotaPeriod: "month", costPerRequest: 0.01 },
];

// 各ソースが使用するAPI
export interface SourceApiMapping {
  source: DataSource;
  primaryApi: ApiProvider;
  alternativeApis?: ApiProvider[]; // 代替API（primaryが使えない場合）
  estimatedRequests: number;       // 1回のリサーチで使う推定リクエスト数
}

export const SOURCE_API_MAPPINGS: SourceApiMapping[] = [
  { source: "infotop", primaryApi: "firecrawl", estimatedRequests: 3 },
  { source: "competitor", primaryApi: "firecrawl", estimatedRequests: 5 },
  { source: "chiebukuro", primaryApi: "firecrawl", estimatedRequests: 3 },
  { source: "amazon_books", primaryApi: "firecrawl", estimatedRequests: 3 },
  { source: "youtube", primaryApi: "firecrawl", estimatedRequests: 2 },
  { source: "ads", primaryApi: "brightdata", alternativeApis: ["firecrawl"], estimatedRequests: 5 },
  { source: "sns_x", primaryApi: "brightdata", estimatedRequests: 10 },
  { source: "sns_instagram", primaryApi: "brightdata", estimatedRequests: 10 },
  { source: "sns_tiktok", primaryApi: "brightdata", estimatedRequests: 10 },
  { source: "overseas", primaryApi: "firecrawl", estimatedRequests: 5 },
];

// プリセット更新（名前とコストを修正）
export const RESEARCH_PRESETS: ResearchPreset[] = [
  {
    id: "free",
    name: "無料",
    description: "無料枠のみ使用。Gemini + Firecrawlの無料枠でリサーチ。",
    icon: "⚡",
    enabledSources: ["chiebukuro", "amazon_books"],
    estimatedCost: "$0",
    estimatedTime: "1〜2分",
  },
  {
    id: "standard",
    name: "標準",
    description: "バランス型。競合分析・YouTube分析も含む。主に無料枠で収まる。",
    icon: "🔍",
    enabledSources: ["infotop", "competitor", "chiebukuro", "amazon_books", "youtube"],
    estimatedCost: "$0〜0.10",
    estimatedTime: "3〜5分",
  },
  {
    id: "thorough",
    name: "徹底",
    description: "SNS分析・広告調査も含む。BrightData/Perplexityが必要。",
    icon: "🚀",
    enabledSources: ["infotop", "competitor", "chiebukuro", "amazon_books", "youtube", "ads", "sns_x", "sns_instagram", "sns_tiktok", "overseas"],
    estimatedCost: "$1〜3",
    estimatedTime: "5〜10分",
  },
  {
    id: "custom",
    name: "カスタム",
    description: "自分で全てのソースとAPIを選択。",
    icon: "⚙️",
    enabledSources: [], // ユーザーが自由に選択
    estimatedCost: "選択次第",
    estimatedTime: "選択次第",
  },
];
```

### 3. APIキー状態取得API

新しいエンドポイント `src/app/api/settings/api-status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getApiKey } from "@/lib/utils/api-keys";

export async function GET() {
  // 各APIキーの設定状態を確認
  const apiStatus = {
    gemini: {
      configured: !!getApiKey("GOOGLE_API_KEY"),
      freeQuota: 60,
      quotaPeriod: "minute",
      remainingQuota: null, // 実際のAPIから取得できれば
    },
    firecrawl: {
      configured: !!getApiKey("FIRECRAWL_API_KEY"),
      freeQuota: 500,
      quotaPeriod: "month",
      remainingQuota: null, // Firecrawl APIで取得可能
    },
    brightdata: {
      configured: !!getApiKey("BRIGHTDATA_API_KEY"),
      freeQuota: 0,
      quotaPeriod: "month",
      remainingQuota: null,
    },
    perplexity: {
      configured: !!getApiKey("PERPLEXITY_API_KEY"),
      freeQuota: 0,
      quotaPeriod: "month",
      remainingQuota: null,
    },
    openrouter: {
      configured: !!getApiKey("OPENROUTER_API_KEY"),
      freeQuota: 0,
      quotaPeriod: "month",
      remainingQuota: null,
    },
    manus: {
      configured: !!getApiKey("MANUS_API_KEY"),
      freeQuota: 0,
      quotaPeriod: "month",
      remainingQuota: null,
    },
  };

  return NextResponse.json({ success: true, status: apiStatus });
}
```

### 4. リサーチ設定UIコンポーネント

新規コンポーネント `src/components/research/ResearchSourceSelector.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Settings, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  SCRAPER_OPTIONS,
  SOURCE_API_MAPPINGS,
  API_FREE_QUOTAS,
  RESEARCH_PRESETS,
  type DataSource,
  type ResearchPreset,
} from "@/lib/research/types";

interface ApiStatus {
  configured: boolean;
  freeQuota: number;
  quotaPeriod: string;
  remainingQuota: number | null;
}

interface ResearchSourceSelectorProps {
  selectedSources: DataSource[];
  onSourcesChange: (sources: DataSource[]) => void;
}

export function ResearchSourceSelector({
  selectedSources,
  onSourcesChange,
}: ResearchSourceSelectorProps) {
  const [apiStatus, setApiStatus] = useState<Record<string, ApiStatus>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>("standard");
  const [loading, setLoading] = useState(true);

  // APIステータスを取得
  useEffect(() => {
    fetch("/api/settings/api-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setApiStatus(data.status);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // プリセット選択時
  const handlePresetSelect = (preset: ResearchPreset) => {
    setSelectedPreset(preset.id);
    if (preset.id !== "custom") {
      onSourcesChange(preset.enabledSources);
    }
  };

  // ソース切り替え
  const toggleSource = (source: DataSource) => {
    setSelectedPreset("custom"); // カスタムモードに切り替え
    if (selectedSources.includes(source)) {
      onSourcesChange(selectedSources.filter((s) => s !== source));
    } else {
      onSourcesChange([...selectedSources, source]);
    }
  };

  // コスト計算
  const calculateCost = () => {
    let totalCost = 0;
    const breakdown: { api: string; requests: number; cost: number; isFree: boolean }[] = [];

    for (const source of selectedSources) {
      const mapping = SOURCE_API_MAPPINGS.find((m) => m.source === source);
      if (!mapping) continue;

      const quota = API_FREE_QUOTAS.find((q) => q.provider === mapping.primaryApi);
      if (!quota) continue;

      // 簡易計算（無料枠を考慮）
      const isFree = quota.freeQuota > 0;
      const cost = isFree ? 0 : (quota.costPerRequest || 0) * mapping.estimatedRequests;
      totalCost += cost;

      breakdown.push({
        api: quota.name,
        requests: mapping.estimatedRequests,
        cost,
        isFree,
      });
    }

    return { total: totalCost, breakdown };
  };

  const { total, breakdown } = calculateCost();

  // ソースに必要なAPIが設定されているか
  const getSourceApiStatus = (source: DataSource) => {
    const mapping = SOURCE_API_MAPPINGS.find((m) => m.source === source);
    if (!mapping) return { available: false, api: "unknown" };

    const status = apiStatus[mapping.primaryApi];
    return {
      available: status?.configured ?? false,
      api: mapping.primaryApi,
      freeQuota: status?.freeQuota ?? 0,
    };
  };

  return (
    <div className="space-y-6">
      {/* プリセット選択 */}
      <div>
        <h3 className="text-sm font-semibold mb-3">クイックスタート</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {RESEARCH_PRESETS.map((preset) => (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all ${
                selectedPreset === preset.id
                  ? "border-2 border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handlePresetSelect(preset)}
            >
              <CardContent className="p-3 text-center">
                <div className="text-2xl mb-1">{preset.icon}</div>
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground">{preset.estimatedCost}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* API設定状況 */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          API設定状況
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Settings className="w-3 h-3 mr-1" />
              設定
            </Button>
          </Link>
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(apiStatus).map(([api, status]) => (
            <Badge
              key={api}
              variant={status.configured ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {status.configured ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-yellow-500" />
              )}
              {api}
              {status.freeQuota > 0 && status.configured && (
                <span className="text-[10px] opacity-70">
                  (無料{status.freeQuota}/{status.quotaPeriod})
                </span>
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* ソース選択 */}
      <div>
        <h3 className="text-sm font-semibold mb-3">リサーチソース</h3>
        <div className="space-y-2">
          {SCRAPER_OPTIONS.map((option) => {
            const apiInfo = getSourceApiStatus(option.id);
            const isSelected = selectedSources.includes(option.id);

            return (
              <Card
                key={option.id}
                className={`transition-all ${
                  isSelected ? "border-primary/50 bg-primary/5" : ""
                } ${!apiInfo.available && isSelected ? "border-yellow-500/50" : ""}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{option.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{option.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {apiInfo.api}
                          </Badge>
                          {apiInfo.freeQuota > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700">
                              無料枠
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                        {!apiInfo.available && (
                          <Link href="/settings" className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            APIキー未設定
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => toggleSource(option.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* コスト見積もり */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">推定コスト</h3>
          <div className="space-y-1 text-xs">
            {breakdown.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>{item.api} ({item.requests}リクエスト)</span>
                <span className={item.isFree ? "text-green-600" : ""}>
                  {item.isFree ? "無料枠内" : `$${item.cost.toFixed(2)}`}
                </span>
              </div>
            ))}
            <div className="border-t pt-1 mt-2 flex justify-between font-semibold">
              <span>合計</span>
              <span className={total === 0 ? "text-green-600" : ""}>
                {total === 0 ? "$0 (無料)" : `~$${total.toFixed(2)}`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. リサーチページへの統合

`src/app/dev/research/page.tsx` の `renderInitStep()` を更新して、
新しい `ResearchSourceSelector` コンポーネントを使用する。

## 完了条件

1. [ ] 型定義の追加（`src/lib/research/types.ts`）
2. [ ] APIステータス取得API（`src/app/api/settings/api-status/route.ts`）
3. [ ] `ResearchSourceSelector` コンポーネント作成
4. [ ] リサーチページへの統合
5. [ ] プリセット名を「無料」「標準」「徹底」「カスタム」に変更
6. [ ] 各ソースに使用APIと無料枠情報を表示
7. [ ] 動的コスト計算の実装
8. [ ] 未設定APIへのリンク表示

## UI/UXの考慮事項

- プリセットを選んでも、その後個別にソースをON/OFFできる（自動的にカスタムモードに切り替わる）
- APIが未設定のソースは選択できるが、警告を表示
- 無料枠があるAPIは緑色のバッジで強調
- コスト見積もりはリアルタイムで更新

## 優先度

**高** - ユーザー体験に直結する重要な機能改善
