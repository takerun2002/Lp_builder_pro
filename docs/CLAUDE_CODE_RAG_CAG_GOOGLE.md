# Claude Code 緊急指示書: RAG+CAG & Google Workspace統合

## 🚨 現状の問題

**実装は存在するが、どこにも統合されていない！**

### 確認済みファイル（実装済み・未統合）

```
✅ 存在するが未使用:
├── src/lib/ai/context-cache.ts        # CAG（静的キャッシュ）
├── src/lib/ai/rag-retriever.ts        # RAG（動的検索）
├── src/lib/ai/hybrid-knowledge.ts     # CAG+RAG統合レイヤー
├── src/lib/ai/knowledge-rag.ts        # ナレッジRAG
├── src/lib/ai/file-search.ts          # ベクトル検索
├── src/lib/google/sheets-manager.ts   # Google Sheets
├── src/lib/google/docs-exporter.ts    # Google Docs
├── src/lib/storage/hybrid-storage.ts  # ハイブリッドストレージ
└── src/app/api/dev/rag/route.ts       # RAG API（未テスト）
```

**呼び出し元を検索した結果**: `hybridGenerate()` 関数は**0箇所**でしか呼ばれていない

---

## 📋 タスク一覧

### Phase 1: RAG+CAG ハイブリッドシステムの統合（最優先）

#### タスク1.1: リサーチエージェントへのRAG+CAG統合

**ファイル**: `src/lib/research/orchestrator.ts`

```typescript
// 現状: AIモデルを直接呼び出し
// 改善: hybridGenerate()経由でCAG+RAGを活用

import { hybridGenerate } from "@/lib/ai/hybrid-knowledge";

// 悩み分析の例
async function analyzePainPoints(painTexts: string[], context: ResearchContext) {
  const result = await hybridGenerate({
    prompt: `以下の悩みテキストを分析してください:\n${painTexts.join("\n")}`,
    projectId: context.projectId,
    useCache: true,           // CAGキャッシュを使用（静的ナレッジ）
    dynamicSources: ["research_result", "competitor_analysis"], // RAGで動的データも参照
    includeN1: true,          // N1データも含める
  });
  
  return result;
}
```

**統合箇所**:
- [ ] `runPainClassification()` - 悩み分類
- [ ] `runKeywordRanking()` - キーワードランキング
- [ ] `runConceptGeneration()` - コンセプト生成
- [ ] `analyzeCompetitors()` - 競合分析

#### タスク1.2: コピーライティングへのRAG+CAG統合

**ファイル**: `src/lib/copywriting/headline-generator.ts`

```typescript
import { hybridGenerate } from "@/lib/ai/hybrid-knowledge";

async function generateHeadlines(context: HeadlineContext) {
  const result = await hybridGenerate({
    prompt: `以下の条件でヘッドライン案を5つ生成:
    ジャンル: ${context.genre}
    ターゲット: ${context.target}
    訴求ポイント: ${context.appeal}`,
    useCache: true,           // killer_words.yaml, writing_techniques.yaml を活用
    dynamicSources: ["concept_draft", "competitor_analysis"],
    maxDynamicTokens: 2000,
  });
  
  return parseHeadlines(result.text);
}
```

**統合箇所**:
- [ ] `generateHeadlines()` - ヘッドライン生成
- [ ] `generateBodyCopy()` - ボディコピー生成
- [ ] `generateCTAs()` - CTA生成

#### タスク1.3: デザインプロンプトジェネレーターへの統合

**ファイル**: `src/lib/ai/design-prompt-generator.ts`

```typescript
import { hybridGenerate } from "@/lib/ai/hybrid-knowledge";

async function generateDesignPrompt(options: DesignPromptOptions) {
  const result = await hybridGenerate({
    prompt: `画像生成プロンプトを作成:
    タイプ: ${options.imageType}
    テーマ: ${options.theme}
    スタイル: ${options.style}`,
    useCache: true,           // design_prompts.yaml を活用
    dynamicSources: [],       // デザインは静的ナレッジのみでOK
  });
  
  return result.text;
}
```

### Phase 2: Google Workspace連携強化

#### タスク2.1: リサーチ結果のGoogle Sheets自動保存

**ファイル**: `src/lib/research/orchestrator.ts`

```typescript
import { getStorage } from "@/lib/storage/hybrid-storage";

async function saveResearchResults(projectId: string, results: ResearchResult) {
  const storage = getStorage();
  
  // ハイブリッドストレージで自動的にGoogle Sheetsにも保存
  await storage.save({
    key: `research_${projectId}`,
    data: results,
    dataType: "research_result",
  });
}
```

#### タスク2.2: Google Docsレポート自動生成

**ファイル**: `src/lib/google/docs-exporter.ts`（既存）

```typescript
// リサーチ完了時に自動でGoogle Docsにエクスポート
import { exportToGoogleDocs } from "@/lib/google/docs-exporter";

async function onResearchComplete(results: ResearchResult) {
  // Markdown形式のレポートを生成
  const markdown = generateResearchReport(results);
  
  // Google Docsにエクスポート
  const docUrl = await exportToGoogleDocs({
    content: markdown,
    title: `リサーチレポート_${results.projectName}`,
    folderId: results.context?.googleDriveFolderId,
  });
  
  return docUrl;
}
```

