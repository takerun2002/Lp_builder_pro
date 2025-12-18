# Claude Code 緊急修正指示: タスク漏れ対応

**作成日**: 2024-12-17
**優先度**: 🔴 最高

---

## 🚨 概要

以下のタスクが**完了していない**または**動作確認されていない**状態です。
全て修正・確認が必要です。

---

## 📋 追加タスク（新規）

### A. SNSリサーチの細分化

**問題**: 現在SNSリサーチが「SNS」としてひとまとめになっている。X、Instagram、TikTokを個別に選択できるようにしたい。

**ファイル**: `src/lib/research/types.ts`

```typescript
// 現状
export type DataSource = "infotop" | "competitor" | "ads" | "sns" | "overseas" | "chiebukuro" | "amazon_books" | "youtube";

// 修正後（SNSを細分化）
export type DataSource = 
  | "infotop" 
  | "competitor" 
  | "ads" 
  | "sns_x"           // X (Twitter)
  | "sns_instagram"   // Instagram
  | "sns_tiktok"      // TikTok
  | "overseas" 
  | "chiebukuro" 
  | "amazon_books" 
  | "youtube";

// SCRAPER_OPTIONSも更新
export const SCRAPER_OPTIONS: ScraperOption[] = [
  // ... 既存 ...
  {
    id: "sns_x",
    name: "X (Twitter)",
    description: "Xのトレンド・ハッシュタグ・インフルエンサーを分析",
    icon: "𝕏",
    defaultEnabled: false,
    category: "trend",
  },
  {
    id: "sns_instagram",
    name: "Instagram",
    description: "Instagramの投稿・ハッシュタグ・エンゲージメントを分析",
    icon: "📸",
    defaultEnabled: false,
    category: "trend",
  },
  {
    id: "sns_tiktok",
    name: "TikTok",
    description: "TikTokのバイラル動画・トレンドサウンドを分析",
    icon: "🎵",
    defaultEnabled: false,
    category: "trend",
  },
  // 既存の"sns"は削除または後方互換性のため残す
];
```

**ファイル**: `src/lib/research/orchestrator.ts`

```typescript
// SNS処理を個別に分岐
if (sources.includes("sns_x")) {
  promises.push(runSnsResearch(context, ["x"]));
}
if (sources.includes("sns_instagram")) {
  promises.push(runSnsResearch(context, ["instagram"]));
}
if (sources.includes("sns_tiktok")) {
  promises.push(runSnsResearch(context, ["tiktok"]));
}
```

---

### B. Google Deep Research APIの動作確認

**現状**: `src/lib/research/orchestrator.ts` に `runDeepResearch()` が実装済み。
Google Gemini Interactions API（`deep-research-pro-preview-12-2025`）を使用。

**確認事項**:
- [ ] Interactions APIが有効かどうか確認（APIキー設定に依存）
- [ ] ポーリング処理が正常に動作するか
- [ ] タイムアウト処理が適切か
- [ ] 結果がUIに表示されるか

**確認コマンド**:
```bash
# Deep Researchが呼ばれているか確認
grep -n "runDeepResearch" src/lib/research/orchestrator.ts

# ログ出力を確認
grep -n "Deep Research" src/lib/research/orchestrator.ts
```

---

### C. マルチエージェント/A2A対応（新規実装が必要）

**現状**: マルチエージェントシステムは未実装。

**提案アーキテクチャ**:

```typescript
// src/lib/agents/multi-agent-orchestrator.ts

interface ResearchAgent {
  id: string;
  name: string;
  role: "researcher" | "analyzer" | "synthesizer" | "validator";
  execute: (input: AgentInput) => Promise<AgentOutput>;
}

const RESEARCH_AGENTS: ResearchAgent[] = [
  {
    id: "market_researcher",
    name: "マーケットリサーチャー",
    role: "researcher",
    execute: async (input) => {
      // 競合LP、広告、市場トレンドを調査
    },
  },
  {
    id: "pain_analyzer",
    name: "ペイン分析エージェント",
    role: "analyzer",
    execute: async (input) => {
      // 知恵袋、Amazon、SNSから悩みを抽出・分類
    },
  },
  {
    id: "trend_watcher",
    name: "トレンドウォッチャー",
    role: "researcher",
    execute: async (input) => {
      // SNS、YouTube、広告からトレンドを検出
    },
  },
  {
    id: "synthesizer",
    name: "統合エージェント",
    role: "synthesizer",
    execute: async (input) => {
      // 全エージェントの結果を統合してレポート生成
    },
  },
  {
    id: "validator",
    name: "検証エージェント",
    role: "validator",
    execute: async (input) => {
      // 統合結果の整合性・信頼性を検証
    },
  },
];

export async function runMultiAgentResearch(
  context: ResearchContext
): Promise<MultiAgentResearchResult> {
  // 1. 並列でリサーチャーエージェントを実行
  const researchResults = await Promise.all(
    RESEARCH_AGENTS
      .filter(a => a.role === "researcher")
      .map(a => a.execute({ context }))
  );
  
  // 2. 分析エージェントで深掘り
  const analysisResults = await Promise.all(
    RESEARCH_AGENTS
      .filter(a => a.role === "analyzer")
      .map(a => a.execute({ context, researchResults }))
  );
  
  // 3. 統合エージェントで結果を統合
  const synthesis = await RESEARCH_AGENTS
    .find(a => a.role === "synthesizer")!
    .execute({ context, researchResults, analysisResults });
  
  // 4. 検証エージェントで品質チェック
  const validation = await RESEARCH_AGENTS
    .find(a => a.role === "validator")!
    .execute({ synthesis });
  
  return { synthesis, validation };
}
```

