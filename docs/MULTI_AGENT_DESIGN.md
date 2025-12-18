# LP Builder Pro - マルチエージェントシステム設計書

**作成日**: 2024-12-17
**バージョン**: 1.0
**ステータス**: 設計フェーズ

---

## 1. 概要

### 1.1 目的

LP Builder Proのリサーチ・コピーライティング機能を、専門化された複数のAIエージェントで構成するマルチエージェントシステムに拡張する。これにより：

- **品質向上**: 各エージェントが専門分野に特化
- **並列処理**: 複数タスクの同時実行で高速化
- **検証強化**: クロスチェックによる信頼性向上
- **拡張性**: 新しいエージェントの追加が容易

### 1.2 現状との関係

現在の`orchestrator.ts`は単一プロセスで逐次実行。マルチエージェント化により：

```
現状: orchestrator.ts → 逐次実行 → 結果
将来: orchestrator.ts → エージェント群（並列） → 統合 → 検証 → 結果
```

---

## 2. アーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Agent Orchestrator                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Conductor Agent                        │  │
│  │              （指揮・タスク分配・進捗管理）                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         ▼                    ▼                    ▼            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │  Research    │   │   Analysis   │   │    Trend     │       │
│  │   Agents     │   │    Agents    │   │   Agents     │       │
│  │              │   │              │   │              │       │
│  │ • Market     │   │ • Pain       │   │ • SNS        │       │
│  │ • Competitor │   │ • Copy       │   │ • YouTube    │       │
│  │ • Deep       │   │ • Design     │   │ • Ads        │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
│         │                    │                    │            │
│         └────────────────────┼────────────────────┘            │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   Synthesizer Agent                       │  │
│  │              （結果統合・レポート生成）                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Validator Agent                        │  │
│  │              （品質検証・整合性チェック）                    │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 エージェント一覧

| エージェントID | 名前 | ロール | 担当タスク |
|----------------|------|--------|------------|
| `conductor` | コンダクター | orchestrator | タスク分配、進捗管理、エラー処理 |
| `market_researcher` | マーケットリサーチャー | researcher | 競合LP、infotop、海外市場 |
| `deep_researcher` | ディープリサーチャー | researcher | Google Deep Research API活用 |
| `pain_analyzer` | ペイン分析 | analyzer | 知恵袋、Amazon、悩み抽出 |
| `copy_analyzer` | コピー分析 | analyzer | ヘッドライン、CTA、心理トリガー |
| `design_analyzer` | デザイン分析 | analyzer | カラー、レイアウト、UI要素 |
| `sns_trend_watcher` | SNSトレンドウォッチャー | trend | X、Instagram、TikTok |
| `video_trend_watcher` | 動画トレンドウォッチャー | trend | YouTube分析 |
| `ad_analyzer` | 広告分析 | trend | Meta広告、Google広告 |
| `synthesizer` | 統合エージェント | synthesizer | 全結果の統合、インサイト生成 |
| `validator` | 検証エージェント | validator | 品質チェック、整合性確認 |

---

## 3. エージェント詳細設計

### 3.1 基本インターフェース

```typescript
// src/lib/agents/types.ts

export type AgentRole =
  | "orchestrator"
  | "researcher"
  | "analyzer"
  | "trend"
  | "synthesizer"
  | "validator";

export type AgentStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "waiting";

export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  dependencies?: string[];  // 実行前に完了が必要なエージェント
  timeout?: number;         // タイムアウト（ms）
  retryCount?: number;      // リトライ回数
}

export interface AgentInput {
  context: ResearchContext;
  previousResults?: Record<string, AgentOutput>;
  parameters?: Record<string, unknown>;
}

export interface AgentOutput {
  agentId: string;
  status: "success" | "partial" | "failed";
  data: unknown;
  metadata: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    tokensUsed?: number;
    error?: string;
  };
}

export interface Agent {
  config: AgentConfig;
  execute: (input: AgentInput) => Promise<AgentOutput>;
  abort?: () => void;
}
```

### 3.2 Conductor Agent（指揮エージェント）

