# Claude Code タスク: リサーチワークフロー実装

## 概要

リサーチワークフローの再設計に基づき、実装を行う。Codex が設計した `CODEX_WORKFLOW_REDESIGN.md` の内容に従って実装すること。

## 前提条件

- Codex の設計書 `docs/CODEX_WORKFLOW_REDESIGN.md` を参照
- 設計が完了次第、以下のタスクを順次実装

---

## Phase 1: 即時修正（設計待ちなし）

### P1-1: Infotopスクレイピングのデバッグ

**問題**: 「パース失敗: ランキングデータを抽出できませんでした」エラーが頻発

**対応**:
1. `src/lib/research/scrapers/infotop.ts` のパース処理をデバッグ
2. Firecrawl から返されるマークダウンの構造を確認
3. パーサーを修正してデータ抽出を安定化

**ファイル**:
- `src/lib/research/scrapers/infotop.ts`
- `src/lib/research/scraping/provider-chain.ts`

### P1-2: UI/UX 必須修正

**問題**: リサーチ結果がログにしか表示されない

**対応**:
既存ドキュメント `docs/CLAUDE_CODE_RESEARCH_UI_UX.md` の P0 タスクを実装:

1. `renderPainCollectionStep` 関数の追加
2. `ResearchData` インターフェースに `chiebukuroResults`, `amazonBooksResults` を追加
3. `runPainCollectionStep` で結果を `data` に保存

### P1-3: プログレス表示改善

**対応**:
`docs/CLAUDE_CODE_RESEARCH_UI_UX.md` の P1 タスクを実装:

1. `src/components/research/ResearchStepper.tsx` を作成
2. 全体進捗%表示
3. 各ステップのステータス表示（pending/running/completed/error/skipped）

---

## Phase 2: ワークフロー再設計実装（Codex設計後）

### P2-1: Deep Research ファースト化

**前提**: Codex が案を選定後に実装

**対応**:
1. ワークフローの実行順序を変更
2. オーケストレーターの修正

**ファイル**:
- `src/lib/research/orchestrator.ts`
- `src/app/api/research/route.ts`

### P2-2: キーワード大量収集機能

**対応**:
1. ラッコキーワード API 統合（または代替）
2. 大量キーワード収集ロジック
3. キーワード表示 UI

**新規ファイル**:
- `src/lib/research/scrapers/keyword-collector.ts`
- `src/app/api/research/keywords/route.ts`

### P2-3: Infotop分析のリフォーカス

**対応**:
悩み収集 → コピー分析 に変更:

```typescript
interface CopyAnalysisResult {
  powerWords: string[];        // 売れる単語
  headlines: string[];         // 効果的なヘッドライン  
  ctaPhrases: string[];        // CTA表現
  lpPatterns: LPPattern[];     // LP構成パターン
}
```

**ファイル**:
- `src/lib/research/analyzers/copy-analyzer.ts`（新規）
- `src/lib/research/scrapers/infotop.ts`（修正）

### P2-4: 悩み収集の統合または削除

**対応**:
Codex の設計に従い:
- 選択肢A: Deep Research に統合
- 選択肢B: オプション化（詳細モードのみ）
- 選択肢C: 削除

**影響ファイル**:
- `src/lib/research/scrapers/yahoo-chiebukuro.ts`
- `src/lib/research/scrapers/amazon-books.ts`
- `src/lib/research/orchestrator.ts`

### P2-5: モード選択 UI

**対応**:
```
簡易モード: Deep Research → コンセプト生成（5分）
標準モード: Deep Research → キーワード → Infotop → コンセプト（15分）
詳細モード: 全ステップ並列 → 統合分析 → コンセプト（30分）
```

**ファイル**:
- `src/app/dev/research/page.tsx`
- `src/components/research/ModeSelector.tsx`（新規）

---

## Phase 3: 統合と最適化

### P3-1: 並列処理の実装

**対応**:
独立したステップを `Promise.all` で並列実行

```typescript
const [deepResearch, keywords, infotop] = await Promise.all([
  runDeepResearch(context),
  collectKeywords(context),
  scrapeInfotop(context),
]);
```

### P3-2: 結果統合ロジック

**対応**:
複数ソースからの結果を統合してコンセプト生成

```typescript
interface UnifiedResearchResult {
  marketOverview: MarketOverview;
  keywords: KeywordResult;
  copyAnalysis: CopyAnalysisResult;
}
```

### P3-3: タブ表示の実装

**対応**:
`docs/CLAUDE_CODE_RESEARCH_UI_UX.md` の P2 タスク:

```tsx
<Tabs>
  <TabsTrigger value="market">市場概要</TabsTrigger>
  <TabsTrigger value="keywords">キーワード</TabsTrigger>
  <TabsTrigger value="copy">コピー分析</TabsTrigger>
  <TabsTrigger value="concepts">コンセプト</TabsTrigger>
</Tabs>
```

---

## 技術要件

### API設計

```typescript
// POST /api/research
interface ResearchRequest {
  context: ResearchContext;
  mode: "simple" | "standard" | "detailed";
  steps?: string[];  // 特定ステップのみ実行する場合
}

interface ResearchResponse {
  ok: boolean;
  result: {
    marketOverview?: MarketOverview;
    keywords?: KeywordResult;
    copyAnalysis?: CopyAnalysisResult;
    concepts?: ConceptCandidate[];
  };
  logs: LogEntry[];
  elapsedMs: number;
}
```

### 型定義

```typescript
// src/lib/research/types.ts に追加
export interface CopyAnalysisResult {
  powerWords: Array<{
    word: string;
    frequency: number;
    context: string;
  }>;
  headlines: Array<{
    text: string;
    pattern: string;  // e.g., "数字型", "疑問型"
    source: string;
  }>;
  ctaPhrases: string[];
  lpPatterns: Array<{
    name: string;
    sections: string[];
    frequency: number;
  }>;
}

export interface KeywordResult {
  total: number;
  keywords: Array<{
    word: string;
    volume?: number;
    difficulty?: number;
    trend?: "up" | "down" | "stable";
  }>;
  categories: Record<string, string[]>;
}
```

---

## 実装順序

1. **Phase 1-1**: Infotopデバッグ（即時）
2. **Phase 1-2**: UI/UX必須修正（即時）
3. **Phase 1-3**: プログレス表示（即時）
4. **Codex設計待ち**
5. **Phase 2**: ワークフロー再設計実装
6. **Phase 3**: 統合と最適化

---

## 完了条件

- [ ] Infotopスクレイピングが安定動作する
- [ ] リサーチ結果がUIに表示される
- [ ] プログレスバーで進捗が見える
- [ ] モード選択ができる（簡易/標準/詳細）
- [ ] キーワード大量収集が動作する
- [ ] コピー分析（パワーワード抽出）が動作する
- [ ] タブで結果を切り替えられる
- [ ] エラー時に適切なフィードバックがある

---

## 参考ドキュメント

- `docs/CODEX_WORKFLOW_REDESIGN.md` - Codex ワークフロー設計
- `docs/CLAUDE_CODE_RESEARCH_UI_UX.md` - UI/UX改善詳細
- `docs/RESEARCH_REFOCUS_ARCHITECTURE.md` - 既存設計
- `src/lib/research/orchestrator.ts` - 現在のオーケストレーター