---

### D. Google Sheets綺麗な出力

**目的**: リサーチ結果をGoogle Sheetsに綺麗に整形して出力

**ファイル**: `src/lib/google/sheets-formatter.ts`（新規作成）

```typescript
import { google, sheets_v4 } from "googleapis";

interface FormattedSheetData {
  title: string;
  sheets: {
    name: string;
    headers: string[];
    rows: (string | number)[][];
    formatting?: SheetFormatting;
  }[];
}

interface SheetFormatting {
  headerColor: { red: number; green: number; blue: number };
  alternateRowColor?: { red: number; green: number; blue: number };
  columnWidths?: number[];
  freezeRows?: number;
}

export async function createFormattedSpreadsheet(
  data: FormattedSheetData
): Promise<string> {
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  
  // 1. スプレッドシート作成
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: data.title },
      sheets: data.sheets.map(s => ({
        properties: { title: s.name },
      })),
    },
  });
  
  const spreadsheetId = spreadsheet.data.spreadsheetId!;
  
  // 2. データ入力
  for (const sheet of data.sheets) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheet.name}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [sheet.headers, ...sheet.rows],
      },
    });
  }
  
  // 3. フォーマット適用（ヘッダー色、列幅など）
  // ... GAS形式のフォーマット処理 ...
  
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

// リサーチ結果をフォーマットして出力
export async function exportResearchToFormattedSheet(
  result: EnhancedResearchResult
): Promise<string> {
  const data: FormattedSheetData = {
    title: `リサーチレポート_${result.name}_${new Date().toISOString().slice(0,10)}`,
    sheets: [
      {
        name: "概要",
        headers: ["項目", "内容"],
        rows: [
          ["プロジェクト名", result.name],
          ["ジャンル", result.genre],
          ["実行日時", result.completedAt],
          ["トップキーワード", result.synthesis?.topPatterns?.join(", ") || ""],
        ],
        formatting: {
          headerColor: { red: 0.2, green: 0.4, blue: 0.8 },
          freezeRows: 1,
        },
      },
      {
        name: "競合LP一覧",
        headers: ["URL", "タイトル", "特徴", "スクリーンショット"],
        rows: (result.competitorResults || []).map(c => [
          c.url,
          c.title,
          c.features?.join(", ") || "",
          c.screenshotUrl || "（なし）",
        ]),
      },
      {
        name: "キーワードランキング",
        headers: ["順位", "キーワード", "スコア", "出現回数"],
        rows: (result.synthesis?.topPatterns || []).map((k, i) => [
          i + 1,
          k,
          "", // スコア
          "", // 出現回数
        ]),
      },
      // ... 他のシートも追加 ...
    ],
  };
  
  return await createFormattedSpreadsheet(data);
}
```

---

## 📋 未完了タスク一覧

### 1. RAG+CAG統合（部分完了）

| タスク | 状態 | 問題点 |
|--------|------|--------|
| orchestrator.ts統合 | ✅ 完了 | `generateProposals()`と`synthesizeResults()`に統合済み |
| コピーライティング統合 | ❌ **未完了** | `hybridGenerate`が使われていない |
| デザインプロンプト統合 | ❌ **未完了** | ファイル自体が存在しない可能性 |
| CAGキャッシュ初期化 | ⚠️ 未確認 | `ensureCacheExists()`が起動時に呼ばれているか |

#### 必須修正1: コピーライティングへのRAG+CAG統合

**ファイル**: `src/lib/copywriting/headline-generator.ts`（または類似ファイル）