```typescript
// src/lib/agents/conductor-agent.ts

export class ConductorAgent implements Agent {
  config: AgentConfig = {
    id: "conductor",
    name: "コンダクター",
    role: "orchestrator",
    description: "タスク分配と進捗管理を行う指揮エージェント",
  };

  private agents: Map<string, Agent> = new Map();
  private status: Map<string, AgentStatus> = new Map();
  private results: Map<string, AgentOutput> = new Map();

  /**
   * エージェントを登録
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.config.id, agent);
    this.status.set(agent.config.id, "idle");
  }

  /**
   * マルチエージェントリサーチを実行
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startedAt = new Date().toISOString();

    // Phase 1: リサーチャーを並列実行
    const researcherResults = await this.executePhase(
      ["market_researcher", "deep_researcher"],
      input
    );

    // Phase 2: 分析エージェントを並列実行（Phase 1の結果を使用）
    const analyzerResults = await this.executePhase(
      ["pain_analyzer", "copy_analyzer", "design_analyzer"],
      { ...input, previousResults: researcherResults }
    );

    // Phase 3: トレンドエージェントを並列実行
    const trendResults = await this.executePhase(
      ["sns_trend_watcher", "video_trend_watcher", "ad_analyzer"],
      input
    );

    // Phase 4: 統合エージェントで結果を統合
    const allResults = { ...researcherResults, ...analyzerResults, ...trendResults };
    const synthesisResult = await this.executeSingle(
      "synthesizer",
      { ...input, previousResults: allResults }
    );

    // Phase 5: 検証エージェントで品質チェック
    const validationResult = await this.executeSingle(
      "validator",
      { ...input, previousResults: { synthesizer: synthesisResult } }
    );

    return {
      agentId: this.config.id,
      status: validationResult.status === "success" ? "success" : "partial",
      data: {
        research: researcherResults,
        analysis: analyzerResults,
        trends: trendResults,
        synthesis: synthesisResult.data,
        validation: validationResult.data,
      },
      metadata: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
      },
    };
  }

  /**
   * 複数エージェントを並列実行
   */
  private async executePhase(
    agentIds: string[],
    input: AgentInput
  ): Promise<Record<string, AgentOutput>> {
    const promises = agentIds.map(async (id) => {
      const agent = this.agents.get(id);
      if (!agent) return { id, result: null };

      this.status.set(id, "running");
      try {
        const result = await agent.execute(input);
        this.status.set(id, "completed");
        this.results.set(id, result);
        return { id, result };
      } catch (error) {
        this.status.set(id, "failed");
        return { id, result: null, error };
      }
    });

    const results = await Promise.all(promises);
    return Object.fromEntries(
      results.filter((r) => r.result).map((r) => [r.id, r.result!])
    );
  }

  /**
   * 単一エージェントを実行
   */
  private async executeSingle(
    agentId: string,
    input: AgentInput
  ): Promise<AgentOutput> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    this.status.set(agentId, "running");
    const result = await agent.execute(input);
    this.status.set(agentId, "completed");
    this.results.set(agentId, result);

    return result;
  }
}
```

### 3.3 Research Agents（リサーチエージェント群）

```typescript
// src/lib/agents/research/market-researcher.ts

export class MarketResearcherAgent implements Agent {
  config: AgentConfig = {
    id: "market_researcher",
    name: "マーケットリサーチャー",
    role: "researcher",
    description: "競合LP、infotop、海外市場を調査",
    timeout: 60000,
  };

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startedAt = new Date().toISOString();
    const { context } = input;

    // 競合LP調査
    const competitorResults = await executeCompetitorResearch(context.keywords);

    // infotop調査
    const infotopResults = await executeInfotopResearch(context.genre);

    // 海外市場調査（オプション）
    const overseasResults = context.options?.includeOverseas
      ? await executeOverseasResearch(context.keywords)
      : null;

    return {
      agentId: this.config.id,
      status: "success",
      data: {
        competitors: competitorResults,
        infotop: infotopResults,
        overseas: overseasResults,
      },
      metadata: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
      },
    };
  }
}
```

### 3.4 Synthesizer Agent（統合エージェント）