#### タスク2.3: Google Sheets as Database の活用

**ファイル**: `src/lib/storage/hybrid-storage.ts`（既存）

**確認・修正箇所**:
- [ ] `save()` がGoogle Sheetsに正しく保存されるか確認
- [ ] `load()` がGoogle Sheetsから正しく読み込めるか確認
- [ ] 同期状態の管理（ローカル↔クラウド）

---

## 🔧 具体的な実装手順

### Step 1: CAGキャッシュの初期化を追加

**ファイル**: `src/app/layout.tsx` または適切な初期化ポイント

```typescript
// アプリ起動時にCAGキャッシュを作成
import { ensureCacheExists } from "@/lib/ai/context-cache";

// サーバーサイドで初期化
if (typeof window === "undefined") {
  ensureCacheExists().catch(console.error);
}
```

### Step 2: hybridGenerate()の呼び出しを追加

**最優先で統合する関数**:

1. **`src/lib/research/orchestrator.ts`**
   - `runResearch()` 内の各ステップで `hybridGenerate()` を使用

2. **`src/lib/copywriting/headline-generator.ts`**
   - `generateHeadlines()` で `hybridGenerate()` を使用

3. **`src/lib/ai/design-prompt-generator.ts`**
   - `generateDesignPrompt()` で `hybridGenerate()` を使用

### Step 3: コスト削減効果の可視化

**ファイル**: `src/app/dev/research/page.tsx`

```typescript
// リサーチ完了時にコスト削減効果を表示
const [costStats, setCostStats] = useState<HybridStats | null>(null);

useEffect(() => {
  getHybridStats().then(setCostStats);
}, []);

// UI表示
{costStats && (
  <Card>
    <CardContent>
      <div className="text-2xl font-bold text-green-500">
        💰 {costStats.estimatedCostSaved.toFixed(2)} USD 削減
      </div>
      <div className="text-sm text-muted-foreground">
        キャッシュヒット率: {(costStats.cacheHitRate * 100).toFixed(1)}%
      </div>
    </CardContent>
  </Card>
)}
```

---

## 📊 期待効果

### RAG+CAG ハイブリッド効果

| 指標 | Before | After |
|------|--------|-------|
| APIコスト | 100% | **50-70%** |
| レスポンス速度 | 1x | **2-3x** |
| キャッシュヒット率 | 0% | **60-80%** |

### 静的ナレッジ（CAGでキャッシュ）

```yaml
# 以下のファイルがCAGでキャッシュされる
STATIC_KNOWLEDGE_FILES:
  - killer_words.yaml        # 刺さるワード集
  - writing_techniques.yaml  # ライティング技術
  - marketing_strategy.yaml  # マーケティング戦略
  - consumer_behavior.yaml   # 消費者行動
  - design_prompts.yaml      # デザインプロンプト
```

### 動的データ（RAGで検索）

```yaml
# 以下のデータはRAGで必要時に検索
DYNAMIC_DATA:
  - research_result         # リサーチ結果（プロジェクト別）
  - competitor_analysis     # 競合分析データ
  - concept_draft          # コンセプト案
  - n1_profile             # N1情報
  - market_trend           # 市場トレンド（最新）
```

---

## ✅ チェックリスト

### Phase 1: RAG+CAG統合
- [ ] `hybridGenerate()` をリサーチオーケストレーターに統合
- [ ] `hybridGenerate()` をコピーライティングに統合
- [ ] `hybridGenerate()` をデザインプロンプトに統合
- [ ] CAGキャッシュの自動作成を実装
- [ ] コスト削減効果の表示UI追加

### Phase 2: Google Workspace連携
- [ ] リサーチ結果のGoogle Sheets自動保存を確認
- [ ] Google Docsレポート自動生成を統合
- [ ] ストレージ設定UIの動作確認
- [ ] 同期状態の可視化

### Phase 3: 動作確認
- [ ] リサーチ実行時にCAGキャッシュが使われることを確認
- [ ] RAGで動的データが取得されることを確認
- [ ] Google Sheetsにデータが保存されることを確認
- [ ] コスト削減効果が正しく計算されることを確認

---

## 🔴 優先度

```
1. [最優先] hybridGenerate()をresearch/orchestrator.tsに統合
   → リサーチ機能でCAG+RAGが使われるようにする
   
2. [高] Google Sheetsへの自動保存を動作確認
   → リサーチ結果が自動でスプシに蓄積される
   
3. [中] コピーライティングへのCAG+RAG統合
   → killer_words.yamlなどを活用
   
4. [中] コスト削減効果の可視化UI
   → ユーザーに効果を見せる
```

---

## 📝 参考リンク

- Gemini Context Caching: https://ai.google.dev/gemini-api/docs/caching
- OpenAI Prompt Caching: https://platform.openai.com/docs/guides/prompt-caching
- 実装済みファイル:
  - `src/lib/ai/hybrid-knowledge.ts`
  - `src/lib/ai/context-cache.ts`
  - `src/lib/ai/rag-retriever.ts`
  - `src/lib/storage/hybrid-storage.ts`