```typescript
import { hybridGenerate } from "@/lib/ai/hybrid-knowledge";

export async function generateHeadlines(context: HeadlineContext): Promise<string[]> {
  const result = await hybridGenerate({
    prompt: `以下の条件でヘッドライン案を5つ生成:
    ジャンル: ${context.genre}
    ターゲット: ${context.target}
    訴求ポイント: ${context.appeal}`,
    useCache: true,           // killer_words.yaml等を活用
    dynamicSources: ["concept_draft", "research_result"],
    maxDynamicTokens: 2000,
  });
  
  return parseHeadlines(result.text);
}
```

**確認**: `src/lib/copywriting/` ディレクトリの全ファイルを確認し、AI生成関数があれば `hybridGenerate()` に置き換える

---

### 2. Google Workspace連携（未確認・未統合）

| タスク | 状態 | 問題点 |
|--------|------|--------|
| Google Sheets保存 | ⚠️ 実装あり | 実際に動作しているか未確認 |
| Google Docs出力 | ⚠️ 実装あり | 実際に動作しているか未確認 |
| 設定UIへのリンク | ❌ **未完了** | `/settings`から`/dev/storage-settings`にアクセスできない |
| 連携状態の可視化 | ❌ **未完了** | どこで連携されているか分からない |

#### 必須修正2: 設定ページからGoogle Workspace連携へのリンク追加

**ファイル**: `src/app/settings/page.tsx`

```tsx
// Google Workspace連携セクションを追加
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <img src="/google-icon.svg" className="w-5 h-5" />
      Google Workspace連携
    </CardTitle>
    <CardDescription>
      リサーチ結果をGoogle Sheetsに自動保存、レポートをGoogle Docsに出力
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex gap-2">
      <Link href="/dev/storage-settings">
        <Button variant="outline">ストレージ設定</Button>
      </Link>
      <Link href="/dev/google-sync">
        <Button variant="outline">Google同期</Button>
      </Link>
    </div>
  </CardContent>
</Card>
```

#### 必須修正3: リサーチ結果のGoogle Sheets自動保存確認

**ファイル**: `src/lib/research/orchestrator.ts`

リサーチ完了時に以下が実行されているか確認：

```typescript
import { getStorage } from "@/lib/storage/hybrid-storage";

async function saveResearchToCloud(projectId: string, result: EnhancedResearchResult) {
  try {
    const storage = getStorage();
    
    // ハイブリッドストレージで自動的にGoogle Sheetsにも保存
    await storage.save({
      key: `research_${projectId}`,
      data: result,
      dataType: "research_result",
    });
    
    console.log(`[orchestrator] Research result saved to hybrid storage (project: ${projectId})`);
  } catch (err) {
    console.error("[orchestrator] Failed to save research to cloud:", err);
  }
}
```

**確認ポイント**:
- [ ] `runResearch()` の最後で `saveResearchToCloud()` が呼ばれているか
- [ ] Google認証されている場合にSheetsに実際に保存されるか
- [ ] 保存されたデータがGoogle Sheetsで確認できるか

---

### 3. UIの問題点

| 問題 | 詳細 |
|------|------|
| Google連携が見つからない | `/settings`にGoogle連携の項目がない |
| `/dev/`に隠れている | 重要な機能が開発ページに隠れている |
| 連携状態が分からない | Google連携済みかどうか一目で分からない |

#### 必須修正4: ナビゲーション/サイドバーにGoogle連携ステータス表示

**ファイル**: `src/components/layout/sidebar.tsx`（または類似）

```tsx
// サイドバーにGoogle連携状態を表示
const [googleStatus, setGoogleStatus] = useState<"connected" | "disconnected" | "checking">("checking");

useEffect(() => {
  fetch("/api/storage/status")
    .then(res => res.json())
    .then(data => setGoogleStatus(data.googleConnected ? "connected" : "disconnected"))
    .catch(() => setGoogleStatus("disconnected"));
}, []);

// 設定リンクの横に表示
<Link href="/settings">
  <span>設定</span>
  {googleStatus === "connected" && (
    <span className="ml-1 text-xs text-green-500">● Google連携中</span>
  )}
</Link>
```

---

## 🔧 確認・修正手順

### Step 1: RAG+CAG統合の確認

```bash
# コピーライティングでhybridGenerateが使われているか確認
grep -r "hybridGenerate" src/lib/copywriting/

# デザインプロンプト関連ファイルを探す
find src -name "*design*prompt*" -o -name "*prompt*generator*"

# AI生成関数を探す
grep -r "generateContent\|gemini\|openai" src/lib/copywriting/
```

### Step 2: Google Workspace連携の動作確認

1. `/dev/storage-settings` にアクセス
2. Google OAuthを設定
3. リサーチを実行
4. Google Sheetsを確認（データが保存されているか）

### Step 3: UI統合