```typescript
// src/lib/agents/synthesizer-agent.ts

export class SynthesizerAgent implements Agent {
  config: AgentConfig = {
    id: "synthesizer",
    name: "統合エージェント",
    role: "synthesizer",
    description: "全エージェントの結果を統合してインサイトを生成",
    dependencies: [
      "market_researcher",
      "pain_analyzer",
      "copy_analyzer",
      "sns_trend_watcher",
    ],
  };

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startedAt = new Date().toISOString();
    const { previousResults } = input;

    // hybridGenerateを使用して統合
    const response = await hybridGenerate({
      prompt: this.buildSynthesisPrompt(previousResults),
      useCache: true,
      dynamicSources: ["research_result"],
    });

    const synthesis = this.parseSynthesis(response.text);

    return {
      agentId: this.config.id,
      status: "success",
      data: synthesis,
      metadata: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        tokensUsed: response.totalTokens,
      },
    };
  }

  private buildSynthesisPrompt(
    results: Record<string, AgentOutput> | undefined
  ): string {
    return `以下のリサーチ結果を統合して、LP制作のためのインサイトを生成してください。

## 競合分析結果
${JSON.stringify(results?.market_researcher?.data || {}, null, 2)}

## ペイン分析結果
${JSON.stringify(results?.pain_analyzer?.data || {}, null, 2)}

## コピー分析結果
${JSON.stringify(results?.copy_analyzer?.data || {}, null, 2)}

## SNSトレンド
${JSON.stringify(results?.sns_trend_watcher?.data || {}, null, 2)}

## 出力形式
{
  "keyInsights": ["インサイト1", "インサイト2", ...],
  "topPatterns": [{"name": "パターン名", "usageRate": 0.7}],
  "topHeadlines": ["ヘッドライン案1", ...],
  "topCTAs": ["CTA案1", ...],
  "differentiationPoints": ["差別化ポイント1", ...],
  "recommendedStructure": ["ファーストビュー", "問題提起", ...]
}`;
  }

  private parseSynthesis(text: string): object {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}
```

### 3.5 Validator Agent（検証エージェント）

```typescript
// src/lib/agents/validator-agent.ts

export class ValidatorAgent implements Agent {
  config: AgentConfig = {
    id: "validator",
    name: "検証エージェント",
    role: "validator",
    description: "統合結果の品質検証と整合性チェック",
    dependencies: ["synthesizer"],
  };

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startedAt = new Date().toISOString();
    const synthesisData = input.previousResults?.synthesizer?.data;

    const validationResults = {
      completeness: this.checkCompleteness(synthesisData),
      consistency: this.checkConsistency(synthesisData),
      quality: await this.checkQuality(synthesisData),
      recommendations: this.generateRecommendations(synthesisData),
    };

    return {
      agentId: this.config.id,
      status: this.calculateOverallStatus(validationResults),
      data: validationResults,
      metadata: {
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
      },
    };
  }

  private checkCompleteness(data: unknown): ValidationResult {
    const required = [
      "keyInsights",
      "topPatterns",
      "topHeadlines",
      "topCTAs",
    ];
    const missing = required.filter(
      (key) => !data || !(data as Record<string, unknown>)[key]
    );

    return {
      passed: missing.length === 0,
      score: ((required.length - missing.length) / required.length) * 100,
      issues: missing.map((key) => `Missing: ${key}`),
    };
  }

  private checkConsistency(data: unknown): ValidationResult {
    // データの整合性チェック
    const issues: string[] = [];

    // ヘッドラインがベネフィットを含んでいるか
    // CTAが行動を促しているか
    // etc.

    return {
      passed: issues.length === 0,
      score: issues.length === 0 ? 100 : 70,
      issues,
    };
  }

  private async checkQuality(data: unknown): Promise<ValidationResult> {
    // AIを使用した品質チェック
    const response = await hybridGenerate({
      prompt: `以下の統合結果の品質を評価してください。
${JSON.stringify(data, null, 2)}

評価項目:
1. ヘッドラインの訴求力
2. CTAの説得力
3. インサイトの深さ
4. 差別化ポイントの明確さ

出力: {"score": 0-100, "feedback": "フィードバック"}`,
      useCache: true,
    });

    const result = JSON.parse(response.text.match(/\{.*\}/s)?.[0] || "{}");
    return {
      passed: result.score >= 70,
      score: result.score || 50,
      issues: result.score < 70 ? [result.feedback] : [],
    };
  }

  private generateRecommendations(data: unknown): string[] {
    const recommendations: string[] = [];

    // データに基づいて改善提案を生成
    // 例: ヘッドラインが少なければ追加を推奨

    return recommendations;
  }

  private calculateOverallStatus(
    results: Record<string, ValidationResult>
  ): "success" | "partial" | "failed" {
    const scores = Object.values(results)
      .filter((r): r is ValidationResult => "score" in r)
      .map((r) => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgScore >= 80) return "success";
    if (avgScore >= 50) return "partial";
    return "failed";
  }
}

interface ValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
}
```

---

## 4. 実行フロー

### 4.1 シーケンス図

```
User                Conductor         Researchers       Analyzers        Synthesizer     Validator
 │                      │                 │                │                 │              │
 │  リサーチ開始        │                 │                │                 │              │
 │─────────────────────>│                 │                │                 │              │
 │                      │                 │                │                 │              │
 │                      │ Phase 1: 並列   │                │                 │              │
 │                      │────────────────>│                │                 │              │
 │                      │<────────────────│                │                 │              │
 │                      │                 │                │                 │              │
 │                      │ Phase 2: 並列   │                │                 │              │
 │                      │──────────────────────────────────>│                 │              │
 │                      │<──────────────────────────────────│                 │              │
 │                      │                 │                │                 │              │
 │                      │ Phase 3: 統合   │                │                 │              │
 │                      │────────────────────────────────────────────────────>│              │
 │                      │<────────────────────────────────────────────────────│              │
 │                      │                 │                │                 │              │
 │                      │ Phase 4: 検証   │                │                 │              │
 │                      │──────────────────────────────────────────────────────────────────>│
 │                      │<──────────────────────────────────────────────────────────────────│
 │                      │                 │                │                 │              │
 │  結果返却            │                 │                │                 │              │
 │<─────────────────────│                 │                │                 │              │
 │                      │                 │                │                 │              │
```

### 4.2 フェーズ説明

| フェーズ | 実行エージェント | 依存関係 | 所要時間目安 |
|---------|-----------------|---------|------------|
| 1. Research | market_researcher, deep_researcher | なし | 30-60秒 |
| 2. Analysis | pain_analyzer, copy_analyzer, design_analyzer | Phase 1完了 | 20-30秒 |
| 3. Trend | sns_trend_watcher, video_trend_watcher, ad_analyzer | なし（並列可） | 20-30秒 |
| 4. Synthesis | synthesizer | Phase 1-3完了 | 10-20秒 |
| 5. Validation | validator | Phase 4完了 | 5-10秒 |

**合計所要時間**: 約90-150秒（並列化により短縮）

---

## 5. エラーハンドリング

### 5.1 リトライ戦略

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

async function executeWithRetry(
  agent: Agent,
  input: AgentInput,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<AgentOutput> {
  let lastError: Error | null = null;
  let delay = config.baseDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await agent.execute(input);
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `[${agent.config.id}] Attempt ${attempt + 1} failed:`,
        error
      );

      if (attempt < config.maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }

  throw lastError;
}
```

### 5.2 フォールバック

```typescript
// エージェント失敗時のフォールバック処理
const FALLBACK_HANDLERS: Record<string, () => Promise<AgentOutput>> = {
  market_researcher: async () => ({
    agentId: "market_researcher",
    status: "partial",
    data: { competitors: [], note: "Fallback: manual research required" },
    metadata: { /* ... */ },
  }),
  sns_trend_watcher: async () => ({
    agentId: "sns_trend_watcher",
    status: "partial",
    data: { hashtags: [], trends: [], note: "SNS API unavailable" },
    metadata: { /* ... */ },
  }),
};
```

---

## 6. 監視・ロギング

### 6.1 メトリクス収集

```typescript
interface AgentMetrics {
  agentId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  avgTokensUsed: number;
  lastExecutedAt: string;
}