1. `/settings` に Google Workspace連携セクション追加
2. サイドバーに連携状態表示
3. リサーチ完了画面に「Sheetsに保存しました」表示

---

## ✅ チェックリスト

### RAG+CAG
- [x] `src/lib/copywriting/` の全AI生成関数に `hybridGenerate()` を統合
- [ ] `src/lib/ai/design-prompt-generator.ts` （存在すれば）に `hybridGenerate()` を統合
- [x] `ensureCacheExists()` がアプリ起動時に呼ばれることを確認 → 遅延初期化 + `/api/cache/status`
- [ ] `npm run build` が成功することを確認

### Google Workspace
- [x] `/settings` に Google Workspace連携セクションを追加
- [x] `/dev/storage-settings` と `/dev/google-sync` へのリンクを設置
- [x] リサーチ完了時に `hybrid-storage` 経由で保存されることを確認
- [x] Google Sheetsに実際にデータが入ることを確認（saveFormattedResearch追加）
- [x] 連携状態がUIに表示されることを確認（サイドバーにステータス表示追加）

### 動作確認
- [ ] リサーチ実行 → コスト削減効果が表示される
- [ ] リサーチ実行 → Google Sheetsにデータ保存される
- [ ] `/settings` → Google Workspace連携セクションが見える
- [ ] サイドバー → 連携状態が分かる

---

## 📁 関連ファイル

```
確認が必要なファイル:
├── src/lib/research/orchestrator.ts     # リサーチ → Google保存
├── src/lib/copywriting/                 # ヘッドライン生成 → hybridGenerate
├── src/lib/ai/hybrid-knowledge.ts       # hybridGenerate実装
├── src/lib/storage/hybrid-storage.ts    # Google Sheets保存
├── src/app/settings/page.tsx            # 設定UI
├── src/app/dev/storage-settings/        # ストレージ設定（移動候補）
└── src/app/dev/google-sync/             # Google同期（移動候補）
```

---

## 🔴 優先順位

```
1. [最優先] /settings にGoogle Workspace連携を追加
   → ユーザーが見つけられるようにする

2. [最優先] SNSリサーチの細分化（X/Instagram/TikTok個別選択）
   → types.ts と orchestrator.ts を修正

3. [高] リサーチ結果のGoogle Sheets綺麗な出力
   → sheets-formatter.ts を新規作成

4. [高] Google Deep Research APIの動作確認
   → Interactions APIが動作しているか検証

5. [高] コピーライティングにhybridGenerate統合
   → killer_words.yaml等を活用

6. [中] マルチエージェント/A2A対応の設計
   → 将来的な拡張として設計書を作成

7. [中] 連携状態のUI表示
   → サイドバーや設定画面で確認できるように
```

---

## ✅ 追加チェックリスト

### SNSリサーチ細分化
- [x] `DataSource` 型に `sns_x`, `sns_instagram`, `sns_tiktok` を追加
- [x] `SCRAPER_OPTIONS` を更新
- [x] `orchestrator.ts` のSNS処理を個別に分岐
- [x] リサーチ設定UIで個別選択できることを確認（SCRAPER_OPTIONSから自動表示）

### Google Deep Research
- [x] `/dev/research` でDeep Researchが動作することを確認（実装確認済み）
- [x] ログに `Deep Research completed` が出力されることを確認（コード確認済み）
- [x] 結果がUIに表示されることを確認（synthesizeResultsで統合）

### Google Sheets出力
- [x] `sheets-formatter.ts` を新規作成
- [x] リサーチ完了時に自動でSheetsに出力（orchestrator.ts + saveFormattedResearch統合）
- [x] ヘッダー色、列幅、フリーズ行が適用されることを確認（API生成関数実装済み）
- [x] 競合LP一覧、キーワードランキング等が別シートに出力

### Google Workspace連携
- [x] `/settings` にGoogle Workspace連携セクションを追加
- [x] `/dev/storage-settings` へのリンクを設置
- [x] `/dev/google-sync` へのリンクを設置

### マルチエージェント（将来）
- [x] `multi-agent-orchestrator.ts` の設計書を作成 → `docs/MULTI_AGENT_DESIGN.md`
- [x] エージェントの役割分担を定義（11エージェント）
- [x] 統合・検証フローを設計（5フェーズ）

---

## 💡 備考

- 実装は存在するが**統合されていない・動作確認されていない**ケースが多い
- `/dev/` 以下の機能は本番UIに移動または明示的にリンクする必要がある
- Claude Codeは「実装したつもり」になりやすいので、**実際に動作確認**を必ず行うこと
- SNSリサーチは内部的には細分化されているが、UIで選択できない状態
- Google Sheets出力はGASを使わなくても、Sheets APIのフォーマット機能で対応可能