class AgentMetricsCollector {
  private metrics: Map<string, AgentMetrics> = new Map();

  recordExecution(output: AgentOutput): void {
    const existing = this.metrics.get(output.agentId) || {
      agentId: output.agentId,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: 0,
      avgTokensUsed: 0,
      lastExecutedAt: "",
    };

    existing.executionCount++;
    if (output.status === "success") existing.successCount++;
    if (output.status === "failed") existing.failureCount++;
    existing.avgDurationMs =
      (existing.avgDurationMs * (existing.executionCount - 1) +
        output.metadata.durationMs) /
      existing.executionCount;
    existing.lastExecutedAt = output.metadata.completedAt;

    this.metrics.set(output.agentId, existing);
  }

  getReport(): AgentMetrics[] {
    return Array.from(this.metrics.values());
  }
}
```

---

## 7. 拡張計画

### 7.1 将来のエージェント追加案

| 優先度 | エージェント名 | 役割 | 説明 |
|--------|---------------|------|------|
| 高 | `a_b_tester` | optimizer | A/Bテストパターン提案 |
| 高 | `persona_generator` | analyzer | N1ペルソナ自動生成 |
| 中 | `landing_page_generator` | creator | LP HTML自動生成 |
| 中 | `price_optimizer` | analyzer | 価格設定最適化 |
| 低 | `localization_agent` | translator | 多言語対応 |

### 7.2 Agent-to-Agent (A2A) 通信

将来的には、エージェント間で直接メッセージをやり取りするA2A通信を導入：

```typescript
interface A2AMessage {
  from: string;
  to: string;
  type: "request" | "response" | "notification";
  payload: unknown;
  timestamp: string;
}

// エージェント間通信の例
// pain_analyzer → copy_analyzer: "これらの悩みに対応するコピーを生成して"
```

---

## 8. 実装ロードマップ

### Phase 1: 基盤整備（優先度: 高）

1. `src/lib/agents/types.ts` - 型定義
2. `src/lib/agents/conductor-agent.ts` - 指揮エージェント
3. `src/lib/agents/base-agent.ts` - 基底クラス
4. 既存orchestrator.tsとの統合インターフェース

### Phase 2: リサーチエージェント群

1. `market-researcher.ts` - 競合調査
2. `deep-researcher.ts` - Deep Research統合
3. `pain-analyzer.ts` - 悩み分析

### Phase 3: 統合・検証

1. `synthesizer-agent.ts` - 統合エージェント
2. `validator-agent.ts` - 検証エージェント
3. メトリクス収集

### Phase 4: UI統合

1. マルチエージェント進捗表示
2. エージェント別結果表示
3. 検証結果フィードバック

---

## 9. ファイル構成

```
src/lib/agents/
├── types.ts                    # 型定義
├── conductor-agent.ts          # 指揮エージェント
├── base-agent.ts               # 基底クラス
├── metrics-collector.ts        # メトリクス収集
├── research/
│   ├── market-researcher.ts    # マーケットリサーチ
│   ├── deep-researcher.ts      # Deep Research
│   └── index.ts
├── analysis/
│   ├── pain-analyzer.ts        # ペイン分析
│   ├── copy-analyzer.ts        # コピー分析
│   ├── design-analyzer.ts      # デザイン分析
│   └── index.ts
├── trend/
│   ├── sns-trend-watcher.ts    # SNSトレンド
│   ├── video-trend-watcher.ts  # 動画トレンド
│   ├── ad-analyzer.ts          # 広告分析
│   └── index.ts
├── synthesizer-agent.ts        # 統合エージェント
├── validator-agent.ts          # 検証エージェント
└── index.ts                    # エクスポート
```

---

## 10. 参考資料

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Multi-Agent Systems Design Patterns](https://www.microsoft.com/en-us/research/publication/multi-agent-systems/)
- [A2A (Agent-to-Agent) Protocol](https://www.anthropic.com/research)

---

**次のステップ**: Phase 1の基盤整備から開始。`types.ts`と`conductor-agent.ts`を先行実装。
